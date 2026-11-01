using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Services;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private const string AdminServices = "/api/v1/admin/services";

    private static async Task PrepareModeration(App app)
    {
        await app.Inspect(async db => {
            var provider = await db.Users.Include(u => u.BusinessProfile).SingleAsync(u => u.Id == "provider");
            provider.Name = "Provider Contact";
            provider.Phone = "0901234567";
            provider.BusinessProfile!.BusinessName = "Hospitality Company";
            var service = await db.Services.SingleAsync(s => s.Id == 102);
            service.Status = ServiceStatus.Pending;
            service.SubCategory = "Resort";
            service.Description = "Mô tả đầy đủ để kiểm duyệt";
            service.Province = "Lâm Đồng";
            service.Ward = "Xuân Hương";
            service.Street = "12 Trần Phú";
            service.FullAddress = "12 Trần Phú, Xuân Hương, Lâm Đồng";
            service.OperatingHours = "14:00 - 12:00";
            service.Capacity = 37;
            service.StarRating = 4;
            service.Price = 600000m;
            service.PriceFrom = 500000m;
            service.PriceTo = 800000m;
            service.Latitude = 11.94m;
            service.Longitude = 108.45m;
            service.ThumbnailUrl = "https://example.test/main.jpg";
            service.Images = "[\"https://example.test/main.jpg\",\"https://example.test/extra.jpg\"]";
            service.Amenities = "[\"Wifi\",\"Hồ bơi\"]";
            service.Policies = "Nhận phòng cần giấy tờ";
            service.RejectionReason = "Lý do cũ";
            service.HiddenReason = "Lý do ẩn cũ";
            await db.SaveChangesAsync();
        });
    }

    [Fact]
    public async Task Moderation_requires_an_active_admin_session_on_every_route()
    {
        await using var app = new App(); await app.Initialize();
        using var anonymous = app.CreateClient();
        async Task Check(HttpClient client, HttpStatusCode status)
        {
            Assert.Equal(status, (await client.GetAsync(AdminServices)).StatusCode);
            Assert.Equal(status, (await client.GetAsync($"{AdminServices}/102")).StatusCode);
            Assert.Equal(status, (await client.PostAsync($"{AdminServices}/102/approve", null)).StatusCode);
            Assert.Equal(status, (await client.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = "Reason" })).StatusCode);
            Assert.Equal(status, (await client.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "hide", hiddenReason = "Reason" })).StatusCode);
        }
        await Check(anonymous, HttpStatusCode.Unauthorized);
        foreach (var role in new[] { "provider", "agency", "customer" })
        {
            using var client = await app.Login(role);
            await Check(client, HttpStatusCode.Forbidden);
        }
        using var admin = await app.Login("admin");
        await app.Inspect(async db => {
            var user = await db.Users.SingleAsync(u => u.Id == "admin");
            user.Status = UserStatus.Inactive; await db.SaveChangesAsync();
        });
        await Check(admin, HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Admin_reads_full_FE_contract_provider_contacts_and_all_statuses()
    {
        await using var app = new App(); await app.Initialize(); await PrepareModeration(app);
        using var admin = await app.Login("admin");
        var detail = await Read<AdminServiceDto>(await admin.GetAsync($"{AdminServices}/102"));
        Assert.Equal("102", detail.Id);
        Assert.Equal("Hospitality Company", detail.ProviderName);
        Assert.Equal("provider@example.test", detail.ProviderEmail);
        Assert.Equal("0901234567", detail.ProviderHotline);
        Assert.Equal(detail.ProviderName, detail.Provider.BusinessName);
        Assert.Equal(detail.ProviderEmail, detail.Provider.Email);
        Assert.Equal(detail.ProviderHotline, detail.Provider.Hotline);
        Assert.Equal("Resort", detail.SubCategory);
        Assert.Equal("Mô tả đầy đủ để kiểm duyệt", detail.Description);
        Assert.Equal("14:00 - 12:00", detail.OperatingHours);
        Assert.Equal("12 Trần Phú, Xuân Hương, Lâm Đồng", detail.FullAddress);
        Assert.Equal(detail.FullAddress, detail.Location);
        Assert.Equal("Xuân Hương", detail.Ward);
        Assert.Equal("12 Trần Phú", detail.Street);
        Assert.Equal(11.94m, detail.Latitude); Assert.Equal(108.45m, detail.Longitude);
        Assert.Equal(37, detail.Capacity); Assert.Equal(4, detail.Stars);
        Assert.Equal(600000m, detail.Price); Assert.Equal(500000m, detail.PriceFrom); Assert.Equal(800000m, detail.PriceTo);
        Assert.Equal("pending", detail.Status);
        Assert.Equal("Lý do cũ", detail.RejectionReason); Assert.Equal("Lý do ẩn cũ", detail.HiddenReason);
        Assert.Equal(detail.ThumbnailUrl, detail.Image);
        Assert.Equal(new[] { "https://example.test/extra.jpg" }, detail.Images);
        Assert.Equal(new[] { "Wifi", "Hồ bơi" }, detail.Amenities);
        Assert.Equal(new[] { "Nhận phòng cần giấy tờ" }, detail.Policies);
        Assert.NotNull(detail.CreatedAt); Assert.NotNull(detail.UpdatedAt);

        using var json = JsonDocument.Parse(await admin.GetStringAsync($"{AdminServices}/102"));
        foreach (var field in new[] { "subCategory", "fullAddress", "operatingHours", "hiddenReason", "rejectionReason", "thumbnailUrl", "images" })
            Assert.True(json.RootElement.TryGetProperty(field, out _));

        // SQLite lower() only folds ASCII; SQL Server Unicode search is also checked against the live database.
        foreach (var term in new[] { "hotel", "HOSPITALITY", "Provider Contact", "Lâm", "Trần Phú" })
        {
            var page = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?status=pending&category=hotel&search={Uri.EscapeDataString(term)}"));
            Assert.True(page.Total == 1, $"Expected one pending hotel for search '{term}', got {page.Total}.");
            Assert.Equal("102", Assert.Single(page.Items).Id);
        }
        foreach (var category in new[] { "hotel", "fnb", "transportation", "attraction" })
        {
            var page = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?category={category}"));
            Assert.NotEmpty(page.Items); Assert.All(page.Items, item => Assert.Equal(category, item.Category));
        }
        foreach (var status in new[] { "pending", "approved", "hidden", "rejected" })
        {
            var page = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?status={status}"));
            Assert.All(page.Items, item => Assert.Equal(status, item.Status));
        }
        var all = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?status=all&pageSize=1"));
        Assert.Equal(8, all.Total); Assert.Single(all.Items); Assert.Equal(1, all.Page); Assert.Equal(1, all.PageSize);
        var second = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?page=2&pageSize=1"));
        Assert.NotEqual(all.Items[0].Id, Assert.Single(second.Items).Id);
        var empty = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?page=2147483647&pageSize=100"));
        Assert.Equal(8, empty.Total); Assert.Empty(empty.Items);
        await app.Inspect(async db => {
            var provider = await db.Users.SingleAsync(u => u.Id == "provider");
            provider.Status = UserStatus.Inactive; await db.SaveChangesAsync();
        });
        // Moderators must still be able to inspect posts from Providers who cannot appear publicly.
        var inactiveProviderPosts = await Read<AdminServicePage>(await admin.GetAsync(AdminServices));
        Assert.Equal(8, inactiveProviderPosts.Total);
    }

    [Theory]
    [InlineData("status=invalid")]
    [InlineData("status=4")]
    [InlineData("category=restaurant")]
    [InlineData("page=0")]
    [InlineData("page=-1")]
    [InlineData("pageSize=0")]
    [InlineData("pageSize=101")]
    public async Task Invalid_moderation_filters_return_400(string query)
    {
        await using var app = new App(); await app.Initialize(); using var admin = await app.Login("admin");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync($"{AdminServices}?{query}")).StatusCode);
    }

    [Fact]
    public async Task Approve_hide_unhide_controls_public_and_agency_eligibility_and_clears_reasons()
    {
        await using var app = new App(); await app.Initialize(); await PrepareModeration(app);
        using var admin = await app.Login("admin"); using var agency = await app.Login("agency");
        using var anonymous = app.CreateClient();
        async Task Eligible(bool expected)
        {
            var items = (await anonymous.GetFromJsonAsync<JsonElement[]>("/api/v1/catalogue"))!;
            Assert.Equal(expected, items.Any(i => i.GetProperty("id").GetString() == "102"));
            Assert.Equal(expected ? HttpStatusCode.OK : HttpStatusCode.NotFound,
                (await agency.GetAsync("/api/v1/services/102")).StatusCode);
            var references = (await agency.GetFromJsonAsync<TourPage<TourServiceReference>>("/api/v1/services"))!;
            Assert.Equal(expected, references.Items.Any(i => i.Id == 102));
        }
        await Eligible(false);
        var before = DateTime.UtcNow;
        var approved = await Read<ServiceModerationResponse>(await admin.PostAsync($"{AdminServices}/102/approve", null));
        Assert.Equal("approved", approved.Service.Status); Assert.NotEmpty(approved.Message);
        Assert.Null(approved.Service.RejectionReason); Assert.Null(approved.Service.HiddenReason);
        Assert.True(approved.Service.UpdatedAt >= before);
        await Eligible(true);
        var hidden = await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide",
            new { action = "hide", hiddenReason = "  Thông tin sai lệch  " }));
        Assert.Equal("hidden", hidden.Service.Status); Assert.Equal("Thông tin sai lệch", hidden.Service.HiddenReason);
        await Eligible(false);
        var unhidden = await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "unhide" }));
        Assert.Equal("approved", unhidden.Service.Status); Assert.Null(unhidden.Service.HiddenReason);
        await Eligible(true);
        await app.Inspect(async db => {
            var service = await db.Services.SingleAsync(s => s.Id == 102);
            Assert.Equal(ServiceStatus.Approved, service.Status); Assert.Null(service.RejectionReason); Assert.Null(service.HiddenReason);
        });
    }

    [Fact]
    public async Task Reject_requires_pending_and_reason_then_reapproval_clears_rejection()
    {
        await using var app = new App(); await app.Initialize(); await PrepareModeration(app);
        using var admin = await app.Login("admin");
        foreach (var reason in new string?[] { null, "", "   " })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = reason })).StatusCode);
        var rejected = await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = "  Ảnh không rõ  " }));
        Assert.Equal("rejected", rejected.Service.Status); Assert.Equal("Ảnh không rõ", rejected.Service.RejectionReason);
        Assert.Null(rejected.Service.HiddenReason);
        var page = await Read<AdminServicePage>(await admin.GetAsync($"{AdminServices}?status=rejected"));
        Assert.Equal("102", Assert.Single(page.Items).Id);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = "Other review" })).StatusCode);
        var approved = await Read<ServiceModerationResponse>(await admin.PostAsync($"{AdminServices}/102/approve", null));
        Assert.Null(approved.Service.RejectionReason); Assert.Equal("approved", approved.Service.Status);
    }

    [Fact]
    public async Task Invalid_actions_missing_resources_and_stale_reviews_leave_service_unchanged()
    {
        await using var app = new App(); await app.Initialize(); using var admin = await app.Login("admin");
        foreach (var body in new object[] { new { action = "hide" }, new { action = "hide", hiddenReason = "   " },
            new { action = "delete", hiddenReason = "Reason" }, new { hiddenReason = "Reason" } })
            Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", body)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"{AdminServices}/102/approve", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminServices}/102/reject", new { rejectionReason = "Reason" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "unhide" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminServices}/108/toggle-hide", new { action = "hide", hiddenReason = "Reason" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync($"{AdminServices}/99999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsync($"{AdminServices}/99999/approve", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"{AdminServices}/99999/reject", new { rejectionReason = "Reason" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PostAsJsonAsync($"{AdminServices}/99999/toggle-hide", new { action = "hide", hiddenReason = "Reason" })).StatusCode);
        var unchanged = await Read<AdminServiceDto>(await admin.GetAsync($"{AdminServices}/102"));
        Assert.Equal("approved", unchanged.Status); Assert.Null(unchanged.RejectionReason); Assert.Null(unchanged.HiddenReason);

        await Read<ServiceModerationResponse>(await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "hide", hiddenReason = "First review" }));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminServices}/102/toggle-hide", new { action = "hide", hiddenReason = "Stale review" })).StatusCode);
        var final = await Read<AdminServiceDto>(await admin.GetAsync($"{AdminServices}/102"));
        Assert.Equal("First review", final.HiddenReason);
    }
}
