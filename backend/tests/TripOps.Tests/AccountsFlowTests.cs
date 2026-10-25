using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
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
using TripOps.Service.Accounts;

namespace TripOps.Tests;

public sealed class AccountsFlowTests
{
    private sealed class CloudHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            Assert.Equal("Basic", request.Headers.Authorization?.Scheme);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) {
                Content = JsonContent.Create(new { secure_url = "https://res.cloudinary.com/test/image/authenticated/v123/tripops/licenses/test/license.png" }) });
        }
    }

    private sealed class App : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection connection = new("Data Source=:memory:");
        public CloudHandler Cloud { get; } = new();
        public App() => connection.Open();
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?> {
                ["Cloudinary:CloudName"] = "test", ["Cloudinary:ApiKey"] = "test-key", ["Cloudinary:ApiSecret"] = "test-secret"
            }));
            builder.ConfigureServices(services => {
                services.AddSingleton<IDataProtectionProvider>(new EphemeralDataProtectionProvider());
                services.RemoveAll<DbContextOptions<TripOpsDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<TripOpsDbContext>>();
                services.AddDbContext<TripOpsDbContext>(options => options.UseSqlite(connection));
                services.AddHttpClient<CloudinaryStorage>().ConfigurePrimaryHttpMessageHandler(() => Cloud);
            });
        }
        public async Task Initialize()
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            await db.Database.EnsureCreatedAsync();
            var admin = new User { Id = Guid.NewGuid().ToString(), Name = "Test Admin", Email = "admin@example.test", Role = UserRole.Admin };
            admin.PasswordHash = new PasswordHasher<User>().HashPassword(admin, "AdminPass123!");
            db.Users.Add(admin); await db.SaveChangesAsync();
        }
        protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) connection.Dispose(); }
    }

    private static object Registration(string role = "agency") => new { name = "Test Partner", email = "Partner@Example.test", password = "Partner123!", role, acceptedTerms = true };
    private static MultipartFormDataContent Profile(bool includeImage = true)
    {
        var form = new MultipartFormDataContent();
        foreach (var (key, value) in new[] { ("businessName", "Test Business"), ("taxCode", "0123456789"), ("phone", "0901234567"), ("businessAddress", "Test Address"), ("description", "Test profile") })
            form.Add(new StringContent(value), key);
        if (includeImage) {
            var image = new ByteArrayContent(Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZAAAAABJRU5ErkJggg=="));
            image.Headers.ContentType = new("image/png"); form.Add(image, "license", "license.png");
        }
        return form;
    }

    [Fact]
    public async Task Registration_stores_hash_and_cookie_and_rejects_duplicate_email()
    {
        await using var app = new App(); await app.Initialize();
        using var client = app.CreateClient();
        using var registered = await client.PostAsJsonAsync("/api/v1/auth/register", Registration());
        Assert.Equal(HttpStatusCode.Created, registered.StatusCode);
        Assert.Contains("httponly", string.Join(";", registered.Headers.GetValues("Set-Cookie")).ToLowerInvariant());
        var me = await client.GetFromJsonAsync<AccountDto>("/api/v1/auth/me");
        Assert.Equal("partner@example.test", me!.Email); Assert.Null(me.BusinessProfile);
        using var scope = app.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().Users.SingleAsync(u => u.Id == me.Id);
        Assert.NotEqual("Partner123!", stored.PasswordHash);
        Assert.Equal(PasswordVerificationResult.Success, new PasswordHasher<User>().VerifyHashedPassword(stored, stored.PasswordHash!, "Partner123!"));
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/v1/auth/register", Registration())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/register", Registration("admin"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/register", Registration("guide"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/admin/partner-applications")).StatusCode);
        await client.PostAsync("/api/v1/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Submit_reject_resubmit_approve_persists_existing_tables()
    {
        await using var app = new App(); await app.Initialize();
        using var partner = app.CreateClient(); using var admin = app.CreateClient();
        (await partner.PostAsJsonAsync("/api/v1/auth/register", Registration())).EnsureSuccessStatusCode();
        (await admin.PostAsJsonAsync("/api/v1/auth/login", new { email = "admin@example.test", password = "AdminPass123!" })).EnsureSuccessStatusCode();
        using var form = Profile();
        using var submitted = await partner.PostAsync("/api/v1/me/business-profile/submit", form);
        submitted.EnsureSuccessStatusCode();
        var p = (await submitted.Content.ReadFromJsonAsync<ProfileDto>())!;
        Assert.Equal("pending", p.Status); Assert.Contains("/s--", p.BusinessLicenseUrl);
        Assert.Equal(1, app.Cloud.Calls);
        using var duplicateForm = Profile(false);
        Assert.Equal(HttpStatusCode.Conflict, (await partner.PostAsync("/api/v1/me/business-profile/submit", duplicateForm)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"/api/v1/admin/partner-applications/{p.Id}/reject", new { reason = " " })).StatusCode);
        (await admin.PostAsJsonAsync($"/api/v1/admin/partner-applications/{p.Id}/reject", new { reason = "Ảnh chưa rõ" })).EnsureSuccessStatusCode();
        using var resubmit = Profile(false);
        var updated = await (await partner.PostAsync("/api/v1/me/business-profile/submit", resubmit)).Content.ReadFromJsonAsync<ProfileDto>();
        Assert.Equal(p.Id, updated!.Id); Assert.Equal(p.CreatedAt, updated.CreatedAt); Assert.Null(updated.RejectionReason);
        var approved = await admin.PostAsync($"/api/v1/admin/partner-applications/{p.Id}/approve", null);
        approved.EnsureSuccessStatusCode();
        Assert.Equal("approved", (await approved.Content.ReadFromJsonAsync<ProfileDto>())!.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/v1/admin/partner-applications/{p.Id}/approve", null)).StatusCode);
        using var list = await admin.GetAsync("/api/v1/admin/partner-applications?status=approved&role=agency&search=Test&page=1&pageSize=20");
        list.EnsureSuccessStatusCode();
        Assert.Contains("Test Business", await list.Content.ReadAsStringAsync());
        var me = (await partner.GetFromJsonAsync<AccountDto>("/api/v1/auth/me"))!;
        Assert.Equal("0901234567", me.Phone); Assert.Equal("approved", me.BusinessProfile!.Status);
    }

    [Fact]
    public async Task Unauthenticated_and_cross_origin_requests_are_blocked()
    {
        await using var app = new App(); await app.Initialize();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/admin/partner-applications")).StatusCode);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/register") { Content = JsonContent.Create(Registration()) };
        request.Headers.Add("Origin", "https://attacker.invalid");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Invalid_upload_is_not_sent_to_Cloudinary_and_creates_no_profile()
    {
        await using var app = new App(); await app.Initialize();
        using var client = app.CreateClient();
        (await client.PostAsJsonAsync("/api/v1/auth/register", Registration())).EnsureSuccessStatusCode();
        using var form = Profile(false);
        var fakeImage = new ByteArrayContent("not an image"u8.ToArray());
        fakeImage.Headers.ContentType = new("image/png"); form.Add(fakeImage, "license", "fake.png");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/v1/me/business-profile/submit", form)).StatusCode);
        Assert.Equal(0, app.Cloud.Calls);
        using var scope = app.Services.CreateScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().BusinessProfiles.CountAsync());
    }

    [Fact]
    public async Task Banning_account_invalidates_existing_cookie()
    {
        await using var app = new App(); await app.Initialize();
        using var client = app.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", Registration("user"));
        response.EnsureSuccessStatusCode();
        var user = (await response.Content.ReadFromJsonAsync<AccountDto>())!;
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s.SetProperty(u => u.Status, UserStatus.Banned));
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/v1/auth/login", new { email = user.Email, password = "Partner123!" })).StatusCode);
    }
}
