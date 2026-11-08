using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    // Cross-feature regression: create a private tour, confirm its services, agree its
    // actual price, approve, sign the exact contract and settle through the fake gateway.
    // Both payment schedules use the same journey, not pre-approved fixture bookings.
    [Theory]
    [InlineData(30, false)]
    [InlineData(3, false)]
    public async Task Custom_tour_provider_quote_contract_and_payos_complete_one_journey(int daysUntilDeparture, bool fullPayment)
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        var gateway = new FakePayOs();
        using var app = PayOsApp(gateway, clock);
        await app.Initialize();
        int hotelId, mealId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            // New registrations use Customer; the older booking fixture uses legacy User.
            (await db.Users.SingleAsync(u => u.Id == "customer1")).Role = UserRole.Customer;
            var provider = new User { Id = "journey-provider", Name = "Journey Provider",
                Email = "journey-provider@example.test", Role = UserRole.Provider, Status = UserStatus.Active };
            provider.PasswordHash = new PasswordHasher<User>().HashPassword(provider, "Password123!");
            provider.BusinessProfile = new BusinessProfile { UserId = provider.Id,
                BusinessName = "Journey Provider", Status = BusinessProfileStatus.Approved };
            var hotel = new TripOps.Data.Entities.Service { ProviderId = provider.Id,
                Name = "Journey Hotel", Category = ServiceCategory.Hotel, Status = ServiceStatus.Approved, Price = 500000 };
            var meal = new TripOps.Data.Entities.Service { ProviderId = provider.Id,
                Name = "Journey Restaurant", Category = ServiceCategory.Fnb, Status = ServiceStatus.Approved, Price = 150000 };
            db.Users.Add(provider); db.Services.AddRange(hotel, meal);
            await db.SaveChangesAsync();
            hotelId = hotel.Id; mealId = meal.Id;
        }

        using var customer = await app.Client("customer1@example.test");
        using var agency = await app.Client("agency1@example.test");
        using var providerClient = await app.Client("journey-provider@example.test");
        var departure = clock.Fixed!.Value.Date.AddDays(daysUntilDeparture);
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency1", "Demo Customer", "customer1@example.test", "0900000000",
                "Da Lat", departure, departure.AddDays(1), 2)));
        var config = new TourConfiguration("Journey Da Lat 2N1D", Destination: "Da Lat",
            DurationDays: 2, DurationNights: 1, BasePrice: 3000000, MinGuests: 2, MaxGuests: 20,
            CancellationPolicy: "Demo cancellation terms", Images: ["https://example.test/journey.jpg"],
            PricingTiers: [new("Adult", 0, 150, 3000000)],
            Timelines: [new(1, "Arrival", Activities: [new("Xuan Huong Lake")],
                Meals: [new("lunch", "Journey Restaurant", ServiceId: mealId)],
                Accommodations: [new("Journey Hotel", "Da Lat", ServiceId: hotelId)]), new(2, "Departure")],
            ProvinceCodes: ["LAM_DONG"]);
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", config));
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tours/{draft.Id}/complete", new TourCommand(draft.Version)));
        Assert.Equal("hidden", plan.Visibility);
        Assert.Equal(plan.Id, Assert.Single(await Read<TourDto[]>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/plans"))).Id);

        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new DesignRequestService.PlanAgreement(plan.Id, plan.Version))).StatusCode);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(plan.Id, departure, "Demo Customer", "0900000000", "customer1@example.test", null,
                [new ParticipantInput("Adult One", null, new DateTime(1990, 1, 1), null, null, null),
                    new ParticipantInput("Adult Two", null, new DateTime(1992, 1, 1), null, null, null)])));
        Assert.Null(booking.Contract);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/send", null)).StatusCode);

        var serviceRequests = await Read<ProviderRequestView[]>(await providerClient.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(2, serviceRequests.Length);
        foreach (var row in serviceRequests)
            await Read<ProviderRequestView>(await providerClient.PostAsJsonAsync(
                $"/api/v1/provider/booking-requests/{row.Id}/respond",
                new ProviderReply("confirm", row.ServiceId == hotelId ? 3000000 : 2000000, "Demo total service cost")));
        await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(1000000, [], "Confirmed service prices")));
        var quotation = await Read<QuotationView>(await agency.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/send", null));
        Assert.Equal(6000000, quotation.SaleTotal);
        var customerQuote = Assert.Single(await Read<QuotationView[]>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")));
        Assert.Null(customerQuote.TotalCost); Assert.Null(customerQuote.AgencyProfit);
        await Read<QuotationView>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/{quotation.Version}/accept", null));

        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        Assert.Equal(quotation.SaleTotal, approved.Contract!.TotalAmount);
        Assert.True(approved.Contract.RequiredBeforePayment);
        Assert.Equal(fullPayment ? 1 : 2, approved.PaymentSchedule!.Count);
        Assert.Equal(fullPayment ? "full" : "deposit", approved.PaymentSchedule[0].Stage);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).StatusCode);
        Assert.Equal(0, gateway.CreateCalls);

        await SignContract(customer, booking.Id);
        var signed = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"));
        Assert.Equal("web", signed.Contract!.SignMethod);
        Assert.False(signed.Contract.RequiredBeforePayment);
        Assert.Equal("application/pdf", (await customer.GetAsync($"/api/v1/files/contracts/{booking.Id}/signed")).Content.Headers.ContentType!.MediaType);

        var checkout = await Read<PayOsCheckoutDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null));
        Assert.Equal(fullPayment ? 6000000 : 3000000, checkout.Amount);
        gateway.Pay(OrderCode(checkout.TransactionCode));
        var paid = (await Sync(customer, booking.Id)).Booking;
        Assert.Equal(fullPayment ? "Paid" : "PartiallyPaid", paid.PaymentStatus);
        if (!fullPayment)
        {
            Assert.Equal("Confirmed", paid.Status);
            var balance = await Read<PayOsCheckoutDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null));
            Assert.Equal(3000000, balance.Amount);
            gateway.Pay(OrderCode(balance.TransactionCode));
            paid = (await Sync(customer, booking.Id)).Booking;
        }
        Assert.Equal("Paid", paid.Status);
        Assert.Equal("Paid", paid.PaymentStatus);
        Assert.Equal(6000000, paid.PaidAmount);
        Assert.Equal(6000000, (await Sync(customer, booking.Id)).Booking.PaidAmount);
        using var check = app.Services.CreateScope();
        var persisted = check.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Assert.Equal(6000000, await persisted.PaymentTransactions.Where(t => t.BookingId == booking.Id && t.Status == PaymentTransactionStatus.Success).SumAsync(t => t.Amount));
        Assert.All(await persisted.PaymentRequests.Where(r => r.BookingId == booking.Id).ToListAsync(), r => Assert.Equal(quotation.Id, r.QuotationId));
        Assert.Single(await persisted.ContractSignSessions.Where(s => s.CompletedAt != null).ToListAsync());
    }
}
