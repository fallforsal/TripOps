using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Surcharges_are_independent_but_balance_requires_deposit_and_selected_request_is_enforced()
    {
        var gateway = new FakePayOs();
        using var app = PayOsApp(gateway, new TestClock { Fixed = ApprovedAtUtc });
        await app.Initialize();
        var (customer, agency, b) = await ApprovedBooking(app, TenMillion());
        var root = $"/api/v1/bookings/{b.Id}";
        foreach (var amount in new[] { 200000m, 50000m })
            b = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/surcharges",
                new BookingSurchargeInput(amount, "Agreed extra service", b.TotalAmount, Guid.NewGuid())));
        var fees = b.PaymentSchedule!.Where(p => p.Stage == "surcharge").ToArray();
        Assert.All(fees, p => Assert.Equal("Pending", p.Status));
        var deposit = b.PaymentSchedule!.Single(p => p.Stage == "deposit");
        var balance = b.PaymentSchedule!.Single(p => p.Stage == "balance");
        Assert.Equal("Scheduled", balance.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"{root}/payments/payos?paymentRequestId={balance.Id}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"{root}/deposit",
            new BookingDepositRequest(balance.Outstanding, "blocked-balance", null, balance.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await customer.PostAsync($"{root}/payments/payos?paymentRequestId=2147483647", null)).StatusCode);

        // Select the SECOND surcharge while deposit, balance and first surcharge are unpaid.
        var feeUrl = $"{root}/payments/payos?paymentRequestId={fees[1].Id}";
        var checkout = await Read<PayOsCheckoutDto>(await customer.PostAsync(feeUrl, null));
        Assert.Equal(50000, checkout.Amount);
        Assert.StartsWith("PT", gateway.Links[OrderCode(checkout.TransactionCode)].Description);
        Assert.Equal(checkout.TransactionCode, (await Read<PayOsCheckoutDto>(await customer.PostAsync(feeUrl, null))).TransactionCode);
        gateway.Pay(OrderCode(checkout.TransactionCode));
        b = (await Sync(customer, b.Id)).Booking;
        Assert.Equal(50000, b.PaidAmount);
        Assert.Equal("Paid", b.PaymentSchedule!.Single(p => p.Id == fees[1].Id).Status);
        Assert.Equal(deposit.Outstanding, b.PaymentSchedule!.Single(p => p.Id == deposit.Id).Outstanding);
        Assert.Equal("Scheduled", b.PaymentSchedule!.Single(p => p.Id == balance.Id).Status);
        Assert.Equal("Pending", b.PaymentSchedule!.Single(p => p.Id == fees[0].Id).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync(feeUrl, null)).StatusCode);
        Assert.Equal(50000, (await Sync(customer, b.Id)).Booking.PaidAmount);

        // Paying a fee cannot unlock balance. Paying the actual deposit does.
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"{root}/payments/payos?paymentRequestId={balance.Id}", null)).StatusCode);
        b = await Read<BookingDto>(await customer.PostAsJsonAsync($"{root}/deposit",
            new BookingDepositRequest(deposit.Outstanding, "actual-deposit", null, deposit.Id)));
        Assert.Equal("Pending", b.PaymentSchedule!.Single(p => p.Id == balance.Id).Status);
        var second = await Read<PayOsCheckoutDto>(await customer.PostAsync($"{root}/payments/payos?paymentRequestId={balance.Id}", null));
        Assert.Equal(balance.Outstanding, second.Amount);
        // The still-unpaid first surcharge remains independently payable alongside the balance link.
        Assert.Equal(fees[0].Outstanding, (await Read<PayOsCheckoutDto>(await customer.PostAsync($"{root}/payments/payos?paymentRequestId={fees[0].Id}", null))).Amount);
    }

    [Fact]
    public async Task Customer_cannot_edit_or_remove_booking_passengers_but_owner_agency_can_edit()
    {
        using var app = PayOsApp(new FakePayOs(), new TestClock { Fixed = ApprovedAtUtc });
        await app.Initialize();
        var (customer, agency, b) = await ApprovedBooking(app);
        var edits = new { participants = b.Participants.Select(p => new {
            p.Id, fullName = p.FullName + " updated", p.DateOfBirth, p.Gender, p.IdentityNumber,
            p.Note, p.RoommateNote, p.RestaurantNote }).ToArray() };
        var url = $"/api/v1/bookings/{b.Id}/participants";
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PutAsJsonAsync(url, edits)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PutAsJsonAsync(url, new { participants = Array.Empty<object>() })).StatusCode);
        var updated = await Read<BookingDto>(await agency.PutAsJsonAsync(url, edits));
        Assert.All(updated.Participants, p => Assert.EndsWith(" updated", p.FullName));
        Assert.Equal(b.TotalAmount, updated.TotalAmount);
    }
}
