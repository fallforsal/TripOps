using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData(false, 150000)]
    [InlineData(true, 150000)]
    [InlineData(true, 0)]
    public async Task Agency_adds_passenger_with_preferences_and_atomic_price_or_surcharge(bool approved, decimal price)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        if (approved) b = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/decision", new BookingDecisionRequest("approve", null)));
        var original = b.TotalAmount; var contractId = b.Contract?.Id;
        var input = new AgencyParticipantInput("Agency guest", new DateTime(2001, 1, 1), "Nữ", "GUEST-123",
            "Ở cùng người thân, hai giường đơn", "Ăn chay, dị ứng tôm", "Cần hỗ trợ xe lăn", price,
            "Bổ sung người theo thỏa thuận", original, Guid.NewGuid());
        var url = $"/api/v1/agency/bookings/{b.Id}/participants";
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync(url, input)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsJsonAsync(url, input)).StatusCode);
        b = await Read<BookingDto>(await agency.PostAsJsonAsync(url, input));
        var retry = await Read<BookingDto>(await agency.PostAsJsonAsync(url, input));
        Assert.Equal(3, b.TotalGuests); Assert.Equal(3, retry.TotalGuests);
        Assert.Equal(original + price, retry.TotalAmount);
        Assert.Equal(approved ? "Confirmed" : "Pending", b.Status);
        var passenger = Assert.Single(b.Participants, p => p.FullName == "Agency guest");
        Assert.Equal(input.RoommateNote, passenger.RoommateNote);
        Assert.Equal(input.RestaurantNote, passenger.RestaurantNote);
        Assert.Equal(input.Note, passenger.Note); Assert.Equal(price, passenger.Price);
        Assert.Null(passenger.PhoneNumber);
        if (approved) {
            Assert.Equal(contractId, b.Contract!.Id); Assert.Equal(original, b.BaseTourAmount);
            Assert.Equal(price, b.SurchargeAmount);
            Assert.Equal(price > 0 ? 1 : 0, b.PaymentSchedule!.Count(p => p.Stage == "surcharge"));
        }
        await app.Inspect(async db => Assert.Single(await db.BookingParticipants.Where(p => p.BookingId == b.Id && p.CreationKey == input.RequestId).ToListAsync()));
        var providerRequests = await Read<ProviderRequestView[]>(await agency.GetAsync($"/api/v1/bookings/{b.Id}/quotations/supplier-requests"));
        Assert.Equal(3, providerRequests.Single(r => r.ServiceId == 103 && r.Status != "Superseded").Quantity);
        var reloaded = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
        Assert.Equal(3, reloaded.TotalGuests);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(url, input with { RequestId = Guid.NewGuid(), ExpectedTotal = b.TotalAmount })).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(url, input with { RequestId = Guid.NewGuid(), IdentityNumber = null, DateOfBirth = DateTime.UtcNow.AddDays(1), ExpectedTotal = b.TotalAmount })).StatusCode);
    }

    [Fact]
    public async Task Customer_cannot_append_passenger_through_plan_edit()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        var people = b.Participants.Select(p => new ParticipantInput(p.FullName, null, p.DateOfBirth, p.Gender, p.IdentityNumber, null))
            .Append(new ParticipantInput("Not allowed", null, null, null, null, null)).ToArray();
        var response = await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/quotations/change-plan", new BookingPlanChange(b.TourId!.Value, Participants: people));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(2, (await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"))).TotalGuests);
    }
}
