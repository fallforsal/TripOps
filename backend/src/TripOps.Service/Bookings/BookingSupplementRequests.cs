using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Bookings;

public sealed record SupplementReplacementInput([Range(1,int.MaxValue)] int? ServiceId,
    [Required,StringLength(500,MinimumLength=3)] string Reason, [Range(1,int.MaxValue)] int? AgencySupplierId = null);

public sealed partial class BookingQuotationService
{
    private static bool LastProviderDecisionWasReject(BookingSupplierRequest request) {
        if(string.IsNullOrWhiteSpace(request.ResponseHistoryJson))return false;
        try {
            var history=JsonSerializer.Deserialize<JsonElement[]>(request.ResponseHistoryJson,Json)??[];
            foreach(var entry in history.Reverse())
                if(entry.TryGetProperty("input",out var input) && input.TryGetProperty("decision",out var decision))
                    return decision.GetString()=="reject";
        } catch(JsonException) { }
        return false;
    }
    private static int[]? RosterIndices(BookingSupplierRequest r) =>
        r.ParticipantIndicesJson is null ? null : JsonSerializer.Deserialize<int[]>(r.ParticipantIndicesJson,Json) ?? [];
    private static IEnumerable<BookingParticipant> RequestPassengers(Booking b,BookingSupplierRequest r) {
        var indices=RosterIndices(r);var owner=BookingAlliance.OwnerOfSlot(b,r.SlotKey);
        return b.Participants.Where(p=>p.Status!="INACTIVE" && p.AgencyId==owner && (indices==null || indices.Contains(p.ParticipantIndex)));
    }
    private static string RequestCostKey(BookingSupplierRequest r) => r.ParentRequestId.HasValue?$"supplement:{r.Id}":r.SlotKey;
    private static CostLine RequestCost(BookingSupplierRequest r) => new(RequestCostKey(r),r.AgencySupplierId.HasValue?"AGENCY_SUPPLIER":"PLATFORM_PARTNER",r.ServiceName,r.Quantity,r.Unit,
        r.Quantity>0?r.EstimatedCost/r.Quantity:0,r.Quantity>0?(r.QuotedCost??r.EstimatedCost)/r.Quantity:0,
        r.QuotedCost??r.EstimatedCost,r.Status=="Confirmed");
    private static decimal RequestQuantity(Booking b,string slot,string unit,int guests) {
        if(unit is "person" or "meal")return guests;
        if(unit is "trip" or "item")return 1;
        var hotel=b.Accommodations.FirstOrDefault(h=>slot=="hotel:"+h.Id);
        var nights=Math.Max(1,hotel?.NightsCount??1);
        return unit=="person_night"?nights*guests:nights;
    }
    private static BookingSupplierRequest NewSupplement(Booking b,BookingSupplierRequest source,int? serviceId,string? provider,string name,int[] indices,string unit,decimal price) {
        var quantity=RequestQuantity(b,source.SlotKey,unit,indices.Length);
        return new BookingSupplierRequest {BookingId=b.Id,ParentRequestId=source.ParentRequestId??source.Id,
            ParticipantIndicesJson=JsonSerializer.Serialize(indices,Json),SlotKey=source.SlotKey,ServiceId=serviceId,ProviderId=provider,ServiceName=name,
            ServiceDateFrom=source.ServiceDateFrom,ServiceDateTo=source.ServiceDateTo,Quantity=quantity,Unit=unit,EstimatedCost=Money(price*quantity),
            ReplyDeadline=DateTime.UtcNow.AddHours(48)};
    }

    public async Task<ProviderRequestView> ReplaceSupplement(string actor,int bookingId,int requestId,SupplementReplacementInput input,CancellationToken ct) {
        await using var tx=await Repository.BeginPaymentChange(bookingId,ct);
        var b=await Repository.Find(bookingId,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        var old=await Db.BookingSupplierRequests.SingleOrDefaultAsync(r=>r.Id==requestId && r.BookingId==bookingId,ct)
            ??throw new BookingException(404,"Không tìm thấy yêu cầu bổ sung.");
        if(!BookingAlliance.IsMember(b,actor) || BookingAlliance.OwnerOfSlot(b,old.SlotKey)!=actor)
            throw new BookingException(403,"Chỉ Agency phụ trách dịch vụ được bố trí dịch vụ bổ sung.");
        Require(b.Status is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid,"Booking không còn cho phép thay đổi.");
        Require(old.ParentRequestId.HasValue && old.Status=="Rejected","Chỉ tìm dịch vụ khác sau khi Provider từ chối phần khách bổ sung.");
        Require(!b.RefundRequests.Any(r=>r.Reason!=BookingBilling.PriceReductionReason && r.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved),"Booking đang chờ hủy.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >=3 and <=500,"Cần nhập lý do đổi dịch vụ.");
        Require(input.ServiceId.HasValue != input.AgencySupplierId.HasValue,"Chọn một dịch vụ trên sàn hoặc nhà cung cấp trong danh bạ.");
        var category=old.SlotKey.StartsWith("hotel:")?ServiceCategory.Hotel:ServiceCategory.Fnb;
        TripOps.Data.Entities.Service? service=null;AgencySupplier? supplier=null;
        if(input.ServiceId.HasValue) {
            Require(input.ServiceId!=old.ServiceId,"Hãy chọn dịch vụ khác.");
            service=await Db.Services.Include(s=>s.Provider).ThenInclude(u=>u.BusinessProfile).SingleOrDefaultAsync(s=>s.Id==input.ServiceId && s.Category==category &&
                s.Status==ServiceStatus.Approved && !s.IsPaused && s.Provider.Status==UserStatus.Active && s.Provider.BusinessProfile!=null && s.Provider.BusinessProfile.Status==BusinessProfileStatus.Approved,ct)
                ??throw new BookingException(422,"Dịch vụ thay thế không khả dụng hoặc sai loại.");
        } else {
            var type=category==ServiceCategory.Hotel?AgencySupplier.Hotel:AgencySupplier.Restaurant;
            supplier=await Db.AgencySuppliers.SingleOrDefaultAsync(s=>s.Id==input.AgencySupplierId && s.AgencyId==actor && s.Status==AgencySupplier.Active && s.SupplierType==type,ct)
                ??throw new BookingException(422,"Nhà cung cấp không thuộc danh bạ đang hoạt động của Agency hoặc sai loại.");
        }
        var indices=RequestPassengers(b,old).Select(p=>p.ParticipantIndex).Distinct().ToArray();
        Require(indices.Length>0,"Không còn khách bổ sung đang tham gia chặng này.");
        var name=service?.Name??supplier!.Name;
        old.Status="Superseded";
        var next=NewSupplement(b,old,service?.Id,service?.ProviderId,name,indices,service?.PriceUnit??(category==ServiceCategory.Hotel?"person_night":"meal"),service?.Price??supplier?.ReferencePrice??0);
        next.ParentRequestId=old.Id;
        next.AgencySupplierId=supplier?.Id;
        if(supplier!=null) { next.Status="External";next.ReplyDeadline=null;next.Note="Agency tự liên hệ và xác nhận với nhà cung cấp riêng. "+input.Reason.Trim(); }
        Db.BookingSupplierRequests.Add(next);
        if(service!=null) Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=service.ProviderId,BookingId=bookingId,
            Message=$"Booking {b.BookingCode}: yêu cầu dịch vụ mới cho {indices.Length} khách tại {name}. {input.Reason.Trim()}"});
        NotifyAgencies(b,$"Đã gửi yêu cầu mới cho {indices.Length} khách bổ sung tại {name}; khách cũ giữ nguyên dịch vụ.",[actor]);
        Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=b.CustomerId!,BookingId=bookingId,
            Message=$"Agency đang bố trí {name} cho {indices.Length} khách bổ sung; dịch vụ đã xác nhận cho khách cũ không thay đổi."});
        await Db.SaveChangesAsync(ct);
        var latest=await Db.BookingQuotations.Where(q=>q.BookingId==bookingId).OrderByDescending(q=>q.Version).FirstAsync(ct);
        var lines=Lines(latest);lines.RemoveAll(l=>l.SlotKey==RequestCostKey(old));lines.Add(RequestCost(next));
        latest.Status="Superseded";
        Db.BookingQuotations.Add(new BookingQuotation {BookingId=bookingId,Version=latest.Version+1,TourId=latest.TourId,TourVersion=latest.TourVersion,
            EstimatedSale=b.TotalAmount,NumberOfGuests=BookingAlliance.GuestCount(b),PlanSnapshotJson=PlanSnapshot(b),LinesJson=JsonSerializer.Serialize(lines,Json),
            TotalCost=lines.Sum(l=>l.Total),Reason=$"Đổi dịch vụ riêng cho khách bổ sung: {input.Reason.Trim()}"});
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
        return (await AgencyRequests(actor,bookingId,ct)).Single(r=>r.Id==next.Id);
    }
}
