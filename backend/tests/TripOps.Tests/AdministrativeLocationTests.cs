using System.Net;
using System.Net.Http.Json;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Locations;

namespace TripOps.Tests;

public sealed class AdministrativeLocationTests
{
    private const string Provinces = """[{"code":68,"name":"Tỉnh Lâm Đồng"},{"code":1,"name":"Thành phố Hà Nội"}]""";
    private sealed class Upstream : HttpMessageHandler
    {
        public readonly ConcurrentQueue<string> Requests = new();
        public Func<string, HttpResponseMessage> Reply = path => new(HttpStatusCode.OK) {
            Content = new StringContent(path == "/api/v2/" ? Provinces :
                """{"code":68,"name":"Tỉnh Lâm Đồng","wards":[{"code":24778,"name":"Phường Xuân Hương - Đà Lạt","province_code":68}]}""",
                System.Text.Encoding.UTF8, "application/json")
        };
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Requests.Enqueue(request.RequestUri!.PathAndQuery);
            return Task.FromResult(Reply(request.RequestUri.PathAndQuery));
        }
    }
    private static WebApplicationFactory<Program> Factory(Upstream upstream) => new WebApplicationFactory<Program>()
        .WithWebHostBuilder(builder => builder.UseEnvironment("Development").ConfigureServices(services =>
            services.AddHttpClient(VietnamAdministrativeService.ClientName).ConfigurePrimaryHttpMessageHandler(() => upstream)));

    [Fact]
    public async Task Anonymous_dropdown_reads_v2_provinces_and_scoped_wards_with_shared_cache()
    {
        var upstream = new Upstream(); await using var app = Factory(upstream); using var client = app.CreateClient();
        var provinces = await client.GetFromJsonAsync<ProvinceOption[]>("/api/v1/locations/provinces");
        Assert.Contains(provinces!, p => p.Code == "01" && p.Name == "Hà Nội" && p.FullName == "Thành phố Hà Nội");
        var ward = Assert.Single((await client.GetFromJsonAsync<WardOption[]>("/api/v1/locations/provinces/68/wards"))!);
        Assert.Equal("68", ward.ProvinceCode);
        Assert.Equal("Phường Xuân Hương - Đà Lạt", ward.Name);
        await client.GetStringAsync("/api/v1/locations/provinces");
        await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => client.GetStringAsync("/api/v1/locations/provinces/68/wards")));
        Assert.Equal(new[] { "/api/v2/", "/api/v2/p/68?depth=2" }, upstream.Requests.ToArray());
    }

    [Theory]
    [InlineData("0", HttpStatusCode.BadRequest)]
    [InlineData("100", HttpStatusCode.BadRequest)]
    [InlineData("abc", HttpStatusCode.BadRequest)]
    [InlineData("99", HttpStatusCode.NotFound)]
    public async Task Invalid_or_unknown_provinces_never_fetch_unrelated_wards(string code, HttpStatusCode expected)
    {
        var upstream = new Upstream(); await using var app = Factory(upstream); using var client = app.CreateClient();
        Assert.Equal(expected, (await client.GetAsync($"/api/v1/locations/provinces/{code}/wards")).StatusCode);
        Assert.DoesNotContain(upstream.Requests, p => p.Contains("/p/"));
    }

    [Theory]
    [InlineData("unavailable")]
    [InlineData("malformed")]
    [InlineData("empty")]
    [InlineData("timeout")]
    public async Task Upstream_failure_returns_retryable_503_and_is_not_cached(string failure)
    {
        var upstream = new Upstream(); var success = upstream.Reply;
        upstream.Reply = _ => failure switch {
            "unavailable" => new(HttpStatusCode.BadGateway),
            "timeout" => throw new TaskCanceledException(),
            _ => new(HttpStatusCode.OK) { Content = new StringContent(failure == "empty" ? "[]" : "not json") }
        };
        await using var app = Factory(upstream); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/v1/locations/provinces")).StatusCode);
        upstream.Reply = success;
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/locations/provinces")).StatusCode);
        Assert.Equal(2, upstream.Requests.Count);
    }

    [Fact]
    public async Task Ward_response_for_the_wrong_province_is_rejected_and_can_be_retried()
    {
        var upstream = new Upstream(); var success = upstream.Reply;
        upstream.Reply = path => path == "/api/v2/" ? success(path) : new(HttpStatusCode.OK) {
            Content = new StringContent("""{"code":68,"wards":[{"code":1,"name":"Wrong ward","province_code":1}]}""",
                System.Text.Encoding.UTF8, "application/json")
        };
        await using var app = Factory(upstream); using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync("/api/v1/locations/provinces/68/wards")).StatusCode);
        upstream.Reply = success;
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/locations/provinces/68/wards")).StatusCode);
        Assert.Equal(3, upstream.Requests.Count);
    }
}
