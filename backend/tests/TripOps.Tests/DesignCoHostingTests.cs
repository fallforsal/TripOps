using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;
namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Co_host_price_matrix_uses_lead_frames_and_partner_can_only_set_own_amounts()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);
        var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        PricingTierInput[] frames=[new("Người lớn",11,null,2200000,0),new("Trẻ em",2,10,1540000,1),new("Em bé",0,1,0,2)];
        await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete() with {PricingTiers=frames},true)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var working=await Read<TourDto>(await partner.GetAsync(root+"/working-tour"));
        var sharedFrames=working.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="agency").Tiers;
        var prices=sharedFrames.Select(t=>t with {PricePerGuest=t.MinAge==11?3300000:t.MinAge==2?2310000:0}).ToArray();
        async Task Reject(PricingTierInput[] invalid) => Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,working.Configuration.Timelines!,invalid))).StatusCode);
        await Reject(prices.Skip(1).ToArray());
        await Reject([..prices,new("Extra",120,150,1,3)]);
        await Reject(prices.Select((t,i)=>i==0?t with {Name="Partner renames frame"}:t).ToArray());
        await Reject(prices.Select((t,i)=>i==0?t with {MinAge=12}:t).ToArray());
        await Reject(prices.Select((t,i)=>i==0?t with {DisplayOrder=2}:t).ToArray());
        await Reject(prices.Select((t,i)=>i==0?t with {Key="unknown-frame"}:t).ToArray());
        var saved=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,working.Configuration.Timelines!,prices)));
        Assert.Equal(5500000,saved.Configuration.BasePrice);
        Assert.Equal(3850000,saved.Configuration.PricingTiers!.Single(t=>t.MinAge==2).PricePerGuest);
        // Names, boundaries and new/deleted frames are controlled by the lead; existing row keys retain partner amounts.
        var leadFrames=sharedFrames.Select(t=>t.MinAge==11?t with {MinAge=12}:t.MinAge==2?t with {Name="Thiếu nhi",MaxAge=11}:t).ToArray();
        var final=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(saved.Revision,saved.Configuration with {PricingTiers=leadFrames},true)));
        var partnerFrames=final.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="other").Tiers;
        Assert.Equal(2310000,partnerFrames.Single(t=>t.Name=="Thiếu nhi").PricePerGuest);
        Assert.Equal(3300000,partnerFrames.Single(t=>t.MinAge==12).PricePerGuest);
        final=await Share(lead,request.Id,final);
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Null(visible.Configuration.AgencyPricing);Assert.Equal(5500000,visible.Configuration.BasePrice);
        var changedFrames=leadFrames.Where(t=>t.MinAge!=0).Append(new("Khung mới",0,1,10000,2,Key:"new-common-frame")).ToArray();
        var changed=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(final.Revision,final.Configuration with {PricingTiers=changedFrames},false)));
        Assert.DoesNotContain(changed.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="other").Tiers,t=>t.Key=="new-common-frame");
        Assert.DoesNotContain(changed.Configuration.AgencyPricing!.SelectMany(p=>p.Tiers),t=>t.Key==sharedFrames.Single(t=>t.MinAge==0).Key);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(changed.Revision,changed.Configuration with {PricingTiers=changedFrames},true))).StatusCode);
        await app.Inspect(async db=>{
            var rows=await db.TourPricingTiers.Where(t=>t.TourId==changed.Id).ToListAsync();
            Assert.Equal(5,rows.Count);Assert.Equal(3300000,rows.Single(t=>t.AgencyId=="other" && t.MinAge==12).PricePerGuest);
        });
    }

    [Fact]
    public async Task Co_host_invitation_is_membership_only_and_has_explicit_host()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other"))).StatusCode);
        await Receive(lead,request.Id);
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await partner.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("agency"))).StatusCode);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        var incoming=Assert.Single(await Read<DesignRequestDto[]>(await partner.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal("",incoming.ContactPhone);Assert.Empty(incoming.CoHosts!.Single(h=>h.CompanyId=="other").AssignedDays);
        Assert.Equal(HttpStatusCode.NotFound,(await partner.GetAsync(root+"/working-tour")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("reject"," "))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("reject","No availability"))).StatusCode);
        await app.Inspect(async db=>{
            var rows=await db.TourDesignRequestAgencies.Where(a=>a.TourDesignRequestId==request.Id).ToListAsync();
            Assert.True(rows.Single(a=>a.AgencyId=="agency").IsHost);
            var rejected=rows.Single(a=>a.AgencyId=="other");Assert.False(rejected.IsHost);Assert.Equal("No availability",rejected.CommunicationNotes);
        });
    }

    [Fact]
    public async Task Co_host_owns_children_and_price_table_shared_day_is_editable_and_booking_freezes_each_share()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var first=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete() with {DurationDays=3,DurationNights=2,Timelines=[..Complete().Timelines!,new(3,"Final day")]},true)));await Share(lead,request.Id,first);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other","Formal invitation")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var working=await Read<TourDto>(await partner.GetAsync(root+"/working-tour"));
        Assert.Equal(HttpStatusCode.NotFound,(await partner.PostAsJsonAsync(root+"/share",new TourCommand(working.Revision))).StatusCode);
        var existing=working.Configuration.Timelines![0];var originalLocation=existing.Activities![0];var originalHotel=existing.Accommodations!.Single(h=>h.IsDefault);
        // Partner changes the common day title, attempts to overwrite lead children, and adds its own children.
        var day1=existing with {Title="Jointly edited day",Activities=[originalLocation with {Name="Attempted overwrite"},new("Partner visit",Id:"partner-location",AgencyId:"other",OrderIndex:1)],
            Accommodations=existing.Accommodations!.Select(h=>h with {HotelName="Attempted hotel overwrite"}).ToArray()};
        var day2=working.Configuration.Timelines[1] with {Accommodations=[new("Partner hotel","Second destination",Id:"partner-hotel",AgencyId:"other",ServiceId:102)],
            Meals=[new("dinner","Partner restaurant",Id:"partner-meal",AgencyId:"other",ServiceId:103)]};
        PricingTierInput[] ownPrices=[new("Child",0,11,300000),new("Adult",12,null,600000,1)];
        var changed=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,[day1,day2,working.Configuration.Timelines![2]],ownPrices)));
        Assert.Equal("Jointly edited day",changed.Configuration.Timelines![0].Title);
        Assert.Equal(originalLocation.Name,changed.Configuration.Timelines[0].Activities!.Single(a=>a.Id==originalLocation.Id).Name);
        Assert.Equal(originalHotel.HotelName,changed.Configuration.Timelines[0].Accommodations!.Single(h=>h.Id==originalHotel.Id).HotelName);
        Assert.Equal("other",changed.Configuration.Timelines[1].Accommodations![0].AgencyId);
        Assert.Equal("other",changed.Configuration.Timelines[1].Meals![0].AgencyId);
        Assert.Equal(2100000,changed.Configuration.BasePrice);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.DeleteAsync(root+"/co-hosts/other")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.DeleteAsync(root+"/co-hosts/agency")).StatusCode);
        Assert.Equal(first.Version,(await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"))).Version);
        Assert.Equal(HttpStatusCode.Conflict,(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(working.Revision,[day1,day2,working.Configuration.Timelines![2]],ownPrices))).StatusCode);
        // The lead can change the common title, but cannot alter or remove partner children or partner prices.
        var input=changed.Configuration with {Timelines=changed.Configuration.Timelines.Select(d=>d with {Title=d.DayNumber==1?"Lead edits shared day":d.Title,
            Activities=d.Activities?.Where(a=>a.AgencyId!="other").ToArray(),Meals=d.Meals?.Select(m=>m.AgencyId=="other"?m with {RestaurantName="Lead attempts restaurant overwrite"}:m).ToArray(),Accommodations=d.Accommodations?.Select(h=>h.AgencyId=="other"?h with {HotelName="Lead attempts overwrite"}:h).ToArray()}).ToArray(),
            PricingTiers=changed.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="agency").Tiers};
        var final=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(changed.Revision,input,true,CreateNewVersion:true)));
        Assert.Contains(final.Configuration.Timelines![0].Activities!,a=>a.Id=="partner-location");
        Assert.Equal("Partner hotel",final.Configuration.Timelines[1].Accommodations![0].HotelName);
        Assert.Equal("Partner restaurant",final.Configuration.Timelines[1].Meals![0].RestaurantName);
        Assert.Equal(600000,final.Configuration.AgencyPricing!.Single(p=>p.AgencyId=="other").Tiers.Single(p=>p.MinAge==12).PricePerGuest);
        await Share(lead,request.Id,final);
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Null(visible.Configuration.AgencyPricing);Assert.Equal(2100000,visible.Configuration.PricingTiers!.Single(p=>p.MinAge==12).PricePerGuest);
        var bookingInput=DesignBooking(visible) with {Participants=[new("Adult",null,new DateTime(1990,1,1),null,null,null),new("Child",null,new DateTime(2018,1,1),null,null,null)]};
        var booking=await Read<TripOps.Service.Bookings.BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",bookingInput),HttpStatusCode.Created);
        Assert.Equal(3150000,booking.TotalAmount);
        await app.Inspect(async db=>{
            var shares=await db.BookingAgencies.Where(a=>a.BookingId==booking.Id).ToListAsync();
            Assert.Equal(2,shares.Count);Assert.Equal(2250000,shares.Single(a=>a.AgencyId=="agency").FinalAmount);Assert.Equal(900000,shares.Single(a=>a.AgencyId=="other").FinalAmount);
            Assert.Equal(booking.TotalAmount,shares.Sum(a=>a.FinalAmount));Assert.All(shares,a=>Assert.Equal(a.OriginalAmount,a.NetPayout));
            Assert.Contains(await db.TourPricingTiers.Where(t=>t.TourId==final.Id).ToListAsync(),p=>p.AgencyId=="other" && p.PricePerGuest==600000);
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.DeleteAsync(root+"/co-hosts/other")).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(final.Revision,[day1,day2],ownPrices))).StatusCode);
    }
}
