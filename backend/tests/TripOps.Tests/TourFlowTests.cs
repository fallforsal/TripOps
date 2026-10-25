using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private const string Root = "/api/v1/agency/tours";
    private sealed class App : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection connection = new("Data Source=:memory:");
        public App() => connection.Open();
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services => {
                services.RemoveAll<DbContextOptions<TripOpsDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<TripOpsDbContext>>();
                services.AddDbContext<TripOpsDbContext>(o => o.UseSqlite(connection));
                services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
            });
        }
        public async Task Initialize()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            await db.Database.EnsureCreatedAsync();
            foreach (var (id, role) in new[] { ("agency", UserRole.TravelAgency), ("other", UserRole.TravelAgency),
                ("pending", UserRole.TravelAgency), ("provider", UserRole.Provider), ("customer", UserRole.Customer), ("admin", UserRole.Admin) })
            {
                var user = new User { Id = id, Name = id, Email = $"{id}@example.test", Role = role, Status = UserStatus.Active };
                user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "TourTest123!");
                if (role is UserRole.TravelAgency or UserRole.Provider)
                    user.BusinessProfile = new BusinessProfile { UserId = id, BusinessName = id,
                        Status = id == "pending" ? BusinessProfileStatus.Pending : BusinessProfileStatus.Approved };
                db.Users.Add(user);
            }
            db.Services.AddRange(
                new Data.Entities.Service { Id = 101, ProviderId = "provider", Name = "Attraction", Category = ServiceCategory.Attraction, Status = ServiceStatus.Approved },
                new Data.Entities.Service { Id = 102, ProviderId = "provider", Name = "Hotel", Category = ServiceCategory.Hotel, Status = ServiceStatus.Approved },
                new Data.Entities.Service { Id = 103, ProviderId = "provider", Name = "Meal", Category = ServiceCategory.Fnb, Status = ServiceStatus.Approved },
                new Data.Entities.Service { Id = 104, ProviderId = "provider", Name = "Transport", Category = ServiceCategory.Transportation, Status = ServiceStatus.Approved },
                new Data.Entities.Service { Id = 105, ProviderId = "provider", Name = "Unreviewed active", Category = ServiceCategory.Attraction, Status = ServiceStatus.Active },
                new Data.Entities.Service { Id = 106, ProviderId = "provider", Name = "Hidden", Category = ServiceCategory.Attraction, Status = ServiceStatus.Hidden },
                new Data.Entities.Service { Id = 107, ProviderId = "provider", Name = "Suspended", Category = ServiceCategory.Attraction, Status = ServiceStatus.Suspended },
                new Data.Entities.Service { Id = 108, ProviderId = "provider", Name = "Draft", Category = ServiceCategory.Attraction, Status = ServiceStatus.Draft });
            await db.SaveChangesAsync();
        }
        public async Task<HttpClient> Login(string id)
        {
            var client = CreateClient();
            var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email = $"{id}@example.test", password = "TourTest123!" });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return client;
        }
        public async Task Inspect(Func<TripOpsDbContext, Task> action)
        {
            using var scope = Services.CreateScope();
            await action(scope.ServiceProvider.GetRequiredService<TripOpsDbContext>());
        }
        protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) connection.Dispose(); }
    }
    private static TourConfiguration Complete(string name = "Da Lat tour") => new(name,
        Description: "Two day trip", Destination: "Da Lat", DurationDays: 2, DurationNights: 1,
        BasePrice: 1500000.5m, MinGuests: 2, MaxGuests: 30, CancellationPolicy: "Cancellation terms",
        Images: ["https://example.test/tour.jpg"],
        PricingTiers: [new("Child", 0, 11, 750000), new("Adult", 12, null, 1500000, 1)],
        Timelines: [new(1, "Arrival", TransportationServiceId: 104,
            Activities: [new("Gardens", 101, EstimatedTime: TimeSpan.FromHours(9))],
            Meals: [new("lunch", "Restaurant", 103), new("lunch", "Alternative", 103, IsDefault: false, PriceDifference: -10000)],
            Accommodations: [new("Hotel", "Da Lat", 102), new("Premium", "Da Lat", 102, IsDefault: false, PriceDifference: 100000)]),
            new(2, "Departure")]);
    private static async Task<T> Read<T>(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        Assert.True(response.StatusCode == expected, $"Expected {expected}, got {response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }
    private static Task<TourDto> Create(HttpClient agency, TourConfiguration? config = null) => CreateCore(agency, config ?? Complete());
    private static async Task<TourDto> CreateCore(HttpClient agency, TourConfiguration config) =>
        await Read<TourDto>(await agency.PostAsJsonAsync(Root, config), HttpStatusCode.Created);
    private static async Task<TourDto> Command(HttpClient client, TourDto tour, string action, bool admin = false, string? reason = null) =>
        await Read<TourDto>(await client.PostAsJsonAsync($"{(admin ? "/api/v1/admin/tours" : Root)}/{tour.Id}/{action}", new TourCommand(tour.Version, reason)));

    [Fact]
    public async Task Draft_persists_full_configuration_and_uses_authenticated_owner()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var response = await agency.PostAsJsonAsync(Root, Complete());
        var tour = await Read<TourDto>(response, HttpStatusCode.Created);
        Assert.EndsWith($"/{tour.Id}", response.Headers.Location!.ToString());
        Assert.Equal("agency", tour.AgencyId); Assert.Equal("draft", tour.Status); Assert.Equal("hidden", tour.Visibility);
        Assert.Equal(1, tour.Version);
        Assert.Equal(1500001, tour.Configuration.BasePrice);
        var stored = (await agency.GetFromJsonAsync<TourDto>($"{Root}/{tour.Id}"))!;
        Assert.Equal(2, stored.Configuration.Timelines!.Length);
        Assert.Equal(-10000, stored.Configuration.Timelines[0].Meals![1].PriceDifference);
        Assert.Equal(12, stored.Configuration.PricingTiers![1].MinAge);
        await app.Inspect(async db => {
            Assert.Equal(4, await db.Services.CountAsync(s => s.Status == ServiceStatus.Approved));
            Assert.Equal(0, await db.BookingTimelines.CountAsync());
            Assert.Equal(1, await db.TourVersions.CountAsync());
            Assert.Equal("agency", (await db.TourVersions.SingleAsync()).CreatedBy);
        });
    }

    [Fact]
    public async Task Identity_roles_approval_ownership_and_mass_assignment_are_enforced()
    {
        await using var app = new App(); await app.Initialize(); using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync(Root, new { name = "Test" })).StatusCode);
        foreach (var role in new[] { "customer", "provider", "admin", "pending" })
        { using var client = await app.Login(role); Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(Root, new { name = "Test" })).StatusCode); }
        using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var tour = await Read<TourDto>(await agency.PostAsJsonAsync(Root, new { name = "Owned", agencyId = "other", status = "completed", visibility = "public", approvalStatus = "approved", version = 99 }), HttpStatusCode.Created);
        Assert.Equal("agency", tour.AgencyId); Assert.Equal("draft", tour.Status); Assert.Equal(1, tour.Version);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"{Root}/{tour.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"{Root}/{tour.Id}", new UpdateTourRequest(1, Complete(), "Edit"))).StatusCode);
        foreach (var action in new[] { "publish", "hide", "duplicate" })
            Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsJsonAsync($"{Root}/{tour.Id}/{action}", new { version = 1, name = "Copy", reason = "Change" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"{Root}/{tour.Id}?version=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"{Root}/{tour.Id}/versions/1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsJsonAsync($"{Root}/{tour.Id}/versions/1/restore", new TourCommand(1, "Restore"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.PostAsJsonAsync($"/api/v1/admin/tours/{tour.Id}/hide", new TourCommand(1, "Moderation"))).StatusCode);
    }

    [Theory]
    [InlineData(105)] [InlineData(106)] [InlineData(107)] [InlineData(108)] [InlineData(999)] [InlineData(102)]
    public async Task Ineligible_or_wrong_category_service_is_rejected_atomically(int serviceId)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = Complete() with { Timelines = [new(1, "Day", Activities: [new("Invalid", serviceId)])] };
        var response = await agency.PostAsJsonAsync(Root, config);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Contains("traceId", await response.Content.ReadAsStringAsync());
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        await app.Inspect(async db => { Assert.Equal(0, await db.Tours.CountAsync()); Assert.Equal(0, await db.TourVersions.CountAsync()); });
    }

    [Theory]
    [InlineData("guestRange")] [InlineData("days")] [InlineData("ageOverlap")]
    [InlineData("defaultDelta")] [InlineData("noDefault")] [InlineData("time")]
    [InlineData("nightOverflow")] [InlineData("image")]
    public async Task Invalid_configuration_fails_without_persistence(string invalid)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var config = invalid switch {
            "guestRange" => Complete() with { MinGuests = 40, MaxGuests = 20 },
            "days" => Complete() with { Timelines = [new(1, "One"), new(1, "Duplicate")] },
            "ageOverlap" => Complete() with { PricingTiers = [new("Child", 0, 12, 1), new("Adult", 12, null, 2)] },
            "defaultDelta" => Complete() with { Timelines = [new(1, "Day", Meals: [new("lunch", "Meal", PriceDifference: 1)])] },
            "noDefault" => Complete() with { Timelines = [new(1, "Day", Meals: [new("lunch", "Meal", IsDefault: false)])] },
            "time" => Complete() with { Timelines = [new(1, "Day", Activities: [new("Visit", EstimatedTime: TimeSpan.FromDays(1))])] },
            "nightOverflow" => Complete() with { Timelines = [new(2, "Day", Accommodations: [new("Hotel", "City")])] },
            _ => Complete() with { Images = ["javascript:alert(1)"] }
        };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(Root, config)).StatusCode);
        await app.Inspect(async db => Assert.Equal(0, await db.Tours.CountAsync()));
    }

    [Fact]
    public async Task Request_validation_and_incomplete_draft_submission_are_distinct()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PostAsJsonAsync(Root, new { name = "", durationDays = 0 })).StatusCode);
        var tour = await Create(agency, new("Basic draft"));
        var validation = await agency.GetFromJsonAsync<TourValidationResult>($"{Root}/{tour.Id}/validation");
        Assert.False(validation!.IsValid);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(1))).StatusCode);
        await app.Inspect(async db => Assert.Equal(1, await db.TourVersions.CountAsync()));
    }

    [Fact]
    public async Task Direct_publish_hide_edit_restore_preserve_versions_and_admin_moderation()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        using var admin = await app.Login("admin"); using var publicClient = app.CreateClient();
        var tour = await Create(agency);
        var original = (await agency.GetFromJsonAsync<TourVersionDto>($"{Root}/{tour.Id}/versions/1"))!.SnapshotData;
        Assert.Equal(HttpStatusCode.NotFound, (await publicClient.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        tour = await Command(agency, tour, "publish");
        Assert.Equal("completed", tour.Status); Assert.Equal("public", tour.Visibility);
        var queue = await admin.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/admin/tours"); Assert.Equal(1, queue!.Total);
        var published = await publicClient.GetFromJsonAsync<PublicTourDto>($"/api/v1/tours/{tour.Id}"); Assert.Equal(tour.Id, published!.Id);
        var publicBody = await (await publicClient.GetAsync($"/api/v1/tours/{tour.Id}")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("reviewedBy", publicBody); Assert.DoesNotContain("rejectionReason", publicBody);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.DeleteAsync($"{Root}/{tour.Id}?version={tour.Version}")).StatusCode);
        tour = await Command(agency, tour, "hide", reason: "Maintenance");
        Assert.Equal(HttpStatusCode.NotFound, (await publicClient.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        tour = await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}", new UpdateTourRequest(tour.Version, Complete("New itinerary"), "Updated itinerary")));
        Assert.Equal("draft", tour.Status); Assert.Equal("hidden", tour.Visibility);
        tour = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/versions/1/restore", new TourCommand(tour.Version, "Restore original")));
        Assert.Equal(5, tour.Version); Assert.Equal("Da Lat tour", tour.Configuration.Name); Assert.Equal("draft", tour.Status);
        Assert.Equal(original, (await agency.GetFromJsonAsync<TourVersionDto>($"{Root}/{tour.Id}/versions/1"))!.SnapshotData);
        var versions = await agency.GetFromJsonAsync<TourPage<TourVersionDto>>($"{Root}/{tour.Id}/versions?pageSize=2");
        Assert.Equal(5, versions!.Total); Assert.Equal(2, versions.Items.Count); Assert.Equal(5, versions.Items[0].Version);
        await app.Inspect(async db => {
            Assert.Equal(2, await db.TourTimelines.CountAsync(d => d.TourId == tour.Id));
            Assert.Equal(2, await db.TourPricingTiers.CountAsync(p => p.TourId == tour.Id));
            Assert.Equal(2, await db.TourMeals.CountAsync(m => m.TourTimeline.TourId == tour.Id));
            Assert.Equal(2, await db.TourAccommodations.CountAsync(a => a.TourTimeline.TourId == tour.Id));
            var snapshot = await db.TourVersions.SingleAsync(v => v.TourId == tour.Id && v.VersionNumber == 2);
            using var json = JsonDocument.Parse(snapshot.SnapshotData);
            Assert.Equal("public", json.RootElement.GetProperty("visibility").GetString());
            snapshot.ChangeLog = "tampered";
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        });
    }

    [Fact]
    public async Task Tour_approval_routes_are_removed_and_agency_can_publish_without_admin()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency"); using var admin = await app.Login("admin");
        var tour = await Create(agency);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/submit", new TourCommand(1))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"/api/v1/admin/tours/{tour.Id}/approve", new TourCommand(1))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"/api/v1/admin/tours/{tour.Id}/reject", new TourCommand(1))).StatusCode);
        tour = await Command(agency, tour, "publish");
        Assert.Equal("public", tour.Visibility);
    }

    [Fact]
    public async Task Service_and_provider_eligibility_are_rechecked_before_publish()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var tour = await Create(agency);
        await app.Inspect(async db => { (await db.Services.SingleAsync(s => s.Id == 101)).Status = ServiceStatus.Hidden; await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);
        await app.Inspect(async db => { (await db.Services.SingleAsync(s => s.Id == 101)).Status = ServiceStatus.Approved; await db.SaveChangesAsync(); });
        await app.Inspect(async db => { (await db.BusinessProfiles.SingleAsync(p => p.UserId == "provider")).Status = BusinessProfileStatus.Suspended; await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);
    }

    [Fact]
    public async Task Public_filters_exclude_private_and_suspended_agencies_and_page_deterministically()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency"); using var admin = await app.Login("admin"); using var client = app.CreateClient();
        var tour = await Create(agency); tour = await Command(agency, tour, "publish");
        await Create(agency, Complete("Unpublished"));
        var page = await client.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/tours?destination=Da%20Lat&maxPrice=2000000&headcount=10&pageSize=1");
        Assert.Equal(1, page!.Total); Assert.Equal(tour.Id, Assert.Single(page.Items).Id);
        Assert.Equal(0, (await client.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/tours?headcount=100"))!.Total);
        Assert.Equal(0, (await client.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/tours?maxPrice=1"))!.Total);
        tour = await Command(admin, tour, "hide", true, "Review public listing");
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        tour = await Command(agency, tour, "publish");
        await app.Inspect(async db => { (await db.BusinessProfiles.SingleAsync(p => p.UserId == "agency")).Status = BusinessProfileStatus.Suspended; await db.SaveChangesAsync(); });
        Assert.Equal(0, (await client.GetFromJsonAsync<TourPage<TourListItem>>("/api/v1/tours"))!.Total);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.GetAsync(Root)).StatusCode);
    }

    [Fact]
    public async Task Duplicate_and_soft_delete_do_not_copy_or_remove_history()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var tour = await Create(agency);
        var copy = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/duplicate", new DuplicateTourRequest("Copied tour")), HttpStatusCode.Created);
        Assert.NotEqual(tour.Code, copy.Code); Assert.NotEqual(tour.Id, copy.Id); Assert.Equal(1, copy.Version);
        Assert.Equal(HttpStatusCode.NoContent, (await agency.DeleteAsync($"{Root}/{tour.Id}?version=1")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync($"{Root}/{tour.Id}")).StatusCode);
        Assert.Equal(2, (await agency.GetFromJsonAsync<TourPage<TourVersionDto>>($"{Root}/{tour.Id}/versions"))!.Total);
        await app.Inspect(async db => {
            var deleted = await db.Tours.IgnoreQueryFilters().SingleAsync(t => t.Id == tour.Id);
            Assert.True(deleted.IsDeleted); Assert.Equal(TourStatus.Deleted, deleted.Status);
            Assert.Equal(2, await db.TourVersions.CountAsync(v => v.TourId == tour.Id));
            Assert.Equal(2, await db.TourTimelines.CountAsync(d => d.TourId == tour.Id));
        });
    }

    [Fact]
    public async Task Concurrent_writers_cannot_overwrite_history_or_configuration()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var tour = await Create(agency);
        using var scope1 = app.Services.CreateScope(); using var scope2 = app.Services.CreateScope();
        // Both contexts load the same version before either writes.
        var firstDb = scope1.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var secondDb = scope2.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var first = await firstDb.Tours.SingleAsync(t => t.Id == tour.Id);
        var second = await secondDb.Tours.SingleAsync(t => t.Id == tour.Id);
        first.Version++; first.Name = "First writer"; await firstDb.SaveChangesAsync();
        second.Version++; second.Name = "Second writer";
        secondDb.TourVersions.Add(new TourVersion { TourId = tour.Id, VersionNumber = 2, SnapshotData = "{}" });
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => secondDb.SaveChangesAsync());
        await app.Inspect(async db => {
            Assert.Equal("First writer", (await db.Tours.SingleAsync()).Name);
            Assert.False(await db.TourVersions.AnyAsync(v => v.VersionNumber == 2));
        });
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PutAsJsonAsync($"{Root}/{tour.Id}", new UpdateTourRequest(1, Complete(), "Stale"))).StatusCode);
    }

    [Fact]
    public async Task Ai_is_optional_and_unconfigured_boundary_writes_nothing()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await agency.PostAsJsonAsync("/api/v1/agency/ai/itinerary-drafts", new AiDraftRequest("Da Lat", 2))).StatusCode);
        await app.Inspect(async db => Assert.Equal(0, await db.Tours.CountAsync()));
        Assert.False((await Create(agency)).IsAiGenerated);
    }

    [Fact]
    public async Task Agency_catalogue_returns_only_eligible_services_and_authoritative_provider_references()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        using var customer = await app.Login("customer");
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/services")).StatusCode);
        var catalogue = await agency.GetFromJsonAsync<TourPage<TourServiceReference>>("/api/v1/services?category=hotel&pageSize=1");
        Assert.Equal(1, catalogue!.Total); Assert.Equal(102, Assert.Single(catalogue.Items).Id);
        var item = await agency.GetFromJsonAsync<TourServiceReference>("/api/v1/services/101");
        Assert.Equal("provider", item!.ProviderId);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync("/api/v1/services/105")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.GetAsync("/api/v1/services?category=unknown")).StatusCode);
        await app.Inspect(async db => { (await db.Users.SingleAsync(u => u.Id == "provider")).IsDeleted = true; await db.SaveChangesAsync(); });
        Assert.Equal(0, (await agency.GetFromJsonAsync<TourPage<TourServiceReference>>("/api/v1/services"))!.Total);
    }

    [Fact]
    public async Task Custom_tours_remain_private_even_with_complete_configuration()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var tour = await Create(agency);
        await app.Inspect(async db => { (await db.Tours.SingleAsync()).IsRequest = true; await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);
        using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
    }

    private sealed class DraftGenerator(TourConfiguration result) : IItineraryDraftGenerator
    {
        public Task<TourConfiguration> Generate(AiDraftRequest request, CancellationToken ct) => Task.FromResult(result);
    }

    [Fact]
    public async Task Ai_boundary_validates_generated_configuration_and_keeps_it_private()
    {
        await using var app = new App(); await app.Initialize();
        await using var configured = app.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton<IItineraryDraftGenerator>(new DraftGenerator(Complete()))));
        using var agency = configured.CreateClient();
        (await agency.PostAsJsonAsync("/api/v1/auth/login", new { email = "agency@example.test", password = "TourTest123!" })).EnsureSuccessStatusCode();
        var tour = await Read<TourDto>(await agency.PostAsJsonAsync("/api/v1/agency/ai/itinerary-drafts", new AiDraftRequest("Da Lat", 2)), HttpStatusCode.Created);
        Assert.True(tour.IsAiGenerated); Assert.Equal("draft", tour.Status); Assert.Equal("hidden", tour.Visibility);
        await using var invalid = app.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton<IItineraryDraftGenerator>(new DraftGenerator(Complete() with { Timelines = [new(1, "Day", Activities: [new("Unreviewed", 105)])] }))));
        using var invalidClient = invalid.CreateClient();
        (await invalidClient.PostAsJsonAsync("/api/v1/auth/login", new { email = "agency@example.test", password = "TourTest123!" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await invalidClient.PostAsJsonAsync("/api/v1/agency/ai/itinerary-drafts", new AiDraftRequest("Da Lat", 2))).StatusCode);
        await app.Inspect(async db => Assert.Equal(1, await db.Tours.CountAsync()));
    }
}
