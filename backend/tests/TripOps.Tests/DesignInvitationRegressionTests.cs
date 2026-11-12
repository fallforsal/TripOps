using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Service.Tours;
namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Receiving_design_request_does_not_invite_any_other_agency()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);
        Assert.Empty(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        var hosts=await Read<DesignCoHostDto[]>(await lead.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/co-hosts"));
        Assert.Equal("agency",Assert.Single(hosts).CompanyId);Assert.Equal("lead",hosts[0].Role);
        var tour=await Read<TourDto>(await lead.PutAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tour",new SaveDesignTourInput(null,Complete())));
        Assert.Equal("agency",Assert.Single(tour.Configuration.CoHosts!).CompanyId);
        await app.Inspect(async db=>{
            var host=Assert.Single(await db.TourDesignRequestAgencies.Where(a=>a.TourDesignRequestId==request.Id).ToListAsync());
            Assert.True(host.IsHost);Assert.Equal("agency",host.AgencyId);Assert.Equal("accepted",host.Status);
            Assert.False(await db.WorkflowNotifications.AnyAsync(n=>n.RequestId==request.Id && n.UserId=="other"));
            Assert.Equal("agency",Assert.Single(await db.TourVersionAgencies.Where(a=>a.TourVersion.TourId==tour.Id).ToListAsync()).AgencyId);
        });
    }
    [Fact]
    public async Task A_stale_wrong_lead_is_not_an_invitation_and_receiving_repairs_the_canonical_lead()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        await app.Inspect(async db=>{
            db.TourDesignRequestAgencies.Remove(await db.TourDesignRequestAgencies.SingleAsync(a=>a.TourDesignRequestId==request.Id));
            db.TourDesignRequestAgencies.Add(new TourDesignRequestAgency{TourDesignRequestId=request.Id,AgencyId="other",IsHost=true,Status="pending"});
            await db.SaveChangesAsync();
        });
        Assert.Empty(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(HttpStatusCode.NotFound,(await partner.GetAsync(root+"/co-hosts")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        Assert.Equal("agency",Assert.Single(await Read<DesignCoHostDto[]>(await lead.GetAsync(root+"/co-hosts"))).CompanyId);
        await Receive(lead,request.Id);
        await app.Inspect(async db=>{
            var rows=await db.TourDesignRequestAgencies.Where(a=>a.TourDesignRequestId==request.Id).ToListAsync();
            Assert.Equal("accepted",rows.Single(a=>a.AgencyId=="agency").Status);
            Assert.Equal("cancelled",rows.Single(a=>a.AgencyId=="other").Status);
        });
        var invited=await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal("partner",invited.Single(h=>h.CompanyId=="other").Role);
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
    }
}
