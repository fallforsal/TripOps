using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private static async Task<BookingDto> PublishedBookingWithProviderServices(HttpClient customer, HttpClient agency)
    {
        var draft = await CreateCore(agency, Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Meals: [new MealInput("lunch", "Restaurant", ServiceId: 103)],
            Accommodations: [new AccommodationInput("Hotel", "Da Lat", ServiceId: 102)]), new TimelineInput(2, "Departure")] });
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{plan.Id}/publish", new TourCommand(plan.Version)));
        return await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(plan.Id, DateTime.UtcNow.Date.AddDays(20), "Customer", "0900000000", "customer@example.test", null,
                [new ParticipantInput("One", null, null, null, null, null), new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
    }

    [Fact]
    public async Task Published_booking_approves_after_both_services_confirm_and_keeps_booked_price()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var provider = await app.Login("provider");
        var booking = await PublishedBookingWithProviderServices(customer, agency);
        var requests = await Read<ProviderRequestView[]>(await agency.GetAsync($"/api/v1/bookings/{booking.Id}/quotations/supplier-requests"));
        Assert.Equal(2, requests.Length);
        foreach (var request in requests)
            await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{request.Id}/respond",
                new ProviderReply("confirm", 5000000, "Confirmed costs", request.Quantity, DateTime.UtcNow.AddDays(1))));
        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        Assert.Equal(booking.TotalAmount, approved.TotalAmount);
        Assert.Equal(booking.TotalAmount, approved.Contract!.TotalAmount);
        await app.Inspect(async db => {
            Assert.Null((await db.Bookings.SingleAsync(b => b.Id == booking.Id)).AcceptedQuotationId);
            Assert.DoesNotContain(await db.BookingQuotations.Where(q => q.BookingId == booking.Id).ToListAsync(), q => q.Status == "Accepted");
            Assert.All(await db.PaymentRequests.Where(p => p.BookingId == booking.Id).ToListAsync(), p => Assert.Null(p.QuotationId));
        });
        // A confirmed booking is idempotent; no duplicate contract/deposit is produced.
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        await app.Inspect(async db => Assert.Single(await db.PaymentRequests.Where(p => p.BookingId == booking.Id && p.Stage == "deposit").ToListAsync()));
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Rejected")]
    [InlineData("Partial")]
    [InlineData("CounterOffered")]
    [InlineData("Expired")]
    [InlineData("Missing")]
    [InlineData("WrongSlot")]
    public async Task Agency_approval_is_independent_of_provider_response(string condition)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var provider = await app.Login("provider");
        var booking = await PublishedBookingWithProviderServices(customer, agency);
        await app.Inspect(async db => {
            var requests = await db.BookingSupplierRequests.Where(r => r.BookingId == booking.Id).OrderBy(r => r.Id).ToListAsync();
            foreach (var request in requests) { request.Status = "Confirmed"; request.QuotedCost = 100000; }
            if (condition == "Expired") requests[0].HoldUntil = DateTime.UtcNow.AddSeconds(-1);
            else if (condition == "Missing") db.BookingSupplierRequests.Remove(requests[0]);
            else if (condition == "WrongSlot") requests[0].SlotKey = "hotel:999999";
            else requests[0].Status = condition;
            await db.SaveChangesAsync();
        });
        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        Assert.Equal("Confirmed", approved.Status);
        Assert.Equal(booking.TotalAmount, approved.Contract!.TotalAmount);
        Assert.NotEmpty(approved.PaymentSchedule!);
        if (condition == "Pending") {
            var rows = await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
            var pending = rows.Single(r => r.BookingId == booking.Id && r.Status == "Pending");
            var reply = await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{pending.Id}/respond", new ProviderReply("confirm", 999999, "Confirmed after Agency approval")));
            Assert.Equal("Confirmed", reply.Status);
            var reloaded = await Read<BookingDto>(await agency.GetAsync($"/api/v1/agency/bookings/{booking.Id}"));
            Assert.Equal("Confirmed", reloaded.Status);
            Assert.Equal(booking.TotalAmount, reloaded.TotalAmount);
        }
    }

    [Fact]
    public async Task Booked_private_plan_cannot_rewrite_customer_booking()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var (request, plan) = await SharedDesign(customer, agency);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", DesignBooking(plan)), HttpStatusCode.Created);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PutAsJsonAsync($"{Root}/{plan.Id}", new UpdateTourRequest(plan.Version,
            plan.Configuration with { Name = "Revised private plan" }, "Revised itinerary"))).StatusCode);
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
    }
}
