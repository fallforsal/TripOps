using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Saving_existing_public_tour_preserves_its_visibility_and_does_not_create_versions(bool publish)
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var tour = await Create(agency);
        tour = await Command(agency, tour, publish ? "publish" : "complete");
        var saved = await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}",
            new UpdateTourRequest(tour.Revision, tour.Configuration with { Name = "Edited tour" }, "Save")));
        Assert.Equal("completed", saved.Status);
        Assert.Equal(publish ? "public" : "hidden", saved.Visibility);
        Assert.Equal("Edited tour", saved.Configuration.Name);
        await app.Inspect(async db => Assert.Empty(await db.TourVersions.Where(v => v.TourId == tour.Id).ToListAsync()));
    }

    [Fact]
    public async Task Agency_refusal_closes_provider_requests_and_exposes_reason_without_creating_contract_or_payments()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var provider = await app.Login("provider");
        var booking = await PublishedBookingWithProviderServices(customer, agency);
        const string reason = "Không thể dẫn tour đợt này";
        var refused = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("reject", reason)));
        Assert.Equal("Rejected", refused.Status); Assert.Null(refused.Contract);
        Assert.Empty(refused.PaymentSchedule ?? []);
        Assert.Contains(reason, refused.SpecialRequests!);
        var inbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        var requests = inbox.Where(r => r.BookingId == booking.Id).ToArray();
        Assert.Equal(2, requests.Length);
        Assert.All(requests, r => { Assert.Equal("Cancelled", r.Status); Assert.Equal(reason, r.CancelReason); });
    }
}
