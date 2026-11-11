using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Supplier_archive_removes_directory_choices_and_preserves_hotel_and_meal_snapshots()
    {
        await using var app = new App(); await app.Initialize();
        await SupplierArchiveScenario(app);
    }

    private static async Task SupplierArchiveScenario(App app)
    {
        const string directory = "/api/v1/agency/suppliers";
        using var agency = await app.Login("agency");
        var hotel = await Read<SupplierDto>(await agency.PostAsJsonAsync(directory,
            new SupplierRequest("HOTEL", "Archive hotel", "Hotel address", "Da Lat", ContactName: "Hotel contact", ContactPhone: "0901000001", ReferencePrice: 650000)));
        var restaurant = await Read<SupplierDto>(await agency.PostAsJsonAsync(directory,
            new SupplierRequest("RESTAURANT", "Archive restaurant", "Meal address", "Da Lat", ReferencePrice: 150000)));
        Assert.Equal(hotel, await Read<SupplierDto>(await agency.GetAsync($"{directory}/{hotel.Id}")));
        Assert.Equal(hotel.Id, Assert.Single(await Read<SupplierDto[]>(await agency.GetAsync($"{directory}?type=HOTEL&search=0901000001"))).Id);
        var config = Complete();
        config = config with { Timelines = [config.Timelines![0] with {
            Accommodations = [new AccommodationInput(hotel.Name, "Da Lat", SupplierSource: "AGENCY_SUPPLIER", AgencySupplierId: hotel.Id,
                Supplier: new SupplierSnapshotInput(hotel.Address, hotel.Area, ReferencePrice: hotel.ReferencePrice))],
            Meals = [new MealInput("lunch", restaurant.Name, SupplierSource: "AGENCY_SUPPLIER", AgencySupplierId: restaurant.Id,
                Supplier: new SupplierSnapshotInput(restaurant.Address, restaurant.Area, ReferencePrice: restaurant.ReferencePrice))]
        }, config.Timelines[1]] };
        var tour = await Create(agency, config);
        var published = await Command(agency, tour, "publish");
        foreach (var supplier in new[] { hotel, restaurant })
        {
            Assert.Equal(HttpStatusCode.NoContent, (await agency.DeleteAsync($"{directory}/{supplier.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await agency.DeleteAsync($"{directory}/{supplier.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync($"{directory}/{supplier.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await agency.PutAsJsonAsync($"{directory}/{supplier.Id}", new SupplierRequest(supplier.Type, "Cannot reactivate"))).StatusCode);
            Assert.DoesNotContain(await Read<SupplierDto[]>(await agency.GetAsync($"{directory}?type={supplier.Type}")), s => s.Id == supplier.Id);
        }
        Assert.Empty(await Read<SupplierDto[]>(await agency.GetAsync(directory)));
        await app.Inspect(async db => {
            Assert.Equal(2, await db.AgencySuppliers.CountAsync(s => s.Status == AgencySupplier.Archived));
            Assert.True(await db.TourAccommodations.AnyAsync(a => a.AgencySupplierId == hotel.Id));
            Assert.True(await db.TourMeals.AnyAsync(m => m.AgencySupplierId == restaurant.Id));
        });
        var loaded = await Read<TourDto>(await agency.GetAsync($"{Root}/{tour.Id}"));
        Assert.Equal("Hotel address", loaded.Configuration.Timelines![0].Accommodations![0].Supplier!.Address);
        Assert.Equal(150000, loaded.Configuration.Timelines[0].Meals![0].Supplier!.ReferencePrice);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.GetAsync($"{Root}/{tour.Id}/versions/{published.Version}")).StatusCode);
        await app.Inspect(async db => Assert.NotNull((await db.Tours.SingleAsync(t=>t.Id==tour.Id)).ConfigurationData));
        // Existing tours remain editable even though their saved supplier links are archived.
        await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}", new UpdateTourRequest(loaded.Revision, loaded.Configuration, "Keep historical suppliers")));
    }

    [Fact]
    public async Task Supplier_details_and_delete_enforce_agency_role_and_ownership()
    {
        const string directory = "/api/v1/agency/suppliers";
        await using var app = new App(); await app.Initialize();
        using var agency = await app.Login("agency");
        var supplier = await Read<SupplierDto>(await agency.PostAsJsonAsync(directory, new SupplierRequest("HOTEL", "Owned supplier")));
        using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync($"{directory}/{supplier.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync($"{directory}/{supplier.Id}")).StatusCode);
        foreach (var role in new[] { "customer", "provider", "admin", "pending" })
        {
            using var client = await app.Login(role);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"{directory}/{supplier.Id}")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"{directory}/{supplier.Id}")).StatusCode);
        }
        using var other = await app.Login("other");
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"{directory}/{supplier.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"{directory}/{supplier.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync($"{directory}/999999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.DeleteAsync($"{directory}/999999")).StatusCode);
        Assert.Single(await Read<SupplierDto[]>(await agency.GetAsync(directory)));
    }

    [Fact]
    public async Task Supplier_directory_does_not_silently_drop_entries_after_first_hundred()
    {
        await using var app = new App(); await app.Initialize();
        await app.Inspect(async db => {
            db.AgencySuppliers.AddRange(Enumerable.Range(1, 105).Select(i => new AgencySupplier { AgencyId = "agency", Name = $"Supplier {i:D3}" }));
            await db.SaveChangesAsync();
        });
        using var agency = await app.Login("agency");
        Assert.Equal(105, (await Read<SupplierDto[]>(await agency.GetAsync("/api/v1/agency/suppliers"))).Length);
    }

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
        var published = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Revision)));
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
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour2.Id}/publish", new TourCommand(tour2.Revision)));
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
            (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Revision))).StatusCode);
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
        var published = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Revision)));
        Assert.Equal("completed", published.Status);
        Assert.Equal(102, published.Configuration.Timelines![0].Accommodations![0].ServiceId);
        Assert.Equal(103, published.Configuration.Timelines![0].Meals![0].ServiceId);
    }
}
