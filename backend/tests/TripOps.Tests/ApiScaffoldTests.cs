using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TripOps.Service.Diagnostics;

namespace TripOps.Tests;

public sealed class ApiScaffoldTests
{
    private static WebApplicationFactory<Program> Factory(string environment = "Development") =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder => builder.UseEnvironment(environment));

    [Fact]
    public async Task Health_does_not_claim_database_readiness()
    {
        await using var app = Factory();
        using var client = app.CreateClient();
        using var response = await client.GetAsync("/api/v1/health");
        response.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("api_liveness_only", json.RootElement.GetProperty("scope").GetString());
        Assert.Contains(json.RootElement.GetProperty("database").GetString(),
            new[] { "not_configured", "configured_not_checked" });
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task Development_serves_openapi_and_swagger_without_sample_business_routes()
    {
        await using var app = Factory();
        using var client = app.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.GetProperty("paths").TryGetProperty("/api/v1/health", out _));
        Assert.False(json.RootElement.GetProperty("paths").TryGetProperty("/WeatherForecast", out _));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/swagger/index.html")).StatusCode);
    }

    [Theory]
    [InlineData("/swagger/index.html")]
    [InlineData("/openapi/v1.json")]
    public async Task Production_hides_development_documentation(string path)
    {
        await using var app = Factory("Production");
        Assert.Equal(HttpStatusCode.NotFound, (await app.CreateClient().GetAsync(path)).StatusCode);
    }

    [Theory]
    [InlineData("Development", "http://localhost:5173", true)]
    [InlineData("Development", "https://untrusted.invalid", false)]
    [InlineData("Production", "http://localhost:5173", false)]
    public async Task Cors_is_allowlisted_and_development_only(string environment, string origin, bool allowed)
    {
        await using var app = Factory(environment);
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/health");
        request.Headers.Add("Origin", origin);
        using var response = await app.CreateClient().SendAsync(request);
        Assert.Equal(allowed, response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Unhandled_errors_return_safe_problem_details_with_trace_id()
    {
        await using var app = Factory().WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<ISystemStatusService>();
            services.AddSingleton<ISystemStatusService, FailingStatusService>();
        }));
        using var response = await app.CreateClient().GetAsync("/api/v1/health");
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("private-test-detail", body);
        using var json = JsonDocument.Parse(body);
        Assert.False(string.IsNullOrWhiteSpace(json.RootElement.GetProperty("traceId").GetString()));
    }

    private sealed class FailingStatusService : ISystemStatusService
    {
        public SystemStatusResponse GetStatus() => throw new InvalidOperationException("private-test-detail");
    }
}
