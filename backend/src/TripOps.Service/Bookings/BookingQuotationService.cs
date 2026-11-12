using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Service.Bookings;

public sealed record CostLine(string SlotKey, string Source, string Name, decimal Quantity,
    string Unit, decimal ReferenceUnitCost, decimal UnitCost, decimal Total, bool Confirmed = false,
    SupplierSnapshotInput? Supplier = null);
public sealed record QuotationView(int Id, int BookingId, int Version, int TourId, int TourVersion,
    string Status, decimal EstimatedSale, decimal? TotalCost, decimal? AgencyProfit,
    decimal SaleTotal, IReadOnlyList<CostLine>? Costs, string Reason, DateTime CreatedAt,
    DateTime? SentAt, DateTime? AcceptedAt, DateTime? ValidUntil = null,
    decimal DepositAmount = 0, int NumberOfGuests = 0, string? PlanSnapshotJson = null, string? PaymentPolicy = null);
public sealed record ProviderRequestView(int Id, int BookingId, int ServiceId, string SlotKey,
    string ServiceName, DateTime? ServiceDateFrom, DateTime? ServiceDateTo,
    decimal Quantity, string Unit, decimal EstimatedCost, decimal? QuotedCost, string Status, string? Note,
    DateTime? RespondedAt = null, string? ProviderId = null, string? ProviderName = null,
    string? ProviderPhone = null, string? FullAddress = null, DateTime? HoldUntil = null,
    decimal? AvailableQuantity = null, string? ThumbnailUrl = null);
/// <summary>Khách trong đoàn (chỉ thông tin cần cho xếp phòng/suất ăn, không có giấy tờ tùy thân).</summary>
public sealed record ProviderGuestView(string FullName, string? Gender, string? TierName,
    string? RoommateNote, string? RestaurantNote, int? Age = null);
/// <summary>Yêu cầu dịch vụ hiển thị cho Provider: các trường của ProviderRequestView kèm thông tin booking,
/// công ty lữ hành và đoàn khách. Booking đã hủy/từ chối thì Status = "Cancelled" để Provider biết không cần xử lý nữa.</summary>
public sealed record ProviderInboxView(int Id, int BookingId, int ServiceId, string SlotKey,
    string ServiceName, DateTime? ServiceDateFrom, DateTime? ServiceDateTo,
    decimal Quantity, string Unit, decimal EstimatedCost, decimal? QuotedCost, string Status, string? Note,
    DateTime? RespondedAt, string? ProviderId, string? ProviderName, string? ProviderPhone, string? FullAddress,
    DateTime CreatedAt, string BookingCode, string TourName,
    string AgencyName, string? AgencyPhone, string? AgencyEmail, string? MealType, string? SpecialRequests,
    string? CancelReason, DateTime? CancelledAt, IReadOnlyList<ProviderGuestView> Guests, TimeSpan? ServiceTime = null,
    string? AgencyId = null, string? AgencyLogo = null);
public sealed record ProviderReply(string Decision, decimal? QuotedCost, string? Note,
    decimal? AvailableQuantity = null, DateTime? HoldUntil = null);
public sealed record BookingPlanChange(int TourId, HotelChoiceInput[]? HotelChoices = null,
    MealChoiceInput[]? MealChoices = null, string? SpecialRequests = null,
    DateTime? StartDate = null, ParticipantInput[]? Participants = null);

public sealed partial class BookingQuotationService(TripOpsDbContext db, TripOps.Data.Repositories.BookingRepository repository)
{
    private TripOpsDbContext Db => db;
    private TripOps.Data.Repositories.BookingRepository Repository => repository;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);
    private static List<CostLine> Lines(BookingQuotation q) =>
        JsonSerializer.Deserialize<List<CostLine>>(q.LinesJson, Json) ?? [];
    private static void Require(bool condition, string message) {
        if (!condition) throw new BookingException(422, message);
    }
    private async Task<Booking> Owned(string actor, int id, bool agency, CancellationToken ct) =>
        await db.Bookings.Include(b => b.Tour).SingleOrDefaultAsync(b => b.Id == id &&
            (agency ? (b.Tour!.AgencyId == actor || b.BookingAgencies.Any(a=>a.AgencyId==actor)) : b.CustomerId == actor), ct)
        ?? throw new BookingException(404, "Không tìm thấy booking.");
    private static QuotationView View(BookingQuotation q, bool agency) => new(q.Id, q.BookingId,
        q.Version, q.TourId, q.TourVersion, q.Status, q.EstimatedSale,
        agency ? q.TotalCost : null, agency ? q.AgencyProfit : null, q.SaleTotal,
        agency ? Lines(q) : null, q.Reason, q.CreatedAt, q.SentAt, q.AcceptedAt,
        ValidUntil: q.ValidUntil, DepositAmount: decimal.Round(q.SaleTotal / 2, 0, MidpointRounding.AwayFromZero),
        NumberOfGuests: q.NumberOfGuests, PlanSnapshotJson: q.PlanSnapshotJson, PaymentPolicy: q.PaymentPolicy);

    private static string PlanSnapshot(Booking b) => JsonSerializer.Serialize(new {
        name = b.Tour?.Name, b.StartDate, numberOfGuests = BookingAlliance.GuestCount(b),
        b.Tour?.Inclusions, b.Tour?.Exclusions, b.Tour?.CancellationPolicy,
        itinerary = b.Timelines.OrderBy(d => d.DayNumber).Select(d => new { d.DayNumber, d.Title, d.Description,
            activities = d.Attractions.Select(a => new { name = a.CurrentLocationName ?? a.OriginalLocationName, a.Time }),
            meals = d.Meals.Select(m => new { m.MealType, name = m.CurrentRestaurantName ?? m.OriginalRestaurantName, m.DateService, m.Time }) }),
        hotels = b.Accommodations.Select(h => new { name = h.CurrentHotelName ?? h.OriginalHotelName, h.DateFrom, h.DateTo, h.NightsCount })
    }, Json);
    private static string InitialPlanSnapshot(Booking booking, Tour? source)
    {
        var snapshot = System.Text.Json.Nodes.JsonNode.Parse(PlanSnapshot(booking))!.AsObject();
        if (source != null) {
            snapshot["name"] = source.Name; snapshot["inclusions"] = source.Inclusions;
            snapshot["exclusions"] = source.Exclusions; snapshot["cancellationPolicy"] = source.CancellationPolicy;
        }
        return snapshot.ToJsonString();
    }
    public async Task Initialize(int bookingId, CancellationToken ct, Tour? source = null)
    {
        if (await db.BookingQuotations.AnyAsync(q => q.BookingId == bookingId, ct)) return;
        var booking = await db.Bookings.Include(b => b.Tour).Include(b => b.Participants).Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Attractions)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals).AsSplitQuery()
            .SingleAsync(b => b.Id == bookingId, ct);
        var lines = await CaptureCosts(booking, ct);
        db.BookingQuotations.Add(new BookingQuotation { BookingId = bookingId,
            NumberOfGuests = BookingAlliance.GuestCount(booking), PlanSnapshotJson = InitialPlanSnapshot(booking, source),
            Version = 1, TourId = booking.TourId!.Value, TourVersion = booking.TourVersion,
            EstimatedSale = booking.TotalAmount, TotalCost = lines.Sum(l => l.Total),
            LinesJson = JsonSerializer.Serialize(lines, Json), Reason = "Giá dự kiến khi khách đặt tour" });
        await db.SaveChangesAsync(ct);
    }
    private async Task<List<CostLine>> CaptureCosts(Booking booking, CancellationToken ct)
    {
        var bookingId = booking.Id;
        var selections = booking.Accommodations.Select(h =>
            (Key: $"hotel:{h.Id}", Name: h.CurrentHotelName ?? h.OriginalHotelName,
             ServiceId: h.ServiceId, Quantity: (decimal)Math.Max(1, h.NightsCount ?? 1), Unit: "room_night",
             From: h.DateFrom, To: h.DateTo, Destination: (string?)h.Destination,
             Day: (int?)null, MealType: (string?)null))
            .Concat(booking.Timelines.SelectMany(d => d.Meals.Select(m =>
                (Key: $"meal:{m.Id}", Name: m.CurrentRestaurantName ?? m.OriginalRestaurantName,
                 ServiceId: m.ServiceId, Quantity: (decimal)Math.Max(1, BookingAlliance.GuestCount(booking,m.AgencyId??booking.Tour!.AgencyId)), Unit: "meal",
                 From: m.Time ?? m.DateService, To: m.Time ?? m.DateService, Destination: (string?)null,
                 Day: (int?)d.DayNumber, MealType: (string?)m.MealType)))).ToList();
        var serviceIds = selections.Where(s => s.ServiceId.HasValue).Select(s => s.ServiceId!.Value).Distinct().ToArray();
        var services = await db.Services.AsNoTracking().Where(s => serviceIds.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, ct);
        var tour = await db.Tours.AsNoTracking().Include(t => t.Accommodations)
            .Include(t => t.Timelines).ThenInclude(d => d.Meals)
            .Include(t => t.Timelines).ThenInclude(d => d.Attractions).AsSplitQuery()
            .SingleAsync(t => t.Id == booking.TourId, ct);
        decimal Reference(string key, string name, string? destination, int? day, string? mealType)
        {
            var raw = key.StartsWith("hotel:")
                ? tour!.Accommodations.FirstOrDefault(h => h.DestinationName == destination && h.HotelName == name)?.SupplierSnapshot
                : tour!.Timelines.Where(d => d.DayNumber == day).SelectMany(d => d.Meals)
                    .FirstOrDefault(m => m.MealType == mealType && m.RestaurantName == name)?.SupplierSnapshot;
            if (raw is null) return 0;
            try { return JsonSerializer.Deserialize<SupplierSnapshotInput>(raw, Json)?.ReferencePrice ?? 0; }
            catch (JsonException) { return 0; }
        }
        var lines = new List<CostLine>();
        if (tour != null && booking.DesignRequestId.HasValue) {
            var version = await db.TourVersions.AsNoTracking().SingleAsync(v => v.TourId == tour.Id && v.VersionNumber == booking.TourVersion, ct);
            tour = TourService.MaterializeSnapshot(tour, version);
        }
        foreach (var s in selections)
        {
            var service = s.ServiceId.HasValue ? services.GetValueOrDefault(s.ServiceId.Value) : null;
            var unit = service?.PriceUnit ?? s.Unit;
            var quantity = unit is "person" or "meal" ? BookingAlliance.GuestCount(booking,BookingAlliance.OwnerOfSlot(booking,s.Key)) : unit is "trip" or "item" ? 1 : s.Quantity;
            var price = service?.Price ?? Reference(s.Key, s.Name, s.Destination, s.Day, s.MealType);
            if(unit=="person_night") quantity=s.Quantity*BookingAlliance.GuestCount(booking,BookingAlliance.OwnerOfSlot(booking,s.Key));
            lines.Add(new CostLine(s.Key, service is null ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER",
                s.Name, quantity, unit, price, price, Money(price * quantity)));
            if (service is not null)
            {
                db.WorkflowNotifications.Add(new WorkflowNotification { UserId = service.ProviderId, BookingId = bookingId, Message = "Có yêu cầu xác nhận giá và khả năng cung cấp dịch vụ." });
                db.BookingSupplierRequests.Add(new BookingSupplierRequest { BookingId = bookingId,
                    ServiceId = service.Id, ProviderId = service.ProviderId, SlotKey = s.Key,
                    ReplyDeadline = DateTime.UtcNow.AddHours(48), ServiceName = s.Name, ServiceDateFrom = s.From, ServiceDateTo = s.To,
                    Quantity = quantity, Unit = unit, EstimatedCost = Money(price * quantity) });
            }
        }
        return lines;
    }
    public async Task<QuotationView> ChangePlan(string actor, int bookingId, BookingPlanChange input, CancellationToken ct)
    {
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);
        var booking = await db.Bookings.Include(b => b.Participants).Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals)
            .Include(b => b.Timelines).ThenInclude(d => d.Attractions).Include(b => b.Tour)
            .AsSplitQuery().SingleOrDefaultAsync(b => b.Id == bookingId &&
                b.Tour!.AgencyId == actor, ct)
            ?? throw new BookingException(404, "Không tìm thấy booking.");
        Require(await db.BookingAgencies.CountAsync(a=>a.BookingId==bookingId,ct)<2,"Booking liên minh cần đổi dịch vụ hoặc chặng riêng; không thay toàn bộ phương án.");
        Require(!await db.BookingContracts.AnyAsync(c => c.BookingId == bookingId, ct) && booking.Status == BookingStatus.Pending,
            "Booking đã duyệt một lần nên không đổi toàn bộ phương án/giá. Agency có thể đổi dịch vụ riêng và tạo phụ thu.");
        var previouslyApproved = booking.Status == BookingStatus.Confirmed;
        Require((booking.Status == BookingStatus.Pending || previouslyApproved) &&
            booking.PaymentStatus == PaymentStatus.Unpaid &&
            !await db.PaymentTransactions.AnyAsync(p => p.BookingId == bookingId &&
                (p.Status == null || p.Status == PaymentTransactionStatus.Pending ||
                 p.Status == PaymentTransactionStatus.Success), ct) &&
            !await db.PaymentRequests.AnyAsync(p => p.BookingId == bookingId &&
                p.Status == PaymentRequestStatus.Paid, ct) &&
            (!await db.PaymentRequests.AnyAsync(p => p.BookingId == bookingId && p.Status != PaymentRequestStatus.Cancelled, ct) || previouslyApproved),
            "Chỉ được đổi phương án trước khi cọc; giao dịch payOS đang xử lý phải hoàn tất trước.");
        var tour = await db.Tours.Include(t => t.PricingTiers).Include(t => t.Accommodations)
            .Include(t => t.Timelines).ThenInclude(d => d.Meals)
            .Include(t => t.Timelines).ThenInclude(d => d.Attractions).AsSplitQuery()
            .SingleOrDefaultAsync(t => t.Id == input.TourId && t.Status != TourStatus.Deleted &&
                (booking.DesignRequestId.HasValue
                    ? t.DesignRequestId == booking.DesignRequestId && t.IsRequest == true && t.SharedVersion.HasValue
                    : t.Id == booking.TourId && t.IsRequest != true && t.Visibility == TourVisibility.Public), ct)
            ?? throw new BookingException(422, "Tour plan không thuộc yêu cầu của bạn hoặc chưa sẵn sàng.");
        if (booking.DesignRequestId.HasValue) {
            var version = await db.TourVersions.AsNoTracking().SingleAsync(v => v.TourId == tour.Id && v.VersionNumber == tour.SharedVersion, ct);
            tour = TourService.MaterializeSnapshot(tour, version);
        }
        booking.TourVersion = tour.Version ?? 1;
        booking.TourConfigurationData = tour.ConfigurationData;
        var guestCount = input.Participants?.Length ?? booking.Participants.Count;
        Require(guestCount > 0 && (!tour.MinGuests.HasValue || guestCount >= tour.MinGuests) &&
            (!tour.MaxGuests.HasValue || guestCount <= tour.MaxGuests), "Số khách không phù hợp Tour plan.");
        Require(input.Participants is null || input.Participants.All(p => !string.IsNullOrWhiteSpace(p.FullName) && p.FullName.Length <= 150),
            "Cần nhập tên từng hành khách.");
        if (input.StartDate.HasValue)
            Require(input.StartDate.Value.Date >= DateTime.UtcNow.Date, "Ngày khởi hành không hợp lệ.");
        string? TierName(ParticipantInput p, int index)
        {
            if (p.PricingTierId.HasValue)
                return tour.PricingTiers.FirstOrDefault(t => t.Id == p.PricingTierId)?.Name
                    ?? throw new BookingException(422, "Nhóm giá không thuộc Tour plan.");
            if (!p.DateOfBirth.HasValue)
                return booking.Participants.OrderBy(x => x.ParticipantIndex).ElementAtOrDefault(index)?.TierName;
            var start = input.StartDate?.Date ?? booking.StartDate.Date;
            Require(p.DateOfBirth.Value.Date <= start, "Ngày sinh không hợp lệ.");
            var age = start.Year - p.DateOfBirth.Value.Year;
            if (p.DateOfBirth.Value.Date.AddYears(age) > start) age--;
            return tour.PricingTiers.OrderBy(t => t.DisplayOrder)
                .FirstOrDefault(t => (!t.MinAge.HasValue || age >= t.MinAge) &&
                    (!t.MaxAge.HasValue || age <= t.MaxAge))?.Name;
        }
        var hotelChoices = input.HotelChoices ?? [];
        var mealChoices = input.MealChoices ?? [];
        Require(hotelChoices.Select(h => h.Destination).Distinct(StringComparer.OrdinalIgnoreCase).Count() == hotelChoices.Length &&
            mealChoices.Select(m => (m.DayNumber, m.MealType)).Distinct().Count() == mealChoices.Length,
            "Không được chọn trùng phương án.");
        var hotels = new List<(TourAccommodation Option, string Destination)>();
        foreach (var group in tour.Accommodations.GroupBy(h => h.DestinationName))
        {
            var choice = hotelChoices.FirstOrDefault(h => h.Destination.Equals(group.Key, StringComparison.OrdinalIgnoreCase));
            var current = tour.Id == booking.TourId ? booking.Accommodations.FirstOrDefault(h =>
                h.Destination.Equals(group.Key, StringComparison.OrdinalIgnoreCase)) : null;
            var option = choice is null ?
                group.FirstOrDefault(h => current != null && h.ServiceId == current.ServiceId &&
                    h.HotelName == (current.CurrentHotelName ?? current.OriginalHotelName))
                ?? group.FirstOrDefault(h => h.IsDefault == true) :
                group.FirstOrDefault(h => choice.ServiceId.HasValue ? h.ServiceId == choice.ServiceId && h.HotelName == choice.Name :
                    h.ServiceId == null && h.HotelName == choice.Name);
            Require(option is not null, $"Chưa chọn khách sạn hợp lệ tại {group.Key}.");
            hotels.Add((option!, group.Key));
        }
        Require(hotelChoices.All(c => hotels.Any(h => h.Destination.Equals(c.Destination, StringComparison.OrdinalIgnoreCase))),
            "Khách sạn không thuộc Tour plan.");
        var meals = new List<(int Day, TourMeal Option)>();
        foreach (var day in tour.Timelines)
        foreach (var group in day.Meals.GroupBy(m => m.MealType))
        {
            var choice = mealChoices.FirstOrDefault(m => m.DayNumber == day.DayNumber && m.MealType == group.Key);
            var current = tour.Id == booking.TourId ? booking.Timelines.FirstOrDefault(d => d.DayNumber == day.DayNumber)?
                .Meals.FirstOrDefault(m => m.MealType == group.Key) : null;
            var option = choice is null ?
                group.FirstOrDefault(m => current != null && m.ServiceId == current.ServiceId &&
                    m.RestaurantName == (current.CurrentRestaurantName ?? current.OriginalRestaurantName))
                ?? group.FirstOrDefault(m => m.IsDefault) :
                group.FirstOrDefault(m => choice.ServiceId.HasValue ? m.ServiceId == choice.ServiceId && m.RestaurantName == choice.Name :
                    m.ServiceId == null && m.RestaurantName == choice.Name);
            Require(option is not null, $"Chưa chọn nhà hàng hợp lệ cho ngày {day.DayNumber}, bữa {group.Key}.");
            meals.Add((day.DayNumber, option!));
        }
        Require(mealChoices.All(c => meals.Any(m => m.Day == c.DayNumber && m.Option.MealType == c.MealType)),
            "Bữa ăn không thuộc Tour plan.");
        var selectedServiceIds = hotels.Select(h => h.Option.ServiceId)
            .Concat(meals.Select(m => m.Option.ServiceId)).Where(id => id.HasValue)
            .Select(id => id!.Value).Distinct().ToArray();
        Require(await db.Services.CountAsync(s => selectedServiceIds.Contains(s.Id) &&
            s.Status == ServiceStatus.Approved && !s.IsPaused &&
            s.Provider.Status == UserStatus.Active && s.Provider.BusinessProfile != null &&
            s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved, ct) == selectedServiceIds.Length,
            "Dịch vụ Provider đã ngừng hoạt động; hãy chọn phương án khác.");
        var rejectedServiceIds = await db.BookingSupplierRequests.Where(r => r.BookingId == bookingId &&
            r.Status == "Rejected").Select(r => r.ServiceId).Distinct().ToArrayAsync(ct);
        Require(!selectedServiceIds.Intersect(rejectedServiceIds).Any(),
            "Provider đã từ chối booking; Agency cần chọn dịch vụ khác.");
        if (previouslyApproved)
        {
            foreach (var payment in await db.PaymentRequests.Where(p => p.BookingId == bookingId &&
                p.Status != PaymentRequestStatus.Paid).ToListAsync(ct))
                payment.Status = PaymentRequestStatus.Cancelled;
            foreach (var contract in await db.BookingContracts.Where(c => c.BookingId == bookingId &&
                c.Status != "Superseded").ToListAsync(ct))
                contract.Status = "Superseded";
            booking.Status = BookingStatus.Pending;
        }
        var oldRequests = await db.BookingSupplierRequests.Where(r => r.BookingId == bookingId &&
            r.Status != "Superseded").ToListAsync(ct);
        foreach (var r in oldRequests) r.Status = "Superseded";
        var originalHotels = booking.Accommodations.ToDictionary(h => h.Destination, StringComparer.OrdinalIgnoreCase);
        var originalMeals = booking.Timelines.SelectMany(d => d.Meals.Select(m => (Key: (d.DayNumber, m.MealType), Item: m)))
            .ToDictionary(x => x.Key, x => x.Item);
        var originalLocations = booking.Timelines.ToDictionary(d => d.DayNumber, d => d.Attractions.OrderBy(a => a.Id).ToArray());
        var sameTour = tour.Id == booking.TourId;
        db.BookingTimelineMeals.RemoveRange(booking.Timelines.SelectMany(d => d.Meals));
        db.BookingTimelineAttractions.RemoveRange(booking.Timelines.SelectMany(d => d.Attractions));
        db.BookingAccommodations.RemoveRange(booking.Accommodations);
        db.BookingTimelines.RemoveRange(booking.Timelines);
        if (input.StartDate.HasValue) booking.StartDate = input.StartDate.Value.Date;
        if (input.Participants is not null)
        {
            db.BookingParticipants.RemoveRange(booking.Participants);
            booking.Participants = input.Participants.Select((p, i) => new BookingParticipant {
                BookingId = bookingId, AgencyId = tour.AgencyId!, ParticipantIndex = i + 1,
                FullName = p.FullName.Trim(), DateOfBirth = p.DateOfBirth,
                Gender = p.Gender, IdentityNumber = p.IdentityNumber, Note = p.Note,
                RoommateNote = p.RoommateNote, RestaurantNote = p.RestaurantNote,
                TierName = TierName(p, i),
                Status = "ACTIVE" }).ToList();
        }
        booking.Accommodations = hotels.Select(h => new BookingAccommodation { BookingId = bookingId,
            ServiceId = h.Option.ServiceId, Destination = h.Destination,
            OriginalHotelName = originalHotels.GetValueOrDefault(h.Destination)?.OriginalHotelName ?? h.Option.HotelName,
            OriginalStars = originalHotels.GetValueOrDefault(h.Destination)?.OriginalStars ?? h.Option.StarRating,
            CurrentHotelName = h.Option.HotelName, CurrentStars = h.Option.StarRating,
            IsCustomized = originalHotels.GetValueOrDefault(h.Destination)?.OriginalHotelName is { } originalHotel && originalHotel != h.Option.HotelName,
            NightsCount = h.Option.NightsCount,
            DateFrom = booking.StartDate, DateTo = booking.StartDate.AddDays(h.Option.NightsCount ?? 1),
            PriceDifference = h.Option.PriceDifference }).ToList();
        booking.Timelines = tour.Timelines.Select(day => new BookingTimeline { BookingId = bookingId,
            DayNumber = day.DayNumber, Title = day.Title ?? $"Ngày {day.DayNumber}", Description = day.Description,
            Attractions = day.Attractions.Select((a, index) => new BookingTimelineAttraction {
                AgencyId = a.AgencyId ?? tour.AgencyId,
                OriginalLocationName = originalLocations.GetValueOrDefault(day.DayNumber)?.ElementAtOrDefault(index)?.OriginalLocationName ?? a.Name ?? "",
                CurrentLocationName = sameTour ? originalLocations.GetValueOrDefault(day.DayNumber)?.ElementAtOrDefault(index)?.CurrentLocationName ?? a.Name ?? "" : a.Name ?? "",
                CustomerNote = sameTour ? originalLocations.GetValueOrDefault(day.DayNumber)?.ElementAtOrDefault(index)?.CustomerNote : null,
                Time = a.Time.HasValue ? booking.StartDate.AddDays(day.DayNumber - 1).Add(a.Time.Value.TimeOfDay) : null
            }).ToList(),
            Meals = meals.Where(m => m.Day == day.DayNumber).Select(m => new BookingTimelineMeal {
                MealType = m.Option.MealType,
                OriginalRestaurantName = originalMeals.GetValueOrDefault((m.Day, m.Option.MealType))?.OriginalRestaurantName ?? m.Option.RestaurantName,
                CurrentRestaurantName = m.Option.RestaurantName,
                IsCustomized = originalMeals.GetValueOrDefault((m.Day, m.Option.MealType))?.OriginalRestaurantName is { } originalMeal && originalMeal != m.Option.RestaurantName,
                ServiceId = m.Option.ServiceId, PriceDifference = m.Option.PriceDifference,
                DateService = booking.StartDate.AddDays(day.DayNumber - 1),
                Time = m.Option.Time.HasValue ? booking.StartDate.AddDays(day.DayNumber - 1).Add(m.Option.Time.Value.TimeOfDay) : null }).ToList() }).ToList();
        booking.AcceptedQuotationId = null;
        booking.TourId = tour.Id; booking.Tour = tour;
        var extra = hotels.Sum(h => h.Option.PriceDifference ?? 0) + meals.Sum(m => m.Option.PriceDifference);
        foreach (var person in booking.Participants)
        {
            var tier = tour.PricingTiers.FirstOrDefault(t => t.Name == person.TierName);
            person.Price = (tier?.PricePerGuest ?? tour.BasePrice ?? 0) + extra;
        }
        booking.TotalAmount = booking.Participants.Sum(p => p.Price);
        booking.OriginalTotalPrice = booking.TotalAmount - extra * booking.Participants.Count;
        booking.HasCustomization = hotelChoices.Length > 0 || mealChoices.Length > 0 ||
            input.Participants is not null || input.StartDate.HasValue;
        if (input.SpecialRequests is not null)
        {
            Require(input.SpecialRequests.Length <= 1000, "Yêu cầu tùy chỉnh quá dài.");
            booking.SpecialRequests = input.SpecialRequests.Trim();
            booking.HasCustomization = true;
        }
        await db.SaveChangesAsync(ct);
        var lines = await CaptureCosts(booking, ct);
        var reused = new HashSet<int>();
        foreach (var pendingRequest in db.ChangeTracker.Entries<BookingSupplierRequest>().Where(e => e.State == EntityState.Added).Select(e => e.Entity))
        {
            var prior = oldRequests.FirstOrDefault(r => !reused.Contains(r.Id) && r.QuotedCost.HasValue && r.RespondedAt.HasValue &&
                r.ServiceId == pendingRequest.ServiceId && r.ServiceDateFrom == pendingRequest.ServiceDateFrom &&
                r.ServiceDateTo == pendingRequest.ServiceDateTo && r.Quantity == pendingRequest.Quantity && r.Unit == pendingRequest.Unit &&
                r.EstimatedCost == pendingRequest.EstimatedCost && (!r.HoldUntil.HasValue || r.HoldUntil > DateTime.UtcNow));
            if (prior == null || !prior.PriceConfirmed || !prior.AvailabilityConfirmed) continue;
            reused.Add(prior.Id); pendingRequest.Status = "Confirmed"; pendingRequest.QuotedCost = prior.QuotedCost;
            pendingRequest.PriceConfirmed = true; pendingRequest.AvailabilityConfirmed = true;
            pendingRequest.AvailableQuantity = prior.AvailableQuantity; pendingRequest.HoldUntil = prior.HoldUntil;
            pendingRequest.ResponseHistoryJson = prior.ResponseHistoryJson; pendingRequest.RespondedAt = prior.RespondedAt;
            var index = lines.FindIndex(l => l.SlotKey == pendingRequest.SlotKey);
            if (index >= 0) lines[index] = lines[index] with { Total = prior.QuotedCost!.Value, UnitCost = prior.QuotedCost.Value / pendingRequest.Quantity, Confirmed = true };
        }
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        latest.Status = "Superseded";
        var next = new BookingQuotation { BookingId = bookingId, Version = latest.Version + 1,
            TourId = tour.Id, TourVersion = tour.Version ?? 1, EstimatedSale = booking.TotalAmount,
            NumberOfGuests = BookingAlliance.GuestCount(booking), PlanSnapshotJson = PlanSnapshot(booking),
            TotalCost = lines.Sum(l => l.Total), LinesJson = JsonSerializer.Serialize(lines, Json),
            Reason = "Agency đổi phương án tour hoặc dịch vụ" };
        db.BookingQuotations.Add(next);
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return View(next, true);
    }

    public async Task<IReadOnlyList<QuotationView>> Quotations(string actor, int bookingId, bool agency, CancellationToken ct)
    {
        var scope=await Owned(actor, bookingId, agency, ct);
        if(agency && scope.Tour!.AgencyId!=actor)return []; // Whole-booking quotations are private to the host.
        var rows = await db.BookingQuotations.AsNoTracking().Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).ToListAsync(ct);
        return rows.Where(q => agency || q.SentAt.HasValue)
            .Select(q => View(q, agency)).ToArray();
    }
    private IQueryable<ProviderRequestView> RequestViews(IQueryable<BookingSupplierRequest> requests) =>
        from r in requests
        join service in db.Services.AsNoTracking() on r.ServiceId equals service.Id
        select new ProviderRequestView(r.Id, r.BookingId, r.ServiceId, r.SlotKey, r.ServiceName,
            r.ServiceDateFrom, r.ServiceDateTo, r.Quantity, r.Unit, r.EstimatedCost, r.QuotedCost,
            r.Status, r.Note, r.RespondedAt, r.ProviderId,
            service.Provider.BusinessProfile != null ? service.Provider.BusinessProfile.BusinessName : service.Provider.Name,
            service.Provider.Phone, service.FullAddress, r.HoldUntil, r.AvailableQuantity, service.ThumbnailUrl);

    public async Task<IReadOnlyList<ProviderInboxView>> ProviderRequests(string actor, CancellationToken ct)
    {
        // Giữ yêu cầu đã thay thế trong lịch sử; Provider không thể phản hồi yêu cầu cũ.
        var views = (await RequestViews(db.BookingSupplierRequests.AsNoTracking()
                .Where(r => r.ProviderId == actor)).ToListAsync(ct))
            .ToDictionary(v => v.Id);
        var ids = views.Keys.ToArray();
        var rows = await db.BookingSupplierRequests.AsNoTracking().Where(r => ids.Contains(r.Id))
            .Include(r => r.Booking).ThenInclude(b => b.Tour!).ThenInclude(t => t.Agency)
            .Include(r => r.Booking).ThenInclude(b => b.Participants)
            .Include(r => r.Booking).ThenInclude(b => b.Accommodations)
            .Include(r => r.Booking).ThenInclude(b => b.Timelines).ThenInclude(d=>d.Meals)
            .AsSplitQuery().OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        var mealIds = rows.Select(r => r.SlotKey.StartsWith("meal:", StringComparison.Ordinal) &&
                int.TryParse(r.SlotKey.AsSpan(5), out var id) ? id : 0).Where(id => id > 0).Distinct().ToArray();
        var mealTypes = await db.BookingTimelineMeals.AsNoTracking().Where(m => mealIds.Contains(m.Id))
            .ToDictionaryAsync(m => $"meal:{m.Id}", m => m.MealType, ct);
        var agencyIds = rows.Select(r => BookingAlliance.OwnerOfSlot(r.Booking, r.SlotKey)).Distinct().ToArray();
        var agencies = await db.Users.AsNoTracking().Where(u => agencyIds.Contains(u.Id)).Select(u => new {
            u.Id, Name = u.BusinessProfile != null ? u.BusinessProfile.BusinessName ?? u.Name : u.Name,
            u.Phone, u.Email, Logo = u.BusinessProfile != null ? u.BusinessProfile.LogoUrl ?? u.Avatar : u.Avatar
        }).ToDictionaryAsync(u => u.Id, ct);
        return rows.Select(r =>
        {
            var v = views[r.Id];
            var b = r.Booking;
            var agencyId = BookingAlliance.OwnerOfSlot(b, r.SlotKey);
            var agency = agencies.GetValueOrDefault(agencyId);
            var closed = b.Status is BookingStatus.Cancelled or BookingStatus.Rejected;
            return new ProviderInboxView(v.Id, v.BookingId, v.ServiceId, v.SlotKey, v.ServiceName,
                v.ServiceDateFrom, v.ServiceDateTo, v.Quantity, v.Unit, v.EstimatedCost, v.QuotedCost,
                closed ? "Cancelled" : v.Status, v.Note, v.RespondedAt, v.ProviderId, v.ProviderName,
                v.ProviderPhone, v.FullAddress, r.CreatedAt, b.BookingCode,
                b.Tour?.Name ?? "Tour", agency?.Name ?? "Công ty lữ hành", agency?.Phone,
                agency?.Email, mealTypes.GetValueOrDefault(r.SlotKey), b.SpecialRequests,
                closed ? b.CancelReason : r.Status == "Superseded" ? "Agency đã thay dịch vụ cho lịch phục vụ này. Yêu cầu cũ không còn hiệu lực." : null,
                closed ? b.CancelledAt : null,
                b.Participants.Where(p => p.Status != "INACTIVE" && p.AgencyId==BookingAlliance.OwnerOfSlot(b,r.SlotKey)).OrderBy(p => p.ParticipantIndex)
                    .Select(p => new ProviderGuestView(p.FullName, p.Gender, p.TierName, p.RoommateNote, p.RestaurantNote,
                        p.DateOfBirth.HasValue ? BookingAlliance.Age(p.DateOfBirth.Value,v.ServiceDateFrom ?? b.StartDate) : null))
                    .ToArray(), b.Timelines.SelectMany(day=>day.Meals).FirstOrDefault(meal=>r.SlotKey == $"meal:{meal.Id}")?.Time?.TimeOfDay,
                AgencyId: agencyId, AgencyLogo: agency?.Logo);
        }).ToArray();
    }
    public async Task<IReadOnlyList<ProviderRequestView>> AgencyRequests(string actor, int bookingId, CancellationToken ct)
    {
        var b=await repository.Find(bookingId,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(!BookingAlliance.IsMember(b,actor))throw new BookingException(403,"Agency không thuộc booking.");
        var slots=b.Accommodations.Where(h=>(h.AgencyId??b.Tour!.AgencyId)==actor).Select(h=>"hotel:"+h.Id)
            .Concat(b.Timelines.SelectMany(d=>d.Meals).Where(m=>(m.AgencyId??b.Tour!.AgencyId)==actor).Select(m=>"meal:"+m.Id)).ToArray();
        var requests=await RequestViews(db.BookingSupplierRequests.AsNoTracking().Where(r => r.BookingId == bookingId)
            .OrderByDescending(r => r.CreatedAt)).ToListAsync(ct);
        return requests.Select(r=>b.Tour!.AgencyId==actor || slots.Contains(r.SlotKey)?r:
            r with {EstimatedCost=0,QuotedCost=null,Quantity=0,AvailableQuantity=null,Note=null}).ToArray();
    }
    private static bool AcceptsSupplierResponses(BookingStatus? status) => status is
        BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid or BookingStatus.InProgress;

    public async Task<ProviderRequestView> Respond(string actor, int requestId, ProviderReply input, CancellationToken ct)
    {
        var bookingId = await db.BookingSupplierRequests.Where(r => r.Id == requestId && r.ProviderId == actor).Select(r => (int?)r.BookingId).SingleOrDefaultAsync(ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);
        var request = await db.BookingSupplierRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.ProviderId == actor, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
        Require(request.Status == "Pending" || (request.Status == "Confirmed" && input.Decision == "confirm"),
            "Yêu cầu đã được xử lý.");
        var booking = await db.Bookings.SingleAsync(b => b.Id == request.BookingId, ct);
        Require(AcceptsSupplierResponses(booking.Status), "Booking đã kết thúc, bị hủy hoặc từ chối; không thể phản hồi dịch vụ.");
        Require(input.Decision is "confirm" or "reject" or "counter" or "partial", "Phản hồi không hợp lệ.");
        if (input.Decision != "reject") Require(input.QuotedCost is >= 0, "Cần nhập giá thực tế không âm.");
        Require(request.Status != "Confirmed" || request.QuotedCost != input.QuotedCost || request.Note != input.Note,
            "Giá và ghi chú không thay đổi.");
        Require(input.Note == null || input.Note.Length <= 1000, "Ghi chú quá dài.");
        Require(input.Decision is not ("confirm" or "counter") || !input.AvailableQuantity.HasValue || input.AvailableQuantity >= request.Quantity, "Cần xác nhận đủ số lượng hoặc phản hồi một phần.");
        Require(input.Decision != "partial" || (input.AvailableQuantity > 0 && input.AvailableQuantity < request.Quantity), "Số lượng cung cấp một phần không hợp lệ.");
        Require(!request.ReplyDeadline.HasValue || request.ReplyDeadline > DateTime.UtcNow, "Đã hết hạn phản hồi.");
        Require(!input.HoldUntil.HasValue || input.HoldUntil > DateTime.UtcNow, "Hạn giữ chỗ phải trong tương lai.");
        var history = string.IsNullOrWhiteSpace(request.ResponseHistoryJson) ? [] : JsonSerializer.Deserialize<List<JsonElement>>(request.ResponseHistoryJson, Json) ?? [];
        history.Add(JsonSerializer.SerializeToElement(new { actor, input, at = DateTime.UtcNow }, Json));
        request.ResponseHistoryJson = JsonSerializer.Serialize(history, Json);
        request.AvailableQuantity = input.AvailableQuantity ?? (input.Decision == "reject" ? 0 : request.Quantity);
        request.PriceConfirmed = input.Decision == "confirm"; request.AvailabilityConfirmed = input.Decision == "confirm";
        request.HoldUntil = input.HoldUntil;
        request.Status = input.Decision switch { "confirm" => "Confirmed", "counter" => "CounterOffered", "partial" => "Partial", _ => "Rejected" };
        request.QuotedCost = input.Decision != "reject" && input.QuotedCost.HasValue ? Money(input.QuotedCost.Value) : null;
        request.Note = input.Note?.Trim(); request.RespondedAt = DateTime.UtcNow;
        var agencies=await db.BookingAgencies.Where(a=>a.BookingId==request.BookingId).Select(a=>a.AgencyId).ToListAsync(ct);
        foreach(var agencyId in agencies) db.WorkflowNotifications.Add(new WorkflowNotification { UserId = agencyId, BookingId = request.BookingId, Message = $"Provider phản hồi: {request.ServiceName} — {request.Status}" });
        await Revise(request.BookingId, $"Provider {request.ServiceName} {request.Status.ToLowerInvariant()}", request, ct);
        await transaction.CommitAsync(ct);
        return await RequestViews(db.BookingSupplierRequests.AsNoTracking().Where(r => r.Id == request.Id)).SingleAsync(ct);
    }
    private async Task<BookingQuotation> Revise(int bookingId, string reason,
        BookingSupplierRequest? response, CancellationToken ct)
    {
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        var lines = Lines(latest);
        if (response is not null && response.QuotedCost.HasValue)
        {
            var i = lines.FindIndex(l => l.SlotKey == response.SlotKey);
            if (i >= 0) lines[i] = lines[i] with { UnitCost = response.QuotedCost.Value / lines[i].Quantity,
                Total = response.QuotedCost.Value, Confirmed = response.Status == "Confirmed" };
        }
        latest.Status = "Superseded";
        var next = new BookingQuotation { BookingId = bookingId, Version = latest.Version + 1,
            TourId = latest.TourId, TourVersion = latest.TourVersion, EstimatedSale = latest.EstimatedSale,
            TotalCost = lines.Sum(l => l.Total), AgencyProfit = latest.AgencyProfit,
            SaleTotal = latest.SaleTotal, NumberOfGuests = latest.NumberOfGuests,
            PlanSnapshotJson = latest.PlanSnapshotJson, PaymentPolicy = latest.PaymentPolicy, ValidUntil = latest.ValidUntil,
            LinesJson = JsonSerializer.Serialize(lines, Json), Reason = reason };
        db.BookingQuotations.Add(next); await db.SaveChangesAsync(ct); return next;
    }
    public async Task CounterDecision(string actor, int bookingId, int requestId, bool accept, CancellationToken ct)
    {
        await using var tx = await repository.BeginPaymentChange(bookingId, ct);
        var b = await Owned(actor, bookingId, true, ct);
        Require(AcceptsSupplierResponses(b.Status), "Booking đã kết thúc, bị hủy hoặc từ chối.");
        var r = await db.BookingSupplierRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.BookingId == bookingId, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
        var scope=await repository.Find(bookingId,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        Require(BookingAlliance.OwnerOfSlot(scope,r.SlotKey)==actor,"Chỉ Agency phụ trách dịch vụ được phản hồi báo giá.");
        Require(r.Status == "CounterOffered" && r.AvailableQuantity >= r.Quantity, "Chỉ chấp nhận báo giá đáp ứng đủ số lượng.");
        r.Status = accept ? "Confirmed" : "Rejected";
        r.PriceConfirmed = accept; r.AvailabilityConfirmed = accept;
        var history = string.IsNullOrWhiteSpace(r.ResponseHistoryJson) ? [] : JsonSerializer.Deserialize<List<JsonElement>>(r.ResponseHistoryJson, Json) ?? [];
        history.Add(JsonSerializer.SerializeToElement(new { actor, accept, at = DateTime.UtcNow }, Json));
        r.ResponseHistoryJson = JsonSerializer.Serialize(history, Json);
        await Revise(bookingId, "Agency xử lý counter offer", r, ct);
        await tx.CommitAsync(ct);
    }
    public async Task<object> ResponseHistory(string actor, int bookingId, int requestId, CancellationToken ct)
    {
        await Owned(actor, bookingId, true, ct);
        var r = await db.BookingSupplierRequests.AsNoTracking().SingleOrDefaultAsync(r => r.Id == requestId && r.BookingId == bookingId, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
        var scope=await repository.Find(bookingId,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(scope.Tour!.AgencyId!=actor && BookingAlliance.OwnerOfSlot(scope,r.SlotKey)!=actor)throw new BookingException(403,"Không được xem phản hồi dịch vụ của Agency khác.");
        return new { r.PriceConfirmed, r.AvailabilityConfirmed, r.AvailableQuantity, r.HoldUntil, r.ReplyDeadline,
            Responses = JsonSerializer.Deserialize<JsonElement>(r.ResponseHistoryJson) };
    }
    public async Task RequireCurrentPlan(int bookingId, CancellationToken ct)
    {
        var plan = await db.Bookings.AsNoTracking().Where(b => b.Id == bookingId)
            .Select(b => new { b.DesignRequestId, b.TourId, TourVersion = b.TourVersion }).SingleAsync(ct);
        if (plan.DesignRequestId.HasValue)
        {
            var snapshot = await db.BookingQuotations.AsNoTracking().Where(q => q.BookingId == bookingId)
                .OrderByDescending(q => q.Version).FirstOrDefaultAsync(ct);
            Require(snapshot == null || (snapshot.Status != "Superseded" && snapshot.TourId == plan.TourId && snapshot.TourVersion == plan.TourVersion),
                "Phương án tour đã thay đổi. Khách cần xác nhận lại phương án và cập nhật booking.");
        }

    }

    public async Task ValidatePayment(int bookingId, CancellationToken ct)
    {
        var booking = await db.Bookings.AsNoTracking().SingleAsync(b => b.Id == bookingId, ct);
        // Provider replies are operational tracking, independent of approval/payment.
        // A booking is checked against its own captured version, never a later Agency draft.
        if (booking.PaymentStatus == PaymentStatus.Unpaid)
            await RequireCurrentPlan(bookingId, ct);
    }
}
