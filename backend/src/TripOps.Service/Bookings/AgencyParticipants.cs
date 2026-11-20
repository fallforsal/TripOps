using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Bookings;

public sealed record AgencyParticipantInput(
    [Required, StringLength(150)] string FullName, DateTime DateOfBirth,
    [AllowedValues("Nam", "Nữ", "Khác")] string Gender,
    [StringLength(50)] string? IdentityNumber, [StringLength(2000)] string? RoommateNote,
    [StringLength(2000)] string? RestaurantNote, [StringLength(2000)] string? Note,
    [Range(typeof(decimal), "0", "9999999999")] decimal TicketPrice,
    [Required, StringLength(240, MinimumLength = 3)] string Reason,
    decimal ExpectedTotal, Guid RequestId,string[]? AgencyIds=null, [Phone, StringLength(30)] string? PhoneNumber=null);
public sealed record ParticipantStagesInput([Required] string[] AgencyIds,
    [Required,StringLength(240,MinimumLength=3)] string Reason,decimal ExpectedTotal,Guid RequestId);

public sealed partial class BookingQuotationService
{
    private static Guid StageChargeKey(Guid request,string agency) => new(SHA256.HashData(Encoding.UTF8.GetBytes(request.ToString("N")+":"+agency)).AsSpan(0,16));
    private static string[] SelectedStages(Booking b,string actor,string[]? selected) {
        var ids=selected??(b.BookingAgencies.Count==1?[actor]:[]);
        Require(ids.Distinct().Count()==ids.Length && ids.All(id=>b.BookingAgencies.Any(a=>a.AgencyId==id)),"Chặng được chọn không thuộc booking hoặc bị trùng.");
        return ids;
    }
    private async Task ChargeStage(Booking b,string actor,BookingParticipant p,string reason,Guid request,CancellationToken ct) {
        if(p.Price==0)return;
        if(BookingBilling.HasBeenApproved(b)) {
            await AddSurchargeCore(b,actor,new BookingSurchargeInput(p.Price,reason[..Math.Min(240,reason.Length)],b.TotalAmount,StageChargeKey(request,p.AgencyId),p.AgencyId),ct);
        } else {
            var old=b.TotalAmount;b.OriginalTotalPrice??=old;b.TotalAmount+=p.Price;
            var allocation=b.BookingAgencies.Single(a=>a.AgencyId==p.AgencyId);allocation.FinalAmount+=p.Price;allocation.NetPayout=allocation.FinalAmount-(allocation.PlatformFee??0);
            Db.BookingPriceAdjustments.Add(new BookingPriceAdjustment {BookingId=b.Id,AgencyId=p.AgencyId,AdjustedBy=actor,Amount=p.Price,PreviousTotalPrice=old,NewTotalPrice=b.TotalAmount,Reason=reason});
        }
    }
    private async Task RefreshStageRoster(Booking b,string[] affected,string reason,CancellationToken ct,int[]? addedIndices=null,string[]? addingAgencies=null) {
        BookingAlliance.SetPrimary(b);MarkAmended(b);
        var requests=await Db.BookingSupplierRequests.Where(r=>r.BookingId==b.Id && r.Status!="Superseded").ToListAsync(ct);
        var additions=new List<BookingSupplierRequest>();
        foreach(var r in requests.Where(r=>affected.Contains(BookingAlliance.OwnerOfSlot(b,r.SlotKey)))) {
            var owner=BookingAlliance.OwnerOfSlot(b,r.SlotKey);
            if(addedIndices is {Length:>0} && (addingAgencies==null || addingAgencies.Contains(owner))) {
                if(r.ParentRequestId.HasValue)continue;
                // Freeze legacy requests before the new people are assigned. Their confirmation remains intact.
                r.ParticipantIndicesJson??=JsonSerializer.Serialize(b.Participants.Where(p=>p.AgencyId==owner && p.Status!="INACTIVE" && !addedIndices.Contains(p.ParticipantIndex)).Select(p=>p.ParticipantIndex).Distinct().ToArray(),Json);
                var indices=b.Participants.Where(p=>p.AgencyId==owner && p.Status!="INACTIVE" && addedIndices.Contains(p.ParticipantIndex)).Select(p=>p.ParticipantIndex).Distinct().ToArray();
                if(indices.Length==0)continue;
                var extra=NewSupplement(b,r,r.ServiceId,r.ProviderId,r.ServiceName,indices,r.Unit,r.Quantity>0?r.EstimatedCost/r.Quantity:0);
                additions.Add(extra);Db.BookingSupplierRequests.Add(extra);
                if(r.ProviderId!=null) Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=r.ProviderId,BookingId=b.Id,Message=$"Booking {b.BookingCode}: đề nghị bổ sung {indices.Length} khách cho {r.ServiceName}. Chỉ xác nhận/báo giá phần bổ sung; giữ nguyên dịch vụ đã xác nhận cho khách cũ."});
            } else {
                var before=RosterIndices(r);
                var active=RequestPassengers(b,r).Select(p=>p.ParticipantIndex).Distinct().ToArray();
                if(before!=null && before.Order().SequenceEqual(active.Order()))continue;
                r.ParticipantIndicesJson=JsonSerializer.Serialize(active,Json);
                if(active.Length==0)r.Status="Cancelled";
                else {var price=r.Quantity>0?r.EstimatedCost/r.Quantity:0;r.Quantity=RequestQuantity(b,r.SlotKey,r.Unit,active.Length);r.EstimatedCost=Money(price*r.Quantity);}
                if(r.ProviderId!=null) Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=r.ProviderId,BookingId=b.Id,Message=$"Booking {b.BookingCode}: danh sách phục vụ {r.ServiceName} đã giảm/cập nhật, còn {active.Length} khách. {reason}"});
            }
        }
        await Db.SaveChangesAsync(ct); // Obtain supplementary IDs inside the enclosing transaction.
        var latest=await Db.BookingQuotations.Where(q=>q.BookingId==b.Id).OrderByDescending(q=>q.Version).FirstAsync(ct);
        var all=requests.Concat(additions).ToArray();
        var lines=Lines(latest);
        foreach(var r in all) {
            var key=RequestCostKey(r);var prior=lines.FirstOrDefault(l=>l.SlotKey==key);
            if(r.Status=="Cancelled") {lines.RemoveAll(l=>l.SlotKey==key);continue;}
            if(r.ParentRequestId.HasValue && prior==null)lines.Add(RequestCost(r));
            else if(prior!=null && addedIndices==null) {var i=lines.IndexOf(prior);var next=RequestCost(r);lines[i]=prior with {Quantity=next.Quantity,UnitCost=next.UnitCost,Total=next.Total,Confirmed=next.Confirmed};}
        }
        latest.Status="Superseded";
        Db.BookingQuotations.Add(new BookingQuotation {BookingId=b.Id,Version=latest.Version+1,TourId=latest.TourId,TourVersion=latest.TourVersion,
            EstimatedSale=b.TotalAmount,NumberOfGuests=BookingAlliance.GuestCount(b),PlanSnapshotJson=PlanSnapshot(b),LinesJson=JsonSerializer.Serialize(lines,Json),TotalCost=lines.Sum(l=>l.Total),Reason=reason});
        NotifyAgencies(b,reason,affected);Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=b.CustomerId!,BookingId=b.Id,Message=reason});
    }
    public async Task AddParticipant(string actor,int id,AgencyParticipantInput input,CancellationToken ct) {
        await using var tx=await Repository.BeginPaymentChange(id,ct);
        Require(input.RequestId!=Guid.Empty,"Thiếu mã yêu cầu thêm hành khách.");
        var prior=await Db.BookingParticipants.AsNoTracking().Where(p=>p.BookingId==id && p.CreationKey==input.RequestId).ToListAsync(ct);
        if(prior.Count>0) {
            var known=await Repository.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
            if(known.Tour?.AgencyId!=actor)throw new BookingException(403,"Chỉ Agency chủ trì được thêm hành khách.");
            var ids=SelectedStages(known,actor,input.AgencyIds);
            Require(prior.All(p=>p.FullName==input.FullName.Trim() && p.DateOfBirth==input.DateOfBirth.Date) && prior.Select(p=>p.AgencyId).Order().SequenceEqual(ids.Order()) && (known.BookingAgencies.Count>1 || prior[0].Price==input.TicketPrice),"Mã yêu cầu thêm hành khách đã được sử dụng.");
            await tx.CommitAsync(ct);return;
        }
        var b=await Amendable(actor,id,input.ExpectedTotal,ct);
        var selected=SelectedStages(b,actor,input.AgencyIds);Require(selected.Length>0,"Chọn ít nhất một chặng tham gia.");
        Require(!string.IsNullOrWhiteSpace(input.FullName) && input.FullName.Trim().Length<=150,"Cần nhập họ tên hành khách.");
        Require(input.DateOfBirth.Date<=DateTime.UtcNow.Date && input.DateOfBirth.Year>=1900,"Ngày sinh không hợp lệ.");
        Require(input.TicketPrice>=0 && input.TicketPrice==Money(input.TicketPrice),"Giá vé phải là số nguyên không âm.");
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >=3 and <=240,"Cần nhập lý do bổ sung hành khách.");
        // Min/max guests apply to the initial sale, not to Agency-managed booking rosters.
        var identity=input.IdentityNumber?.Trim();Require(string.IsNullOrEmpty(identity)||!b.Participants.Any(p=>p.Status!="INACTIVE" && p.IdentityNumber==identity),"CCCD/hộ chiếu đã có trong đoàn.");
        var config=await BookingAlliance.BookedConfiguration(Db,b,ct);var age=BookingAlliance.Age(input.DateOfBirth,b.StartDate);
        var next=b.Participants.Select(p=>p.ParticipantIndex).DefaultIfEmpty(0).Max()+1;
        foreach(var agency in selected) {
            var tier=BookingAlliance.Tier(config,agency,age);
            Require(b.BookingAgencies.Count==1 || tier!=null,"Không có giá chặng phù hợp độ tuổi trong phiên bản đã đặt.");
            var row=new BookingParticipant {CreationKey=input.RequestId,AgencyId=agency,ParticipantIndex=next,IsPrimary=agency==selected[0],FullName=input.FullName.Trim(),DateOfBirth=input.DateOfBirth.Date,
                PhoneNumber=string.IsNullOrWhiteSpace(input.PhoneNumber)?null:input.PhoneNumber.Trim(),Gender=input.Gender,IdentityNumber=identity,RoommateNote=input.RoommateNote?.Trim(),RestaurantNote=input.RestaurantNote?.Trim(),Note=input.Note?.Trim(),TierName=tier?.Name??(age<12?"Trẻ em":"Người lớn"),
                Price=b.BookingAgencies.Count>1?Money(tier!.PricePerGuest):input.TicketPrice,Status="ACTIVE"};
            b.Participants.Add(row);await ChargeStage(b,actor,row,"Bổ sung "+row.FullName+": "+input.Reason.Trim(),input.RequestId,ct);
        }
        await RefreshStageRoster(b,selected,"Bổ sung "+input.FullName.Trim()+": "+input.Reason.Trim(),ct,[next]);
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
    public async Task ChangeParticipantStages(string actor,int id,int index,ParticipantStagesInput input,CancellationToken ct) {
        await using var tx=await Repository.BeginPaymentChange(id,ct);
        Require(input.RequestId!=Guid.Empty,"Thiếu mã yêu cầu thay đổi chặng.");
        var b=await Repository.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(b.Tour?.AgencyId!=actor)throw new BookingException(403,"Chỉ Agency chủ trì được thêm/bớt khách theo chặng.");
        var selected=SelectedStages(b,actor,input.AgencyIds);
        var group=b.Participants.Where(p=>p.ParticipantIndex==index).ToList();Require(group.Count>0,"Không tìm thấy hành khách.");
        if(group.Any(p=>p.CreationKey==input.RequestId)) {
            Require(group.Where(p=>p.Status!="INACTIVE").Select(p=>p.AgencyId).Order().SequenceEqual(selected.Order()),"Mã yêu cầu đã được sử dụng.");await tx.CommitAsync(ct);return;
        }
        b=await Amendable(actor,id,input.ExpectedTotal,ct);
        Require(!string.IsNullOrWhiteSpace(input.Reason) && input.Reason.Trim().Length is >=3 and <=240,"Cần nhập lý do thay đổi chặng.");
        var changed=group.Where(p=>(p.Status!="INACTIVE")!=selected.Contains(p.AgencyId)).Select(p=>p.AgencyId).Concat(selected.Where(a=>group.All(p=>p.AgencyId!=a))).Distinct().ToArray();
        var joining=selected.Where(agency=>group.All(p=>p.AgencyId!=agency || p.Status=="INACTIVE")).ToArray();
        var config=await BookingAlliance.BookedConfiguration(Db,b,ct);var person=group[0];var age=person.DateOfBirth.HasValue?BookingAlliance.Age(person.DateOfBirth.Value,b.StartDate):30;
        foreach(var agency in selected.Where(a=>group.All(p=>p.AgencyId!=a))) {
            var tier=BookingAlliance.Tier(config,agency,age)??throw new BookingException(422,"Không có giá chặng phù hợp tuổi.");
            var row=BookingAlliance.Copy(person,agency,Money(tier.PricePerGuest),false);row.CreationKey=input.RequestId;row.Status="ACTIVE";b.Participants.Add(row);
            await ChargeStage(b,actor,row,"Bổ sung chặng cho "+person.FullName+": "+input.Reason,input.RequestId,ct);
        }
        foreach(var row in group) {
            var active=selected.Contains(row.AgencyId);var wasActive=row.Status!="INACTIVE";
            if(active!=wasActive && !BookingBilling.HasBeenApproved(b)) {
                var delta=active?row.Price:-row.Price;var allocation=b.BookingAgencies.Single(a=>a.AgencyId==row.AgencyId);
                var before=b.TotalAmount;b.TotalAmount+=delta;allocation.FinalAmount+=delta;allocation.NetPayout=allocation.FinalAmount-(allocation.PlatformFee??0);
                Db.BookingPriceAdjustments.Add(new BookingPriceAdjustment {BookingId=id,AgencyId=row.AgencyId,AdjustedBy=actor,Amount=delta,PreviousTotalPrice=before,NewTotalPrice=b.TotalAmount,Reason=input.Reason.Trim()});
            }
            row.Status=active?"ACTIVE":"INACTIVE";row.StatusNote=input.Reason.Trim();row.UpdatedAt=DateTime.UtcNow;
        }
        Require(b.TotalAmount>=0,"Tổng giá booking không được âm.");
        await RefreshStageRoster(b,changed,"Cập nhật chặng tham gia của "+person.FullName+": "+input.Reason.Trim(),ct,joining.Length>0?[index]:null,joining);
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
}
