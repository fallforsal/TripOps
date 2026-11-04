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
    DateTime? SentAt, DateTime? AcceptedAt);
public sealed record ProviderRequestView(int Id, int BookingId, int ServiceId, string SlotKey,
    string ServiceName, DateTime? ServiceDateFrom, DateTime? ServiceDateTo,
    decimal Quantity, string Unit, decimal EstimatedCost, decimal? QuotedCost, string Status, string? Note);
public sealed record ProviderReply(string Decision, decimal? QuotedCost, string? Note);
public sealed record AgencyCostInput(string SlotKey, decimal UnitCost);
public sealed record ExtraCostInput(string Name, decimal Quantity, string Unit, decimal UnitCost);
public sealed record AgencyQuotationInput(decimal AgencyProfit, AgencyCostInput[] AgencyCosts, string Reason,
    ExtraCostInput[]? ExtraCosts = null);
public sealed record BookingPlanChange(int TourId, HotelChoiceInput[]? HotelChoices = null,
    MealChoiceInput[]? MealChoices = null, string? SpecialRequests = null,
    DateTime? StartDate = null, ParticipantInput[]? Participants = null);

public sealed class BookingQuotationService(TripOpsDbContext db)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
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
        agency ? Lines(q) : null, q.Reason, q.CreatedAt, q.SentAt, q.AcceptedAt);

    public async Task Initialize(int bookingId, CancellationToken ct)
    {
        if (await db.BookingQuotations.AnyAsync(q => q.BookingId == bookingId, ct)) return;
        var booking = await db.Bookings.Include(b => b.Tour).Include(b => b.Participants).Include(b => b.Accommodations)
            .Include(b => b.Timelines).ThenInclude(d => d.Meals).AsSplitQuery()
            .SingleAsync(b => b.Id == bookingId, ct);
        var lines = await CaptureCosts(booking, ct);
        db.BookingQuotations.Add(new BookingQuotation { BookingId = bookingId,
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
             ServiceId: h.ServiceId, Quantity: (decimal)Math.Max(1, h.NightsCount ?? 1), Unit: "đêm",
             From: h.DateFrom, To: h.DateTo, Destination: (string?)h.Destination,
             Day: (int?)null, MealType: (string?)null))
            .Concat(booking.Timelines.SelectMany(d => d.Meals.Select(m =>
                (Key: $"meal:{m.Id}", Name: m.CustomizedRestaurantName ?? m.OriginalRestaurantName,
                 ServiceId: m.ServiceId, Quantity: (decimal)Math.Max(1, booking.Participants.Count), Unit: "suất",
                 From: m.DateService, To: m.DateService, Destination: (string?)null,
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
            var price = service?.Price ?? Reference(s.Key, s.Name, s.Destination, s.Day, s.MealType);
            lines.Add(new CostLine(s.Key, service is null ? "AGENCY_SUPPLIER" : "PLATFORM_PARTNER",
                s.Name, s.Quantity, s.Unit, price, price, price * s.Quantity));
            if (service is not null)
                db.BookingSupplierRequests.Add(new BookingSupplierRequest { BookingId = bookingId,
                    ServiceId = service.Id, ProviderId = service.ProviderId, SlotKey = s.Key,
                    ServiceName = s.Name, ServiceDateFrom = s.From, ServiceDateTo = s.To,
                    Quantity = s.Quantity, Unit = s.Unit, EstimatedCost = price * s.Quantity });
        }
        return lines;
    }
    public async Task<QuotationView> ChangePlan(string actor, int bookingId, BookingPlanChange input, CancellationToken ct,
        bool agency = false)
    {
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
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
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
                DateService = booking.StartDate.AddDays(day.DayNumber - 1) }).ToList() }).ToList();
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
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        latest.Status = "Superseded";
        var next = new BookingQuotation { BookingId = bookingId, Version = latest.Version + 1,
            TourId = tour.Id, TourVersion = tour.Version ?? 1, EstimatedSale = booking.TotalAmount,
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
        return rows.Where(q => agency || q.SentAt.HasValue)
            .Select(q => View(q, agency)).ToArray();
    }
    public async Task<IReadOnlyList<ProviderRequestView>> ProviderRequests(string actor, CancellationToken ct) =>
        await db.BookingSupplierRequests.AsNoTracking().Where(r => r.ProviderId == actor)
            .OrderByDescending(r => r.CreatedAt).Select(r => new ProviderRequestView(r.Id, r.BookingId,
                r.ServiceId, r.SlotKey, r.ServiceName, r.ServiceDateFrom, r.ServiceDateTo,
                r.Quantity, r.Unit, r.EstimatedCost, r.QuotedCost, r.Status, r.Note))
            .ToListAsync(ct);
    public async Task<IReadOnlyList<ProviderRequestView>> AgencyRequests(string actor, int bookingId, CancellationToken ct)
    {
        await Owned(actor, bookingId, true, ct);
        return await db.BookingSupplierRequests.AsNoTracking().Where(r => r.BookingId == bookingId)
            .OrderByDescending(r => r.CreatedAt).Select(r => new ProviderRequestView(r.Id, r.BookingId,
                r.ServiceId, r.SlotKey, r.ServiceName, r.ServiceDateFrom, r.ServiceDateTo,
                r.Quantity, r.Unit, r.EstimatedCost, r.QuotedCost, r.Status, r.Note))
            .ToListAsync(ct);
    }
    public async Task<ProviderRequestView> Respond(string actor, int requestId, ProviderReply input, CancellationToken ct)
    {
        var request = await db.BookingSupplierRequests.SingleOrDefaultAsync(r => r.Id == requestId && r.ProviderId == actor, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu Provider.");
        Require(request.Status == "Pending" || (request.Status == "Confirmed" && input.Decision == "confirm"),
            "Yêu cầu đã được xử lý.");
        var booking = await db.Bookings.SingleAsync(b => b.Id == request.BookingId, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid &&
            !await db.PaymentRequests.AnyAsync(p => p.BookingId == booking.Id, ct),
            "Booking đã chốt giá; Provider không thể đổi báo giá.");
        Require(input.Decision is "confirm" or "reject", "Phản hồi không hợp lệ.");
        if (input.Decision == "confirm") Require(input.QuotedCost is >= 0, "Cần nhập giá thực tế không âm.");
        Require(request.Status != "Confirmed" || request.QuotedCost != input.QuotedCost || request.Note != input.Note,
            "Giá và ghi chú không thay đổi.");
        request.Status = input.Decision == "confirm" ? "Confirmed" : "Rejected";
        request.QuotedCost = input.Decision == "confirm" ? input.QuotedCost : null;
        request.Note = input.Note?.Trim(); request.RespondedAt = DateTime.UtcNow;
        await Revise(request.BookingId, $"Provider {request.ServiceName} {request.Status.ToLowerInvariant()}", request, ct);
        return new(request.Id, request.BookingId, request.ServiceId, request.SlotKey,
            request.ServiceName, request.ServiceDateFrom, request.ServiceDateTo,
            request.Quantity, request.Unit, request.EstimatedCost, request.QuotedCost, request.Status, request.Note);
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
                Total = response.QuotedCost.Value, Confirmed = true };
        }
        latest.Status = "Superseded";
        var next = new BookingQuotation { BookingId = bookingId, Version = latest.Version + 1,
            TourId = latest.TourId, TourVersion = latest.TourVersion, EstimatedSale = latest.EstimatedSale,
            TotalCost = lines.Sum(l => l.Total), AgencyProfit = latest.AgencyProfit,
            SaleTotal = lines.Sum(l => l.Total) + latest.AgencyProfit,
            LinesJson = JsonSerializer.Serialize(lines, Json), Reason = reason };
        db.BookingQuotations.Add(next); await db.SaveChangesAsync(ct); return next;
    }
    public async Task<QuotationView> Price(string actor, int bookingId, AgencyQuotationInput input, CancellationToken ct)
    {
        var booking = await Owned(actor, bookingId, true, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid,
            "Booking đã chốt, không thể sửa báo giá trước cọc.");
        Require(input.AgencyProfit >= 0, "Lãi Agency không hợp lệ.");
        var previous = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
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
                Total = cost.UnitCost * lines[index].Quantity, Confirmed = true };
        }
        if (input.ExtraCosts is not null)
        {
            lines.RemoveAll(l => l.Source == "AGENCY_OTHER");
            lines.AddRange(input.ExtraCosts.Select((x, i) => new CostLine($"other:{i}", "AGENCY_OTHER",
                x.Name.Trim(), x.Quantity, x.Unit.Trim(), x.UnitCost, x.UnitCost,
                x.Quantity * x.UnitCost, true)));
        }
        latest.LinesJson = JsonSerializer.Serialize(lines, Json);
        latest.TotalCost = lines.Sum(l => l.Total); latest.AgencyProfit = input.AgencyProfit;
        latest.SaleTotal = latest.TotalCost + input.AgencyProfit;
        latest.Reason = input.Reason?.Trim() ?? ""; await db.SaveChangesAsync(ct);
        return View(latest, true);
    }
    public async Task<QuotationView> Send(string actor, int bookingId, CancellationToken ct)
    {
        await Owned(actor, bookingId, true, ct);
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(latest.Status == "Draft" && latest.SaleTotal > 0, "Agency cần lập báo giá hợp lệ.");
        Require(Lines(latest).All(l => l.Confirmed), "Cần xác nhận giá của mọi dịch vụ trước khi gửi báo giá.");
        Require(!await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Confirmed" && r.Status != "Superseded", ct),
            "Cần Provider xác nhận; nếu từ chối, Agency phải đổi phương án.");
        latest.Status = "Sent"; latest.SentAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct); return View(latest, true);
    }
    public async Task<QuotationView> Accept(string actor, int bookingId, int version, CancellationToken ct)
    {
        var booking = await Owned(actor, bookingId, false, ct);
        Require(booking.Status == BookingStatus.Pending && booking.PaymentStatus == PaymentStatus.Unpaid,
            "Booking đã chốt.");
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstAsync(ct);
        Require(latest.Version == version && latest.Status == "Sent", "Báo giá không còn hiệu lực.");
        latest.Status = "Accepted"; latest.AcceptedAt = DateTime.UtcNow;
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
        await db.SaveChangesAsync(ct); return View(latest, false);
    }
    public async Task RequireAccepted(int bookingId, CancellationToken ct)
    {
        var latest = await db.BookingQuotations.Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstOrDefaultAsync(ct);
        Require(latest?.Status == "Accepted" &&
            !await db.BookingSupplierRequests.AnyAsync(r => r.BookingId == bookingId && r.Status != "Confirmed" && r.Status != "Superseded", ct),
            "Cần xác nhận dịch vụ và báo giá hiện hành trước khi duyệt booking.");
    }
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
