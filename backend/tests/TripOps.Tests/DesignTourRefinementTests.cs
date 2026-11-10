using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Ordinary_booking_freezes_configuration_without_creating_tour_history()
    {
        await using var app=new App();await app.Initialize();
        using var agency=await app.Login("agency");using var customer=await app.Login("customer");
        var tour=await Command(agency,await Create(agency),"publish");
        var booking=await Read<TripOps.Service.Bookings.BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(tour)),HttpStatusCode.Created);
        await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}",new UpdateTourRequest(tour.Revision,tour.Configuration with {Name="Changed source",BasePrice=9999999},"Edit source")));
        await app.Inspect(async db=> {
            var b=await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.SingleAsync(db.Bookings,x=>x.Id==booking.Id);
            var frozen=await TripOps.Service.Bookings.BookingAlliance.BookedConfiguration(db,b,CancellationToken.None);
            Assert.Equal(tour.Configuration.Name,frozen!.Name);Assert.Equal(tour.Configuration.BasePrice,frozen.BasePrice);
            Assert.Equal(0,await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.CountAsync(db.TourVersions));
        });
    }

    [Fact]
    public async Task Design_clone_keeps_only_default_hotels_and_meals_and_preserves_source()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var source = await Create(agency);
        var request = await DesignRequest(customer); await Receive(agency, request.Id);
        var clone = await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/clone", new DesignCloneInput(source.Id)), HttpStatusCode.Created);
        var day = clone.Configuration.Timelines![0];
        Assert.Equal("Restaurant", Assert.Single(day.Meals!).RestaurantName);
        Assert.True(day.Meals![0].IsDefault);
        Assert.Equal("Hotel", Assert.Single(day.Accommodations!).HotelName);
        Assert.True(day.Accommodations![0].IsDefault);
        var unchanged = await Read<TourDto>(await agency.GetAsync($"{Root}/{source.Id}"));
        Assert.Equal(2, unchanged.Configuration.Timelines![0].Meals!.Length);
        Assert.Equal(2, unchanged.Configuration.Timelines![0].Accommodations!.Length);
    }

    [Fact]
    public async Task Design_versions_are_editable_plans_and_new_versions_use_max_number()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var request = await DesignRequest(customer); await Receive(agency, request.Id);
        var url = $"/api/v1/agency/tour-design-requests/{request.Id}";
        var first = await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour", new SaveDesignTourInput(null, Complete("Plan one"))));
        Assert.Equal(1, first.Version);
        var shared = await Share(agency, request.Id, first);
        var edited = await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour", new SaveDesignTourInput(shared.Revision, Complete("Edited shared one"), Version:1)));
        Assert.Equal(1, edited.Version); Assert.False(edited.HasDraftChanges);
        var visible = await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Equal("Edited shared one", visible.Configuration.Name);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(shared))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(first.Revision,Complete(),Version:1))).StatusCode);
        var second = await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour", new SaveDesignTourInput(edited.Revision, Complete("Plan two"), CreateNewVersion:true, Version:1)));
        Assert.Equal(2, second.Version);
        Assert.Equal("Edited shared one",(await Read<TourDto>(await agency.GetAsync(url+"/versions/1"))).Configuration.Name);
        // Selecting a prior plan is read-only; saving it edits only that plan.
        var selected = await Read<TourDto>(await agency.GetAsync(url+"/versions/1"));
        var changedFirst = await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(selected.Revision,Complete("One revised again"),Version:1)));
        Assert.Equal(1, changedFirst.Version);
        Assert.Equal("Plan two",(await Read<TourDto>(await agency.GetAsync(url+"/versions/2"))).Configuration.Name);
        var third=await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(changedFirst.Revision,Complete("Plan three"),CreateNewVersion:true,Version:1)));
        Assert.Equal(3,third.Version);
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync(url+"/versions/1")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.GetAsync(url+"/versions/1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await agency.GetAsync(url+"/versions/99")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await agency.PostAsJsonAsync(url+"/share",new ShareDesignVersionInput(third.Revision,99))).StatusCode);
        Assert.Equal(3,(await Read<DesignRequestService.PlanHistory[]>(await agency.GetAsync(url+"/history"))).Length);
    }

    [Fact]
    public async Task Design_incomplete_version_can_be_saved_but_cannot_be_shared()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");
        var request=await DesignRequest(customer);await Receive(agency,request.Id);
        var url=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var draft=await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(null,new TourConfiguration("Incomplete"))));
        Assert.Equal(1,draft.Version);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(url+"/share",new ShareDesignVersionInput(draft.Revision,1))).StatusCode);
        Assert.Empty(await Read<TourDto[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/plans")));
        var ready=await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(draft.Revision,Complete(),Version:1)));
        Assert.Equal(1,(await Share(agency,request.Id,ready)).SharedVersion);
        Assert.Single(await Read<DesignRequestService.PlanHistory[]>(await agency.GetAsync(url+"/history")));
    }

    [Fact]
    public async Task Design_customer_sees_shared_hotel_and_private_supplier_address_without_internal_price()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var request = await DesignRequest(customer); await Receive(agency, request.Id);
        var config = Complete() with { Timelines = [new(1, "Arrival", Accommodations: [
            new("Private hotel", "Da Lat", SupplierSource: "AGENCY_SUPPLIER", Supplier:
                new(Address: "18 Tran Phu, Da Lat", Area: "Lam Dong", ContactName: "Internal contact", ContactPhone: "0900000000", ReferencePrice: 700000))
        ]), new(2, "Departure")] };
        var saved = await Read<TourDto>(await agency.PutAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tour", new SaveDesignTourInput(null, config, true)));
        await Share(agency, request.Id, saved);
        var visible = await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        var hotel = Assert.Single(visible.Configuration.Timelines![0].Accommodations!);
        Assert.Equal("Private hotel", hotel.HotelName);
        Assert.Equal("18 Tran Phu, Da Lat", hotel.Supplier!.Address);
        Assert.Null(hotel.Supplier.ReferencePrice); Assert.Null(hotel.Supplier.ContactName); Assert.Null(hotel.Supplier.ContactPhone);
        var history = await Read<DesignRequestService.PlanHistory[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/history"));
        Assert.Null(Assert.Single(history).Configuration.Timelines![0].Accommodations![0].Supplier!.ReferencePrice);
    }
}
