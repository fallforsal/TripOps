using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task IncidentEvidence_VisibleToGuideAndAgency_WithPrivatePhotosAndNoSeverity()
    {
        using var app = new App(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> {
                ["Storage:UseLocal"] = "true"
            })));
        await app.Initialize();
        var id = await MakeCheckinPhotoBooking(app);
        using var guide = await app.Client("guide1@example.test");
        using var agency = await app.Client("agency1@example.test");
        using var customer = await app.Client("customer1@example.test");
        using var otherAgency = await app.Client("agency2@example.test");

        using var form = IncidentForm(2);
        var response = await guide.PostAsync($"/api/v1/guide/bookings/{id}/incidents", form);
        response.EnsureSuccessStatusCode();
        var incident = (await response.Content.ReadFromJsonAsync<IncidentDto>())!;
        Assert.Equal("Reported", incident.Status);
        Assert.Equal("VEHICLE", incident.IncidentType);
        Assert.Equal(2, incident.EvidenceUrls!.Count);
        Assert.DoesNotContain("Mức độ:", incident.Description);

        var guideDetail = (await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{id}"))!;
        var agencyDetail = (await agency.GetFromJsonAsync<BookingDto>($"/api/v1/agency/bookings/{id}"))!;
        Assert.Single(guideDetail.Incidents!);
        Assert.Single(agencyDetail.Incidents!);
        Assert.Equal(2, agencyDetail.Incidents![0].EvidenceUrls!.Count);
        Assert.False(string.IsNullOrWhiteSpace(agencyDetail.Incidents[0].ReportedByName));
        var customerDetail = (await customer.GetFromJsonAsync<BookingDto>(
            $"/api/v1/bookings/{id}"))!;
        Assert.Empty(customerDetail.Incidents![0].EvidenceUrls!);


        var root = app.Services.GetRequiredService<IWebHostEnvironment>().ContentRootPath;
        var files = new List<string>();
        try
        {
            foreach (var url in incident.EvidenceUrls)
            {
                Assert.StartsWith("/api/v1/files/guide-incidents/guide1/", url);
                Assert.Equal(HttpStatusCode.OK, (await guide.GetAsync(url)).StatusCode);
                Assert.Equal(HttpStatusCode.OK, (await agency.GetAsync(url)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync(url)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await otherAgency.GetAsync(url)).StatusCode);
                files.Add(Path.Combine(root, "App_Data", "uploads", "guide-incidents",
                    url.Replace("/api/v1/files/guide-incidents/", "")
                      .Replace('/', Path.DirectorySeparatorChar)));
            }
        }
        finally
        {
            foreach (var file in files)
                if (File.Exists(file)) File.Delete(file);
        }

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var stored = await db.BookingIncidents.SingleAsync(i => i.Id == incident.Id);
        Assert.Equal(2, GuideCheckinPhotoRules.Decode(stored.EvidenceUrls).Count);
    }

    [Fact]
    public async Task IncidentEvidence_RejectsWrongCountAndType_WithoutCreatingIncident()
    {
        using var app = new App();
        await app.Initialize();
        var id = await MakeCheckinPhotoBooking(app);
        using var guide = await app.Client("guide1@example.test");
        using (var wrongCount = IncidentForm(6))
            Assert.Equal(HttpStatusCode.UnprocessableEntity,
                (await guide.PostAsync($"/api/v1/guide/bookings/{id}/incidents", wrongCount)).StatusCode);
        using (var wrongType = IncidentForm(1, "text/plain"))
            Assert.Equal(HttpStatusCode.UnprocessableEntity,
                (await guide.PostAsync($"/api/v1/guide/bookings/{id}/incidents", wrongType)).StatusCode);

        using var scope = app.Services.CreateScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>()
            .BookingIncidents.CountAsync(i => i.BookingId == id));
    }

    [Fact]
    public async Task IncidentEvidence_OneEndpointSupportsTextOnlyAndEverySupportedCategory()
    {
        using var app = new App();
        await app.Initialize();
        var id = await MakeCheckinPhotoBooking(app);
        using var guide = await app.Client("guide1@example.test");
        using var agency = await app.Client("agency1@example.test");
        var endpoint = $"/api/v1/guide/bookings/{id}/incidents";

        Assert.Equal(new[] {
            "HEALTH", "VEHICLE", "WEATHER", "CUSTOMER",
            "SECURITY", "SERVICE_PROVIDER", "SCHEDULE", "OTHER"
        }, IncidentTypeRules.Allowed);
        foreach (var category in IncidentTypeRules.Allowed)
        {
            using var request = IncidentForm(0, category: category);
            var response = await guide.PostAsync(endpoint, request);
            response.EnsureSuccessStatusCode();
            var incident = (await response.Content.ReadFromJsonAsync<IncidentDto>())!;
            Assert.Equal(category, incident.IncidentType);
            Assert.Empty(incident.EvidenceUrls!);
            Assert.DoesNotContain("Mức độ:", incident.Description);
        }

        var agencyDetail = (await agency.GetFromJsonAsync<BookingDto>(
            $"/api/v1/agency/bookings/{id}"))!;
        Assert.Equal(8, agencyDetail.Incidents!.Count);

        // The legacy extra endpoint must not remain available.
        using var oldForm = IncidentForm(1);
        Assert.Equal(HttpStatusCode.NotFound,
            (await guide.PostAsync(
                $"/api/v1/guide/bookings/{id}/incidents-with-images", oldForm)).StatusCode);

        // The consolidated endpoint intentionally has one multipart-only contract.
        Assert.Equal(HttpStatusCode.UnsupportedMediaType,
            (await guide.PostAsJsonAsync(endpoint, new {
                incidentType = "OTHER",
                title = "No multipart",
                description = "Legacy JSON payload"
            })).StatusCode);
    }

    [Theory]
    [InlineData("TRANSPORT")]
    [InlineData("INVALID")]
    [InlineData("VEHICLE_WRONG")]
    public async Task IncidentEvidence_RejectsUnsupportedIncidentCategories(string category)
    {
        using var app = new App();
        await app.Initialize();
        var id = await MakeCheckinPhotoBooking(app);
        using var guide = await app.Client("guide1@example.test");
        using var form = IncidentForm(0, category: category);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsync($"/api/v1/guide/bookings/{id}/incidents", form))
                .StatusCode);
        using var scope = app.Services.CreateScope();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>()
            .BookingIncidents.CountAsync(i => i.BookingId == id));
    }

    private static MultipartFormDataContent IncidentForm(int count, string mime = "image/png", string category = "VEHICLE")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent(category), "IncidentType");
        form.Add(new StringContent("Xe bị hỏng"), "Title");
        form.Add(new StringContent("Xe dừng bên đường để sửa"), "Description");
        for (var i = 0; i < count; i++)
        {
            var item = new ByteArrayContent([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
            item.Headers.ContentType = new MediaTypeHeaderValue(mime);
            form.Add(item, "Images", $"incident_{i}.png");
        }
        return form;
    }
}
