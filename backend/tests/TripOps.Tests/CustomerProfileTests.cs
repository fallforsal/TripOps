using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Accounts;
using TripOps.Service.Locations;

namespace TripOps.Tests;

// Thông tin tài khoản khách: họ tên, cơ quan, SĐT, địa chỉ (tỉnh → phường/xã thuộc đúng tỉnh).
public sealed partial class BookingFlowTests
{
    private sealed class FakeAdministrativeApi : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var path = request.RequestUri!.PathAndQuery;
            var body = path == "/api/v2/"
                ? """[{"code":79,"name":"Thành phố Hồ Chí Minh"},{"code":1,"name":"Thành phố Hà Nội"}]"""
                : path.StartsWith("/api/v2/p/79", StringComparison.Ordinal)
                    ? """{"code":79,"name":"Thành phố Hồ Chí Minh","wards":[{"code":26734,"name":"Phường Sài Gòn","province_code":79},{"code":26737,"name":"Phường Bến Thành","province_code":79}]}"""
                    : """{"code":1,"name":"Thành phố Hà Nội","wards":[{"code":4,"name":"Phường Ba Đình","province_code":1}]}""";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
            });
        }
    }

    private static App ProfileApp() => new(builder => builder.ConfigureServices(services =>
        services.AddHttpClient(VietnamAdministrativeService.ClientName).ConfigurePrimaryHttpMessageHandler(() => new FakeAdministrativeApi())));

    [Fact]
    public async Task Customer_updates_profile_with_ward_inside_selected_province()
    {
        using var app = ProfileApp(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var before = await Read<CustomerProfileDto>(await customer.GetAsync("/api/v1/me/profile"));
        Assert.Equal("customer1@example.test", before.Email);

        var saved = await Read<CustomerProfileDto>(await customer.PutAsJsonAsync("/api/v1/me/profile",
            new CustomerProfileInput("  Hoàng   Tùng Lâm ", "Công ty ABC", "+84 912.345.678", "12 Lê Lợi", "79", "26737")));
        Assert.Equal("Hoàng Tùng Lâm", saved.Name);
        Assert.Equal("0912345678", saved.Phone);
        Assert.Equal("Thành phố Hồ Chí Minh", saved.ProvinceName);
        Assert.Equal("Phường Bến Thành", saved.WardName);
        Assert.Equal("customer1@example.test", saved.Email);

        // Tên mới cũng hiện ở tài khoản đang đăng nhập.
        var me = await (await customer.GetAsync("/api/v1/auth/me")).Content.ReadAsStringAsync();
        Assert.Contains("Hoàng Tùng Lâm", me);
    }

    [Theory]
    [InlineData("A", "0912345678", "79", "26737")]      // tên quá ngắn
    [InlineData("Nguyễn Văn A", "12345", "79", "26737")] // SĐT sai
    [InlineData("Nguyễn Văn A", "0912345678", "79", "00004")] // phường của tỉnh khác
    [InlineData("Nguyễn Văn A", "0912345678", null, "26737")]  // có phường mà chưa chọn tỉnh
    [InlineData("Nguyễn Văn A", "0912345678", "55", null)]     // tỉnh không có trong danh mục
    public async Task Customer_profile_rejects_invalid_values_without_saving(string name, string phone, string? province, string? ward)
    {
        using var app = ProfileApp(); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var before = await Read<CustomerProfileDto>(await customer.GetAsync("/api/v1/me/profile"));
        var response = await customer.PutAsJsonAsync("/api/v1/me/profile", new CustomerProfileInput(name, null, phone, null, province, ward));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var after = await Read<CustomerProfileDto>(await customer.GetAsync("/api/v1/me/profile"));
        Assert.Equal(before.Name, after.Name);
        Assert.Equal(before.Phone, after.Phone);
    }

    [Fact]
    public async Task Only_customers_use_the_personal_profile_endpoint()
    {
        using var app = ProfileApp(); await app.Initialize();
        var agency = await app.Client("agency1@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.PutAsJsonAsync("/api/v1/me/profile",
            new CustomerProfileInput("Agency Name", null, "0912345678", null, null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().GetAsync("/api/v1/me/profile")).StatusCode);
    }
}
