using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Customer_request_reaches_only_target_agency_and_creates_one_private_tour()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer");
        using var agency = await app.Login("agency");
        using var other = await app.Login("other");
        using var anonymous = app.CreateClient();
        var agencies = await Read<AgencyChoiceDto[]>(await anonymous.GetAsync("/api/v1/tour-design-requests/agencies"));
        Assert.Contains(agencies, a => a.Id == "agency");
        Assert.DoesNotContain(agencies, a => a.Id == "pending");

        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 8, 2000000,
                "4", "Vegetarian meal", "Customer company", "company@example.test", "0900000001")), HttpStatusCode.Created);
        Assert.Equal("pending", request.Status);
        Assert.Equal("Customer company", request.BusinessName);
        Assert.Single(await Read<DesignRequestDto[]>(await agency.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Empty(await Read<DesignRequestDto[]>(await other.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete())).StatusCode);

        var tour = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete("Private itinerary")), HttpStatusCode.Created);
        Assert.True(tour.IsRequest);
        Assert.Equal(request.Id, tour.DesignRequestId);
        Assert.Equal("hidden", tour.Visibility);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await customer.PostAsync($"/api/v1/tour-design-requests/{request.Id}/cancel", null)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);

        var completed = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"{Root}/{tour.Id}/complete", new TourCommand(tour.Version)));
        Assert.Equal("completed", completed.Status);
        Assert.Equal("hidden", completed.Visibility);
        var customerTour = await Read<TourDto>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Equal(tour.Id, customerTour.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        var customerRequests = await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests"));
        Assert.Equal("designed", Assert.Single(customerRequests).Status);
        Assert.Equal(tour.Id, customerRequests[0].DesignedTourId);
    }

    [Fact]
    public async Task Invalid_or_cancelled_request_cannot_start_tour()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var invalid = new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
            DateTime.UtcNow.Date.AddDays(11), DateTime.UtcNow.Date.AddDays(10), 8);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await customer.PostAsJsonAsync("/api/v1/tour-design-requests", invalid)).StatusCode);
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            invalid with { ReturnDate = DateTime.UtcNow.Date.AddDays(12) }), HttpStatusCode.Created);
        var cancelled = await Read<DesignRequestDto>(await customer.PostAsync(
            $"/api/v1/tour-design-requests/{request.Id}/cancel", null));
        Assert.Equal("cancelled", cancelled.Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete())).StatusCode);
    }
}
