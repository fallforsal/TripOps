using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace TripOps.Tests;

public sealed class OpenApiTests
{
    private static WebApplicationFactory<Program> Factory(string environment = "Development") =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseEnvironment(environment));
    private static async Task<JsonDocument> Document(WebApplicationFactory<Program> app) =>
        JsonDocument.Parse(await app.CreateClient().GetStringAsync("/openapi/v1.json"));
    private static IEnumerable<(string Path, string Method, JsonElement Operation)> Operations(JsonElement document) =>
        document.GetProperty("paths").EnumerateObject().SelectMany(path => path.Value.EnumerateObject()
            .Where(method => new[] { "get", "post", "put", "delete", "patch", "head", "options" }.Contains(method.Name))
            .Select(method => (path.Name, method.Name, method.Value)));

    [Fact]
    public async Task Document_matches_all_implemented_controller_routes_and_contains_WF01_and_WF02()
    {
        await using var app = Factory(); using var json = await Document(app);
        var operations = Operations(json.RootElement).ToArray();
        var descriptions = app.Services.GetRequiredService<IApiDescriptionGroupCollectionProvider>().ApiDescriptionGroups.Items.SelectMany(g => g.Items).ToArray();
        var expected = descriptions.Select(d => $"{d.HttpMethod!.ToLowerInvariant()} /{d.RelativePath}").Order().ToArray();
        Assert.Equal(expected, operations.Select(o => $"{o.Method} {o.Path}").Order().ToArray());
        Assert.Equal(30, operations.Length);
        Assert.Equal(20, operations.Count(o => !o.Path.StartsWith("/api/v1/auth") && !o.Path.StartsWith("/api/v1/me/business-profile") &&
            !o.Path.StartsWith("/api/v1/admin/partner-applications") && o.Path != "/api/v1/health"));
        Assert.Contains(operations, o => o.Path == "/api/v1/agency/tours" && o.Method == "post");
        Assert.Contains(operations, o => o.Path == "/api/v1/agency/tours/{id}" && o.Method == "put");
        foreach (var action in new[] { "publish", "hide" }) Assert.Contains(operations, o => o.Path == $"/api/v1/agency/tours/{{id}}/{action}" && o.Method == "post");
        foreach (var action in new[] { "submit", "approve", "reject" }) Assert.DoesNotContain(operations, o =>
            (o.Path.StartsWith("/api/v1/agency/tours/") || o.Path.StartsWith("/api/v1/admin/tours/")) && o.Path.EndsWith($"/{{id}}/{action}"));
        Assert.Contains(operations, o => o.Path == "/api/v1/agency/tours/{id}/versions/{number}/restore");
        Assert.DoesNotContain(operations, o => o.Path.Contains("provider/services") || o.Path.Contains("WeatherForecast"));
        Assert.Equal(operations.Length, operations.Select(o => o.Operation.GetProperty("operationId").GetString()).Distinct().Count());
    }

    [Fact]
    public async Task Security_matches_actual_cookie_authentication_and_endpoint_authorization()
    {
        await using var app = Factory(); using var json = await Document(app);
        var root = json.RootElement;
        var handlers = await app.Services.GetRequiredService<IAuthenticationSchemeProvider>().GetAllSchemesAsync();
        Assert.Equal("Cookies", Assert.Single(handlers).Name);
        var schemes = root.GetProperty("components").GetProperty("securitySchemes");
        var cookie = schemes.GetProperty("Cookies");
        Assert.Equal("apiKey", cookie.GetProperty("type").GetString());
        Assert.Equal("cookie", cookie.GetProperty("in").GetString());
        Assert.Equal("TripOps.Session", cookie.GetProperty("name").GetString());
        Assert.False(schemes.TryGetProperty("Bearer", out _));
        Assert.False(root.TryGetProperty("security", out _));
        var descriptions = app.Services.GetRequiredService<IApiDescriptionGroupCollectionProvider>().ApiDescriptionGroups.Items.SelectMany(g => g.Items).ToArray();
        var protectedCount = 0;
        foreach (var item in Operations(root))
        {
            var metadata = descriptions.Single(d => $"/{d.RelativePath}" == item.Path && d.HttpMethod!.Equals(item.Method, StringComparison.OrdinalIgnoreCase)).ActionDescriptor.EndpointMetadata;
            var protectedEndpoint = metadata.OfType<IAuthorizeData>().Any() && !metadata.OfType<IAllowAnonymous>().Any();
            var security = item.Operation.GetProperty("security");
            if (protectedEndpoint) {
                protectedCount++;
                Assert.True(security[0].TryGetProperty("Cookies", out _));
                Assert.True(item.Operation.GetProperty("responses").TryGetProperty("401", out _));
                Assert.True(item.Operation.GetProperty("responses").TryGetProperty("403", out _));
            } else Assert.Equal(0, security.GetArrayLength());
        }
        Assert.Equal(24, protectedCount);
    }

    [Fact]
    public async Task Tags_summaries_response_DTOs_and_statuses_describe_actual_operations()
    {
        await using var app = Factory(); using var json = await Document(app); var root = json.RootElement;
        var operations = Operations(root).ToArray();
        var tags = operations.SelectMany(o => o.Operation.GetProperty("tags").EnumerateArray().Select(t => t.GetString())).Distinct().ToArray();
        foreach (var tag in new[] { "Authentication", "Partner Management", "Service Management", "Tour Management", "Tour Moderation", "Tour Publishing", "Health" }) Assert.Contains(tag, tags);
        Assert.DoesNotContain("Tour Approval", tags);
        foreach (var item in operations) {
            Assert.False(string.IsNullOrWhiteSpace(item.Operation.GetProperty("summary").GetString()));
            var responses = item.Operation.GetProperty("responses");
            foreach (var response in responses.EnumerateObject().Where(r => r.Name.StartsWith('2') && r.Name != "204"))
                Assert.True(response.Value.GetProperty("content").GetProperty("application/json").TryGetProperty("schema", out _), $"Missing response schema for {item.Method} {item.Path}");
        }
        var paths = root.GetProperty("paths");
        Assert.True(paths.GetProperty("/api/v1/agency/tours").GetProperty("post").GetProperty("responses").TryGetProperty("201", out _));
        Assert.True(paths.GetProperty("/api/v1/agency/tours/{id}").GetProperty("delete").GetProperty("responses").TryGetProperty("204", out _));
        Assert.True(paths.GetProperty("/api/v1/agency/ai/itinerary-drafts").GetProperty("post").GetProperty("responses").TryGetProperty("503", out _));
        Assert.Contains("Tour Publishing", paths.GetProperty("/api/v1/agency/tours/{id}/publish").GetProperty("post").GetProperty("tags").EnumerateArray().Select(t => t.GetString()));
    }

    [Fact]
    public async Task Positional_record_validation_constraints_and_multipart_upload_are_preserved()
    {
        await using var app = Factory(); using var json = await Document(app); var root = json.RootElement;
        var schemas = root.GetProperty("components").GetProperty("schemas");
        var config = schemas.GetProperty("TourConfiguration"); var properties = config.GetProperty("properties");
        Assert.Contains("name", config.GetProperty("required").EnumerateArray().Select(v => v.GetString()));
        Assert.Equal(255, properties.GetProperty("name").GetProperty("maxLength").GetInt32());
        Assert.Equal(1, properties.GetProperty("durationDays").GetProperty("minimum").GetInt32());
        Assert.Equal(365, properties.GetProperty("durationDays").GetProperty("maximum").GetInt32());
        Assert.Equal(9999999999m, properties.GetProperty("basePrice").GetProperty("maximum").GetDecimal());
        var tier = schemas.GetProperty("PricingTierInput");
        Assert.Contains("minAge", tier.GetProperty("required").EnumerateArray().Select(v => v.GetString()));
        var age = tier.GetProperty("properties").GetProperty("minAge");
        var ageTypes = age.GetProperty("type").ValueKind == JsonValueKind.Array
            ? age.GetProperty("type").EnumerateArray().Select(v => v.GetString()).ToArray()
            : [age.GetProperty("type").GetString()];
        Assert.Contains("integer", ageTypes); Assert.DoesNotContain("null", ageTypes);
        var registration = schemas.GetProperty("RegisterRequest").GetProperty("properties");
        Assert.Equal("email", registration.GetProperty("email").GetProperty("format").GetString());
        Assert.Equal("password", registration.GetProperty("password").GetProperty("format").GetString());
        Assert.Equal(8, registration.GetProperty("password").GetProperty("minLength").GetInt32());
        var upload = root.GetProperty("paths").GetProperty("/api/v1/me/business-profile/submit").GetProperty("post").GetProperty("requestBody");
        Assert.True(upload.GetProperty("content").TryGetProperty("multipart/form-data", out _));
    }

    [Fact]
    public async Task Swagger_root_serves_UI_with_cookie_credentials_and_current_document_route()
    {
        await using var app = Factory(); using var client = app.CreateClient();
        var response = await client.GetAsync("/swagger"); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var html = await response.Content.ReadAsStringAsync();
        Assert.Contains("TripOps API testing", html);
        var initialization = await client.GetStringAsync("/swagger/index.js");
        Assert.Contains("/openapi/v1.json", initialization);
        Assert.Contains("\"withCredentials\":true", initialization);
    }

    [Fact]
    public async Task Tour_nested_schemas_expose_realistic_examples_nullable_references_and_business_constraints()
    {
        await using var app = Factory(); using var json = await Document(app);
        var schemas = json.RootElement.GetProperty("components").GetProperty("schemas");
        foreach (var (type, field) in new[] { ("ActivityInput", "serviceId"), ("MealInput", "serviceId"),
            ("AccommodationInput", "serviceId"), ("TimelineInput", "transportationServiceId") })
        {
            var value = schemas.GetProperty(type).GetProperty("properties").GetProperty(field);
            Assert.Equal(1, value.GetProperty("minimum").GetInt32());
            Assert.Contains("null", value.GetProperty("type").EnumerateArray().Select(t => t.GetString()));
            Assert.Equal(JsonValueKind.Null, value.GetProperty("examples")[0].ValueKind);
        }
        var activity = schemas.GetProperty("ActivityInput").GetProperty("properties");
        Assert.Equal("08:30:00", activity.GetProperty("estimatedTime").GetProperty("examples")[0].GetString());
        Assert.Contains("less than 24 hours", activity.GetProperty("estimatedTime").GetProperty("description").GetString());
        var meals = schemas.GetProperty("MealInput").GetProperty("properties");
        Assert.Equal(new[] { "breakfast", "lunch", "dinner" }, meals.GetProperty("mealType").GetProperty("enum").EnumerateArray().Select(e => e.GetString()).ToArray());
        Assert.Equal(-9999999999m, meals.GetProperty("priceDifference").GetProperty("minimum").GetDecimal());
        var hotel = schemas.GetProperty("AccommodationInput").GetProperty("properties");
        Assert.Equal(0, hotel.GetProperty("nightsCount").GetProperty("minimum").GetInt32());
        Assert.Equal(1, hotel.GetProperty("starRating").GetProperty("minimum").GetInt32());
        Assert.Equal(5, hotel.GetProperty("starRating").GetProperty("maximum").GetInt32());
        var image = schemas.GetProperty("TourConfiguration").GetProperty("properties").GetProperty("images").GetProperty("items");
        Assert.Equal("uri", image.GetProperty("format").GetString()); Assert.Equal(2048, image.GetProperty("maxLength").GetInt32());
        var examples = json.RootElement.GetProperty("paths").GetProperty("/api/v1/agency/tours").GetProperty("post")
            .GetProperty("requestBody").GetProperty("content").GetProperty("application/json").GetProperty("examples");
        var tour = examples.GetProperty("completeManualTour").GetProperty("value");
        Assert.Equal(3, tour.GetProperty("durationDays").GetInt32());
        Assert.Equal(2, tour.GetProperty("durationNights").GetInt32());
        Assert.Equal(JsonValueKind.Null, tour.GetProperty("pricingTiers")[2].GetProperty("maxAge").ValueKind);
    }
}
