using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Lead_can_withdraw_invitation_and_invite_again_without_exposing_customer_contacts()
    {
        await using var app=new App(); await app.Initialize();
        using var customer=await app.Login("customer"); using var lead=await app.Login("agency"); using var partner=await app.Login("other");
        var request=await DesignRequest(customer); await Receive(lead,request.Id);
        var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal(HttpStatusCode.NotFound,(await partner.DeleteAsync(root+"/co-hosts/agency?removeContent=true")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.DeleteAsync(root+"/co-hosts/other")).StatusCode);
        Assert.Empty(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var invited=await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal("pending",invited.Single(h=>h.CompanyId=="other").Status);
        var payload=JsonSerializer.Serialize(request,new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.DoesNotContain("businessEmail",payload); Assert.DoesNotContain("businessPhone",payload);
        Assert.Contains("contactEmail",payload); Assert.Contains("contactPhone",payload);
    }

    [Fact]
    public async Task Lead_can_remove_partner_content_but_old_versions_remain_readable_and_cannot_be_selected()
    {
        await using var app=new App(); await app.Initialize();
        using var customer=await app.Login("customer"); using var lead=await app.Login("agency"); using var partner=await app.Login("other");
        var request=await DesignRequest(customer); await Receive(lead,request.Id);
        var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete(),true)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var working=await Read<TourDto>(await partner.GetAsync(root+"/working-tour"));
        var days=working.Configuration.Timelines!.Select((d,i)=>i==0 ? d with {
            Activities=[..(d.Activities??[]),new("Partner visit",Id:"partner-point",AgencyId:"other",OrderIndex:99)],
            Meals=[..(d.Meals??[]),new("dinner","Partner dinner",Id:"partner-meal",AgencyId:"other",ServiceId:103)],
            Accommodations=[..(d.Accommodations??[]),new("Partner hotel","Da Lat",IsDefault:false,NightsCount:1,Id:"partner-hotel",AgencyId:"other",ServiceId:102)]
        }:d).ToArray();
        var partnerPrices=working.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
        var changed=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,days,partnerPrices)));
        var oldVersion=changed.Version;
        var second=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(changed.Revision,changed.Configuration,true,CreateNewVersion:true)));
        await Share(lead,request.Id,second);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.DeleteAsync(root+"/co-hosts/other?removeContent=true")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await partner.GetAsync(root+"/working-tour")).StatusCode);
        var clean=await Read<TourDto>(await lead.GetAsync(root+"/working-tour"));
        Assert.Null(clean.SharedVersion);
        Assert.DoesNotContain(clean.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.AgencyId=="other");
        Assert.DoesNotContain(clean.Configuration.AgencyPricing!,p=>p.AgencyId=="other");
        Assert.DoesNotContain(clean.Configuration.Timelines!.SelectMany(d=>d.Meals??[]),m=>m.AgencyId=="other");
        Assert.DoesNotContain(clean.Configuration.Timelines!.SelectMany(d=>d.Accommodations??[]),h=>h.AgencyId=="other");
        Assert.Contains(clean.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.AgencyId=="agency");
        var previous=await Read<TourDto>(await lead.GetAsync(root+$"/versions/{oldVersion}"));
        Assert.Contains(previous.Configuration.Timelines!.SelectMany(d=>d.Activities??[]),a=>a.AgencyId=="other");
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/share",new ShareDesignVersionInput(clean.Revision,oldVersion))).StatusCode);
        Assert.Empty(await Read<TourDto[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/plans")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.DeleteAsync(root+"/co-hosts/agency?removeContent=true")).StatusCode);
        await app.Inspect(async db=>Assert.Equal("cancelled",(await db.TourDesignRequestAgencies.SingleAsync(a=>a.TourDesignRequestId==request.Id && a.AgencyId=="other")).Status));
    }
}
