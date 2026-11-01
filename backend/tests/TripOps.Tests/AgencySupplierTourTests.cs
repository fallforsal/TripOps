using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Agency_directory_is_private_and_tour_keeps_its_snapshot()
    {
        await using var app = new App(); await app.Initialize();
        using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var supplier = await Read<SupplierDto>(await agency.PostAsJsonAsync("/api/v1/agency/suppliers",
            new SupplierRequest("HOTEL", "Private hotel", "Old address", "Da Lat", ReferencePrice: 100000, Conditions: "Breakfast")));
        Assert.Single(await Read<SupplierDto[]>(await agency.GetAsync("/api/v1/agency/suppliers?type=HOTEL")));
        Assert.Empty(await Read<SupplierDto[]>(await other.GetAsync("/api/v1/agency/suppliers?type=HOTEL")));
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"/api/v1/agency/suppliers/{supplier.Id}",
            new SupplierRequest("HOTEL", "Changed"))).StatusCode);

        var snapshot = new SupplierSnapshotInput("Old address", "Da Lat", ReferencePrice: 100000, Conditions: "Breakfast");
        var baseConfig = Complete();
        var days = baseConfig.Timelines!;
        var config = baseConfig with { Timelines = [days[0] with { Accommodations = [
            new AccommodationInput("Private hotel", "Da Lat", AgencySupplierId: supplier.Id,
                SupplierSource: SupplierSources.AgencySupplier, Supplier: snapshot),
            new AccommodationInput("Partner hotel", "Da Lat", IsDefault: false, PriceDifference: 100000,
                ServiceId: 102, SupplierSource: SupplierSources.PlatformPartner)] }, days[1]] };
        var tour = await Create(agency, config);
        var published = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version)));
        Assert.Equal("completed", published.Status);
        Assert.Equal(supplier.Id, published.Configuration.Timelines![0].Accommodations![0].AgencySupplierId);
        await Read<SupplierDto>(await agency.PutAsJsonAsync($"/api/v1/agency/suppliers/{supplier.Id}",
            new SupplierRequest("HOTEL", "Private hotel", "New address", "Da Lat", ReferencePrice: 200000)));
        var loaded = await Read<TourDto>(await agency.GetAsync($"{Root}/{tour.Id}"));
        Assert.Equal("Old address", loaded.Configuration.Timelines![0].Accommodations![0].Supplier!.Address);
        Assert.Equal(100000, loaded.Configuration.Timelines![0].Accommodations![0].Supplier!.ReferencePrice);
        var restaurant = await Read<SupplierDto>(await agency.PostAsJsonAsync("/api/v1/agency/suppliers",
            new SupplierRequest("RESTAURANT", "Private restaurant", "Market street", "Da Lat", ReferencePrice: 50000)));
        var second = config with { Name = "Second tour", Timelines = [days[0] with {
            Meals = [new MealInput("lunch", "Private restaurant", SupplierSource: SupplierSources.AgencySupplier,
                AgencySupplierId: restaurant.Id, Supplier: new SupplierSnapshotInput("Market street", "Da Lat", ReferencePrice: 50000))],
            Accommodations = [new AccommodationInput("Private hotel", "Da Lat", AgencySupplierId: supplier.Id,
                SupplierSource: SupplierSources.AgencySupplier,
                Supplier: new SupplierSnapshotInput("New address", "Da Lat", ReferencePrice: 200000))]
        }, days[1]] };
        var tour2 = await Create(agency, second);
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour2.Id}/publish", new TourCommand(tour2.Version)));
        Assert.Equal(2, (await Read<SupplierDto[]>(await agency.GetAsync("/api/v1/agency/suppliers"))).Length);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await other.PostAsJsonAsync(Root, config)).StatusCode);
    }

    [Fact]
    public async Task Explicit_agency_option_without_location_and_reference_price_cannot_publish()
    {
        await using var app = new App(); await app.Initialize();
        using var agency = await app.Login("agency");
        var config = Complete(); var days = config.Timelines!;
        var invalid = config with { Timelines = [days[0] with { Accommodations = [
            new AccommodationInput("Missing supplier details", "Da Lat", SupplierSource: SupplierSources.AgencySupplier)] }, days[1]] };
        var tour = await Create(agency, invalid);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);
    }

    [Fact]
    public async Task Platform_partner_only_tour_still_publishes()
    {
        await using var app = new App(); await app.Initialize();
        using var agency = await app.Login("agency");
        var config = Complete(); var days = config.Timelines!;
        var partner = config with { Timelines = [days[0] with {
            Meals = [new MealInput("lunch", "Partner restaurant", ServiceId: 103, SupplierSource: SupplierSources.PlatformPartner)],
            Accommodations = [new AccommodationInput("Partner hotel", "Da Lat", ServiceId: 102,
                SupplierSource: SupplierSources.PlatformPartner)] }, days[1]] };
        var tour = await Create(agency, partner);
        var published = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version)));
        Assert.Equal("completed", published.Status);
        Assert.Equal(102, published.Configuration.Timelines![0].Accommodations![0].ServiceId);
        Assert.Equal(103, published.Configuration.Timelines![0].Meals![0].ServiceId);
    }
}
