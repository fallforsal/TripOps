using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;

namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    private static async Task<(DesignRequestDto Request, TourDto Plan)> SharedDesign(HttpClient customer, HttpClient agency, TourConfiguration? config = null)
    {
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(20), DateTime.UtcNow.Date.AddDays(21), 2)), HttpStatusCode.Created);
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", config ?? Complete()), HttpStatusCode.Created);
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        return (request, plan);
    }
    [Fact]
    public async Task Shared_history_and_multiple_change_requests_survive_revision_and_communication_is_owned()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var (request, plan) = await SharedDesign(customer, agency);
        var root = $"/api/v1/tour-design-requests/{request.Id}";
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync(root + "/messages", new { message = "Please include vegetarian meals" })).StatusCode);
        Assert.Single(await Read<DesignRequestService.RequestMessage[]>(await agency.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/messages")));
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/messages")).StatusCode);
        var proposal = new { tourId = plan.Id, baseTourVersion = plan.Version,
            proposal = new { itinerary = Array.Empty<object>(), hotels = Array.Empty<object>(), requestedChanges = new { numberOfPeople = "3" } }, message = "Add one guest" };
        await Read<DesignRequestService.PlanProposalDto>(await customer.PostAsJsonAsync(root + "/proposals", proposal), HttpStatusCode.Created);
        await Read<DesignRequestService.PlanProposalDto>(await customer.PostAsJsonAsync(root + "/proposals", proposal with { message = "Also add another attraction" }), HttpStatusCode.Created);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync(root + "/agree-plan", new { tourId = plan.Id, version = plan.Version })).StatusCode);
        var edited = await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{plan.Id}", new UpdateTourRequest(plan.Version, plan.Configuration with { BasePrice = 3500000, NumberOfGuests = 3 }, "Revised guest count and price")));
        var next = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{plan.Id}/complete", new TourCommand(edited.Version)));
        var history = await Read<DesignRequestService.PlanHistory[]>(await customer.GetAsync(root + "/history"));
        Assert.Equal(2, history.Length);
        Assert.Contains(history, h => h.Version == plan.Version && h.Configuration.BasePrice == plan.Configuration.BasePrice);
        Assert.Contains(history, h => h.Version == next.Version && h.NumberOfGuests == 3);
        var savedChanges = await Read<DesignRequestService.PlanProposalDto[]>(await customer.GetAsync(root + "/proposals"));
        Assert.Equal(2, savedChanges.Length);
        Assert.Equal(2, savedChanges.Select(p => p.Id).Distinct().Count());
        Assert.All(savedChanges, change => {
            Assert.Equal(plan.Version, change.Proposal.GetProperty("quotation").GetProperty("tourVersion").GetInt32());
            Assert.Equal(plan.Configuration.BasePrice, change.Proposal.GetProperty("quotation").GetProperty("pricePerPerson").GetDecimal());
            Assert.Equal(plan.Configuration.Name, change.Proposal.GetProperty("planSnapshot").GetProperty("name").GetString());
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync(root + "/proposals", proposal)).StatusCode);
    }
    [Fact]
    public async Task Existing_tour_is_copied_into_the_same_request_without_mutating_the_published_tour()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var source = await CreateCore(agency, Complete("Published source"));
        source = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{source.Id}/publish", new TourCommand(source.Version)));
        var input = new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
            DateTime.UtcNow.Date.AddDays(20), DateTime.UtcNow.Date.AddDays(21), 2, SourceTourId: source.Id,
            InitialChanges: JsonSerializer.SerializeToElement(new { itinerary = new[] { new { title = "Customer copy" } }, hotels = Array.Empty<object>(), message = "Change visit order" }));
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests", input), HttpStatusCode.Created);
        var copy = await Read<TourConfiguration>(await agency.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/source"));
        Assert.Equal(source.Configuration.Name, copy.Name);
        var changes = await Read<JsonElement>(await agency.GetAsync($"/api/v1/agency/tour-design-requests/{request.Id}/initial-changes"));
        Assert.Equal("Customer copy", changes.GetProperty("itinerary")[0].GetProperty("title").GetString());
        Assert.Equal(source.Version, (await Read<TourDto>(await agency.GetAsync($"{Root}/{source.Id}"))).Version);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync("/api/v1/tour-design-requests", input with { AgencyId = "other" })).StatusCode);
    }
    [Fact]
    public async Task Final_quotation_commands_are_no_longer_exposed()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        foreach (var action in new[] { "send", "1/accept", "1/decision" })
            Assert.Equal(HttpStatusCode.NotFound, (await agency.PostAsJsonAsync($"/api/v1/bookings/1/quotations/{action}", new { })).StatusCode);
        foreach (var action in new[] { "draft", "terms" })
            Assert.Equal(HttpStatusCode.NotFound, (await agency.PutAsJsonAsync($"/api/v1/bookings/1/quotations/{action}", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await customer.PostAsync("/api/v1/bookings/1/quotations/1/accept", null)).StatusCode);
    }
    [Fact]
    public async Task Provider_counter_offer_requires_agency_decision_and_partial_supply_blocks_approval()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var provider = await app.Login("provider");
        var config = Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Activities: [new ActivityInput("Free text attraction")],
            Meals: [new MealInput("lunch", "Restaurant", ServiceId: 103)],
            Accommodations: [new AccommodationInput("Hotel", "Da Lat", ServiceId: 102)]), new TimelineInput(2, "Departure")] };
        var (request, plan) = await SharedDesign(customer, agency, config);
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new { tourId = plan.Id, version = plan.Version })).StatusCode);
        var notices = await Read<TripOps.Data.Entities.WorkflowNotification[]>(await provider.GetAsync("/api/v1/notifications"));
        Assert.Single(notices, n => n.RequestId == request.Id);
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new { tourId = plan.Id, version = plan.Version })).StatusCode);
        Assert.Single(await Read<TripOps.Data.Entities.WorkflowNotification[]>(await provider.GetAsync("/api/v1/notifications")), n => n.RequestId == request.Id);
        var b = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", new CreateBookingRequest(plan.Id, DateTime.UtcNow.Date.AddDays(20), "Customer", "0900000000", "customer@example.test", null,
            [new ParticipantInput("One", null, null, null, null, null), new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
        var inbox = await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        var hotel = inbox.Single(r => r.ServiceId == 102); var restaurant = inbox.Single(r => r.ServiceId == 103);
        Assert.DoesNotContain(inbox, r => r.SlotKey.StartsWith("activity:"));
        var costing = Assert.Single(await Read<QuotationView[]>(await agency.GetAsync($"/api/v1/bookings/{b.Id}/quotations")));
        Assert.DoesNotContain(costing.Costs!, line => line.SlotKey.StartsWith("activity:"));
        Assert.Contains(b.SnapshotDays!.SelectMany(d => d.Locations), location => location.Name == "Free text attraction");
        var counter = await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{hotel.Id}/respond", new ProviderReply("counter", 300000, "New price", 1, DateTime.UtcNow.AddDays(1))));
        Assert.Equal("CounterOffered", counter.Status);
        var partial = await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{restaurant.Id}/respond", new ProviderReply("partial", 200000, "Only one meal", 1)));
        Assert.Equal("Partial", partial.Status);
        Assert.Equal(HttpStatusCode.NoContent, (await agency.PostAsync($"/api/v1/bookings/{b.Id}/quotations/supplier-requests/{hotel.Id}/counter/true", null)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsync($"/api/v1/bookings/{b.Id}/quotations/supplier-requests/{restaurant.Id}/counter/true", null)).StatusCode);
        var history = await Read<JsonElement>(await agency.GetAsync($"/api/v1/bookings/{b.Id}/quotations/supplier-requests/{hotel.Id}/history"));
        Assert.True(history.GetProperty("priceConfirmed").GetBoolean());
        Assert.Equal(2, history.GetProperty("responses").GetArrayLength());
        Assert.Equal(HttpStatusCode.OK, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
    }

}
