using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Removed_partner_keeps_version_invitation_history_but_cannot_read_or_save_design()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);
        var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var v1=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete(),true)));
        var v2=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(v1.Revision,v1.Configuration,true,CreateNewVersion:true,Version:1)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other","Private segment",Notes:"Original invitation",Version:1)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:1))).StatusCode);
        var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=1"));
        var prices=work.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
        var days=work.Configuration.Timelines!.Select((d,i)=>i==0?d with {Activities=[..d.Activities!,new("Partner stop",AgencyId:"other",Id:"partner-stop")]}:d).ToArray();
        var saved=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,days,prices,Version:1)));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.GetAsync(root+"/working-tour?version=2")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await partner.GetAsync(root+"/co-hosts?version=2")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(saved.Revision,days,prices,Version:2))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.DeleteAsync(root+"/co-hosts/other?version=1")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(saved.Revision,days,prices,Version:1))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.GetAsync(root+"/working-tour?version=1")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:1))).StatusCode);

        var history=Assert.Single(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(new[]{1},history.CollaborationVersions);Assert.True(history.HasCollaborations);
        Assert.Equal("",history.ContactPhone);Assert.Equal("",history.ContactEmail);Assert.Null(history.AdditionalInfo);
        var invitation=Assert.Single(history.CollaborationInvitations!);
        Assert.Equal(1,invitation.Version);Assert.Equal("removed",invitation.Status);Assert.NotNull(invitation.RespondedAt);
        var old=Assert.Single(await Read<DesignCoHostDto[]>(await partner.GetAsync(root+"/co-hosts?version=1")),h=>h.CompanyId=="other");
        Assert.Equal("removed",old.Status);Assert.Equal("Original invitation",old.Notes);Assert.NotNull(old.InvitedAt);
        var clean=await Read<TourDto>(await lead.GetAsync(root+"/working-tour?version=1"));
        Assert.DoesNotContain(clean.Configuration.AgencyPricing!,p=>p.AgencyId=="other");
        Assert.DoesNotContain(clean.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.AgencyId=="other");
        var untouched=await Read<TourDto>(await lead.GetAsync(root+"/versions/2"));
        Assert.Equal(v2.Configuration.Name,untouched.Configuration.Name);Assert.Equal(v2.Configuration.BasePrice,untouched.Configuration.BasePrice);
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("archive"))).StatusCode);
        await app.Inspect(async db=>Assert.Contains(await db.WorkflowNotifications.Where(n=>n.UserId=="other" && n.RequestId==request.Id).ToListAsync(),n=>n.Message.Contains("gỡ bạn khỏi phiên bản v1")));
    }

    [Fact]
    public async Task Copying_version_keeps_contributions_but_does_not_copy_partner_editing_permission()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete(),true)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:1)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:1))).StatusCode);
        var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=1"));
        var prices=work.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
        var days=work.Configuration.Timelines!.Select((d,i)=>i==0?d with {Activities=[..d.Activities!,new("Copied partner stop",AgencyId:"other",Id:"copied-stop")]}:d).ToArray();
        var saved=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,days,prices,Version:1)));
        var copy=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(saved.Revision,saved.Configuration,true,CreateNewVersion:true,Version:1)));
        Assert.Equal("uninvited",copy.Configuration.CoHosts!.Single(h=>h.CompanyId=="other").Status);
        Assert.Contains(copy.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.Name=="Copied partner stop");
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.GetAsync(root+"/working-tour?version=2")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/share",new ShareDesignVersionInput(copy.Revision,2))).StatusCode);
        var before=Assert.Single(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(new[]{1},before.CollaborationVersions);Assert.Single(before.CollaborationInvitations!);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:2)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:2))).StatusCode);
        var accepted=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=2"));
        Assert.Contains(accepted.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.Name=="Copied partner stop");
        Assert.Equal(HttpStatusCode.NoContent,(await lead.DeleteAsync(root+"/co-hosts/other?version=1")).StatusCode);
        var after=Assert.Single(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(2,after.CurrentVersion);Assert.Equal(new[]{2,1},after.CollaborationVersions);
        Assert.Equal("removed",after.CollaborationInvitations!.Single(i=>i.Version==1).Status);
        Assert.Equal("accepted",after.CollaborationInvitations!.Single(i=>i.Version==2).Status);
        Assert.Equal(HttpStatusCode.OK,(await partner.GetAsync(root+"/working-tour?version=2")).StatusCode);
    }
}
