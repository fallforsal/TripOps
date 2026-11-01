using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Services;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private const string ProviderServices = "/api/v1/provider/services";
    private static SaveProviderServiceRequest ServicePost() => new() {
        Name = "Khách sạn thử nghiệm", Category = "hotel", SubCategory = "Resort", Description = "Mô tả dịch vụ",
        Price = 500000, PriceFrom = 500000, PriceTo = 800000, Capacity = 30, Stars = 4,
        Province = "Lâm Đồng", Ward = "Xuân Hương", Street = "12 Trần Phú", OperatingHours = "14:00 - 12:00",
        Latitude = 11.94m, Longitude = 108.45m, ThumbnailUrl = "https://example.test/thumb.jpg",
        Images = ["https://example.test/thumb.jpg", "https://example.test/extra.jpg"],
        Amenities = ["Wifi", "Hồ bơi"], Policies = ["Nhận phòng cần giấy tờ"]
    };

    [Fact]
    public async Task Provider_creates_persistent_pending_post_and_can_edit_delete_own_service()
    {
        await using var app = new App(); await app.Initialize(); using var provider = await app.Login("provider");
        // Provider identity, status, reasons and rating must not be writable by the caller.
        var payload = JsonSerializer.SerializeToElement(ServicePost(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var body = payload.EnumerateObject().ToDictionary(p => p.Name, p => (object?)p.Value.Clone());
        body["providerId"] = "agency"; body["status"] = "approved"; body["rating"] = 5; body["hiddenReason"] = "Injected";
        var response = await provider.PostAsJsonAsync(ProviderServices, body);
        var created = await Read<AdminServiceDto>(response, HttpStatusCode.Created);
        Assert.EndsWith($"/{created.Id}", response.Headers.Location!.ToString());
        Assert.Equal("provider", created.ProviderId); Assert.Equal("pending", created.Status); Assert.Equal(0, created.Rating);
        Assert.Null(created.HiddenReason); Assert.Null(created.RejectionReason);
        Assert.Equal("12 Trần Phú, Xuân Hương, Lâm Đồng", created.FullAddress);
        Assert.Equal(new[] { "https://example.test/extra.jpg" }, created.Images);
        Assert.Equal(new[] { "Wifi", "Hồ bơi" }, created.Amenities);
        await app.Inspect(async db => {
            var saved = await db.Services.SingleAsync(s => s.Id == int.Parse(created.Id));
            Assert.Equal("[\"https://example.test/extra.jpg\"]", saved.Images);
            Assert.Equal(ServiceStatus.Pending, saved.Status);
        });
        var loaded = await Read<AdminServiceDto>(await provider.GetAsync($"{ProviderServices}/{created.Id}"));
        Assert.Equal(created.Name, loaded.Name); Assert.Equal(created.Policies, loaded.Policies);
        var list = await Read<AdminServicePage>(await provider.GetAsync($"{ProviderServices}?status=pending"));
        Assert.Equal(created.Id, Assert.Single(list.Items).Id);
        var updated = await Read<AdminServiceDto>(await provider.PutAsJsonAsync($"{ProviderServices}/{created.Id}", ServicePost() with { Name = "Tên đã sửa", Capacity = 42 }));
        Assert.Equal("Tên đã sửa", updated.Name); Assert.Equal(42, updated.Capacity);
        Assert.Equal(HttpStatusCode.NoContent, (await provider.DeleteAsync($"{ProviderServices}/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await provider.GetAsync($"{ProviderServices}/{created.Id}")).StatusCode);
    }

    [Fact]
    public async Task Provider_edit_resubmits_approved_or_rejected_posts_but_never_removes_an_Admin_hide()
    {
        await using var app = new App(); await app.Initialize(); using var provider = await app.Login("provider"); using var admin = await app.Login("admin");
        var pending = await Read<AdminServiceDto>(await provider.PutAsJsonAsync($"{ProviderServices}/102", ServicePost()));
        Assert.Equal("pending", pending.Status);
        await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = "Ảnh mờ" }));
        var resubmitted = await Read<AdminServiceDto>(await provider.PutAsJsonAsync($"{ProviderServices}/102", ServicePost()));
        Assert.Equal("pending", resubmitted.Status); Assert.Null(resubmitted.RejectionReason);
        await Read<ServiceModerationResponse>(await admin.PostAsync($"{AdminServices}/102/approve", null));
        await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "hide", hiddenReason = "Cần kiểm tra lại" }));
        Assert.Equal(HttpStatusCode.Conflict, (await provider.PutAsJsonAsync($"{ProviderServices}/102", ServicePost() with { Name = "Đã chỉnh sửa thông tin" })).StatusCode);
        var hidden = await Read<AdminServiceDto>(await provider.GetAsync($"{ProviderServices}/102"));
        Assert.Equal("hidden", hidden.Status); Assert.Equal("Cần kiểm tra lại", hidden.HiddenReason);
        Assert.Equal(ServicePost().Name, hidden.Name);
    }

    [Fact]
    public async Task Provider_API_enforces_roles_profile_approval_and_ownership()
    {
        await using var app = new App(); await app.Initialize(); using var anonymous = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync(ProviderServices, ServicePost())).StatusCode);
        foreach (var id in new[] { "agency", "customer", "admin" })
        {
            using var client = await app.Login(id);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(ProviderServices)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(ProviderServices, ServicePost())).StatusCode);
        }
        await app.Inspect(async db => {
            var other = new User { Id = "other-provider", Name = "Other", Email = "other-provider@example.test", Role = UserRole.Provider };
            other.PasswordHash = new PasswordHasher<User>().HashPassword(other, "TourTest123!");
            other.BusinessProfile = new BusinessProfile { UserId = other.Id, BusinessName = "Other", Status = BusinessProfileStatus.Approved };
            db.Users.Add(other); await db.SaveChangesAsync();
        });
        using var foreign = await app.Login("other-provider");
        var list = await Read<AdminServicePage>(await foreign.GetAsync(ProviderServices)); Assert.Empty(list.Items);
        Assert.Equal(HttpStatusCode.NotFound, (await foreign.GetAsync($"{ProviderServices}/102")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await foreign.PutAsJsonAsync($"{ProviderServices}/102", ServicePost())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await foreign.DeleteAsync($"{ProviderServices}/102")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await foreign.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true })).StatusCode);
        using var provider = await app.Login("provider");
        await app.Inspect(async db => {
            var profile = await db.BusinessProfiles.SingleAsync(p => p.UserId == "provider");
            profile.Status = BusinessProfileStatus.Pending; await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.Forbidden, (await provider.PostAsJsonAsync(ProviderServices, ServicePost())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true })).StatusCode);
    }

    [Fact]
    public async Task Invalid_provider_input_is_rejected_and_services_used_by_tours_cannot_be_deleted()
    {
        await using var app = new App(); await app.Initialize(); using var provider = await app.Login("provider"); using var agency = await app.Login("agency");
        foreach (var request in new[] { ServicePost() with { Price = -1 }, ServicePost() with { PriceFrom = 900000, PriceTo = 100000 },
            ServicePost() with { ThumbnailUrl = "data:image/png;base64,fake" }, ServicePost() with { Name = " " },
            ServicePost() with { SubCategory = new string('a', 101) }, ServicePost() with { Category = "unknown" },
            ServicePost() with { Capacity = -1 }, ServicePost() with { Latitude = 100 },
            ServicePost() with { Images = ["/api/v1/files/licenses/provider/private.png"] } })
            Assert.Equal(HttpStatusCode.BadRequest, (await provider.PostAsJsonAsync(ProviderServices, request)).StatusCode);
        await Create(agency, Complete() with { Timelines = [new(1, "Stay", Accommodations: [new("Hotel", "Da Lat", ServiceId: 102)])] });
        Assert.Equal(HttpStatusCode.Conflict, (await provider.DeleteAsync($"{ProviderServices}/102")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await provider.GetAsync($"{ProviderServices}/102")).StatusCode);
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent("not an image"u8.ToArray()); file.Headers.ContentType = new("image/png"); form.Add(file, "image", "fake.png");
        Assert.Equal(HttpStatusCode.BadRequest, (await provider.PostAsync($"{ProviderServices}/images", form)).StatusCode);
    }

    [Fact]
    public async Task Provider_pause_is_persistent_and_blocks_catalogues_tour_selection_and_new_booking_eligibility()
    {
        await using var app = new App(); await app.Initialize(); using var provider = await app.Login("provider");
        using var agency = await app.Login("agency"); using var anonymous = app.CreateClient();
        var paused = await Read<AdminServiceDto>(await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true }));
        Assert.True(paused.IsPaused); Assert.Equal("approved", paused.Status);
        var reloaded = await Read<AdminServiceDto>(await provider.GetAsync($"{ProviderServices}/102")); Assert.True(reloaded.IsPaused);
        var own = await Read<AdminServicePage>(await provider.GetAsync($"{ProviderServices}?isPaused=true"));
        Assert.Equal("102", Assert.Single(own.Items).Id);
        var catalogue = (await anonymous.GetFromJsonAsync<JsonElement[]>("/api/v1/catalogue"))!;
        Assert.DoesNotContain(catalogue, s => s.GetProperty("id").GetString() == "102");
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync("/api/v1/services/102")).StatusCode);
        var tour = Complete() with { Timelines = [new(1, "Stay", Accommodations: [new("Hotel", "Da Lat", ServiceId: 102)])] };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(Root, tour)).StatusCode);
        await app.Inspect(async db => {
            var repository = new Data.Repositories.BookingRepository(db);
            Assert.Equal(0, await repository.EligibleServiceCount([102], default));
            Assert.Equal(1, await repository.EligibleServiceCount([103], default));
            Assert.Equal(0, await db.Bookings.CountAsync());
        });
        var resumed = await Read<AdminServiceDto>(await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = false }));
        Assert.False(resumed.IsPaused); Assert.Equal("approved", resumed.Status);
        Assert.Equal(HttpStatusCode.OK, (await agency.GetAsync("/api/v1/services/102")).StatusCode);
        await Create(agency, tour);
    }

    [Fact]
    public async Task Provider_availability_and_Admin_visibility_cannot_override_each_other()
    {
        await using var app = new App(); await app.Initialize(); using var provider = await app.Login("provider");
        using var admin = await app.Login("admin"); using var agency = await app.Login("agency");
        Assert.Equal(HttpStatusCode.BadRequest, (await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true })).StatusCode);
        await Read<AdminServiceDto>(await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true }));
        await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "hide", hiddenReason = "Admin đang kiểm tra" }));
        Assert.Equal(HttpStatusCode.Conflict, (await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = false })).StatusCode);
        var resumed = await Read<AdminServiceDto>(await provider.GetAsync($"{ProviderServices}/102"));
        Assert.True(resumed.IsPaused); Assert.Equal("hidden", resumed.Status); Assert.Equal("Admin đang kiểm tra", resumed.HiddenReason);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync("/api/v1/services/102")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await provider.PostAsJsonAsync($"{ProviderServices}/102/availability", new { isPaused = true })).StatusCode);
        var openedByAdmin = await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "unhide" }));
        Assert.True(openedByAdmin.Service.IsPaused); Assert.Equal("approved", openedByAdmin.Service.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync("/api/v1/services/102")).StatusCode);
        var edited = await Read<AdminServiceDto>(await provider.PutAsJsonAsync($"{ProviderServices}/102", ServicePost()));
        Assert.True(edited.IsPaused); Assert.Equal("pending", edited.Status);
    }
}
