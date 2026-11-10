using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Service.Bookings;

public sealed record BookingPriceChange(
    [Range(typeof(decimal), "1", "9999999999")] decimal NewPrice,
    [Required, StringLength(2000, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal);
public sealed record BookingSurchargeInput(
    [Range(typeof(decimal), "1", "9999999999")] decimal Amount,
    [Required, StringLength(240, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal, Guid RequestId, string? BeneficiaryAgencyId = null);
public sealed record BookingServiceChange(
    [Required, AllowedValues("hotel", "meal")] string Kind,
    [Range(1, int.MaxValue)] int ItemId,
    [Required, StringLength(2000, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal, decimal PriceDifference = 0,
    int? ServiceId = null, int? AgencySupplierId = null,
    [StringLength(255)] string? Name = null,
    SupplierSnapshotInput? Supplier = null, [Range(1, 5)] int? Stars = null);
public sealed record BookingLocationChange(
    [Range(1, int.MaxValue)] int ItemId,
    [Required, StringLength(255)] string Name,
    [Required, StringLength(2000, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal, decimal PriceDifference = 0);
public sealed record BookingPriceAdjustmentDto(int Id, string AdjustedBy, decimal PreviousTotalPrice,
    decimal AdjustmentAmount, decimal NewTotalPrice, string Reason, DateTime? CreatedAt,string? BeneficiaryAgencyId=null);

public sealed partial class BookingQuotationService
{
    public async Task<Dictionary<string, SupplierSnapshotInput>> SelectionSnapshots(int bookingId, CancellationToken ct)
    {
        var latest = await Db.BookingQuotations.AsNoTracking().Where(q => q.BookingId == bookingId)
            .OrderByDescending(q => q.Version).FirstOrDefaultAsync(ct);
        return latest is null ? [] : Lines(latest).Where(l => l.Supplier != null)
            .ToDictionary(l => l.SlotKey, l => l.Supplier!);
    }

    private async Task<Booking> Amendable(string actor, int id, decimal expectedTotal, CancellationToken ct,bool hostOnly=true)
    {
        var b = await Repository.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy booking.");
        if (!BookingAlliance.IsMember(b,actor) || (hostOnly && b.Tour?.AgencyId!=actor)) throw new BookingException(403, "Bạn không có quyền thay đổi booking này.");
        Require(b.Status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid,
            "Booking đã hủy, kết thúc hoặc đang thực hiện không thể thay đổi.");
        Require(!b.RefundRequests.Any(r => r.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved),
            "Booking đang có yêu cầu hủy, không thể thay đổi.");
        var visibleTotal=b.Tour!.AgencyId==actor?b.TotalAmount:b.BookingAgencies.Single(a=>a.AgencyId==actor).FinalAmount;
        if (visibleTotal != expectedTotal) throw new BookingException(409, "Giá booking đã thay đổi. Vui lòng tải lại trang.");
        return b;
    }

    // Amendments are recorded without resetting approval, contracts or payment deadlines.
    private static void MarkAmended(Booking b)
    {
        b.HasCustomization = true;
        b.UpdatedAt = DateTime.UtcNow;
    }

    public async Task ChangeLocation(string actor, int id, BookingLocationChange input, CancellationToken ct)
    {
        await using var tx = await Repository.BeginPaymentChange(id, ct);
        var b = await Amendable(actor, id, input.ExpectedTotal, ct,false);
        var location = b.Timelines.SelectMany(d => d.Attractions).SingleOrDefault(a => a.Id == input.ItemId)
            ?? throw new BookingException(422, "Điểm tham quan không thuộc booking.");
        if ((string.IsNullOrWhiteSpace(location.AgencyId)?b.Tour!.AgencyId:location.AgencyId) != actor)
            throw new BookingException(403,"Chỉ Agency tạo địa điểm này được thay đổi.");
        Require(location.AttendanceStatus is not ("CheckedIn" or "Skipped") &&
            !await Db.BookingAttractionCheckins.AnyAsync(c => c.BookingTimelineAttractionId == location.Id &&
                (c.AttendanceStatus == AttractionCheckinStatus.CheckedIn || c.AttendanceStatus == AttractionCheckinStatus.Skipped), ct),
            "Điểm đã được check-in hoặc bỏ qua không thể đổi.");
        Require(!string.IsNullOrWhiteSpace(input.Name) && input.Name.Trim().Length <= 255, "Cần nhập tên điểm tham quan hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >= 3 and <= 2000, "Cần nhập lý do thay đổi.");
        Require(b.Tour?.AgencyId==actor || input.PriceDifference==0,"Agency đối tác không được thay đổi giá booking.");
        Require(input.PriceDifference == Money(input.PriceDifference), "Chênh lệch giá phải là số nguyên VNĐ.");
        Require(!BookingBilling.HasBeenApproved(b) || input.PriceDifference == 0,
            "Giá tour đã khóa sau khi duyệt. Nếu phát sinh chi phí, hãy tạo phụ thu riêng.");
        var oldName = location.CurrentLocationName ?? location.OriginalLocationName;
        location.CurrentLocationName = input.Name.Trim();
        location.IsCustomized = location.CurrentLocationName != location.OriginalLocationName;
        location.CustomerNote = input.Reason.Trim();
        location.PriceDifference = (location.PriceDifference ?? 0) + input.PriceDifference;
        if (input.PriceDifference != 0)
            await ApplyPrice(b, actor, b.TotalAmount + input.PriceDifference, input.Reason.Trim(), ct);
        MarkAmended(b);
        // Keep the active plan in sync; no separate service-change history is created.
        var plan = await Db.BookingQuotations.Where(q => q.BookingId == id).OrderByDescending(q => q.Version).FirstOrDefaultAsync(ct);
        if (plan != null) { plan.PlanSnapshotJson = PlanSnapshot(b); plan.EstimatedSale = b.TotalAmount; }
        Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.CustomerId!, BookingId = id,
            Message = $"Agency đổi điểm {oldName} → {location.CurrentLocationName}. Lý do: {input.Reason.Trim()}" });
        await Db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }

    private async Task ApplyPrice(Booking b, string actor, decimal total, string reason, CancellationToken ct)
    {
        Require(total > 0 && total <= 9999999999m && total == Money(total), "Giá tour phải là số nguyên dương hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(reason) && reason.Trim().Length is >= 3 and <= 2000, "Cần nhập lý do thay đổi.");
        b.OriginalTotalPrice ??= b.TotalAmount;
        Db.BookingPriceAdjustments.Add(new BookingPriceAdjustment { BookingId = b.Id, AgencyId = actor,
            AdjustedBy = actor, PreviousTotalPrice = b.TotalAmount, Amount = total - b.TotalAmount,
            NewTotalPrice = total, Reason = reason.Trim() });
        b.TotalAmount = total;
        // Keep the host Agency's accounting amount in sync; participant ticket prices remain unchanged.
        var host = await Db.BookingAgencies.SingleOrDefaultAsync(a => a.BookingId == b.Id && a.AgencyId == actor, ct);
        if (host != null) {
            var others=await Db.BookingAgencies.Where(a=>a.BookingId==b.Id && a.AgencyId!=actor).SumAsync(a=>(decimal?)a.FinalAmount,ct)??0;
            Require(total>=others,"Giá mới không được thấp hơn số tiền đã phân bổ cho Agency đối tác.");
            host.FinalAmount=total-others;host.NetPayout=host.FinalAmount;
        }
    }

    public async Task ChangePrice(string actor, int id, BookingPriceChange input, CancellationToken ct)
    {
        await using var tx = await Repository.BeginPaymentChange(id, ct);
        var b = await Amendable(actor, id, input.ExpectedTotal, ct);
        Require(!BookingBilling.HasBeenApproved(b) && b.Status == BookingStatus.Pending && b.PaymentStatus == PaymentStatus.Unpaid,
            "Giá tour đã khóa sau khi duyệt. Nếu phát sinh chi phí, hãy tạo phụ thu riêng.");
        Require(input.NewPrice != b.TotalAmount, "Giá mới chưa thay đổi.");
        await ApplyPrice(b, actor, input.NewPrice, input.Reason, ct);
        MarkAmended(b);
        Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.CustomerId!, BookingId = id,
            Message = $"Agency điều chỉnh giá booking thành {b.TotalAmount:N0}đ. Lý do: {input.Reason.Trim()}" });
        await Db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task AddSurcharge(string actor, int id, BookingSurchargeInput input, CancellationToken ct)
    {
        await using var tx = await Repository.BeginPaymentChange(id, ct);
        Require(input.RequestId != Guid.Empty, "Thiếu mã yêu cầu phụ thu.");
        var stage = "fee:" + input.RequestId.ToString("N")[..16];
        // A retry with the same request key returns the recorded charge, without charging twice.
        var prior = await Db.PaymentRequests.AsNoTracking().SingleOrDefaultAsync(p => p.BookingId == id && p.Stage == stage, ct);
        if (prior != null) {
            var owner=await Owned(actor, id, true, ct);
            if(owner.Tour!.AgencyId!=actor)throw new BookingException(403,"Chỉ Agency chủ trì được tạo phụ thu.");
            Require(prior.Amount == input.Amount && prior.Description == "Phụ thu: " + input.Reason.Trim() && prior.BeneficiaryAgencyId==(input.BeneficiaryAgencyId??actor), "Mã yêu cầu phụ thu đã được sử dụng.");
            await tx.CommitAsync(ct); return;
        }
        var b = await Amendable(actor, id, input.ExpectedTotal, ct);
        Require(BookingBilling.HasBeenApproved(b) && b.Status != BookingStatus.Pending, "Chỉ tạo phụ thu sau khi Agency duyệt booking.");
        await AddSurchargeCore(b, actor, input, ct);
        await Db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }

    private async Task AddSurchargeCore(Booking b, string actor, BookingSurchargeInput input, CancellationToken ct)
    {
        var stage = "fee:" + input.RequestId.ToString("N")[..16];
        Require(input.Amount > 0 && input.Amount == Money(input.Amount) && input.Amount + b.TotalAmount <= 9999999999m,
            "Phụ thu phải là số nguyên dương hợp lệ.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >= 3 and <= 240, "Cần nhập lý do phụ thu (3–240 ký tự).");
        var beneficiary=input.BeneficiaryAgencyId??(b.BookingAgencies.Count<=1?actor:null);
        Require(beneficiary!=null && b.BookingAgencies.Any(a=>a.AgencyId==beneficiary),"Hãy chọn Agency trong booking nhận khoản phụ thu.");
        var allocation=b.BookingAgencies.Single(a=>a.AgencyId==beneficiary);
        Require(allocation.SettlementStatus!=SettlementStatus.Paid,"Phần tiền của Agency đã được quyết toán; không thể thêm phụ thu.");
        var now = DateTime.UtcNow;
        var lastBaseDeadline = b.PaymentRequests.Where(p => !BookingBilling.IsSurcharge(p) && p.Status != PaymentRequestStatus.Cancelled)
            .Select(p => p.DueAt ?? now).DefaultIfEmpty(now).Max();
        var due = lastBaseDeadline > now.AddHours(24) ? lastBaseDeadline : now.AddHours(24);
        b.PaymentRequests.Add(new PaymentRequest { Stage = stage, Description = "Phụ thu: " + input.Reason.Trim(),
            BeneficiaryAgencyId=beneficiary, Amount = input.Amount, Status = PaymentRequestStatus.Pending, DueAt = due,
            DueDate = TripOps.Service.Payments.PaymentRules.VietnamDate(due), CreatedBy = actor, CreatedAt = now });
        var before=b.TotalAmount;b.OriginalTotalPrice??=before;b.TotalAmount+=input.Amount;
        allocation.FinalAmount+=input.Amount;allocation.NetPayout=allocation.FinalAmount-(allocation.PlatformFee??0);
        Db.BookingPriceAdjustments.Add(new BookingPriceAdjustment {BookingId=b.Id,AgencyId=beneficiary,AdjustedBy=actor,
            PreviousTotalPrice=before,NewTotalPrice=b.TotalAmount,Amount=input.Amount,Reason="[Phụ thu] "+input.Reason.Trim()});
        var paid = b.PaymentTransactions.Where(t => t.Status == PaymentTransactionStatus.Success).Sum(t => t.Amount);
        b.PaymentStatus = paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid;
        MarkAmended(b);
        Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.CustomerId!, BookingId = b.Id,
            Message = $"Phụ thu {input.Amount:N0}đ: {input.Reason.Trim()}. Giá tour gốc không thay đổi." });
    }

    public async Task ChangeService(string actor, int id, BookingServiceChange input, CancellationToken ct)
    {
        await using var tx = await Repository.BeginPaymentChange(id, ct);
        var b = await Amendable(actor, id, input.ExpectedTotal, ct,false);
        Require(b.Tour?.AgencyId==actor || input.PriceDifference==0,"Agency đối tác không được thay đổi giá booking.");
        Require(!BookingBilling.HasBeenApproved(b) || input.PriceDifference == 0,
            "Giá tour đã khóa sau khi duyệt. Đổi dịch vụ không thay đổi giá; hãy tạo phụ thu riêng nếu phát sinh.");
        Require(input.Kind is "hotel" or "meal", "Loại dịch vụ không hợp lệ.");
        var hotel = input.Kind == "hotel" ? b.Accommodations.SingleOrDefault(h => h.Id == input.ItemId) : null;
        var meal = input.Kind == "meal" ? b.Timelines.SelectMany(d => d.Meals).SingleOrDefault(m => m.Id == input.ItemId) : null;
        Require(hotel != null || meal != null, "Dịch vụ không thuộc booking.");
        Require((hotel?.AgencyId??meal?.AgencyId??b.Tour!.AgencyId)==actor,"Bạn chỉ được đổi dịch vụ thuộc chặng của công ty mình.");
        Require(!(input.ServiceId.HasValue && input.AgencySupplierId.HasValue), "Chỉ chọn một nguồn dịch vụ.");
        var name = input.Name?.Trim(); var snapshot = input.Supplier; var stars = input.Stars;
        TripOps.Data.Entities.Service? service = null;
        if (input.ServiceId.HasValue)
        {
            var category = hotel != null ? ServiceCategory.Hotel : ServiceCategory.Fnb;
            service = await Db.Services.Include(s => s.Provider).ThenInclude(p => p.BusinessProfile)
                .SingleOrDefaultAsync(s => s.Id == input.ServiceId && s.Category == category &&
                    s.Status == ServiceStatus.Approved && !s.IsPaused && s.Provider.Status == UserStatus.Active &&
                    s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved, ct)
                ?? throw new BookingException(422, "Dịch vụ trên sàn không còn khả dụng hoặc sai phân loại.");
            name = service.Name; stars = service.StarRating;
            snapshot = new SupplierSnapshotInput(service.FullAddress ?? string.Join(", ", new[] { service.Street, service.Ward, service.Province }.Where(v => !string.IsNullOrWhiteSpace(v))),
                service.Province, ContactPhone: service.Provider.Phone, ReferencePrice: service.Price);
        }
        else if (input.AgencySupplierId.HasValue)
        {
            var type = hotel != null ? AgencySupplier.Hotel : AgencySupplier.Restaurant;
            var own = await Db.AgencySuppliers.AsNoTracking().SingleOrDefaultAsync(s => s.Id == input.AgencySupplierId &&
                s.AgencyId == actor && s.Status == AgencySupplier.Active && s.SupplierType == type, ct)
                ?? throw new BookingException(422, "Nhà cung cấp không thuộc danh bạ đang hoạt động của Agency.");
            name = own.Name; stars = own.StarRating;
            snapshot = new SupplierSnapshotInput(own.Address, own.Area, own.ContactName, own.ContactPhone, own.ReferencePrice, own.Conditions);
        }
        Require(!string.IsNullOrWhiteSpace(name) && name.Length <= 255, "Cần chọn hoặc nhập tên dịch vụ.");
        if (service == null) Require(!string.IsNullOrWhiteSpace(snapshot?.Address), "Cần nhập địa chỉ nhà cung cấp ngoài sàn.");
        var slot = $"{input.Kind}:{input.ItemId}";
        var oldName = hotel != null ? hotel.CurrentHotelName ?? hotel.OriginalHotelName : meal!.CurrentRestaurantName ?? meal.OriginalRestaurantName;
        if (hotel != null) { hotel.ServiceId = service?.Id; hotel.CurrentHotelName = name; hotel.CurrentStars = stars;
            hotel.IsCustomized = true; hotel.PriceDifference = (hotel.PriceDifference ?? 0) + input.PriceDifference; hotel.UpdatedAt = DateTime.UtcNow; }
        else { meal!.ServiceId = service?.Id; meal.CurrentRestaurantName = name; meal.IsCustomized = true;
            meal.PriceDifference = (meal.PriceDifference ?? 0) + input.PriceDifference; meal.UpdatedAt = DateTime.UtcNow; }
        foreach (var r in await Db.BookingSupplierRequests.Where(r => r.BookingId == id && r.SlotKey == slot && r.Status != "Superseded").ToListAsync(ct))
            r.Status = "Superseded";
        var unit = service?.PriceUnit ?? (hotel != null ? "person_night" : "meal");
        var guests = Math.Max(1, BookingAlliance.GuestCount(b,hotel?.AgencyId??meal?.AgencyId??actor));
        decimal quantity = hotel != null ? Math.Max(1, hotel.NightsCount ?? 1) : guests;
        if (hotel != null && (unit == "person_night" || unit == "person")) quantity *= guests;
        if (unit is "trip" or "item") quantity = 1;
        var price = snapshot?.ReferencePrice ?? 0;
        if (service != null) {
            Db.BookingSupplierRequests.Add(new BookingSupplierRequest { BookingId = id, ServiceId = service.Id,
                ProviderId = service.ProviderId, SlotKey = slot, ServiceName = name!,
                ServiceDateFrom = hotel != null ? hotel.DateFrom : meal!.Time ?? meal.DateService,
                ServiceDateTo = hotel != null ? hotel.DateTo : meal!.Time ?? meal.DateService,
                Quantity = quantity, Unit = unit, EstimatedCost = Money(price * quantity), ReplyDeadline = DateTime.UtcNow.AddHours(48) });
            Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = service.ProviderId, BookingId = id,
                Message = "Agency thay đổi dịch vụ booking, cần xác nhận lại giá và khả năng cung cấp." });
        }
        var reason = $"Đổi {oldName} → {name}. {input.Reason}";
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length >= 3, "Cần nhập lý do thay đổi.");
        if(input.PriceDifference!=0)await ApplyPrice(b, actor, b.TotalAmount + input.PriceDifference, reason[..Math.Min(reason.Length, 2000)], ct);
        MarkAmended(b);
        var latest = await Db.BookingQuotations.Where(q => q.BookingId == id).OrderByDescending(q => q.Version).FirstAsync(ct);
        var lines = Lines(latest); lines.RemoveAll(l => l.SlotKey == slot);
        lines.Add(new CostLine(slot, service == null ? SupplierSources.AgencySupplier : SupplierSources.PlatformPartner,
            name!, quantity, unit, price, price, Money(price * quantity), Supplier: snapshot));
        latest.Status = "Superseded";
        Db.BookingQuotations.Add(new BookingQuotation { BookingId = id, Version = latest.Version + 1,
            TourId = latest.TourId, TourVersion = latest.TourVersion, EstimatedSale = b.TotalAmount,
            TotalCost = lines.Sum(l => l.Total), LinesJson = JsonSerializer.Serialize(lines, Json),
            NumberOfGuests = guests, PlanSnapshotJson = PlanSnapshot(b), Reason = reason });
        Db.WorkflowNotifications.Add(new WorkflowNotification { UserId = b.CustomerId!, BookingId = id, Message = reason });
        await Db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
    }
}
