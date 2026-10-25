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

public sealed class BookingFlowTests
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

            var agency = new User { Id = "agency1", Name = "Agency One", Email = "agency1@example.test", Role = UserRole.TravelAgency, Status = UserStatus.Active };
            agency.PasswordHash = hasher.HashPassword(agency, "Password123!");
            agency.BusinessProfile = new BusinessProfile { UserId = "agency1", BusinessName = "Agency One Ltd", Status = BusinessProfileStatus.Approved };
            db.Users.Add(agency);

            var customer = new User { Id = "customer1", Name = "Customer One", Email = "customer1@example.test", Role = UserRole.User, Status = UserStatus.Active };
            customer.PasswordHash = hasher.HashPassword(customer, "Password123!");
            db.Users.Add(customer);

            var guide = new User { Id = "guide1", Name = "Tour Guide One", Email = "guide1@example.test", Role = UserRole.TourGuide, Status = UserStatus.Active };
            guide.PasswordHash = hasher.HashPassword(guide, "Password123!");
            db.Users.Add(guide);

            foreach (var (id, role) in new[] { ("customer2", UserRole.User), ("guide2", UserRole.TourGuide), ("agency2", UserRole.TravelAgency) })
            {
                var other = new User { Id = id, Name = id, Email = $"{id}@example.test", Role = role, Status = UserStatus.Active };
                other.PasswordHash = hasher.HashPassword(other, "Password123!");
                db.Users.Add(other);
            }

            var tour = new Tour
            {
                Id = 1,
                AgencyId = "agency1",
                Name = "Tour Đà Nẵng 3N2Đ",
                BasePrice = 3000000,
                DurationDays = 3,
                DurationNights = 2,
                MinGuests = 1,
                MaxGuests = 20,
                Status = TourStatus.Completed,
                Visibility = TourVisibility.Public,
                PricingTiers =
                [
                    new TourPricingTier { Id = 1, TourId = 1, Name = "Trẻ em", MinAge = 2, MaxAge = 11, PricePerGuest = 2000000 },
                    new TourPricingTier { Id = 2, TourId = 1, Name = "Người lớn", MinAge = 12, MaxAge = 100, PricePerGuest = 3000000 }
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
    public async Task CustomerCanCreateBooking_AndFlowEndToEnd()
    {
        using var app = new App();
        await app.Initialize();

        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var guide = await app.Client("guide1@example.test");

        // 1. Customer tạo đơn đặt tour 2 khách: 1 người lớn (3tr) + 1 trẻ em (2tr) = 5tr
        var createRequest = new CreateBookingRequest(
            TourId: 1,
            StartDate: DateTime.UtcNow.Date.AddDays(10),
            ContactName: "Customer One",
            ContactPhone: "0901234567",
            ContactEmail: "customer1@example.test",
            SpecialRequests: "Cần phòng yên tĩnh",
            Participants:
            [
                new ParticipantInput("Nguyễn Văn A", "0901234567", new DateTime(1990, 1, 1), "Nam", "123456789", 2),
                new ParticipantInput("Nguyễn Văn Con", null, new DateTime(2018, 5, 5), "Nam", null, 1)
            ]);

        var createRes = await customer.PostAsJsonAsync("/api/v1/bookings", createRequest);
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = await createRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(created);
        Assert.Equal(1, created.TourId);
        Assert.Equal(2, created.TotalGuests);
        Assert.Equal(5000000, created.TotalAmount);
        Assert.Equal(1500000, created.DepositAmount); // 30% cọc
        Assert.Equal("Pending", created.Status);
        Assert.Equal("Unpaid", created.PaymentStatus);
        int bookingId = created.Id;

        // 2. Customer xem danh sách đơn đặt của mình
        var myListRes = await customer.GetFromJsonAsync<BookingPage<BookingListItem>>("/api/v1/bookings");
        Assert.NotNull(myListRes);
        Assert.Single(myListRes.Items);
        Assert.Equal(bookingId, myListRes.Items[0].Id);

        // 3. Customer đặt cọc
        var depositRes = await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/deposit", new BookingDepositRequest(1500000, "VQR001", null));
        Assert.Equal(HttpStatusCode.OK, depositRes.StatusCode);
        var deposited = await depositRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(deposited);
        Assert.Equal(1500000, deposited.PaidAmount);
        Assert.Equal("PartiallyPaid", deposited.PaymentStatus);
        Assert.Equal("Deposited", deposited.Status);

        // 4. Agency xem danh sách booking và duyệt
        var agencyListRes = await agency.GetFromJsonAsync<BookingPage<BookingListItem>>("/api/v1/agency/bookings");
        Assert.NotNull(agencyListRes);
        Assert.Single(agencyListRes.Items);

        var decisionRes = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/decision", new BookingDecisionRequest("approve", "Đã kiểm tra đơn"));
        Assert.Equal(HttpStatusCode.OK, decisionRes.StatusCode);
        Assert.Equal("Confirmed", (await decisionRes.Content.ReadFromJsonAsync<BookingDto>())!.Status);

        // 5. Agency phân công Hướng dẫn viên
        var assignRes = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/guide-assignments", new GuideAssignmentRequest("guide1", "Lead", "HDV trưởng"));
        Assert.Equal(HttpStatusCode.OK, assignRes.StatusCode);
        var assigned = await assignRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(assigned);
        Assert.Single(assigned.AssignedGuides);
        Assert.Equal("guide1", assigned.AssignedGuides[0].GuideId);

        // 6. Guide xem tour được phân công
        var guideTrips = await guide.GetFromJsonAsync<BookingPage<BookingListItem>>("/api/v1/guide/bookings");
        Assert.NotNull(guideTrips);
        Assert.Single(guideTrips.Items);
        Assert.Equal(bookingId, guideTrips.Items[0].Id);

        // 7. Guide điểm danh hành khách
        int participantId = assigned.Participants[0].Id;
        var attendRes = await guide.PostAsJsonAsync($"/api/v1/guide/bookings/{bookingId}/attendance", new AttendanceCheckinRequest(participantId, "CheckedIn"));
        Assert.Equal(HttpStatusCode.OK, attendRes.StatusCode);
        var attended = await attendRes.Content.ReadFromJsonAsync<ParticipantDto>();
        Assert.NotNull(attended);
        Assert.Equal("CheckedIn", attended.AttendanceStatus);

        // 8. Guide báo cáo sự cố
        var incidentRes = await guide.PostAsJsonAsync($"/api/v1/guide/bookings/{bookingId}/incidents", new ReportIncidentRequest("Thời tiết", "Mưa lớn", "Lịch trình lùi 30 phút", "Low"));
        Assert.Equal(HttpStatusCode.OK, incidentRes.StatusCode);
        var incident = await incidentRes.Content.ReadFromJsonAsync<IncidentDto>();
        Assert.NotNull(incident);
        Assert.Contains("Thời tiết", incident.Title);

        var reloaded = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.Equal("CheckedIn", reloaded!.Participants.Single(p => p.Id == participantId).AttendanceStatus);
        Assert.Contains(reloaded.Incidents!, i => i.Id == incident.Id);
    }

    private static CreateBookingRequest Sample(params ParticipantInput[] participants) => new(
        1, DateTime.UtcNow.Date.AddDays(10), "Customer One", "0901234567", "customer1@example.test", null,
        participants.Length > 0 ? participants : [new ParticipantInput("Adult", null, new DateTime(1990, 1, 1), "Nam", null, null)]);

    [Fact]
    public async Task DepositRequiresAgencyDecision_AndPartialDepositIsAccumulated()
    {
        using var app = new App(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var create = await customer.PostAsJsonAsync("/api/v1/bookings", Sample());
        var booking = (await create.Content.ReadFromJsonAsync<BookingDto>())!;
        var partial = await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(100000, "PARTIAL", null));
        Assert.Equal("Pending", (await partial.Content.ReadFromJsonAsync<BookingDto>())!.Status);
        var rest = await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(booking.DepositAmount - 100000, "REST", null));
        var deposited = (await rest.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal("Deposited", deposited.Status);
        Assert.Equal(booking.DepositAmount, deposited.PaidAmount);
        var decision = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null));
        Assert.Equal("Confirmed", (await decision.Content.ReadFromJsonAsync<BookingDto>())!.Status);
    }

    [Fact]
    public async Task PricingUsesAgeWhenFrontendDoesNotSendTier_AndRejectsForeignOrWrongTier()
    {
        using var app = new App(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var child = new ParticipantInput("Child", null, DateTime.UtcNow.Date.AddYears(-8), "Nam", null, null);
        var response = await customer.PostAsJsonAsync("/api/v1/bookings", Sample(child));
        Assert.Equal(2000000, (await response.Content.ReadFromJsonAsync<BookingDto>())!.TotalAmount);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync("/api/v1/bookings", Sample(child with { PricingTierId = 999 }))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync("/api/v1/bookings", Sample(child with { PricingTierId = 2 }))).StatusCode);
    }

    [Fact]
    public async Task BookingPermissionsAndGuideAssignmentAreEnforced()
    {
        using var app = new App(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var otherCustomer = await app.Client("customer2@example.test");
        var agency = await app.Client("agency1@example.test");
        var otherAgency = await app.Client("agency2@example.test");
        var otherGuide = await app.Client("guide2@example.test");
        var created = await customer.PostAsJsonAsync("/api/v1/bookings", Sample());
        var id = (await created.Content.ReadFromJsonAsync<BookingDto>())!.Id;
        Assert.Equal(HttpStatusCode.Forbidden, (await otherCustomer.GetAsync($"/api/v1/bookings/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await otherAgency.PostAsJsonAsync($"/api/v1/agency/bookings/{id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await otherGuide.GetAsync($"/api/v1/guide/bookings/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.PostAsJsonAsync("/api/v1/bookings", Sample())).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{id}/guide-assignments", new GuideAssignmentRequest("guide1", "Lead", null))).StatusCode);
        await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{id}/decision", new BookingDecisionRequest("approve", null));
        Assert.Equal(HttpStatusCode.NotFound, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{id}/guide-assignments", new GuideAssignmentRequest("customer1", "Lead", null))).StatusCode);
        var directory = await agency.GetFromJsonAsync<List<AvailableGuideDto>>("/api/v1/agency/bookings/available-guides");
        Assert.Equal(2, directory!.Count);
        Assert.DoesNotContain(directory, g => g.Id == "customer1");
    }
}
