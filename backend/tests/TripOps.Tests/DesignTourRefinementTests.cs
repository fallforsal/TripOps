using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
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
    public async Task Design_atomic_save_increments_once_share_keeps_number_and_restore_remains_private()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var request = await DesignRequest(customer); await Receive(agency, request.Id);
        var url = $"/api/v1/agency/tour-design-requests/{request.Id}/tour";
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PutAsJsonAsync(url, new SaveDesignTourInput(null, Complete(), true))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync(url, new SaveDesignTourInput(null, Complete(), true))).StatusCode);
        var saved = await Read<TourDto>(await agency.PutAsJsonAsync(url, new SaveDesignTourInput(null, Complete(), true)));
        Assert.Equal(1, saved.Version); Assert.Equal("completed", saved.Status);
        Assert.Empty(await Read<TourDto[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/plans")));
        var first = saved;
        // Reproduce the reported v6 case through the same save endpoint used by the FE.
        for (var version = 2; version <= 6; version++) {
            saved = await Read<TourDto>(await agency.PutAsJsonAsync(url, new SaveDesignTourInput(saved.Version, Complete($"Revision {version}"), true)));
            Assert.Equal(version, saved.Version);
        }
        var shared = await Share(agency, request.Id, saved);
        Assert.Equal(6, shared.Version); Assert.Equal(6, shared.SharedVersion);
        Assert.Equal(6, (await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"))).Version);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PutAsJsonAsync(url, new SaveDesignTourInput(5, Complete(), true))).StatusCode);
        var restored = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{saved.Id}/versions/1/restore", new TourCommand(6, "Restore original")));
        Assert.Equal(7, restored.Version); Assert.Equal("draft", restored.Status);
        Assert.Equal(first.Configuration.Name, restored.Configuration.Name);
        Assert.Equal(6, (await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"))).Version);
        var completed = await Read<TourDto>(await agency.PutAsJsonAsync(url, new SaveDesignTourInput(7, restored.Configuration, true)));
        Assert.Equal(8, completed.Version);
        Assert.Equal(8, (await Share(agency, request.Id, completed)).SharedVersion);
        var history = await Read<DesignRequestService.PlanHistory[]>(await agency.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/history"));
        Assert.Equal(8, history.Length);
        Assert.Equal(1, history.Single(v => v.Version == 8).RestoredFromVersion);
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
