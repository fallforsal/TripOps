using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;

public sealed partial class TourService
{
    private async Task<TourDesignRequest> CollaborativeRequest(string actor, int id, CancellationToken ct, bool leadOnly = false)
    {
        await Agency(actor, ct);
        return await db.TourDesignRequests.SingleOrDefaultAsync(r => r.Id == id && (r.AgencyId == actor || (!leadOnly &&
            db.TourDesignRequestAgencies.Any(a => a.TourDesignRequestId == id && a.AgencyId == actor && a.Status == "accepted"))), ct)
            ?? throw new TourException(404, "Không tìm thấy yêu cầu hoặc bạn chưa được nhận vào liên minh.");
    }
    private async Task MutableCollaboration(TourDesignRequest request, CancellationToken ct)
    {
        Require(request.Status == CustomRequestStatus.InProgress, "Yêu cầu chưa tiếp nhận hoặc đã đóng.");
        Require(!await db.Bookings.AnyAsync(b => b.DesignRequestId == request.Id && b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected, ct), "Yêu cầu đã có booking, không thay đổi liên minh của phương án nguồn.");
    }
    public async Task<DesignCoHostDto[]> CoHosts(int id, CancellationToken ct)
    {
        var request = await db.TourDesignRequests.AsNoTracking().SingleAsync(r => r.Id == id, ct);
        var lead = await db.Users.AsNoTracking().Include(u => u.BusinessProfile).SingleAsync(u => u.Id == request.AgencyId, ct);
        var rows = await db.TourDesignRequestAgencies.AsNoTracking().Include(a => a.Agency).ThenInclude(a => a.BusinessProfile)
            .Where(a => a.TourDesignRequestId == id && !a.IsHost && a.Status != "cancelled").OrderBy(a => a.Id).ToListAsync(ct);
        return new[] {new DesignCoHostDto(lead.Id, lead.BusinessProfile?.BusinessName ?? lead.Name ?? "Agency", "lead", "accepted", [], CompanyPhone: lead.Phone, CompanyEmail: lead.Email)}
            .Concat(rows.Select(a => new DesignCoHostDto(a.AgencyId, a.Agency.BusinessProfile?.BusinessName ?? a.Agency.Name ?? "Agency", "partner", a.Status,
                [], a.StageArea, a.SuggestedBudget,
                Notes: a.CommunicationNotes, RejectionReason: a.Status == "rejected" ? a.CommunicationNotes : null, InvitedAt: a.AssignedAt, RespondedAt: a.RespondedAt, CompanyPhone: a.Agency.Phone, CompanyEmail: a.Agency.Email))).ToArray();
    }
    public async Task<DesignCoHostDto[]> GetCoHosts(string actor, int id, CancellationToken ct)
    {
        await CollaborativeRequest(actor,id,ct); return await CoHosts(id,ct);
    }
    public async Task<DesignCoHostDto[]> InviteCoHost(string actor, int id, InviteDesignCoHost input, CancellationToken ct)
    {
        ValidateObject(input);
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await LockDesignRequest(actor,id,ct);
        var request = await CollaborativeRequest(actor,id,ct,true); await MutableCollaboration(request,ct);
        Require(input.AgencyId != actor, "Hãy chọn Agency đối tác khác.");
        Require(await db.Users.AnyAsync(u => u.Id == input.AgencyId && u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active && u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved,ct), "Đối tác chưa được phê duyệt hoặc ngừng hoạt động.");
        var existing = await db.TourDesignRequestAgencies.Where(a => a.TourDesignRequestId == id).ToListAsync(ct);
        var row = existing.SingleOrDefault(a => a.AgencyId == input.AgencyId);
        Require(row == null || row.Status is "rejected" or "cancelled", "Đã có lời mời cho đối tác này.");
        row ??= new TourDesignRequestAgency {TourDesignRequestId=id,AgencyId=input.AgencyId};
        if (row.Id == 0) db.TourDesignRequestAgencies.Add(row);
        row.StageArea=input.Segment?.Trim()??""; row.IsHost=false;
        row.SuggestedBudget=input.Budget; row.CommunicationNotes=input.Notes?.Trim(); row.Status="pending";
        row.AssignedAt=DateTime.UtcNow; row.RespondedAt=null;
        db.WorkflowNotifications.Add(new WorkflowNotification {UserId=input.AgencyId,RequestId=id,Message=$"Có lời mời đồng tổ chức yêu cầu #{id}, chặng {row.StageArea}."});
        await db.SaveChangesAsync(ct); await RefreshCollaboration(request,actor,ct); await tx.CommitAsync(ct);
        return await CoHosts(id,ct);
    }
    public async Task DecideCoHost(string actor, int id, DesignCoHostDecision input, CancellationToken ct)
    {
        await Agency(actor,ct); ValidateObject(input);
        await using var tx=await db.Database.BeginTransactionAsync(ct);
        var lead=await db.TourDesignRequests.Where(r=>r.Id==id).Select(r=>r.AgencyId).SingleOrDefaultAsync(ct) ?? throw new TourException(404,"Không tìm thấy yêu cầu.");
        var row=await db.TourDesignRequestAgencies.SingleOrDefaultAsync(a=>a.TourDesignRequestId==id && a.AgencyId==actor,ct) ?? throw new TourException(404,"Không có lời mời.");
        await LockDesignRequest(lead,id,ct);
        await db.Entry(row).ReloadAsync(ct);
        var request=await db.TourDesignRequests.SingleAsync(r=>r.Id==id,ct); await MutableCollaboration(request,ct);
        Require(row.Status=="pending","Lời mời đã được phản hồi hoặc thu hồi.");
        Require(input.Action!="reject" || !string.IsNullOrWhiteSpace(input.Reason),"Hãy nhập lý do từ chối.");
        row.Status=input.Action=="accept"?"accepted":"rejected"; row.RespondedAt=DateTime.UtcNow;
        if(input.Action=="reject") row.CommunicationNotes=input.Reason!.Trim();
        db.WorkflowNotifications.Add(new WorkflowNotification {UserId=lead,RequestId=id,Message=$"Đối tác đã {(row.Status=="accepted"?"chấp nhận":"từ chối")} lời mời đồng tổ chức yêu cầu #{id}."});
        await db.SaveChangesAsync(ct); await RefreshCollaboration(request,actor,ct); await tx.CommitAsync(ct);
    }
    public async Task RemoveCoHost(string actor,int id,string partner,CancellationToken ct,bool removeContent = false)
    {
        await using var tx=await db.Database.BeginTransactionAsync(ct); await LockDesignRequest(actor,id,ct);
        var request=await CollaborativeRequest(actor,id,ct,true); await MutableCollaboration(request,ct);
        var row=await db.TourDesignRequestAgencies.SingleOrDefaultAsync(a=>a.TourDesignRequestId==id && a.AgencyId==partner,ct) ?? throw new TourException(404,"Không tìm thấy đối tác.");
        Require(!row.IsHost && partner!=request.AgencyId,"Không thể thu hồi Agency chủ trì.");
        var tourId=await db.Tours.Where(t=>t.DesignRequestId==id).Select(t=>(int?)t.Id).SingleOrDefaultAsync(ct);
        Require(row.Status!="cancelled","Đối tác đã được gỡ khỏi liên minh.");
        if(tourId.HasValue) {
            var tour=await Owned(actor,tourId.Value,ct);
            var config=Configuration(tour);
            var hasContent=(config.Timelines??[]).Any(d=>(d.Activities??[]).Any(a=>a.AgencyId==partner) ||
                (d.Meals??[]).Any(m=>m.AgencyId==partner) || (d.Accommodations??[]).Any(h=>h.AgencyId==partner));
            var hasPrice=(config.AgencyPricing??[]).Any(p=>p.AgencyId==partner && p.Tiers.Any(t=>t.PricePerGuest>0));
            Require(removeContent || !hasContent && !hasPrice,"Đối tác cần gỡ nội dung và bảng giá riêng trước khi kết thúc hợp tác.");
            if(removeContent) {
                Apply(tour,WithoutCoHost(config,partner));
                if(tour.SharedVersion.HasValue) {
                    var shared=await db.TourVersions.SingleAsync(v=>v.TourId==tour.Id && v.VersionNumber==tour.SharedVersion,ct);
                    var snapshot=JsonSerializer.Deserialize<TourSnapshot>(shared.SnapshotData,Json)!.Configuration;
                    if((snapshot.CoHosts??[]).Any(h=>h.CompanyId==partner) || HasCoHostContent(snapshot,partner)) tour.SharedVersion=null;
                }
            }
        }
        row.Status="cancelled"; row.RespondedAt=DateTime.UtcNow;
        db.WorkflowNotifications.Add(new WorkflowNotification {UserId=partner,RequestId=id,Message=$"Agency chủ trì đã thu hồi lời mời hoặc kết thúc hợp tác yêu cầu #{id}."});
        await db.SaveChangesAsync(ct); await RefreshCollaboration(request,actor,ct); await tx.CommitAsync(ct);
    }
    private static bool HasCoHostContent(TourConfiguration c,string partner) =>
        (c.Timelines??[]).Any(d=>(d.Activities??[]).Any(a=>a.AgencyId==partner) ||
            (d.Meals??[]).Any(m=>m.AgencyId==partner) || (d.Accommodations??[]).Any(h=>h.AgencyId==partner));
    private static TourConfiguration WithoutCoHost(TourConfiguration c,string partner) => c with {
        CoHosts=c.CoHosts?.Where(h=>h.CompanyId!=partner).ToArray(),
        AgencyPricing=c.AgencyPricing?.Where(p=>p.AgencyId!=partner).ToArray(),
        Timelines=c.Timelines?.Select(d=>d with {
            Activities=d.Activities?.Where(a=>a.AgencyId!=partner).ToArray(),
            Meals=d.Meals?.Where(m=>m.AgencyId!=partner).ToArray(),
            Accommodations=d.Accommodations?.Where(h=>h.AgencyId!=partner).ToArray()
        }).ToArray()
    };
    private async Task<TourConfiguration> CollaborationConfiguration(TourDesignRequest request,TourConfiguration config,CancellationToken ct)
    {
        var hosts=await CoHosts(request.Id,ct);
        var members=hosts.Where(h=>h.Status=="accepted").ToArray();
        var removed=await db.TourDesignRequestAgencies.Where(a=>a.TourDesignRequestId==request.Id && !a.IsHost && a.Status!="accepted").Select(a=>a.AgencyId).ToListAsync(ct);
        foreach(var partner in removed) config=WithoutCoHost(config,partner);
        var existingPricing=config.AgencyPricing;
        if(existingPricing==null) {
            // Quotes from the previous schema were moved to the existing Agency-owned tiers.
            var legacy=await db.TourPricingTiers.AsNoTracking().Where(t=>t.Tour.DesignRequestId==request.Id && t.AgencyId!=request.AgencyId).ToListAsync(ct);
            existingPricing=[new AgencyPricingInput(request.AgencyId!,config.PricingTiers??[]),..legacy.GroupBy(t=>t.AgencyId).Select(g=>new AgencyPricingInput(g.Key,g.Select(t=>new PricingTierInput(t.Name??"",t.MinAge,t.MaxAge,t.PricePerGuest??0,t.DisplayOrder??0)).ToArray()))];
        }
        var pricing=existingPricing
            .Where(p=>members.Any(h=>h.CompanyId==p.AgencyId)).ToList();
        foreach(var member in members.Where(h=>pricing.All(p=>p.AgencyId!=h.CompanyId))) pricing.Add(new(member.CompanyId,[]));
        var result=EnsureOwnership(config,request.AgencyId!) with {CoHosts=members,AgencyPricing=pricing.ToArray()};
        return WithTotalPricing(result,request.AgencyId!);
    }

    private async Task RefreshCollaboration(TourDesignRequest request,string actor,CancellationToken ct)
    {
        var id=await db.Tours.Where(t=>t.DesignRequestId==request.Id).Select(t=>(int?)t.Id).SingleOrDefaultAsync(ct);
        if(!id.HasValue)return;
        var tour=await Owned(request.AgencyId!,id.Value,ct); var config=await CollaborationConfiguration(request,Configuration(tour),ct);
        tour.Status=TourStatus.Draft;
        Apply(tour,config); await Save(tour,actor,"Cập nhật liên minh đồng tổ chức",ct);
    }
    public async Task<TourDto> CollaborativeTour(string actor,int id,CancellationToken ct)
    {
        var request=await CollaborativeRequest(actor,id,ct);
        var tourId=await db.Tours.Where(t=>t.DesignRequestId==id).Select(t=>(int?)t.Id).SingleOrDefaultAsync(ct) ?? throw new TourException(404,"Agency chủ trì chưa lưu tour thiết kế.");
        var result=Dto(await Owned(request.AgencyId!,tourId,ct));
        return result with {Configuration=await CollaborationConfiguration(request,result.Configuration,ct)};
    }
    public async Task<TourDto> SaveSegment(string actor,int id,DesignSegmentInput input,CancellationToken ct)
    {
        ValidateObject(input);
        var request=await CollaborativeRequest(actor,id,ct);
        Require(request.AgencyId!=actor,"Agency chủ trì hãy lưu bằng chức năng Sửa tour.");
        await using var tx=await db.Database.BeginTransactionAsync(ct); await LockDesignRequest(request.AgencyId!,id,ct);
        await db.Entry(request).ReloadAsync(ct);
        // Re-read the invitation after acquiring the common request lock.
        var row=await db.TourDesignRequestAgencies.SingleAsync(a=>a.TourDesignRequestId==id && a.AgencyId==actor,ct);
        Require(row.Status=="accepted","Bạn chưa được nhận vào liên minh."); await MutableCollaboration(request,ct);
        var tourId=await db.Tours.Where(t=>t.DesignRequestId==id).Select(t=>t.Id).SingleOrDefaultAsync(ct);
        var tour=await Owned(request.AgencyId!,tourId,ct); Expected(tour,input.Revision);
        var current=Configuration(tour);
        var incoming=current with {Timelines=input.Timelines,PricingTiers=input.PricingTiers};
        var config=await CollaborationConfiguration(request,MergeDesign(current,incoming,actor,request.AgencyId!),ct);
        await Validate(config,false,ct,request.AgencyId,id); tour.Status=TourStatus.Draft; Apply(tour,config);
        var result=await Save(tour,actor,"Đối tác cập nhật nội dung và bảng giá riêng",ct);
        db.WorkflowNotifications.Add(new WorkflowNotification {UserId=request.AgencyId!,RequestId=id,Message=$"Đối tác đã lưu nội dung và bảng giá riêng yêu cầu #{id}. Hãy kiểm tra, hoàn tất và chia sẻ lại khi sẵn sàng."});
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return result;
    }
}
