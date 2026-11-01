using System.Net;
using System.Net.Http.Json;
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
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed class BookingSnapshotFlowTests
{
    private sealed class App : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection connection = new("Data Source=:memory:");
        public App() => connection.Open();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services =>
            {
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

            var hasher = new PasswordHasher<User>();

            var agency = new User
            {
                Id = "agency1",
                Name = "Agency One",
                Email = "agency1@example.test",
                Role = UserRole.TravelAgency,
                Status = UserStatus.Active
            };
            agency.PasswordHash = hasher.HashPassword(agency, "Password123!");
            agency.BusinessProfile = new BusinessProfile
            {
                UserId = "agency1",
                BusinessName = "Agency One Ltd",
                Status = BusinessProfileStatus.Approved
            };
            db.Users.Add(agency);

            var agency2 = new User
            {
                Id = "agency2",
                Name = "Agency Two",
                Email = "agency2@example.test",
                Role = UserRole.TravelAgency,
                Status = UserStatus.Active
            };
            agency2.PasswordHash = hasher.HashPassword(agency2, "Password123!");
            db.Users.Add(agency2);

            var customer = new User
            {
                Id = "customer1",
                Name = "Customer One",
                Email = "customer1@example.test",
                Role = UserRole.User,
                Status = UserStatus.Active
            };
            customer.PasswordHash = hasher.HashPassword(customer, "Password123!");
            db.Users.Add(customer);

            var customer2 = new User
            {
                Id = "customer2",
                Name = "Customer Two",
                Email = "customer2@example.test",
                Role = UserRole.User,
                Status = UserStatus.Active
            };
            customer2.PasswordHash = hasher.HashPassword(customer2, "Password123!");
            db.Users.Add(customer2);

            var tour = new Tour
            {
                Id = 1,
                AgencyId = "agency1",
                Code = "TO-DN3N2D",
                Name = "Tour Đà Nẵng 3N2Đ Ban Đầu",
                BasePrice = 3000000,
                DurationDays = 3,
                DurationNights = 2,
                MinGuests = 1,
                MaxGuests = 20,
                Status = TourStatus.Completed,
                Visibility = TourVisibility.Public,
                PricingTiers =
                [
                    new TourPricingTier { Id = 1, TourId = 1, Name = "Người lớn", MinAge = 12, MaxAge = 100, PricePerGuest = 3000000 }
                ]
            };
            db.Tours.Add(tour);

            await db.SaveChangesAsync();
        }

        public async Task<HttpClient> Client(string email)
        {
            var client = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, BaseAddress = new Uri("http://localhost") });
            var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Password123!" });
            response.EnsureSuccessStatusCode();
            return client;
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            connection.Dispose();
        }
    }

    [Fact]
    public async Task BookingSnapshot_FullLifecycle_AndImmutability()
    {
        using var app = new App();
        await app.Initialize();

        var customer = await app.Client("customer1@example.test");
        var customer2 = await app.Client("customer2@example.test");
        var agency = await app.Client("agency1@example.test");
        var agency2 = await app.Client("agency2@example.test");

        // 1. Create booking generates initial_request snapshot version 1
        var createRequest = new CreateBookingRequest(
            TourId: 1,
            StartDate: DateTime.UtcNow.Date.AddDays(7),
            ContactName: "Customer One",
            ContactPhone: "0901234567",
            ContactEmail: "customer1@example.test",
            SpecialRequests: "Yêu cầu phòng tầng cao",
            Participants:
            [
                new ParticipantInput("Customer One", "0901234567", new DateTime(1990, 1, 1), "Nam", "123456789", 1)
            ]);

        var createRes = await customer.PostAsJsonAsync("/api/v1/bookings", createRequest);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(created);
        int bookingId = created.Id;

        Assert.Equal("initial_pending", created.SnapshotStatus);
        Assert.NotNull(created.InitialRequestSnapshot);
        Assert.Equal(1, created.InitialRequestSnapshot.Version);
        Assert.Equal("initial_request", created.InitialRequestSnapshot.SnapshotType);
        Assert.Null(created.AgreedSnapshot);
        Assert.Null(created.LatestProposal);
        Assert.Equal("Tour Đà Nẵng 3N2Đ Ban Đầu", created.TourName);

        // 2. Modifying original catalog tour MUST NOT alter historical booking commercial fields
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var originalTour = await db.Tours.FindAsync(1);
            Assert.NotNull(originalTour);
            originalTour.Name = "TÊN TOUR ĐÃ ĐỔI HOÀN TOÀN";
            originalTour.BasePrice = 99999999;
            await db.SaveChangesAsync();
        }

        var fetchRes = await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{bookingId}");
        Assert.NotNull(fetchRes);
        // Tour name in historical booking DTO remains locked to snapshot!
        Assert.Equal("Tour Đà Nẵng 3N2Đ Ban Đầu", fetchRes.TourName);
        Assert.Equal(3000000, fetchRes.TotalAmount);

        // 3. List snapshots returns version 1
        var snapshots = await customer.GetFromJsonAsync<List<BookingSnapshotSummaryDto>>($"/api/v1/bookings/{bookingId}/snapshots");
        Assert.NotNull(snapshots);
        Assert.Single(snapshots);
        Assert.Equal(1, snapshots[0].Version);
        Assert.Equal("initial_request", snapshots[0].SnapshotType);

        var snapDetail = await customer.GetFromJsonAsync<BookingSnapshotDto>($"/api/v1/bookings/{bookingId}/snapshots/{snapshots[0].Id}");
        Assert.NotNull(snapDetail);
        Assert.Equal(1, snapDetail.SnapshotData.SchemaVersion);
        Assert.Equal("Tour Đà Nẵng 3N2Đ Ban Đầu", snapDetail.SnapshotData.TourName);

        // 4. Unauthorized agency cannot create proposal
        var unauthAgencyRes = await agency2.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/proposals", new CreateProposalRequest("Phương án sai"));
        Assert.Equal(HttpStatusCode.Forbidden, unauthAgencyRes.StatusCode);

        // 5. Authorized Agency creates proposal (version 2)
        var createProposalRes = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/proposals", new CreateProposalRequest("Nâng cấp phòng hướng biển"));
        Assert.Equal(HttpStatusCode.OK, createProposalRes.StatusCode);
        var proposal = await createProposalRes.Content.ReadFromJsonAsync<BookingSnapshotDto>();
        Assert.NotNull(proposal);
        Assert.Equal(2, proposal.Version);
        Assert.Equal("proposal", proposal.SnapshotType);
        Assert.Null(proposal.AcceptedAt);
        Assert.Null(proposal.AcceptedBy);
        Assert.Contains("Nâng cấp phòng hướng biển", proposal.SnapshotData.CustomerNotes);
        Assert.Equal("Tour Đà Nẵng 3N2Đ Ban Đầu", proposal.SnapshotData.TourName);
        Assert.Equal(3000000, proposal.SnapshotData.BasePrice);
        Assert.Equal(created.InitialRequestSnapshot.SourceTourVersion, proposal.SourceTourVersion);
        Assert.Single(proposal.SnapshotData.PricingTiers);
        Assert.Equal(3000000, proposal.SnapshotData.PricingTiers[0].PricePerGuest);

        // Booking status is proposal_pending
        var afterProposal = await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{bookingId}");
        Assert.NotNull(afterProposal);
        Assert.Equal("proposal_pending", afterProposal.SnapshotStatus);
        Assert.NotNull(afterProposal.LatestProposal);
        Assert.Equal(2, afterProposal.LatestProposal.Version);

        // 6. Another customer cannot accept proposal
        var wrongCustomerAccept = await customer2.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/snapshots/{proposal.Id}/accept", new { });
        Assert.Equal(HttpStatusCode.Forbidden, wrongCustomerAccept.StatusCode);

        // 7. Booking owner accepts proposal -> transitions to agreed
        var acceptRes = await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/snapshots/{proposal.Id}/accept", new { });
        Assert.Equal(HttpStatusCode.OK, acceptRes.StatusCode);
        var agreedBooking = await acceptRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(agreedBooking);
        Assert.Equal("agreed", agreedBooking.SnapshotStatus);
        Assert.NotNull(agreedBooking.AgreedSnapshot);
        Assert.Equal(2, agreedBooking.AgreedSnapshot.Version);
        Assert.Equal("agreed", agreedBooking.AgreedSnapshot.SnapshotType);
        Assert.NotNull(agreedBooking.AgreedSnapshot.AcceptedAt);
        Assert.Equal("customer1", agreedBooking.AgreedSnapshot.AcceptedBy);

        // 8. Idempotent acceptance
        var reAcceptRes = await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/snapshots/{proposal.Id}/accept", new { });
        Assert.Equal(HttpStatusCode.OK, reAcceptRes.StatusCode);
        var repeated = await reAcceptRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.Equal(agreedBooking.AgreedSnapshot.AcceptedAt, repeated!.AgreedSnapshot!.AcceptedAt);
        Assert.Equal(2, (await customer.GetFromJsonAsync<List<BookingSnapshotSummaryDto>>($"/api/v1/bookings/{bookingId}/snapshots"))!.Count);

        // 9. Entity Framework change tracker immutability validation
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var snapEntity = await db.BookingSnapshots.FindAsync(proposal.Id);
            Assert.NotNull(snapEntity);

            // Cannot delete snapshot
            db.BookingSnapshots.Remove(snapEntity);
            var exDelete = await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
            Assert.Contains("immutable", exDelete.Message, StringComparison.OrdinalIgnoreCase);
            db.ChangeTracker.Clear();

            // Re-fetch and verify cannot tamper version or data
            var snapEntity2 = await db.BookingSnapshots.AsNoTracking().FirstOrDefaultAsync(s => s.Id == proposal.Id);
            Assert.NotNull(snapEntity2);
            db.Entry(snapEntity2).State = EntityState.Modified;
            snapEntity2.Version = 99;
            var exModify = await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
            Assert.Contains("immutable", exModify.Message, StringComparison.OrdinalIgnoreCase);
        }
    }
    private static async Task<int> NewBooking(HttpClient customer) {
        var response = await customer.PostAsJsonAsync("/api/v1/bookings", new CreateBookingRequest(
            1, DateTime.UtcNow.Date.AddDays(7), "Snapshot Review", "0901234567", "customer1@example.test", "REVIEW ONLY",
            [new ParticipantInput("Review Passenger", "0901234567", new DateTime(1990,1,1), "Nam", "001234567890", 1,
                Note: "Ghi chu rieng", RoommateNote: "Hai giuong don", RestaurantNote: "An chay")]));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BookingDto>())!.Id;
    }
    private static async Task<BookingSnapshotDto> Proposal(HttpClient agency, int bookingId, string note) {
        var response = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/proposals", new CreateProposalRequest(note));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BookingSnapshotDto>())!;
    }
    [Fact] public async Task CancelledBooking_MustNotAcceptPendingProposal() {
        using var app = new App(); await app.Initialize();
        var customer=await app.Client("customer1@example.test"); var agency=await app.Client("agency1@example.test");
        var id=await NewBooking(customer); var proposal=await Proposal(agency,id,"v2");
        var cancel=await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/cancel",new {reason="REVIEW cancellation"});
        cancel.EnsureSuccessStatusCode();
        var response=await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/snapshots/{proposal.Id}/accept", new {});
        Assert.True(response.StatusCode is HttpStatusCode.Conflict or HttpStatusCode.UnprocessableEntity,
            $"Expected rejection for cancelled booking; actual={(int)response.StatusCode}; body={await response.Content.ReadAsStringAsync()}");
    }
    [Fact] public async Task AcceptedBooking_RequiresAmendmentForFurtherChanges() {
        using var app = new App(); await app.Initialize();
        var customer=await app.Client("customer1@example.test"); var agency=await app.Client("agency1@example.test");
        var id=await NewBooking(customer); var p2=await Proposal(agency,id,"v2");
        var accepted = await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/snapshots/{p2.Id}/accept", new {});
        accepted.EnsureSuccessStatusCode();
        var original = (await accepted.Content.ReadFromJsonAsync<BookingDto>())!.AgreedSnapshot!;
        var another = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{id}/proposals",new CreateProposalRequest("v3"));
        Assert.Equal(HttpStatusCode.Conflict, another.StatusCode);
        int pendingId;
        // Simulate a pending proposal left by an older deployment after an agreement.
        using(var scope=app.Services.CreateScope()) {
            var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var pending = new BookingSnapshot {BookingId=id,Version=3,SnapshotType="proposal",SnapshotData=System.Text.Json.JsonSerializer.Serialize(p2.SnapshotData),CreatedBy="agency1",CreatedAt=DateTime.UtcNow};
            db.BookingSnapshots.Add(pending); await db.SaveChangesAsync(); pendingId=pending.Id;
        }
        var response=await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/snapshots/{pendingId}/accept", new {});
        Assert.Equal(HttpStatusCode.Conflict,response.StatusCode);
        var unchanged=await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{id}");
        Assert.Equal(original.Id,unchanged!.AgreedSnapshot!.Id);
        Assert.Equal(original.AcceptedAt,unchanged.AgreedSnapshot.AcceptedAt);
    }
    [Fact] public async Task OlderProposal_MustStayStaleAfterNewerProposalAccepted() {
        using var app = new App(); await app.Initialize();
        var customer=await app.Client("customer1@example.test"); var agency=await app.Client("agency1@example.test");
        var id=await NewBooking(customer); var p2=await Proposal(agency,id,"v2"); var p3=await Proposal(agency,id,"v3");
        (await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/snapshots/{p3.Id}/accept", new {})).EnsureSuccessStatusCode();
        var response=await customer.PostAsJsonAsync($"/api/v1/bookings/{id}/snapshots/{p2.Id}/accept", new {});
        Assert.Equal(HttpStatusCode.Conflict,response.StatusCode);
    }
    [Fact] public async Task Proposal_MustRetainPricingTiersFromAuthoritativeBookingSource() {
        using var app = new App(); await app.Initialize();
        var customer=await app.Client("customer1@example.test"); var agency=await app.Client("agency1@example.test");
        var id=await NewBooking(customer); var proposal=await Proposal(agency,id,"v2");
        Assert.NotEmpty(proposal.SnapshotData.PricingTiers);
    }
    [Fact] public async Task InitialSnapshot_MustUseActualTourVersion() {
        using var app = new App(); await app.Initialize();
        using(var scope=app.Services.CreateScope()) {
            var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var tour=await db.Tours.FindAsync(1); tour!.Version=7; await db.SaveChangesAsync();
        }
        var customer=await app.Client("customer1@example.test"); var id=await NewBooking(customer);
        var booking=await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{id}");
        Assert.Equal(7, booking!.InitialRequestSnapshot!.SourceTourVersion);
    }
}
