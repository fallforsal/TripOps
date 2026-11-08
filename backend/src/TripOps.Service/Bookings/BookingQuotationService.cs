using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Service.Bookings;

public sealed record CostLine(string SlotKey, string Source, string Name, decimal Quantity,
    string Unit, decimal ReferenceUnitCost, decimal UnitCost, decimal Total, bool Confirmed = false);
public sealed record QuotationView(int Id, int BookingId, int Version, int TourId, int TourVersion,
    string Status, decimal EstimatedSale, decimal? TotalCost, decimal? AgencyProfit,
    decimal SaleTotal, IReadOnlyList<CostLine>? Costs, string Reason, DateTime CreatedAt,
    DateTime? SentAt, DateTime? AcceptedAt, bool RequiresCustomerAcceptance = false, DateTime? ValidUntil = null,
    decimal DepositAmount = 0, int NumberOfGuests = 0, string? PlanSnapshotJson = null, string? PaymentPolicy = null);
public sealed record ProviderRequestView(int Id, int BookingId, int ServiceId, string SlotKey,
    string ServiceName, DateTime? ServiceDateFrom, DateTime? ServiceDateTo,
    decimal Quantity, string Unit, decimal EstimatedCost, decimal? QuotedCost, string Status, string? Note,
    DateTime? RespondedAt = null, string? ProviderId = null, string? ProviderName = null,
    string? ProviderPhone = null, string? FullAddress = null);
/// <summary>Khách trong đoàn (chỉ thông tin cần cho xếp phòng/suất ăn, không có giấy tờ tùy thân).</summary>
public sealed record ProviderGuestView(string FullName, string? Gender, string? TierName,
    string? RoommateNote, string? RestaurantNote);
/// <summary>Yêu cầu dịch vụ hiển thị cho Provider: các trường của ProviderRequestView kèm thông tin booking,
/// công ty lữ hành và đoàn khách. Booking đã hủy/từ chối thì Status = "Cancelled" để Provider biết không cần xử lý nữa.</summary>
public sealed record ProviderInboxView(int Id, int BookingId, int ServiceId, string SlotKey,
    string ServiceName, DateTime? ServiceDateFrom, DateTime? ServiceDateTo,
    decimal Quantity, string Unit, decimal EstimatedCost, decimal? QuotedCost, string Status, string? Note,
    DateTime? RespondedAt, string? ProviderId, string? ProviderName, string? ProviderPhone, string? FullAddress,
    DateTime CreatedAt, string BookingCode, string TourName,
    string AgencyName, string? AgencyPhone, string? AgencyEmail, string? MealType, string? SpecialRequests,
    string? CancelReason, DateTime? CancelledAt, IReadOnlyList<ProviderGuestView> Guests);
public sealed record ProviderReply(string Decision, decimal? QuotedCost, string? Note,
    decimal? AvailableQuantity = null, DateTime? HoldUntil = null);
public sealed record QuotationTerms(DateTime ValidUntil, string PaymentPolicy);
public sealed record QuotationDecision(string Decision, string? Message);
public sealed record CostQuantity(string SlotKey, decimal Quantity);
public sealed record AgencyCostInput(string SlotKey, decimal UnitCost);
public sealed record ExtraCostInput(string Name, decimal Quantity, string Unit, decimal UnitCost);
public sealed record AgencyQuotationInput(decimal AgencyProfit, AgencyCostInput[] AgencyCosts, string Reason,
    ExtraCostInput[]? ExtraCosts = null, decimal? SaleTotal = null, CostQuantity[]? Quantities = null);
public sealed record BookingPlanChange(int TourId, HotelChoiceInput[]? HotelChoices = null,
    MealChoiceInput[]? MealChoices = null, string? SpecialRequests = null,
    DateTime? StartDate = null, ParticipantInput[]? Participants = null);

public sealed class BookingQuotationService(TripOpsDbContext db, TripOps.Data.Repositories.BookingRepository repository)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);
    private static List<CostLine> Lines(BookingQuotation q) =>
        JsonSerializer.Deserialize<List<CostLine>>(q.LinesJson, Json) ?? [];
    private static void Require(bool condition, string message) {
        if (!condition) throw new BookingException(422, message);
    }
    private async Task<Booking> Owned(string actor, int id, bool agency, CancellationToken ct) =>
        await db.Bookings.Include(b => b.Tour).SingleOrDefaultAsync(b => b.Id == id &&
            (agency ? b.Tour!.AgencyId == actor : b.CustomerId == actor), ct)
        ?? throw new BookingException(404, "Không tìm thấy booking.");
    private static QuotationView View(BookingQuotation q, bool agency) => new(q.Id, q.BookingId,
        q.Version, q.TourId, q.TourVersion, q.Status, q.EstimatedSale,
        agency ? q.TotalCost : null, agency ? q.AgencyProfit : null, q.SaleTotal,
        agency ? Lines(q) : null, q.Reason, q.CreatedAt, q.SentAt, q.AcceptedAt,
        ValidUntil: q.ValidUntil, DepositAmount: decimal.Round(q.SaleTotal / 2, 0, MidpointRounding.AwayFromZero),
        NumberOfGuests: q.NumberOfGuests, PlanSnapshotJson: q.PlanSnapshotJson, PaymentPolicy: q.PaymentPolicy);

    private static string PlanSnapshot(Booking b) => JsonSerializer.Serialize(new {
        name = b.Tour?.Name, b.StartDate, numberOfGuests = b.Participants.Count,
        b.Tour?.Inclusions, b.Tour?.Exclusions, b.Tour?.CancellationPolicy,
        itinerary = b.Timelines.OrderBy(d => d.DayNumber).Select(d => new { d.DayNumber, d.Title, d.Description,
            activities = d.Attractions.Select(a => new { name = a.CustomizedLocationName ?? a.OriginalLocationName, a.Time }),
            meals = d.Meals.Select(m => new { m.MealType, name = m.CustomizedRestaurantName ?? m.OriginalRestaurantName, m.DateService, m.Time }) }),
        hotels = b.Accommodations.Select(h => new { name = h.CustomizedHotelName ?? h.OriginalHotelName, h.DateFrom, h.DateTo, h.NightsCount })
    }, Json);
    public async Task Initialize(int bookingId, CancellationToken ct)
    {
        if (await db.BookingQuotations.AnyAsync(q => q.BookingId == bookingId, ct)) return;
        var booking = await db.Bookings.Include(b => b.Tour).Include(b => b.Participants).Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Attractions)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals).AsSplitQuery()
            .SingleAsync(b => b.Id == bookingId, ct);
        var lines = await CaptureCosts(booking, ct);
        db.BookingQuotations.Add(new BookingQuotation { BookingId = bookingId,
            NumberOfGuests = booking.Participants.Count, PlanSnapshotJson = PlanSnapshot(booking),
            Version = 1, TourId = booking.TourId!.Value, TourVersion = booking.Tour?.Version ?? 1,
            EstimatedSale = booking.TotalAmount, TotalCost = lines.Sum(l => l.Total),
            LinesJson = JsonSerializer.Serialize(lines, Json), Reason = "Giá dự kiến khi khách đặt tour" });
        await db.SaveChangesAsync(ct);
    }
    private async Task<List<CostLine>> CaptureCosts(Booking booking, CancellationToken ct)
    {
        var bookingId = booking.Id;
        var selections = booking.Accommodations.Select(h =>
            (Key: $"hotel:{h.Id}", Name: h.CustomizedHotelName ?? h.OriginalHotelName,
             ServiceId: h.ServiceId, Quantity: (decimal)Math.Max(1, h.NightsCount ?? 1), Unit: "room_night",
             From: h.DateFrom, To: h.DateTo, Destination: (string?)h.Destination,
             Day: (int?)null, MealType: (string?)null))
            .Concat(booking.Timelines.SelectMany(d => d.Meals.Select(m =>
                (Key: $"meal:{m.Id}", Name: m.CustomizedRestaurantName ?? m.OriginalRestaurantName,
                 ServiceId: m.ServiceId, Quantity: (decimal)Math.Max(1, booking.Participants.Count), Unit: "meal",
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
                ? tour.Accommodations.FirstOrDefault(h => h.DestinationName == destination && h.HotelName == name)?.SupplierSnapshot
                : tour.Timelines.Where(d => d.DayNumber == day).SelectMany(d => d.Meals)
                    .FirstOrDefault(m => m.MealType == mealType && m.RestaurantName == name)?.SupplierSnapshot;
            if (raw is null) return 0;
            try { return JsonSerializer.Deserialize<SupplierSnapshotInput>(raw, Json)?.ReferencePrice ?? 0; }
            catch (JsonException) { return 0; }
        }
        var lines = new List<CostLine>();
        foreach (var s in selections)
        {
            var service = s.ServiceId.HasValue ? services.GetValueOrDefault(s.ServiceId.Value) : null;
            var unit = service?.PriceUnit ?? s.Unit;
            var quantity = unit is "person" or "meal" ? Math.Max(1, booking.Participants.Count) : unit is "trip" or "item" ? 1 : s.Quantity;
            var price = service?.Price ?? Reference(s.Key, s.Name, s.Destination, s.Day, s.MealType);
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
    public async Task<QuotationView> ChangePlan(string actor, int bookingId, BookingPlanChange input, CancellationToken ct,
        bool agency = false)
    {
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);
        var booking = await db.Bookings.Include(b => b.Participants).Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals)
            .Include(b => b.Timelines).ThenInclude(d => d.Attractions).Include(b => b.Tour)
            .AsSplitQuery().SingleOrDefaultAsync(b => b.Id == bookingId &&
                (agency ? b.Tour!.AgencyId == actor : b.CustomerId == actor), ct)
            ?? throw new BookingException(404, "Không tìm thấy booking.");
        var previouslyApproved = booking.Status == BookingStatus.Confirmed;
        Require((booking.Status == BookingStatus.Pending || previouslyApproved) &&
            booking.PaymentStatus == PaymentStatus.Unpaid &&
            !await db.PaymentTransactions.AnyAsync(p => p.BookingId == bookingId &&
                (p.Status == null || p.Status == PaymentTransactionStatus.Pending ||
                 p.Status == PaymentTransactionStatus.Success), ct) &&
            !await db.PaymentRequests.AnyAsync(p => p.BookingId == bookingId &&
                p.Status == PaymentRequestStatus.Paid, ct) &&
            (!await db.PaymentRequests.AnyAsync(p => p.BookingId == bookingId, ct) || previouslyApproved),
            "Chỉ được đổi phương án trước khi cọc; giao dịch payOS đang xử lý phải hoàn tất trước.");
        var tour = await db.Tours.Include(t => t.PricingTiers).Include(t => t.Accommodations)
            .Include(t => t.Timelines).ThenInclude(d => d.Meals)
            .Include(t => t.Timelines).ThenInclude(d => d.Attractions).AsSplitQuery()
            .SingleOrDefaultAsync(t => t.Id == input.TourId && t.Status == TourStatus.Completed &&
                (booking.DesignRequestId.HasValue
                    ? t.DesignRequestId == booking.DesignRequestId && t.IsRequest == true && t.IsSharedToCustomer == true
                    : t.Id == booking.TourId && t.IsRequest != true && t.Visibility == TourVisibility.Public), ct)
            ?? throw new BookingException(422, "Tour plan không thuộc yêu cầu của bạn hoặc chưa sẵn sàng.");
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
                    h.HotelName == (current.CustomizedHotelName ?? current.OriginalHotelName))
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
                    m.RestaurantName == (current.CustomizedRestaurantName ?? current.OriginalRestaurantName))
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
            ServiceId = h.Option.ServiceId, Destination = h.Destination, OriginalHotelName = h.Option.HotelName,
            OriginalStars = h.Option.StarRating, NightsCount = h.Option.NightsCount,
            DateFrom = booking.StartDate, DateTo = booking.StartDate.AddDays(h.Option.NightsCount ?? 1),
            PriceDifference = h.Option.PriceDifference }).ToList();
        booking.Timelines = tour.Timelines.Select(day => new BookingTimeline { BookingId = bookingId,
            DayNumber = day.DayNumber, Title = day.Title ?? $"Ngày {day.DayNumber}", Description = day.Description,
            Attractions = day.Attractions.Select(a => new BookingTimelineAttraction {
                AgencyId = a.AgencyId ?? tour.AgencyId, OriginalLocationName = a.Name ?? "",
                Time = a.Time.HasValue ? booking.StartDate.AddDays(day.DayNumber - 1).Add(a.Time.Value.TimeOfDay) : null
            }).ToList(),
            Meals = meals.Where(m => m.Day == day.DayNumber).Select(m => new BookingTimelineMeal {
                MealType = m.Option.MealType, OriginalRestaurantName = m.Option.RestaurantName,
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
            NumberOfGuests = booking.Participants.Count, PlanSnapshotJson = PlanSnapshot(booking),
            TotalCost = lines.Sum(l => l.Total), LinesJson = JsonSerializer.Serialize(lines, Json),
            Reason = "Khách đổi Tour plan hoặc phương án dịch vụ" };
        db.BookingQuotations.Add(next);
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return View(next, agency);
    }

    public async Task<IReadOnlyList<QuotationView>> Quotations(string actor, int bookingId, bool agency, CancellationToken ct)
    {
        await Owned(actor, bookingId, agency, ct);
        var rows = await db.BookingQuotations.AsNoTracking().Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).ToListAsync(ct);
        var requiresAcceptance = await RequiresAcceptance(bookingId, ct);
        return rows.Where(q => agency || q.SentAt.HasValue)
            .Select(q => View(q, agency) with { RequiresCustomerAcceptance = requiresAcceptance }).ToArray();
    }
    private IQueryable<ProviderRequestView> RequestViews(IQueryable<BookingSupplierRequest> requests) =>
        from r in requests
        join service in db.Services.AsNoTracking() on r.ServiceId equals service.Id
        select new ProviderRequestView(r.Id, r.BookingId, r.ServiceId, r.SlotKey, r.ServiceName,
            r.ServiceDateFrom, r.ServiceDateTo, r.Quantity, r.Unit, r.EstimatedCost, r.QuotedCost,
            r.Status, r.Note, r.RespondedAt, r.ProviderId,
            service.Provider.BusinessProfile != null ? service.Provider.BusinessProfile.BusinessName : service.Provider.Name,
            service.Provider.Phone, service.FullAddress);

    public async Task<IReadOnlyList<ProviderInboxView>> ProviderRequests(string actor, CancellationToken ct)
    {
        // Yêu cầu đã bị thay thế (đổi kế hoạch) không còn hiệu lực nên không hiện cho Provider.
        var views = (await RequestViews(db.BookingSupplierRequests.AsNoTracking()
                .Where(r => r.ProviderId == actor && r.Status != "Superseded")).ToListAsync(ct))
            .ToDictionary(v => v.Id);
        var ids = views.Keys.ToArray();
        var rows = await db.BookingSupplierRequests.AsNoTracking().Where(r => ids.Contains(r.Id))
            .Include(r => r.Booking).ThenInclude(b => b.Tour!).ThenInclude(t => t.Agency)
            .Include(r => r.Booking).ThenInclude(b => b.Participants)
            .AsSplitQuery().OrderByDescending(r => r.CreatedAt).ToListAsync(ct);
        var mealIds = rows.Select(r => r.SlotKey.StartsWith("meal:", StringComparison.Ordinal) &&
                int.TryParse(r.SlotKey.AsSpan(5), out var id) ? id : 0).Where(id => id > 0).Distinct().ToArray();
        var mealTypes = await db.BookingTimelineMeals.AsNoTracking().Where(m => mealIds.Contains(m.Id))
            .ToDictionaryAsync(m => $"meal:{m.Id}", m => m.MealType, ct);
        return rows.Select(r =>
        {
            var v = views[r.Id];
            var b = r.Booking;
            var closed = b.Status is BookingStatus.Cancelled or BookingStatus.Rejected;
            return new ProviderInboxView(v.Id, v.BookingId, v.ServiceId, v.SlotKey, v.ServiceName,
                v.ServiceDateFrom, v.ServiceDateTo, v.Quantity, v.Unit, v.EstimatedCost, v.QuotedCost,
                closed ? "Cancelled" : v.Status, v.Note, v.RespondedAt, v.ProviderId, v.ProviderName,
                v.ProviderPhone, v.FullAddress, r.CreatedAt, b.BookingCode,
                b.Tour?.Name ?? "Tour", b.Tour?.Agency?.Name ?? "Công ty lữ hành", b.Tour?.Agency?.Phone,
                b.Tour?.Agency?.Email, mealTypes.GetValueOrDefault(r.SlotKey), b.SpecialRequests,
                closed ? b.CancelReason : null, closed ? b.CancelledAt : null,
                b.Participants.Where(p => p.Status != "INACTIVE").OrderBy(p => p.ParticipantIndex)
                    .Select(p => new ProviderGuestView(p.FullName, p.Gender, p.TierName, p.RoommateNote, p.RestaurantNote))
                    .ToArray());
        }).ToArray();
    }
    public async Task<IReadOnlyList<ProviderRequestView>> AgencyRequests(string actor, int bookingId, CancellationToken ct)
    {
        await Owned(actor, bookingId, true, ct);
        return await RequestViews(db.BookingSupplierRequests.AsNoTracking().Where(r => r.BookingId == bookingId)
            .OrderByDescending(r => r.CreatedAt))
            .ToListAsync(ct);
    }
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
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid &&
            !await db.PaymentRequests.AnyAsync(p => p.BookingId == booking.Id, ct),
            "Booking đã chốt giá; Provider không thể đổi báo giá.");
        Require(!await db.BookingQuotations.AnyAsync(q => q.BookingId == booking.Id && q.Status == "Accepted", ct), "Báo giá đã được khách chấp nhận; không thể đổi xác nhận.");
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
        var agencyId = await db.Bookings.Where(b => b.Id == request.BookingId).Select(b => b.Tour!.AgencyId).SingleAsync(ct);
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = agencyId, BookingId = request.BookingId, Message = $"Provider phản hồi: {request.ServiceName} — {request.Status}" });
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
    public async Task<QuotationView> Price(string actor, int bookingId, AgencyQuotationInput input, CancellationToken ct)
    {
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);

        var booking = await Owned(actor, bookingId, true, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid,
            "Booking đã chốt, không thể sửa báo giá trước cọc.");
        Require(input.Reason == null || input.Reason.Length <= 1000, "Lý do báo giá quá dài.");
        Require(input.AgencyProfit >= 0 && input.AgencyProfit <= 9999999999m, "Lãi Agency không hợp lệ.");
        var previous = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(previous.Status != "Accepted" && previous.Status != "Superseded" && previous.TourVersion == booking.Tour!.Version, "Cần khách xem lại phiên bản Plan trước khi lập báo giá.");
        var available = Lines(previous);
        Require((input.AgencyCosts ?? []).All(cost => cost.UnitCost >= 0 &&
            available.Any(l => l.SlotKey == cost.SlotKey && l.Source == "AGENCY_SUPPLIER")),
            "Chỉ Agency mới được nhập chi phí supplier riêng.");
        Require((input.ExtraCosts ?? []).All(x => !string.IsNullOrWhiteSpace(x.Name) &&
            x.Name.Length <= 255 && x.Unit.Length <= 30 && x.Quantity > 0 && x.UnitCost >= 0),
            "Chi phí phát sinh cần tên, số lượng và đơn giá hợp lệ.");
        var latest = await Revise(bookingId, "Agency cập nhật giá", null, ct);
        var lines = Lines(latest);
        foreach (var cost in input.AgencyCosts ?? [])
        {
            var index = lines.FindIndex(l => l.SlotKey == cost.SlotKey && l.Source == "AGENCY_SUPPLIER");
            lines[index] = lines[index] with { UnitCost = cost.UnitCost,
                Total = Money(cost.UnitCost * lines[index].Quantity), Confirmed = true };
        }
        if (input.ExtraCosts is not null)
        {
            lines.RemoveAll(l => l.Source == "AGENCY_OTHER");
            lines.AddRange(input.ExtraCosts.Select((x, i) => new CostLine($"other:{i}", "AGENCY_OTHER",
                x.Name.Trim(), x.Quantity, x.Unit.Trim(), x.UnitCost, x.UnitCost,
                Money(x.Quantity * x.UnitCost), true)));
        }
        foreach (var change in input.Quantities ?? [])
        {
            Require(change.Quantity > 0 && change.Quantity <= 1000000, "Số lượng dịch vụ không hợp lệ.");
            var i = lines.FindIndex(l => l.SlotKey == change.SlotKey);
            Require(i >= 0, "Không tìm thấy hạng mục chi phí.");
            if (lines[i].Quantity == change.Quantity) continue;
            var r = await db.BookingSupplierRequests.SingleOrDefaultAsync(r => r.BookingId == bookingId && r.SlotKey == change.SlotKey && r.Status != "Superseded", ct);
            lines[i] = lines[i] with { Quantity = change.Quantity, Total = Money(change.Quantity * lines[i].UnitCost), Confirmed = r == null };
            if (r != null)
            {
                r.Quantity = change.Quantity; r.EstimatedCost = lines[i].Total;
                r.Status = "Pending"; r.QuotedCost = null; r.PriceConfirmed = false; r.AvailabilityConfirmed = false;
                r.HoldUntil = null; r.AvailableQuantity = null; r.ReplyDeadline = DateTime.UtcNow.AddHours(48);
                db.WorkflowNotifications.Add(new WorkflowNotification { UserId = r.ProviderId, BookingId = bookingId, Message = "Agency đổi số lượng, cần xác nhận lại dịch vụ." });
            }
        }
        latest.LinesJson = JsonSerializer.Serialize(lines, Json);
        latest.TotalCost = lines.Sum(l => l.Total); latest.AgencyProfit = input.AgencyProfit;
        Require(input.SaleTotal is null || input.SaleTotal > 0, "Tổng giá bán phải dương.");
        latest.SaleTotal = decimal.Round(input.SaleTotal ?? (latest.TotalCost + input.AgencyProfit), 0, MidpointRounding.AwayFromZero);
        Require(latest.SaleTotal <= 9999999999m && latest.TotalCost <= 9999999999m, "Giá vượt giới hạn lưu trữ của hệ thống.");
        latest.AgencyProfit = latest.SaleTotal - latest.TotalCost;
        latest.Reason = input.Reason?.Trim() ?? ""; await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct); return View(latest, true);
    }
    public async Task<QuotationView> Send(string actor, int bookingId, CancellationToken ct)
    {
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);

        var booking = await Owned(actor, bookingId, true, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid, "Booking đã chốt.");
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(latest.Status == "Draft" && latest.SaleTotal > 0, "Agency cần lập báo giá hợp lệ.");
        Require(Lines(latest).All(l => l.Confirmed), "Cần xác nhận giá của mọi dịch vụ trước khi gửi báo giá.");
        Require(!await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && (r.Status != "Superseded" && (r.Status != "Confirmed" || (r.HoldUntil.HasValue && r.HoldUntil <= DateTime.UtcNow))), ct),
            "Cần Provider xác nhận; nếu từ chối, Agency phải đổi phương án.");
        Require(latest.TourVersion == booking.Tour!.Version && latest.TourId == booking.TourId, "Plan đã thay đổi.");
        latest.ValidUntil ??= DateTime.UtcNow.AddDays(3);
        Require(latest.ValidUntil > DateTime.UtcNow, "Hạn báo giá không hợp lệ.");
        latest.Status = "Sent"; latest.SentAt = DateTime.UtcNow;
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = booking.CustomerId!, BookingId = bookingId, Message = "Agency đã gửi báo giá chính thức. Cọc 50% theo giá cuối cùng." });
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return View(latest, true);
    }
    public async Task<QuotationView> Accept(string actor, int bookingId, int version, CancellationToken ct)
    {
        await using var transaction = await repository.BeginPaymentChange(bookingId, ct);

        var booking = await Owned(actor, bookingId, false, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid,
            "Booking đã chốt.");
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(latest.Version == version && latest.Status == "Sent", "Báo giá không còn hiệu lực.");
        Require(latest.ValidUntil > DateTime.UtcNow, "Báo giá đã hết hạn.");
        Require(!await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Superseded" &&
            (r.Status != "Confirmed" || (r.HoldUntil.HasValue && r.HoldUntil <= DateTime.UtcNow)), ct), "Xác nhận Provider không còn hợp lệ.");
        Require(booking.TourId == latest.TourId && booking.Tour!.Version == latest.TourVersion, "Plan đã thay đổi.");
        latest.Status = "Accepted"; latest.AcceptedAt = DateTime.UtcNow;
        booking.AcceptedQuotationId = latest.Id;
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = booking.Tour!.AgencyId, BookingId = bookingId, Message = "Khách đã chấp nhận báo giá chính thức." });
        var people = await db.BookingParticipants.Where(p => p.BookingId == bookingId)
            .OrderBy(p => p.ParticipantIndex).ToListAsync(ct);
        var previousTotal = people.Sum(p => p.Price);
        var allocated = 0m;
        for (var i = 0; i < people.Count; i++)
        {
            var amount = i == people.Count - 1 ? latest.SaleTotal - allocated :
                decimal.Round(latest.SaleTotal * (previousTotal > 0 ? people[i].Price / previousTotal : 1m / people.Count), 0);
            people[i].Price = amount; allocated += amount;
        }
        booking.TotalAmount = latest.SaleTotal;
        foreach (var agency in await db.BookingAgencies.Where(a => a.BookingId == bookingId && a.IsHost == true).ToListAsync(ct))
        {
            agency.FinalAmount = latest.SaleTotal;
            agency.NetPayout = latest.SaleTotal;
        }
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct); return View(latest, false);
    }
    public async Task<QuotationView> SetTerms(string actor, int bookingId, QuotationTerms input, CancellationToken ct)
    {
        await using var tx = await repository.BeginPaymentChange(bookingId, ct);
        await Owned(actor, bookingId, true, ct);
        var q = await db.BookingQuotations.Where(q => q.BookingId == bookingId).OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(q.Status == "Draft", "Chỉ sửa điều khoản bản nháp.");
        Require(input.ValidUntil > DateTime.UtcNow && input.PaymentPolicy.Length is > 0 and <= 10000, "Điều khoản hoặc hạn báo giá không hợp lệ.");
        q.ValidUntil = input.ValidUntil; q.PaymentPolicy = input.PaymentPolicy;
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return View(q, true);
    }
    public async Task<QuotationView> Decide(string actor, int bookingId, int version, QuotationDecision input, CancellationToken ct)
    {
        await using var tx = await repository.BeginPaymentChange(bookingId, ct);
        var b = await Owned(actor, bookingId, false, ct);
        Require(b.Status == BookingStatus.Pending && b.PaymentStatus == PaymentStatus.Unpaid, "Booking đã chốt.");
        var q = await db.BookingQuotations.Where(q => q.BookingId == bookingId).OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(q.Version == version && q.Status == "Sent", "Báo giá không còn hiệu lực.");
        Require(input.Decision is "reject" or "revise", "Thao tác không hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(input.Message) && input.Message.Length <= 2000, "Cần ghi rõ lý do.");
        q.Status = input.Decision == "reject" ? "Rejected" : "Superseded";
        if (input.Decision == "revise")
        {
            Require(b.DesignRequestId.HasValue, "Yêu cầu chỉnh sửa Plan áp dụng cho Tour thiết kế riêng.");
            db.TourPlanProposals.Add(new TourPlanProposal { RequestId = b.DesignRequestId!.Value, TourId = q.TourId,
                CustomerId = actor, AgencyId = b.Tour!.AgencyId, BaseTourVersion = q.TourVersion,
                Message = input.Message!, ProposalJson = "{}" });
            await Revise(bookingId, input.Message!, null, ct);
        }
        db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.Tour!.AgencyId, BookingId = bookingId, Message = input.Message! });
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return View(q, false);
    }
    public async Task CounterDecision(string actor, int bookingId, int requestId, bool accept, CancellationToken ct)
    {
        await using var tx = await repository.BeginPaymentChange(bookingId, ct);
        var b = await Owned(actor, bookingId, true, ct);
        Require(b.Status == BookingStatus.Pending && b.PaymentStatus == PaymentStatus.Unpaid, "Booking đã chốt.");
        var r = await db.BookingSupplierRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.BookingId == bookingId, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
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
        return new { r.PriceConfirmed, r.AvailabilityConfirmed, r.AvailableQuantity, r.HoldUntil, r.ReplyDeadline,
            Responses = JsonSerializer.Deserialize<JsonElement>(r.ResponseHistoryJson) };
    }
    public async Task ValidatePayment(int bookingId, int? quotationId, CancellationToken ct)
    {
        var b = await db.Bookings.AsNoTracking().SingleAsync(b => b.Id == bookingId, ct);
        if (!b.DesignRequestId.HasValue) return;
        if (b.PaymentStatus == PaymentStatus.Unpaid)
            Require(!await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Superseded" &&
                (r.Status != "Confirmed" || (r.HoldUntil.HasValue && r.HoldUntil <= DateTime.UtcNow)), ct), "Xác nhận Provider đã hết hiệu lực trước cọc.");
        var q = await db.BookingQuotations.AsNoTracking().Where(q => q.BookingId == bookingId).OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(q.Status == "Accepted" && q.Id == b.AcceptedQuotationId && q.Id == quotationId &&
            q.SaleTotal == b.TotalAmount && (b.PaymentStatus != PaymentStatus.Unpaid || q.ValidUntil > DateTime.UtcNow), "Phiên bản báo giá thanh toán không còn hiệu lực.");
    }
    public async Task RequireAccepted(int bookingId, CancellationToken ct)
    {
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstOrDefaultAsync(ct);
        Require(latest?.Status == "Accepted" && latest.ValidUntil > DateTime.UtcNow &&
            !await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Confirmed" && r.Status != "Superseded", ct),
            "Cần xác nhận dịch vụ và báo giá hiện hành trước khi duyệt booking.");
    }
    public async Task<bool> RequiresAcceptance(int bookingId, CancellationToken ct) =>
        await db.Bookings.AnyAsync(b => b.Id == bookingId && b.DesignRequestId.HasValue, ct) ||
        await HasPlatformRequests(bookingId, ct) || await HasAgencySuppliers(bookingId, ct);
    public Task<bool> HasPlatformRequests(int bookingId, CancellationToken ct) =>
        db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Superseded", ct);
    public async Task<bool> HasAgencySuppliers(int bookingId, CancellationToken ct)
    {
        var booking = await db.Bookings.AsNoTracking().Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals).SingleAsync(b => b.Id == bookingId, ct);
        var hotels = booking.Accommodations.Where(h => h.ServiceId == null)
            .Select(h => h.CustomizedHotelName ?? h.OriginalHotelName).ToArray();
        var meals = booking.Timelines.SelectMany(d => d.Meals).Where(m => m.ServiceId == null)
            .Select(m => m.CustomizedRestaurantName ?? m.OriginalRestaurantName).ToArray();
        return await db.TourAccommodations.AnyAsync(h => h.TourId == booking.TourId &&
            h.SupplierSource == "AGENCY_SUPPLIER" && hotels.Contains(h.HotelName), ct) ||
            await db.TourMeals.AnyAsync(m => m.TourTimeline.TourId == booking.TourId &&
                m.SupplierSource == "AGENCY_SUPPLIER" && meals.Contains(m.RestaurantName), ct);
    }
}
