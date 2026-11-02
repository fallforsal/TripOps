using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using TripOps.Service.Bookings;
using TripOps.Service.Guides;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private const string GuidesRoot = "/api/v1/agency/guides";
    private static GuideProfileRequest GuideProfile(string email = "new-guide@example.test") => new(
        "Nguyễn Hướng Dẫn", email, "0912345678", 4,
        ["Tiếng Việt", "Tiếng Anh"], ["Lâm Đồng", "Đà Lạt – Tây Nguyên"], ["Văn hóa – Lịch sử"], "Ghi chú nội bộ", null);
    private static async Task<AgencyGuideDto> CreateGuide(HttpClient agency, string email = "new-guide@example.test")
    {
        var response = await agency.PostAsJsonAsync(GuidesRoot, new CreateGuideRequest(GuideProfile(email), "GuidePass123!"));
        response.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("GuidePass123!", text);
        Assert.DoesNotContain("passwordHash", text);
        return JsonSerializer.Deserialize<AgencyGuideDto>(text, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
    }
    private static async Task<int> GuideBooking(App app, DateTime start, string status = "Confirmed")
    {
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var b = new Booking { BookingCode = "GUIDE-" + Guid.NewGuid().ToString("N"), TourId = 1, CustomerId = "customer1",
            StartDate = start, ContactName = "Khách test", ContactPhone = "0901234567", ContactEmail = "customer1@example.test",
            Status = Enum.Parse<BookingStatus>(status), TotalAmount = 1000000,
            BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }],
            Timelines = [new BookingTimeline { DayNumber = 1, Title = "Ngày 1" }, new BookingTimeline { DayNumber = 3, Title = "Ngày 3" }] };
        db.Bookings.Add(b); await db.SaveChangesAsync(); return b.Id;
    }

    [Fact]
    public async Task Guides_FullCrudLoginPasswordSuspendReactivateDelete_PersistsProfile()
    {
        using var app = new App(); await app.Initialize(); using var agency = await app.Client("agency1@example.test");
        var created = await CreateGuide(agency);
        Assert.Equal("agency1", created.CompanyId); Assert.Equal("guide", created.Role);
        Assert.Equal("active", created.MobileAccountStatus); Assert.True(created.CanDelete);
        using var guideClient = app.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await guideClient.PostAsJsonAsync("/api/v1/auth/login", new { email = created.Email, password = "GuidePass123!" })).StatusCode);
        var list = (await agency.GetFromJsonAsync<GuidePage>(GuidesRoot + "?search=NEW-GUIDE&page=1&pageSize=1"))!;
        Assert.Single(list.Items); Assert.Equal(created.Id, list.Items[0].Id); Assert.Equal(2, list.Summary.TotalGuides);
        var detail = (await agency.GetFromJsonAsync<GuideDetailDto>($"{GuidesRoot}/{created.Id}"))!;
        Assert.Equal(new[] { "Tiếng Việt", "Tiếng Anh" }, detail.Guide.Languages);
        Assert.Equal("Ghi chú nội bộ", detail.Guide.Bio); Assert.Empty(detail.Assignments);
        var profile = GuideProfile() with { Name = "HDV đã cập nhật", ExperienceYears = 8,
            Languages = [" Tiếng Việt ", "tiếng việt", "Tiếng Pháp"], Routes = ["Khánh Hòa"], Specialties = [], Bio = "Ghi chú mới" };
        var edit = await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", profile); edit.EnsureSuccessStatusCode();
        using (var scope = app.Services.CreateScope()) {
            var stored = await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().GuideProfiles.SingleAsync(p => p.UserId == created.Id);
            Assert.Equal(8, stored.ExperienceYears); Assert.Equal("Ghi chú mới", stored.Bio);
            Assert.Equal(new[] { "Tiếng Việt", "Tiếng Pháp" }, JsonSerializer.Deserialize<string[]>(stored.Languages));
        }
        Assert.Equal(HttpStatusCode.NoContent, (await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}/password",
            new ChangeGuidePasswordRequest("ChangedPass123!", "ChangedPass123!"))).StatusCode);
        using var changedLogin = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await changedLogin.PostAsJsonAsync("/api/v1/auth/login", new { email = created.Email, password = "GuidePass123!" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await changedLogin.PostAsJsonAsync("/api/v1/auth/login", new { email = created.Email, password = "ChangedPass123!" })).StatusCode);
        var suspend = await agency.PatchAsJsonAsync($"{GuidesRoot}/{created.Id}/account-status", new GuideAccountStatusRequest("suspend", "Nghỉ phép"));
        suspend.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await guideClient.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await changedLogin.PostAsJsonAsync("/api/v1/auth/login", new { email = created.Email, password = "ChangedPass123!" })).StatusCode);
        detail = (await agency.GetFromJsonAsync<GuideDetailDto>($"{GuidesRoot}/{created.Id}"))!;
        Assert.Equal("suspended", detail.Guide.MobileAccountStatus); Assert.Equal("Nghỉ phép", detail.Guide.SuspendedReason); Assert.False(detail.Eligibility.CanAssign);
        var suspended = (await agency.GetFromJsonAsync<GuidePage>(GuidesRoot + "?workStatus=unavailable"))!;
        Assert.Contains(suspended.Items, g => g.Id == created.Id);
        Assert.Equal(HttpStatusCode.OK, (await agency.PatchAsJsonAsync($"{GuidesRoot}/{created.Id}/account-status", new GuideAccountStatusRequest("reactivate", null))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await changedLogin.PostAsJsonAsync("/api/v1/auth/login", new { email = created.Email, password = "ChangedPass123!" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await agency.DeleteAsync($"{GuidesRoot}/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync($"{GuidesRoot}/{created.Id}")).StatusCode);
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            Assert.False(await db.Users.AnyAsync(u => u.Id == created.Id)); Assert.False(await db.GuideProfiles.AnyAsync(u => u.UserId == created.Id));
        }
    }

    [Fact]
    public async Task Guides_OwnershipAllEndpoints_DuplicateEmailAndValidation()
    {
        using var app = new App(); await app.Initialize(); using var agency = await app.Client("agency1@example.test");
        var created = await CreateGuide(agency);
        using var other = await app.Client("agency2@example.test"); using var customer = await app.Client("customer1@example.test");
        using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(GuidesRoot)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync(GuidesRoot)).StatusCode);
        var otherList = (await other.GetFromJsonAsync<GuidePage>(GuidesRoot))!; Assert.Empty(otherList.Items);
        foreach (var suffix in new[] { "", "/assignments" })
            Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"{GuidesRoot}/{created.Id}{suffix}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", GuideProfile())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PatchAsJsonAsync($"{GuidesRoot}/{created.Id}/account-status", new GuideAccountStatusRequest("suspend", null))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"{GuidesRoot}/{created.Id}")).StatusCode);
        foreach (var email in new[] { created.Email.ToUpperInvariant(), "customer1@example.test", "agency1@example.test" })
            Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync(GuidesRoot, new CreateGuideRequest(GuideProfile(email), "GuidePass123!"))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", GuideProfile("customer1@example.test"))).StatusCode);
        foreach (var invalid in new[] { GuideProfile() with { Name = "  " }, GuideProfile() with { Languages = [] }, GuideProfile() with { Languages = [" "] },
            GuideProfile() with { ExperienceYears = 51 }, GuideProfile() with { Phone = "1234" }, GuideProfile() with { Avatar = "javascript:alert(1)" } })
            Assert.Equal(HttpStatusCode.BadRequest, (await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", invalid)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.GetAsync(GuidesRoot + "?workStatus=garbage")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.GetAsync($"{GuidesRoot}/{created.Id}/assignments?status=garbage")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PatchAsJsonAsync($"{GuidesRoot}/{created.Id}/account-status", new GuideAccountStatusRequest("delete", null))).StatusCode);
        using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var guide = await db.Users.SingleAsync(u => u.Id == created.Id); guide.Status = UserStatus.Banned; await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PatchAsJsonAsync($"{GuidesRoot}/{created.Id}/account-status", new GuideAccountStatusRequest("reactivate", null))).StatusCode);
    }

    [Fact]
    public async Task Guides_AssignmentHistoryOverlapSuspendConfirmationAndDeleteProtection()
    {
        using var app = new App(); await app.Initialize(); using var agency = await app.Client("agency1@example.test");
        var guide = await CreateGuide(agency);
        var start = DateTime.UtcNow.Date.AddDays(30);
        var first = await GuideBooking(app, start); var overlap = await GuideBooking(app, start.AddDays(2));
        var adjacent = await GuideBooking(app, start.AddDays(3));
        var assignment = new GuideAssignmentRequest(guide.Id, "lead_guide", "Dẫn chính");
        Assert.Equal(HttpStatusCode.OK, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{first}/guide-assignments", assignment)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{overlap}/guide-assignments", assignment)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{adjacent}/guide-assignments", assignment)).StatusCode);
        var detail = (await agency.GetFromJsonAsync<GuideDetailDto>($"{GuidesRoot}/{guide.Id}"))!;
        Assert.Equal(2, detail.Assignments.Count); Assert.All(detail.Assignments, a => Assert.Equal("upcoming", a.Status));
        Assert.False(detail.Guide.CanDelete);
        var history = await agency.GetFromJsonAsync<JsonElement>($"{GuidesRoot}/{guide.Id}/assignments?status=upcoming");
        Assert.Equal(2, history.GetProperty("items").GetArrayLength());
        Assert.Equal(HttpStatusCode.Conflict, (await agency.DeleteAsync($"{GuidesRoot}/{guide.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PatchAsJsonAsync($"{GuidesRoot}/{guide.Id}/account-status", new GuideAccountStatusRequest("suspend", "Nghỉ phép"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await agency.PatchAsJsonAsync($"{GuidesRoot}/{guide.Id}/account-status", new GuideAccountStatusRequest("suspend", "Nghỉ phép", true))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{overlap}/guide-assignments", assignment)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await agency.PutAsJsonAsync($"{GuidesRoot}/{guide.Id}", GuideProfile() with { Name = "Tên mới giữ lịch" })).StatusCode);
        detail = (await agency.GetFromJsonAsync<GuideDetailDto>($"{GuidesRoot}/{guide.Id}"))!;
        Assert.Equal(2, detail.Assignments.Count); Assert.Equal("suspended", detail.Guide.MobileAccountStatus);
    }

    private sealed class GuideCloudinaryHandler : HttpMessageHandler
    {
        public int UploadCount { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Assert.Equal("api.cloudinary.com", request.RequestUri!.Host);
            Assert.Equal("Basic", request.Headers.Authorization?.Scheme);
            var form = await request.Content!.ReadAsStringAsync(ct);
            Assert.Contains("tripops/guides/", form); Assert.DoesNotContain("authenticated", form);
            UploadCount++;
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(new { secure_url = "https://res.cloudinary.com/guide-test/image/upload/tripops/guides/test/avatar.png" }) };
        }
    }
    [Fact]
    public async Task Guides_AvatarUploadsOnSaveAndKeepsExistingCloudinaryUrl()
    {
        var handler = new GuideCloudinaryHandler();
        using var app = new App(builder => {
            builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string,string?> {
                ["Storage:UseLocal"] = "false", ["Cloudinary:CloudName"] = "guide-test", ["Cloudinary:ApiKey"] = "fake-key", ["Cloudinary:ApiSecret"] = "fake-secret" }));
            builder.ConfigureServices(s => s.AddHttpClient<CloudinaryStorage>().ConfigurePrimaryHttpMessageHandler(() => handler));
        });
        await app.Initialize(); using var agency = await app.Client("agency1@example.test");
        const string png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0WQAAAAASUVORK5CYII=";
        var response = await agency.PostAsJsonAsync(GuidesRoot, new CreateGuideRequest(GuideProfile() with { Avatar = png }, "GuidePass123!"));
        response.EnsureSuccessStatusCode(); var created = (await response.Content.ReadFromJsonAsync<AgencyGuideDto>())!;
        Assert.StartsWith("https://res.cloudinary.com/", created.Avatar); Assert.Equal(1, handler.UploadCount);
        Assert.Equal(HttpStatusCode.OK, (await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", GuideProfile() with { Avatar = created.Avatar })).StatusCode);
        Assert.Equal(1, handler.UploadCount);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PutAsJsonAsync($"{GuidesRoot}/{created.Id}", GuideProfile() with { Avatar = "data:image/png;base64,YmFkLWltYWdl" })).StatusCode);
    }
}
