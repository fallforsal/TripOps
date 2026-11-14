using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private sealed class App : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection connection = new("Data Source=:memory:");
        private readonly Action<IWebHostBuilder>? configureHost;
        public App(Action<IWebHostBuilder>? configure = null) { connection.Open(); configureHost = configure; }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            // Không để khóa chi hộ thật trong user-secrets của máy dev lọt vào test (chi hộ là tiền thật).
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PayOsPayout:ClientId"] = "",
                ["PayOsPayout:ApiKey"] = "",
                ["PayOsPayout:ChecksumKey"] = "",
                // Tác vụ tự chuyển tiền quyết toán không chạy trong test (test gọi lượt quét qua API).
                ["Settlement:AutoPayoutEnabled"] = "false",
                // Không dùng khóa OpenAI thật trên máy dev trong test (tốn phí, kết quả không cố định).
                ["OpenAI:ApiKey"] = "",
            }));
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<TripOpsDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<TripOpsDbContext>>();
                services.AddDbContext<TripOpsDbContext>(o => o.UseSqlite(connection));
                services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
            });
            configureHost?.Invoke(builder);
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

            var guide = new User { Id = "guide1", AgencyId = "agency1", Name = "Tour Guide One", Email = "guide1@example.test", Role = UserRole.TourGuide, Status = UserStatus.Active };
            guide.PasswordHash = hasher.HashPassword(guide, "Password123!");
            db.Users.Add(guide);

            foreach (var (id, role) in new[] { ("customer2", UserRole.User), ("guide2", UserRole.TourGuide), ("agency2", UserRole.TravelAgency), ("admin1", UserRole.Admin) })
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
    public async Task AgencyCanChangeOwnGuidePassword_WithoutChangingAccountStatus()
    {
        using var app = new App();
        await app.Initialize();
        using var agency = await app.Client("agency1@example.test");
        var request = new { newPassword = "NewGuidePass123!", confirmPassword = "NewGuidePass123!" };
        var response = await agency.PutAsJsonAsync("/api/v1/agency/guides/guide1/password", request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        using var login = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await login.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "guide1@example.test", password = "Password123!" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await login.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "guide1@example.test", password = request.newPassword })).StatusCode);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var guide = await db.Users.SingleAsync(u => u.Id == "guide1");
        Assert.NotEqual(request.newPassword, guide.PasswordHash);
        Assert.Equal(PasswordVerificationResult.Success,
            new PasswordHasher<User>().VerifyHashedPassword(guide, guide.PasswordHash!, request.newPassword));
        guide.Status = UserStatus.Inactive;
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.NoContent,
            (await agency.PutAsJsonAsync("/api/v1/agency/guides/guide1/password", request)).StatusCode);
        await db.Entry(guide).ReloadAsync();
        Assert.Equal(UserStatus.Inactive, guide.Status);
    }

    [Fact]
    public async Task GuidePasswordChange_RequiresAgencyOwnershipAndMatchingValidPassword()
    {
        using var app = new App();
        await app.Initialize();
        var request = new { newPassword = "NewGuidePass123!", confirmPassword = "NewGuidePass123!" };
        using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await anonymous.PutAsJsonAsync("/api/v1/agency/guides/guide1/password", request)).StatusCode);
        using var customer = await app.Client("customer1@example.test");
        Assert.Equal(HttpStatusCode.Forbidden,
            (await customer.PutAsJsonAsync("/api/v1/agency/guides/guide1/password", request)).StatusCode);
        using var otherAgency = await app.Client("agency2@example.test");
        Assert.Equal(HttpStatusCode.NotFound,
            (await otherAgency.PutAsJsonAsync("/api/v1/agency/guides/guide1/password", request)).StatusCode);
        using var agency = await app.Client("agency1@example.test");
        Assert.Equal(HttpStatusCode.NotFound,
            (await agency.PutAsJsonAsync("/api/v1/agency/guides/customer1/password", request)).StatusCode);

        foreach (var (password, confirm) in new[] {
            ("short", "short"), ("12345678901234567", "12345678901234567"),
            ("        ", "        "), ("NewGuidePass123!", "DifferentPass123!"), ("", "") })
        {
            Assert.Equal(HttpStatusCode.BadRequest,
                (await agency.PutAsJsonAsync("/api/v1/agency/guides/guide1/password",
                    new { newPassword = password, confirmPassword = confirm })).StatusCode);
        }
        using var unchangedGuide = await app.Client("guide1@example.test");
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
        Assert.Equal(2500000, created.DepositAmount); // 50% cọc (dự kiến, chưa mở thu)
        Assert.Equal("Pending", created.Status);
        Assert.Equal("Unpaid", created.PaymentStatus);
        Assert.Empty(created.PaymentSchedule!); // Chờ duyệt: chưa có lịch thanh toán
        int bookingId = created.Id;

        // 2. Customer xem danh sách đơn đặt của mình
        var myListRes = await customer.GetFromJsonAsync<BookingPage<BookingListItem>>("/api/v1/bookings");
        Assert.NotNull(myListRes);
        Assert.Single(myListRes.Items);
        Assert.Equal(bookingId, myListRes.Items[0].Id);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var snapshots = await db.BookingParticipants.AsNoTracking().Where(p => p.BookingId == bookingId)
                .OrderBy(p => p.ParticipantIndex).ToListAsync();
            Assert.Equal(new[] { 1, 2 }, snapshots.Select(p => p.ParticipantIndex));
            Assert.All(snapshots, p => { Assert.Equal("agency1", p.AgencyId); Assert.True(p.IsPrimary); });
            Assert.Equal(new[] { 3000000m, 2000000m }, snapshots.Select(p => p.Price));
            Assert.Equal(new[] { "Người lớn", "Trẻ em" }, snapshots.Select(p => p.TierName));
        }

        // 3. Chưa được duyệt thì chưa cho trả cọc
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/deposit",
            new BookingDepositRequest(2500000, "VQR000", null))).StatusCode);

        // 4. Agency xem danh sách booking và duyệt → mở đợt cọc
        var agencyListRes = await agency.GetFromJsonAsync<BookingPage<BookingListItem>>("/api/v1/agency/bookings");
        Assert.NotNull(agencyListRes);
        Assert.Single(agencyListRes.Items);

        var decisionRes = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{bookingId}/decision", new BookingDecisionRequest("approve", "Đã kiểm tra đơn"));
        Assert.Equal(HttpStatusCode.OK, decisionRes.StatusCode);
        var approved = (await decisionRes.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal("Confirmed", approved.Status);
        Assert.Collection(approved.PaymentSchedule!,
            deposit =>
            {
                Assert.Equal("deposit", deposit.Stage);
                Assert.Equal(2500000, deposit.Amount);
                Assert.Equal(2500000, deposit.Outstanding);
                Assert.Equal("Pending", deposit.Status);
                Assert.NotNull(deposit.DueAt); // hạn chính xác = lúc duyệt + 24 giờ (kiểm tra chi tiết ở BookingPaymentTests)
            },
            balance =>
            {
                Assert.Equal("balance", balance.Stage);
                Assert.Equal(2500000, balance.Amount);
                Assert.Equal("Scheduled", balance.Status); // mở thu sau khi đủ cọc
                Assert.Equal(TripOps.Service.Payments.PaymentRules.BalanceDeadline(createRequest.StartDate), balance.DueAt!.Value.ToUniversalTime());
            });

        // 5. Chưa ký hợp đồng thì chưa thanh toán được; ký (tải bản đã ký) rồi đặt cọc đúng số tiền của đợt cọc
        Assert.True(approved.Contract!.RequiredBeforePayment);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/deposit",
            new BookingDepositRequest(2500000, "VQR-UNSIGNED", null))).StatusCode);
        await SignContract(customer, bookingId);
        var depositRes = await customer.PostAsJsonAsync($"/api/v1/bookings/{bookingId}/deposit", new BookingDepositRequest(2500000, "VQR001", null));
        Assert.Equal(HttpStatusCode.OK, depositRes.StatusCode);
        var deposited = await depositRes.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(deposited);
        Assert.Equal(2500000, deposited.PaidAmount);
        Assert.Equal("PartiallyPaid", deposited.PaymentStatus);
        Assert.Equal("Confirmed", deposited.Status);
        Assert.Equal("Paid", deposited.PaymentSchedule![0].Status);
        Assert.Equal(0, deposited.PaymentSchedule[0].Outstanding);
        Assert.Equal("Success", Assert.Single(deposited.PaymentTransactions!).Status);

        // The current booking flow has no commercial snapshot/proposal-event tables.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            Assert.DoesNotContain(db.Model.GetEntityTypes(), e =>
                e.GetTableName() is "booking_snapshots" or "booking_proposal_events");
        }

        // 6. Agency phân công Hướng dẫn viên
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

        // 7. Guide may check attendance only on the Vietnam-local departure date.
        int participantId = assigned.Participants[0].Id;
        var departureToday = PaymentRules.VietnamDate(DateTime.UtcNow);
        var attendanceUrl = $"/api/v1/guide/bookings/{bookingId}/attendance";
        var checkedInRequest = new AttendanceCheckinRequest(participantId, "CheckedIn");
        Assert.False(assigned.CanRecordAttendance);
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(attendanceUrl, checkedInRequest)).StatusCode);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var futureParticipant = await db.BookingParticipants.SingleAsync(p => p.Id == participantId);
            Assert.Equal(AttendanceStatus.Pending, futureParticipant.AttendanceStatus);
            Assert.Null(futureParticipant.CheckedAt);
            var trip = await db.Bookings.SingleAsync(b => b.Id == bookingId);
            trip.StartDate = departureToday.AddDays(-1);
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(attendanceUrl, checkedInRequest)).StatusCode);
        var pastDayDetail = await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{bookingId}");
        Assert.False(pastDayDetail!.CanRecordAttendance);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var pastParticipant = await db.BookingParticipants.SingleAsync(p => p.Id == participantId);
            Assert.Equal(AttendanceStatus.Pending, pastParticipant.AttendanceStatus);
            Assert.Null(pastParticipant.CheckedAt);
            var trip = await db.Bookings.SingleAsync(b => b.Id == bookingId);
            trip.StartDate = departureToday;
            await db.SaveChangesAsync();
        }
        var departureDayDetail =
            await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.True(departureDayDetail!.CanRecordAttendance);
        var attendRes = await guide.PostAsJsonAsync(attendanceUrl, checkedInRequest);
        Assert.Equal(HttpStatusCode.OK, attendRes.StatusCode);
        var attended = await attendRes.Content.ReadFromJsonAsync<ParticipantDto>();
        Assert.NotNull(attended);
        Assert.Equal("CheckedIn", attended.AttendanceStatus);

        // 8. Guide báo cáo sự cố qua một API multipart, không đính kèm ảnh.
        using var incidentForm = new MultipartFormDataContent();
        incidentForm.Add(new StringContent("WEATHER"), "IncidentType");
        incidentForm.Add(new StringContent("Mưa lớn"), "Title");
        incidentForm.Add(new StringContent("Lịch trình lùi 30 phút"), "Description");
        var incidentRes = await guide.PostAsync($"/api/v1/guide/bookings/{bookingId}/incidents", incidentForm);
        Assert.Equal(HttpStatusCode.OK, incidentRes.StatusCode);
        var incident = await incidentRes.Content.ReadFromJsonAsync<IncidentDto>();
        Assert.NotNull(incident);
        Assert.Equal("WEATHER", incident.IncidentType);
        Assert.Contains("Mưa lớn", incident.Title);

        var reloaded = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.Equal("CheckedIn", reloaded!.Participants.Single(p => p.Id == participantId).AttendanceStatus);
        Assert.Contains(reloaded.Incidents!, i => i.Id == incident.Id);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var attendance = await db.BookingParticipants.AsNoTracking().SingleAsync(p => p.Id == participantId);
            Assert.Equal("guide1", attendance.CheckedBy);
            Assert.NotNull(attendance.CheckedAt);
            var assignment = await db.BookingAssignedGuides.AsNoTracking().SingleAsync(a => a.BookingId == bookingId);
            Assert.Equal("agency1", assignment.AgencyId);
            Assert.NotNull(assignment.AssignedAt);
            var incidentSnapshot = await db.BookingIncidents.AsNoTracking().SingleAsync(i => i.Id == incident.Id);
            Assert.Equal("agency1", incidentSnapshot.AgencyId);
            Assert.Equal("WEATHER", incidentSnapshot.IncidentType);
        }
    }

    private static CreateBookingRequest Sample(params ParticipantInput[] participants) => new(
        1, DateTime.UtcNow.Date.AddDays(10), "Customer One", "0901234567", "customer1@example.test", null,
        participants.Length > 0 ? participants : [new ParticipantInput("Adult", null, new DateTime(1990, 1, 1), "Nam", null, null)]);

    [Fact]
    public async Task Explicit_false_primary_flag_is_not_replaced_by_database_default_true()
    {
        using var app = new App();
        await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var response = await customer.PostAsJsonAsync("/api/v1/bookings", Sample());
        response.EnsureSuccessStatusCode();
        var booking = (await response.Content.ReadFromJsonAsync<BookingDto>())!;
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var secondary = new BookingParticipant
        {
            BookingId = booking.Id, AgencyId = "agency1", ParticipantIndex = 2,
            FullName = "Secondary segment", IsPrimary = false
        };
        db.BookingParticipants.Add(secondary);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        Assert.False((await db.BookingParticipants.SingleAsync(p => p.Id == secondary.Id)).IsPrimary);
    }

    [Fact]
    public async Task Payment_ledger_survives_reload_and_a_replayed_reference_is_not_counted_twice()
    {
        using var app = new App();
        await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var created = await customer.PostAsJsonAsync("/api/v1/bookings", Sample());
        created.EnsureSuccessStatusCode();
        var booking = (await created.Content.ReadFromJsonAsync<BookingDto>())!;
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).EnsureSuccessStatusCode();
        await SignContract(customer, booking.Id);
        var payment = new BookingDepositRequest(1500000, "IDEMPOTENT-DEMO", "https://example.test/proof.png");
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var response = await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", payment);
            response.EnsureSuccessStatusCode();
            Assert.Equal(1500000, (await response.Content.ReadFromJsonAsync<BookingDto>())!.PaidAmount);
        }
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var transaction = await db.PaymentTransactions.AsNoTracking().SingleAsync(t => t.BookingId == booking.Id);
            Assert.Equal(1500000, transaction.Amount);
            Assert.Equal(payment.PaymentProofUrl, transaction.ProofImageUrl);
            Assert.Equal("DEMO", transaction.PaymentMethod);
            Assert.Null(db.Model.FindEntityType(typeof(Booking))!.FindProperty("PaidAmount"));
            // Trip length is the booking snapshot, independent of later tour edits.
            (await db.Tours.SingleAsync(t => t.Id == 1)).DurationDays = 9;
            await db.SaveChangesAsync();
        }
        var reloaded = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(1500000, reloaded.PaidAmount);
        Assert.Equal(booking.EndDate, reloaded.EndDate);
        Assert.Equal(1, reloaded.TotalGuests);
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
        Assert.Single(directory!);
        Assert.DoesNotContain(directory!, g => g.Id == "guide2");
        Assert.DoesNotContain(directory!, g => g.Id == "customer1");
    }
}
