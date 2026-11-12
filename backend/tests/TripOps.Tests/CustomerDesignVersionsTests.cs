using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;
namespace TripOps.Tests;
public sealed partial class TourFlowTests {
 [Theory]
 [InlineData(1)]
 [InlineData(2)]
 public async Task Customer_can_browse_released_versions_and_book_selected_alliance_snapshot(int choice) {
  await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
  var(request,first)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";var plansUrl=$"/api/v1/tour-design-requests/{request.Id}/plans";
  var second=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(first.Revision,first.Configuration with {Name="Second private design"},CreateNewVersion:true,Version:1)));
  Assert.Equal(1,Assert.Single(await Read<TourDto[]>(await customer.GetAsync(plansUrl))).Version);
  Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(second))).StatusCode);
  await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:2)));
  Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:2))).StatusCode);
  await app.Inspect(async db=>{(await db.BusinessProfiles.SingleAsync(p=>p.UserId=="other")).LogoUrl="https://example.test/partner-logo.png";await db.SaveChangesAsync();});
  var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=2"));
  var prices=work.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
  await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,work.Configuration.Timelines!,prices,Version:2)));
  work=await Read<TourDto>(await lead.GetAsync(root+"/working-tour?version=2"));
  var published=await Share(lead,request.Id,work);
  var versions=await Read<TourDto[]>(await customer.GetAsync(plansUrl));Assert.Equal(new[]{2,1},versions.Select(t=>t.Version));
  Assert.All(versions,v=>Assert.Null(v.Configuration.AgencyPricing));
  Assert.DoesNotContain(versions.Single(t=>t.Version==1).Configuration.CoHosts!,h=>h.Role=="partner");
  Assert.Equal("https://example.test/partner-logo.png",versions.Single(t=>t.Version==2).Configuration.CoHosts!.Single(h=>h.Role=="partner").CompanyLogo);
  var hidden=await Read<TourDto>(await lead.PostAsJsonAsync(root+"/share",new ShareDesignVersionInput(published.Revision,Hidden:true)));
  Assert.Null(hidden.SharedVersion);Assert.Empty(await Read<TourDto[]>(await customer.GetAsync(plansUrl)));
  Assert.Equal(HttpStatusCode.NotFound,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(versions[0]))).StatusCode);
  await Share(lead,request.Id,hidden with {Version=2});
  versions=await Read<TourDto[]>(await customer.GetAsync(plansUrl));var selected=versions.Single(t=>t.Version==choice);
  var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(selected)),HttpStatusCode.Created);
  await app.Inspect(async db=>{var row=await db.Bookings.Include(b=>b.BookingAgencies).SingleAsync(b=>b.Id==booking.Id);Assert.Equal(choice,row.TourVersion);Assert.Equal(choice,row.BookingAgencies.Count);});
  Assert.Equal(selected.Configuration.BasePrice*2,booking.TotalAmount);
 }
}
