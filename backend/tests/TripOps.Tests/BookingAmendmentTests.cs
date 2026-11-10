using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData(20)]
    [InlineData(2)]
    public async Task Booking_single_approval_preserves_service_status_locks_base_price_and_collects_surcharges(int days)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        await app.Inspect(async db => {
            var stored = await db.Bookings.SingleAsync(x => x.Id == b.Id);
            stored.StartDate = DateTime.UtcNow.Date.AddDays(days);
            await db.SaveChangesAsync();
        });
        var root = $"/api/v1/agency/bookings/{b.Id}";
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/price-adjustments", new BookingPriceChange(b.TotalAmount + 100000, "Agreed before approval", b.TotalAmount)));
        Assert.Equal("Pending", b.Status);
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/decision", new BookingDecisionRequest("approve", null)));
        var basePrice = b.TotalAmount;
        var contractId = b.Contract!.Id;
        var installments = b.PaymentSchedule!.Select(p => (p.Id, p.Amount, p.DueAt)).ToArray();
        Assert.True(b.HasBeenApproved);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{root}/price-adjustments", new BookingPriceChange(basePrice + 1, "Forbidden after approval", basePrice))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{root}/service-changes", new BookingServiceChange("hotel", b.SnapshotHotels!.Single().Id, "Cannot hide price change", basePrice, 1000, ServiceId: 102))).StatusCode);
        var own = await Read<SupplierDto>(await agency.PostAsJsonAsync("/api/v1/agency/suppliers", new SupplierRequest("HOTEL", "Replacement private hotel", "Private address", ReferencePrice: 500000)));
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/service-changes", new BookingServiceChange("hotel", b.SnapshotHotels!.Single().Id, "Agreed hotel replacement", basePrice, AgencySupplierId: own.Id)));
        Assert.Equal("Confirmed", b.Status); Assert.Equal(basePrice, b.TotalAmount);
        Assert.Equal(contractId, b.Contract!.Id);
        Assert.Equal(installments, b.PaymentSchedule!.Select(p => (p.Id, p.Amount, p.DueAt)).ToArray());
        // Signed base contract remains valid after a separate surcharge is added.
        await app.Inspect(async db => { (await db.BookingContracts.SingleAsync(c => c.Id == contractId)).Status = "Verified"; await db.SaveChangesAsync(); });
        var fee = new BookingSurchargeInput(200000, "Room upgrade agreed with customer", basePrice, Guid.NewGuid());
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/surcharges", fee));
        var retry = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/surcharges", fee));
        Assert.Equal(basePrice + 200000, retry.TotalAmount);
        Assert.Equal(basePrice, retry.BaseTourAmount); Assert.Equal(200000, retry.SurchargeAmount);
        Assert.Single(retry.PaymentSchedule!, p => p.Stage == "surcharge");
        Assert.Equal("Confirmed", retry.Status); Assert.Equal(contractId, retry.Contract!.Id);
        Assert.Equal(basePrice, retry.Contract.TotalAmount); Assert.False(retry.Contract.RequiredBeforePayment);
        Assert.Equal(installments, retry.PaymentSchedule!.Where(p => p.Stage != "surcharge").Select(p => (p.Id, p.Amount, p.DueAt)).ToArray());
        Assert.Equal("Pending", retry.PaymentSchedule!.Single(p => p.Stage == "surcharge").Status);
        b = retry;
        for (var i = 0; i < installments.Length; i++) {
            var stage = b.PaymentSchedule!.First(p => p.Status == "Pending");
            Assert.NotEqual("surcharge", stage.Stage);
            b = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/deposit", new BookingDepositRequest(stage.Outstanding, $"base-{days}-{i}", null)));
        }
        var payable = b.PaymentSchedule!.Single(p => p.Stage == "surcharge");
        Assert.Equal("Pending", payable.Status); Assert.Equal(200000, payable.Outstanding);
        b = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/deposit", new BookingDepositRequest(200000, $"fee-{days}-one", null)));
        Assert.Equal("Paid", b.PaymentStatus); Assert.Equal(basePrice + 200000, b.PaidAmount);
        // A new fee may be added after the base and an earlier fee have been paid, without reopening approval.
        var extra = new BookingSurchargeInput(50000, "Additional agreed meal upgrade", b.TotalAmount, Guid.NewGuid());
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/surcharges", extra));
        Assert.Equal("Paid", b.Status); Assert.Equal("PartiallyPaid", b.PaymentStatus);
        Assert.Equal(basePrice, b.BaseTourAmount); Assert.Equal(250000, b.SurchargeAmount);
        Assert.Single(b.PaymentSchedule!, p => p.Status == "Pending" && p.Stage == "surcharge");
        b = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/deposit", new BookingDepositRequest(50000, $"fee-{days}-two", null)));
        Assert.Equal("Paid", b.PaymentStatus); Assert.Equal(basePrice + 250000, b.PaidAmount);
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"{root}/service-changes", new BookingServiceChange("meal", b.SnapshotDays!.SelectMany(d => d.Meals).Single().Id, "Meal replacement after payment", b.TotalAmount, ServiceId: 103)));
        Assert.Equal("Paid", b.Status); Assert.Equal(basePrice + 250000, b.TotalAmount);
        Assert.Equal(contractId, b.Contract!.Id);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync($"{root}/surcharges", extra with { RequestId = Guid.NewGuid() })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PostAsJsonAsync($"{root}/surcharges", extra with { Amount = -1, RequestId = Guid.NewGuid() })).StatusCode);
    }

    [Fact]
    public async Task Booking_amendment_smoke_rejects_customer_wrong_category_stale_price_and_paid_booking()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        var root = $"/api/v1/agency/bookings/{b.Id}";
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync($"{root}/price-adjustments", new BookingPriceChange(1000, "Invalid actor", b.TotalAmount))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync($"{root}/price-adjustments", new BookingPriceChange(1000, "Stale price", -1))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{root}/service-changes",
            new BookingServiceChange("hotel", b.SnapshotHotels!.Single().Id, "Wrong service category", b.TotalAmount, ServiceId: 103))).StatusCode);
        await app.Inspect(async db => { (await db.Bookings.SingleAsync(x => x.Id == b.Id)).PaymentStatus = PaymentStatus.PartiallyPaid; await db.SaveChangesAsync(); });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"{root}/price-adjustments", new BookingPriceChange(1000, "Already paid", b.TotalAmount))).StatusCode);
    }
}
