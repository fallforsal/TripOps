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
    decimal ExpectedTotal, Guid RequestId,string[]? AgencyIds=null);
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
    private async Task RefreshStageRoster(Booking b,string[] affected,string reason,CancellationToken ct) {
        BookingAlliance.SetPrimary(b);MarkAmended(b);
        var requests=await Db.BookingSupplierRequests.Where(r=>r.BookingId==b.Id && r.Status!="Superseded").ToListAsync(ct);
        foreach(var r in requests.Where(r=>affected.Contains(BookingAlliance.OwnerOfSlot(b,r.SlotKey)))) {
            var count=BookingAlliance.GuestCount(b,BookingAlliance.OwnerOfSlot(b,r.SlotKey));
            var unitCost=r.Quantity>0?r.EstimatedCost/r.Quantity:0;
            if(r.Unit is "person" or "meal")r.Quantity=count;
            if(r.Unit=="person_night") {
                var hotel=b.Accommodations.SingleOrDefault(h=>r.SlotKey=="hotel:"+h.Id);
                r.Quantity=count*Math.Max(1,hotel?.NightsCount??1);
            }
            r.EstimatedCost=Money(unitCost*r.Quantity);r.Status=count==0?"Cancelled":"Pending";
            r.QuotedCost=null;r.PriceConfirmed=false;r.AvailabilityConfirmed=false;r.AvailableQuantity=null;r.HoldUntil=null;r.RespondedAt=null;r.ReplyDeadline=DateTime.UtcNow.AddHours(48);
            Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=r.ProviderId,BookingId=b.Id,Message="Danh sách khách tham gia chặng đã thay đổi. Vui lòng kiểm tra lại dịch vụ "+r.ServiceName});
        }
        var latest=await Db.BookingQuotations.Where(q=>q.BookingId==b.Id).OrderByDescending(q=>q.Version).FirstAsync(ct);
        var lines=Lines(latest).Select(l=> {var r=requests.FirstOrDefault(r=>r.SlotKey==l.SlotKey);return r==null?l:l with {Quantity=r.Quantity,Total=r.EstimatedCost,Confirmed=r.Status=="Confirmed"};}).ToList();
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
                Gender=input.Gender,IdentityNumber=identity,RoommateNote=input.RoommateNote?.Trim(),RestaurantNote=input.RestaurantNote?.Trim(),Note=input.Note?.Trim(),TierName=tier?.Name??(age<12?"Trẻ em":"Người lớn"),
                Price=b.BookingAgencies.Count>1?Money(tier!.PricePerGuest):input.TicketPrice,Status="ACTIVE"};
            b.Participants.Add(row);await ChargeStage(b,actor,row,"Bổ sung "+row.FullName+": "+input.Reason.Trim(),input.RequestId,ct);
        }
        await RefreshStageRoster(b,selected,"Bổ sung "+input.FullName.Trim()+": "+input.Reason.Trim(),ct);
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
        await RefreshStageRoster(b,changed,"Cập nhật chặng tham gia của "+person.FullName+": "+input.Reason.Trim(),ct);
        await Db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
}
