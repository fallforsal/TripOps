using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Tours;

public sealed partial class TourService
{
    private async Task<TourDesignRequest> CollaborativeRequest(string actor,int id,CancellationToken ct,bool leadOnly=false)
    {
        await Agency(actor,ct);
        return await db.TourDesignRequests.SingleOrDefaultAsync(r=>r.Id==id && (r.AgencyId==actor || !leadOnly && db.TourDesignRequestAgencies.Any(a=>a.TourDesignRequestId==id && a.AgencyId==actor && !a.IsHost && a.Status=="accepted")),ct)
            ?? throw new TourException(404,"Không tìm thấy yêu cầu hoặc bạn chưa được nhận vào liên minh.");
    }
    private async Task MutableCollaboration(TourDesignRequest request,CancellationToken ct)
    {
        Require(request.Status==CustomRequestStatus.InProgress,"Yêu cầu chưa tiếp nhận hoặc đã đóng. Hãy mở lại yêu cầu nếu cần tiếp tục.");
        Require(!await db.Bookings.AnyAsync(b=>b.DesignRequestId==request.Id && b.Status!=BookingStatus.Cancelled && b.Status!=BookingStatus.Rejected,ct),"Yêu cầu đã có booking, không thay đổi phương án nguồn.");
    }
    private Task<Tour?> DesignIdentity(int id,CancellationToken ct) => db.Tours.SingleOrDefaultAsync(t=>t.DesignRequestId==id && t.Status!=TourStatus.Deleted,ct);
    private async Task<TourVersion?> VersionRow(int id,int? number,CancellationToken ct)
    {
        var tour=await DesignIdentity(id,ct);
        if(tour==null) {Require(!number.HasValue,"Chưa có phiên bản tour.");return null;}
        return await db.TourVersions.SingleOrDefaultAsync(v=>v.TourId==tour.Id && v.VersionNumber==(number??tour.Version??1),ct)
            ?? throw new TourException(404,"Không tìm thấy phiên bản tour.");
    }
    private async Task EnsureVersionMembers(Tour tour,CancellationToken ct)
    {
        var version=await db.TourVersions.SingleAsync(v=>v.TourId==tour.Id && v.VersionNumber==tour.Version,ct);
        if(await db.TourVersionAgencies.AnyAsync(a=>a.TourVersionId==version.Id,ct))return;
        var config=JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData,Json)!.Configuration;
        var seeds=(config.CoHosts??[]).Select(h=>new TourVersionAgency {TourVersionId=version.Id,AgencyId=h.CompanyId,IsHost=h.Role=="lead",Status=h.Status,
            StageArea=h.AssignedSegments??"",SuggestedBudget=h.EstimatedBudgetPerGuest,CommunicationNotes=h.Notes,AssignedAt=h.InvitedAt??DateTime.UtcNow,RespondedAt=h.RespondedAt}).ToList();
        if(version.VersionNumber==1) {
            var invitations=await db.TourDesignRequestAgencies.Where(a=>a.TourDesignRequestId==tour.DesignRequestId && a.Status!="cancelled" && (!a.IsHost || a.AgencyId==tour.AgencyId)).ToListAsync(ct);
            foreach(var row in invitations.Where(a=>seeds.All(s=>s.AgencyId!=a.AgencyId))) seeds.Add(new TourVersionAgency {TourVersionId=version.Id,AgencyId=row.AgencyId,IsHost=row.IsHost,Status=row.Status,StageArea=row.StageArea,SuggestedBudget=row.SuggestedBudget,CommunicationNotes=row.CommunicationNotes,AssignedAt=row.AssignedAt,RespondedAt=row.RespondedAt});
        }
        if(seeds.All(a=>a.AgencyId!=tour.AgencyId))seeds.Add(new TourVersionAgency{TourVersionId=version.Id,AgencyId=tour.AgencyId!,IsHost=true,Status="accepted"});
        db.TourVersionAgencies.AddRange(seeds);await db.SaveChangesAsync(ct);
    }
    public async Task<DesignCoHostDto[]> CoHosts(int id,CancellationToken ct,int? number=null,bool includeHistory=false)
    {
        var request=await db.TourDesignRequests.AsNoTracking().SingleAsync(r=>r.Id==id,ct);
        var version=await VersionRow(id,number,ct);
        var rows=version==null ? [] : await db.TourVersionAgencies.AsNoTracking().Where(a=>a.TourVersionId==version.Id).ToListAsync(ct);
        var global=await db.TourDesignRequestAgencies.AsNoTracking().Where(a=>a.TourDesignRequestId==id).ToListAsync(ct);
        if(version==null) rows=global.Select(a=>new TourVersionAgency{AgencyId=a.AgencyId,IsHost=a.IsHost,Status=a.Status,StageArea=a.StageArea,SuggestedBudget=a.SuggestedBudget,CommunicationNotes=a.CommunicationNotes,AssignedAt=a.AssignedAt,RespondedAt=a.RespondedAt}).ToList();
        rows=rows.Where(a=>!a.IsHost || a.AgencyId==request.AgencyId).ToList();
        foreach(var member in rows)member.IsHost=member.AgencyId==request.AgencyId;
        if(rows.All(a=>a.AgencyId!=request.AgencyId))rows.Insert(0,new TourVersionAgency{AgencyId=request.AgencyId!,IsHost=true,Status="accepted"});
        var ids=rows.Select(a=>a.AgencyId).ToArray();
        var agencies=await db.Users.AsNoTracking().Include(u=>u.BusinessProfile).Where(u=>ids.Contains(u.Id)).ToDictionaryAsync(u=>u.Id,ct);
        return rows.Where(a=>includeHistory || a.Status!="excluded" && a.Status!="cancelled").OrderByDescending(a=>a.IsHost).ThenBy(a=>a.Id).Select(a=>{
            var user=agencies[a.AgencyId];var status=a.Status is "excluded" or "cancelled" ? "removed" : !a.IsHost && a.Status=="accepted" && !global.Any(g=>g.AgencyId==a.AgencyId && g.Status=="accepted") ? "revoked" : a.Status;
            return new DesignCoHostDto(a.AgencyId,user.BusinessProfile?.BusinessName??user.Name??"Agency",a.IsHost?"lead":"partner",status,[],a.StageArea,a.SuggestedBudget,
                Notes:a.CommunicationNotes,RejectionReason:a.Status=="rejected"?a.CommunicationNotes:null,InvitedAt:a.AssignedAt,RespondedAt:a.RespondedAt,CompanyPhone:user.Phone,CompanyEmail:user.Email,Version:version?.VersionNumber,CompanyLogo:user.BusinessProfile?.LogoUrl??user.Avatar);
        }).ToArray();
    }
    private async Task RequireVersionAccess(string actor,TourDesignRequest request,TourVersion? version,CancellationToken ct,bool pending=false)
    {
        if(actor==request.AgencyId)return;
        var allowed=version!=null && await db.TourVersionAgencies.AnyAsync(a=>a.TourVersionId==version.Id && a.AgencyId==actor && (a.Status=="accepted" || pending && a.Status=="pending"),ct);
        Require(allowed,"Bạn không tham gia phiên bản tour này.");
    }
    public async Task<DesignCoHostDto[]> GetCoHosts(string actor,int id,CancellationToken ct,int? number=null)
    {
        await Agency(actor,ct);
        var request=await db.TourDesignRequests.SingleOrDefaultAsync(r=>r.Id==id && (r.AgencyId==actor || db.TourDesignRequestAgencies.Any(a=>a.TourDesignRequestId==id && a.AgencyId==actor && !a.IsHost)),ct)
            ??throw new TourException(404,"Không tìm thấy lời mời.");
        var version=await VersionRow(id,number,ct);
        if(actor!=request.AgencyId && version!=null && !await db.TourVersionAgencies.AnyAsync(a=>a.TourVersionId==version.Id && a.AgencyId==actor && !a.IsHost && a.Status!="uninvited",ct))
            throw new TourException(404,"Bạn chưa được mời vào phiên bản này.");
        var hosts=await CoHosts(id,ct,number,true);
        return actor==request.AgencyId || hosts.Any(h=>h.CompanyId==actor && h.Status=="accepted")
            ? hosts : hosts.Where(h=>h.Role=="lead" || h.CompanyId==actor).ToArray();
    }
    public async Task<DesignCoHostDto[]> InviteCoHost(string actor,int id,InviteDesignCoHost input,CancellationToken ct)
    {
        ValidateObject(input);await using var tx=await db.Database.BeginTransactionAsync(ct);await LockDesignRequest(actor,id,ct);
        var request=await CollaborativeRequest(actor,id,ct,true);await MutableCollaboration(request,ct);
        Require(input.AgencyId!=actor,"Hãy chọn Agency đối tác khác.");
        Require(await db.Users.AnyAsync(u=>u.Id==input.AgencyId && u.Role==UserRole.TravelAgency && u.Status==UserStatus.Active && u.BusinessProfile!=null && u.BusinessProfile.Status==BusinessProfileStatus.Approved,ct),"Đối tác chưa được phê duyệt hoặc ngừng hoạt động.");
        var version=await VersionRow(id,input.Version,ct);
        Require(version!=null,"Hãy lưu phiên bản tour trước khi mời đối tác.");
        var global=await db.TourDesignRequestAgencies.SingleOrDefaultAsync(a=>a.TourDesignRequestId==id && a.AgencyId==input.AgencyId,ct);
        // Preserve old global revocations as version removals before re-inviting one version.
        // Re-invitation must never silently restore access to other historical versions.
        if(global?.Status=="cancelled")
            await db.TourVersionAgencies.Where(a=>a.TourVersion.Tour.DesignRequestId==id && a.AgencyId==input.AgencyId && !a.IsHost && (a.Status=="accepted" || a.Status=="pending"))
                .ExecuteUpdateAsync(set=>set.SetProperty(a=>a.Status,"excluded").SetProperty(a=>a.RespondedAt,global.RespondedAt??DateTime.UtcNow),ct);
        TourVersionAgency? row=version==null?null:await db.TourVersionAgencies.SingleOrDefaultAsync(a=>a.TourVersionId==version.Id && a.AgencyId==input.AgencyId,ct);
        Require(version!=null ? row==null || row.Status is "excluded" or "rejected" or "cancelled" or "uninvited" || global?.Status=="cancelled" : global==null || global.Status is "rejected" or "cancelled","Đối tác đã tham gia hoặc đang có lời mời trong phiên bản này.");
        if(global==null){global=new TourDesignRequestAgency{TourDesignRequestId=id,AgencyId=input.AgencyId};db.TourDesignRequestAgencies.Add(global);}
        global.IsHost=false;
        if(global.Status!="accepted")global.Status="pending";
        global.StageArea=input.Segment?.Trim()??"";global.SuggestedBudget=input.Budget;global.CommunicationNotes=input.Notes?.Trim();global.AssignedAt=DateTime.UtcNow;global.RespondedAt=null;
        if(version!=null){if(row==null){row=new TourVersionAgency{TourVersionId=version.Id,AgencyId=input.AgencyId};db.TourVersionAgencies.Add(row);}row.Status="pending";row.StageArea=global.StageArea;row.SuggestedBudget=input.Budget;row.CommunicationNotes=global.CommunicationNotes;row.AssignedAt=DateTime.UtcNow;row.RespondedAt=null;}
        await BumpDesignRevision(id,ct);
        db.WorkflowNotifications.Add(new WorkflowNotification{UserId=input.AgencyId,RequestId=id,Message=$"Có lời mời đồng tổ chức yêu cầu #{id}"+(version==null?"":$", phiên bản v{version.VersionNumber}")});
        await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);return await CoHosts(id,ct,input.Version,true);
    }
    public async Task DecideCoHost(string actor,int id,DesignCoHostDecision input,CancellationToken ct)
    {
        await Agency(actor,ct);ValidateObject(input);await using var tx=await db.Database.BeginTransactionAsync(ct);
        var request=await db.TourDesignRequests.SingleOrDefaultAsync(r=>r.Id==id,ct)??throw new TourException(404,"Không tìm thấy yêu cầu.");
        await LockDesignRequest(request.AgencyId!,id,ct);await db.Entry(request).ReloadAsync(ct);await MutableCollaboration(request,ct);
        var global=await db.TourDesignRequestAgencies.SingleOrDefaultAsync(a=>a.TourDesignRequestId==id && a.AgencyId==actor,ct)??throw new TourException(404,"Không có lời mời.");
        var version=await VersionRow(id,input.Version,ct);
        var row=version==null?null:await db.TourVersionAgencies.SingleOrDefaultAsync(a=>a.TourVersionId==version.Id && a.AgencyId==actor,ct);
        Require(!global.IsHost && actor!=request.AgencyId && (version==null?global.Status:row?.Status)=="pending" && global.Status!="cancelled","Lời mời đã được phản hồi hoặc thu hồi.");
        Require(input.Action!="reject" || !string.IsNullOrWhiteSpace(input.Reason),"Hãy nhập lý do từ chối.");
        var status=input.Action=="accept"?"accepted":"rejected";
        if(row!=null){row.Status=status;row.RespondedAt=DateTime.UtcNow;if(status=="rejected")row.CommunicationNotes=input.Reason!.Trim();}
        if(status=="accepted" || global.Status!="accepted")global.Status=status;
        global.RespondedAt=DateTime.UtcNow;if(status=="rejected")global.CommunicationNotes=input.Reason!.Trim();
        await db.SaveChangesAsync(ct);
        if(status=="accepted")await RefreshCollaboration(request,actor,ct,input.Version);else await BumpDesignRevision(id,ct);
        db.WorkflowNotifications.Add(new WorkflowNotification{UserId=request.AgencyId!,RequestId=id,Message=$"Đối tác đã {(status=="accepted"?"chấp nhận":"từ chối")} lời mời yêu cầu #{id}"});
        await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
    private async Task BumpDesignRevision(int id,CancellationToken ct)
    {
        var tour=await DesignIdentity(id,ct);if(tour!=null)tour.Revision++;
    }
    private async Task<(Tour,TourConfiguration)> EditableVersion(TourDesignRequest request,int? number,CancellationToken ct)
    {
        var identity=await DesignIdentity(request.Id,ct)??throw new TourException(404,"Chưa có tour thiết kế.");
        var tour=await Owned(request.AgencyId!,identity.Id,ct);var target=number??tour.Version??1;
        var config=target==tour.Version?Configuration(tour):JsonSerializer.Deserialize<TourSnapshot>((await db.TourVersions.SingleAsync(v=>v.TourId==tour.Id && v.VersionNumber==target,ct)).SnapshotData,Json)!.Configuration;
        tour.Version=target;return(tour,config);
    }
    public async Task RemoveCoHost(string actor,int id,string partner,CancellationToken ct,int? number=null)
    {
        await using var tx=await db.Database.BeginTransactionAsync(ct);await LockDesignRequest(actor,id,ct);
        var request=await CollaborativeRequest(actor,id,ct,true);await MutableCollaboration(request,ct);
        Require(partner!=request.AgencyId,"Không thể gỡ Agency chủ trì.");
        var version=await VersionRow(id,number,ct)??throw new TourException(422,"Hãy chọn phiên bản tour cần gỡ đối tác.");
        var row=await db.TourVersionAgencies.SingleOrDefaultAsync(a=>a.TourVersionId==version.Id && a.AgencyId==partner,ct)
            ??throw new TourException(404,"Đối tác không có trong phiên bản này.");
        Require(row.Status!="excluded","Đối tác đã bị gỡ khỏi phiên bản này.");
        var(tour,config)=await EditableVersion(request,version.VersionNumber,ct);
        row.Status="excluded";row.RespondedAt=DateTime.UtcNow;await db.SaveChangesAsync(ct);
        config=await CollaborationConfiguration(request,WithoutCoHost(config,partner),ct,version.VersionNumber);
        Apply(tour,config);tour.Status=TourStatus.Draft;if(tour.SharedVersion==version.VersionNumber)tour.SharedVersion=null;
        await Save(tour,actor,"Gỡ đối tác và nội dung khỏi phiên bản",ct);
        db.WorkflowNotifications.Add(new WorkflowNotification{UserId=partner,RequestId=id,
            Message=$"Agency chủ trì đã gỡ bạn khỏi phiên bản v{version.VersionNumber} của yêu cầu #{id}. Nội dung và bảng giá của bạn trong phiên bản này đã được gỡ."});
        await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);
    }
    private static bool HasCoHostContent(TourConfiguration c,string partner)=>(c.Timelines??[]).Any(d=>(d.Activities??[]).Any(a=>a.AgencyId==partner)||(d.Meals??[]).Any(m=>m.AgencyId==partner)||(d.Accommodations??[]).Any(h=>h.AgencyId==partner))||(c.OwnedHighlights??[]).Any(x=>x.AgencyId==partner)||(c.OwnedInclusions??[]).Any(x=>x.AgencyId==partner)||(c.OwnedExclusions??[]).Any(x=>x.AgencyId==partner)||(c.OwnedCancellationPolicy??[]).Any(x=>x.AgencyId==partner)||(c.OwnedImages??[]).Any(x=>x.AgencyId==partner);
    private static TourConfiguration WithoutCoHost(TourConfiguration c,string partner){
        var hl=c.OwnedHighlights?.Where(x=>x.AgencyId!=partner).ToArray();
        var inc=c.OwnedInclusions?.Where(x=>x.AgencyId!=partner).ToArray();
        var exc=c.OwnedExclusions?.Where(x=>x.AgencyId!=partner).ToArray();
        var pol=c.OwnedCancellationPolicy?.Where(x=>x.AgencyId!=partner).ToArray();
        var imgs=c.OwnedImages?.Where(x=>x.AgencyId!=partner).ToArray();
        return c with{
            CoHosts=c.CoHosts?.Where(h=>h.CompanyId!=partner).ToArray(),
            AgencyPricing=c.AgencyPricing?.Where(p=>p.AgencyId!=partner).ToArray(),
            Timelines=c.Timelines?.Select(d=>d with{Activities=d.Activities?.Where(a=>a.AgencyId!=partner).ToArray(),Meals=d.Meals?.Where(m=>m.AgencyId!=partner).ToArray(),Accommodations=d.Accommodations?.Where(h=>h.AgencyId!=partner).ToArray()}).ToArray(),
            OwnedHighlights=hl,Highlights=hl is not null?OwnedToText(hl):c.Highlights,
            OwnedInclusions=inc,Inclusions=inc is not null?OwnedToText(inc):c.Inclusions,
            OwnedExclusions=exc,Exclusions=exc is not null?OwnedToText(exc):c.Exclusions,
            OwnedCancellationPolicy=pol,CancellationPolicy=pol is not null?OwnedToText(pol):c.CancellationPolicy,
            OwnedImages=imgs,Images=imgs is not null?imgs.Select(x=>x.Url).ToArray():c.Images
        };
    }
    private async Task<TourConfiguration> CollaborationConfiguration(TourDesignRequest request,TourConfiguration config,CancellationToken ct,int? number=null)
    {
        var hosts=await CoHosts(request.Id,ct,number);var members=hosts.Where(h=>h.Status is "accepted" or "pending" or "uninvited").ToArray();
        foreach(var owner in (config.CoHosts??[]).Select(h=>h.CompanyId).Concat((config.AgencyPricing??[]).Select(p=>p.AgencyId)).Distinct().Where(id=>id!=request.AgencyId && members.All(m=>m.CompanyId!=id)))config=WithoutCoHost(config,owner);
        var existing=config.AgencyPricing??[new AgencyPricingInput(request.AgencyId!,config.PricingTiers??[])];
        var pricing=existing.Where(p=>members.Any(h=>h.CompanyId==p.AgencyId)).ToList();
        foreach(var member in members.Where(h=>pricing.All(p=>p.AgencyId!=h.CompanyId)))pricing.Add(new(member.CompanyId,[]));
        return WithTotalPricing(EnsureOwnership(config,request.AgencyId!) with{CoHosts=members,AgencyPricing=pricing.ToArray()},request.AgencyId!);
    }
    private async Task RefreshCollaboration(TourDesignRequest request,string actor,CancellationToken ct,int? number=null)
    {
        if(await DesignIdentity(request.Id,ct)==null)return;
        var(tour,config)=await EditableVersion(request,number,ct);config=await CollaborationConfiguration(request,config,ct,tour.Version);
        tour.Status=TourStatus.Draft;Apply(tour,config);await Save(tour,actor,"Cập nhật liên minh của phiên bản",ct);
    }
    public async Task<TourDto> CollaborativeTour(string actor,int id,CancellationToken ct,int? number=null)
    {
        var request=await CollaborativeRequest(actor,id,ct);var version=await VersionRow(id,number,ct);await RequireVersionAccess(actor,request,version,ct);
        var identity=await DesignIdentity(id,ct)??throw new TourException(404,"Chưa có tour thiết kế.");var tour=await Owned(request.AgencyId!,identity.Id,ct);
        var config=version!.VersionNumber==tour.Version?Configuration(tour):JsonSerializer.Deserialize<TourSnapshot>(version.SnapshotData,Json)!.Configuration;
        return Dto(tour) with{Version=version.VersionNumber,Configuration=config with{CoHosts=await CoHosts(id,ct,version.VersionNumber)}};
    }
    public async Task<TourDto> SaveSegment(string actor,int id,DesignSegmentInput input,CancellationToken ct)
    {
        ValidateObject(input);var request=await CollaborativeRequest(actor,id,ct);Require(request.AgencyId!=actor,"Agency chủ trì hãy dùng Sửa tour.");
        await using var tx=await db.Database.BeginTransactionAsync(ct);await LockDesignRequest(request.AgencyId!,id,ct);await db.Entry(request).ReloadAsync(ct);await MutableCollaboration(request,ct);
        var version=await VersionRow(id,input.Version,ct);await RequireVersionAccess(actor,request,version,ct);
        var(tour,current)=await EditableVersion(request,input.Version,ct);Expected(tour,input.Revision);
        var incoming=current with{
            Timelines=input.Timelines,
            PricingTiers=input.PricingTiers,
            OwnedHighlights=input.OwnedHighlights??current.OwnedHighlights,
            OwnedInclusions=input.OwnedInclusions??current.OwnedInclusions,
            OwnedExclusions=input.OwnedExclusions??current.OwnedExclusions,
            OwnedCancellationPolicy=input.OwnedCancellationPolicy??current.OwnedCancellationPolicy,
            OwnedImages=input.OwnedImages??current.OwnedImages
        };
        var config=await CollaborationConfiguration(request,MergeDesign(current,incoming,actor,request.AgencyId!),ct,tour.Version);
        await Validate(config,false,ct,request.AgencyId,id);tour.Status=TourStatus.Draft;Apply(tour,config);var result=await Save(tour,actor,"Đối tác cập nhật chặng của phiên bản",ct);
        await tx.CommitAsync(ct);return result;
    }
    private async Task ValidateVersionMembers(int requestId,int version,CancellationToken ct)
    {
        var hosts=await CoHosts(requestId,ct,version);
        Require(hosts.All(h=>h.Status=="accepted"),"Phiên bản còn đối tác chưa xác nhận hoặc đã kết thúc hợp tác. Hãy mời lại hoặc bỏ đối tác khỏi phiên bản này.");
    }
}
