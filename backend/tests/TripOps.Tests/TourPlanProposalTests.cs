using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Customer_can_send_a_separate_plan_copy_and_agency_can_reply_without_changing_the_tour()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer");
        using var agency = await app.Login("agency");
        using var otherAgency = await app.Login("other");
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 2)), HttpStatusCode.Created);
        var tour = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete("Agency original")), HttpStatusCode.Created);
        var url = $"/api/v1/tour-design-requests/{request.Id}/proposals";
        var input = new { tourId = tour.Id, baseTourVersion = tour.Version,
            proposal = new { itinerary = new[] { new { title = "Customer alternative" } }, hotels = Array.Empty<object>() },
            message = "Please change the hotel and visit order" };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync(url, input)).StatusCode);
        tour = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{tour.Id}/complete", new TourCommand(tour.Version)));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync(url, input)).StatusCode);
        var proposal = await Read<DesignRequestService.PlanProposalDto>(await customer.PostAsJsonAsync(url,
            input with { baseTourVersion = tour.Version }), HttpStatusCode.Created);
        Assert.Equal("Pending", proposal.Status);
        Assert.Equal("Customer alternative", proposal.Proposal.GetProperty("itinerary")[0].GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await otherAgency.GetAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/proposals")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherAgency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/proposals/{proposal.Id}/reply",
            new { decision = "reviewed", message = "No" })).StatusCode);
        Assert.Single(await Read<DesignRequestService.PlanProposalDto[]>(await agency.GetAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/proposals")));
        var replied = await Read<DesignRequestService.PlanProposalDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/proposals/{proposal.Id}/reply",
            new { decision = "needs_changes", message = "Please clarify the new hotel" }));
        Assert.Equal("NeedsChanges", replied.Status);
        Assert.Equal("Please clarify the new hotel", Assert.Single(await Read<DesignRequestService.PlanProposalDto[]>(
            await customer.GetAsync(url))).AgencyReply);
        Assert.Equal("Agency original", (await Read<TourDto>(await agency.GetAsync($"{Root}/{tour.Id}"))).Configuration.Name);
    }
}
