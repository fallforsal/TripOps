using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;
namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Booking_solo_v1_excludes_partner_invited_only_into_working_v2()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var(request,v1)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var v2=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(v1.Revision,v1.Configuration,CreateNewVersion:true,Version:1)));
        Assert.Equal(2,v2.Version);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:2)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:2))).StatusCode);
        var working=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=2"));
        var prices=working.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
        var saved=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,working.Configuration.Timelines!,prices,Version:2)));
        await Read<TourDto>(await lead.PostAsJsonAsync(root+"/share",new ShareDesignVersionInput(saved.Revision,1)));
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Equal(1,visible.Version);Assert.Equal("agency",Assert.Single(visible.Configuration.CoHosts!).CompanyId);
        var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible)),HttpStatusCode.Created);
        Assert.Equal("agency",Assert.Single(booking.BookingAgencies!).AgencyId);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.GetAsync($"/api/v1/agency/bookings/{booking.Id}")).StatusCode);
        await app.Inspect(async db=>{
            var stored=await db.Bookings.SingleAsync(b=>b.Id==booking.Id);Assert.Equal(1,stored.TourVersion);
            Assert.Equal("agency",Assert.Single(await db.BookingAgencies.Where(a=>a.BookingId==booking.Id).ToListAsync()).AgencyId);
            Assert.True(await db.TourVersionAgencies.AnyAsync(a=>a.TourVersion.TourId==v1.Id && a.TourVersion.VersionNumber==2 && a.AgencyId=="other" && a.Status=="accepted"));
        });
    }
}
