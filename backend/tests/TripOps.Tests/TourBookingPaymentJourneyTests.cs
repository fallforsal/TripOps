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
    // Cross-feature regression: Agency approves a private tour booking independently of
    // Provider responses; customer signs and settles through the fake gateway.
    // Both payment schedules use the same journey, not pre-approved fixture bookings.
    [Theory]
    [InlineData(30, false)]
    [InlineData(3, false)]
    public async Task Custom_tour_contract_and_payos_complete_without_provider_confirmation(int daysUntilDeparture, bool fullPayment)
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
        await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/action", new DesignRequestAction("review"));
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
            $"/api/v1/agency/tours/{draft.Id}/complete", new TourCommand(draft.Revision)));
        plan = await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/share",new TourCommand(plan.Revision)));
        Assert.Equal("hidden", plan.Visibility);
        Assert.Equal(plan.Id, Assert.Single(await Read<TourDto[]>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/plans"))).Id);

        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(plan.Id, departure, "Demo Customer", "0900000000", "customer1@example.test", null,
                [new ParticipantInput("Adult One", null, new DateTime(1990, 1, 1), null, null, null),
                    new ParticipantInput("Adult Two", null, new DateTime(1992, 1, 1), null, null, null)], TourVersion: plan.Version, TourRevision: plan.Revision)));
        Assert.Null(booking.Contract);

        var serviceRequests = await Read<ProviderRequestView[]>(await providerClient.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(2, serviceRequests.Length);
        // Provider requests remain Pending. Agency approves independently, at the booked sale price.
        Assert.All(serviceRequests, r => Assert.Equal("Pending", r.Status));
        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        Assert.Equal(booking.TotalAmount, approved.Contract!.TotalAmount);
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

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            await db.BookingSupplierRequests.Where(r => r.BookingId == booking.Id)
                .ExecuteUpdateAsync(set => set.SetProperty(r => r.HoldUntil, DateTime.UtcNow.AddMinutes(-1)));
        }
        // An expired Provider hold does not gate the customer's payment either.
        var checkout = await Read<PayOsCheckoutDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null));
        Assert.Equal(fullPayment ? 6000000 : 3000000, checkout.Amount);
        gateway.Pay(OrderCode(checkout.TransactionCode));
        var paid = (await Sync(customer, booking.Id)).Booking;
        Assert.Equal(fullPayment ? "Paid" : "PartiallyPaid", paid.PaymentStatus);
        if (!fullPayment)
        {
            Assert.Equal("Confirmed", paid.Status);
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
                await db.BookingSupplierRequests.Where(r => r.BookingId == booking.Id)
                    .ExecuteUpdateAsync(set => set.SetProperty(r => r.HoldUntil, DateTime.UtcNow.AddMinutes(-1)));
            }
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
        Assert.All(await persisted.PaymentRequests.Where(r => r.BookingId == booking.Id).ToListAsync(), r => Assert.Null(r.QuotationId));
        Assert.Single(await persisted.ContractSignSessions.Where(s => s.CompletedAt != null).ToListAsync());
        var fee = new BookingSurchargeInput(200000, "Agreed additional service", paid.TotalAmount, Guid.NewGuid());
        var charged = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/surcharges", fee));
        Assert.Equal("Paid", charged.Status);
        Assert.Equal(paid.Contract!.Id, charged.Contract!.Id);
        Assert.False(charged.Contract.RequiredBeforePayment);
        Assert.Equal(6000000, charged.BaseTourAmount);
        var feeCheckout = await Read<PayOsCheckoutDto>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null));
        Assert.Equal(200000, feeCheckout.Amount);
        gateway.Pay(OrderCode(feeCheckout.TransactionCode));
        var finished = (await Sync(customer, booking.Id)).Booking;
        Assert.Equal(6200000, finished.PaidAmount);
        Assert.Equal("Paid", finished.PaymentStatus);
        Assert.Equal(6200000, (await Sync(customer, booking.Id)).Booking.PaidAmount);
    }
}
