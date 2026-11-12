using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private static async Task<BookingDto> BookingWithChosenAlternatives(HttpClient customer, HttpClient agency)
    {
        var draft = await CreateCore(agency, Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Activities: [new ActivityInput("Original attraction", EstimatedTime: TimeSpan.FromHours(9))],
            Meals: [new MealInput("lunch", "Default restaurant", ServiceId: 103),
                new MealInput("lunch", "Booked restaurant", IsDefault: false, SupplierSource: "AGENCY_SUPPLIER", Supplier: new("Booked restaurant address", ReferencePrice: 100000))],
            Accommodations: [new AccommodationInput("Default hotel", "Da Lat", ServiceId: 102),
                new AccommodationInput("Booked hotel", "Da Lat", IsDefault: false, SupplierSource: "AGENCY_SUPPLIER", Supplier: new("Booked hotel address", ReferencePrice: 500000))]),
            new TimelineInput(2, "Departure")] });
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Revision)));
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{plan.Id}/publish", new TourCommand(plan.Revision)));
        return await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", new CreateBookingRequest(plan.Id,
            DateTime.UtcNow.Date.AddDays(20), "Customer", "0900000000", "customer@example.test", null,
            [new ParticipantInput("One", null, null, null, null, null), new ParticipantInput("Two", null, null, null, null, null)],
            [new HotelChoiceInput("Da Lat", "Booked hotel")], [new MealChoiceInput(1, "lunch", "Booked restaurant")])), HttpStatusCode.Created);
    }

    [Theory]
    [InlineData("Pending")]
    [InlineData("Confirmed")]
    [InlineData("Paid")]
    public async Task Location_change_persists_current_and_original_and_preserves_approval_and_payment_schedule(string status)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency"); using var other = await app.Login("other");
        var b = await BookingWithChosenAlternatives(customer, agency);
        if (status != "Pending") b = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/decision", new BookingDecisionRequest("approve", null)));
        if (status == "Paid") await app.Inspect(async db => { (await db.Bookings.SingleAsync(x => x.Id == b.Id)).Status = BookingStatus.Paid; await db.SaveChangesAsync(); });
        var contract = b.Contract?.Id; var total = b.TotalAmount;
        var schedule = b.PaymentSchedule!.Select(p => (p.Id, p.Amount, p.DueAt)).ToArray();
        var original = b.SnapshotDays![0].Locations[0];
        var url = $"/api/v1/agency/bookings/{b.Id}/location-changes";
        var input = new BookingLocationChange(original.Id, "Replacement B", "Agreed with customer", total);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync(url, input)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsJsonAsync(url, input)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(url, input with { ItemId = int.MaxValue })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsJsonAsync(url, input with { ExpectedTotal = -1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PostAsJsonAsync(url, input with { Name = "" })).StatusCode);
        foreach (var name in new[] { "Replacement B", "Replacement C" })
            b = await Read<BookingDto>(await agency.PostAsJsonAsync(url, input with { Name = name }));
        Assert.Equal(status, b.Status); Assert.Equal(total, b.TotalAmount); Assert.Equal(contract, b.Contract?.Id);
        Assert.Equal(schedule, b.PaymentSchedule!.Select(p => (p.Id, p.Amount, p.DueAt)).ToArray());
        var reloaded = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
        var point = reloaded.SnapshotDays![0].Locations[0];
        Assert.Equal("Replacement C", point.Name); Assert.Equal("Original attraction", point.OriginalName);
        Assert.Equal(input.Reason, point.ChangeReason);
        Assert.Empty(b.PriceAdjustments!); // A price-neutral location change creates no financial journal row.
        if (status != "Pending") Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync(url, input with { PriceDifference = 1000 })).StatusCode);
        await app.Inspect(async db => {
            var stored = await db.BookingTimelineAttractions.SingleAsync(p => p.Id == original.Id);
            Assert.Equal("Original attraction", stored.OriginalLocationName); Assert.Equal("Replacement C", stored.CurrentLocationName);
            stored.AttendanceStatus = "CheckedIn"; await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(url, input)).StatusCode);
    }

    [Fact]
    public async Task Booked_alternative_is_original_and_repeated_hotel_meal_changes_never_replace_it()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var b = await BookingWithChosenAlternatives(customer, agency);
        Assert.Equal("Booked hotel", b.SnapshotHotels![0].OriginalName);
        Assert.Equal("Booked restaurant", b.SnapshotDays![0].Meals[0].OriginalName);
        var url = $"/api/v1/agency/bookings/{b.Id}/service-changes";
        foreach (var suffix in new[] { "B", "C" }) {
            b = await Read<BookingDto>(await agency.PostAsJsonAsync(url, new BookingServiceChange("hotel", b.SnapshotHotels![0].Id,
                "Agreed change", b.TotalAmount, Name: "Hotel " + suffix, Supplier: new("Hotel address " + suffix))));
            b = await Read<BookingDto>(await agency.PostAsJsonAsync(url, new BookingServiceChange("meal", b.SnapshotDays![0].Meals[0].Id,
                "Agreed change", b.TotalAmount, Name: "Restaurant " + suffix, Supplier: new("Restaurant address " + suffix))));
        }
        b = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
        Assert.Equal("Hotel C", b.SnapshotHotels![0].Name); Assert.Equal("Booked hotel", b.SnapshotHotels[0].OriginalName);
        Assert.Equal("Restaurant C", b.SnapshotDays![0].Meals[0].Name); Assert.Equal("Booked restaurant", b.SnapshotDays[0].Meals[0].OriginalName);
        // Even a pre-approval plan edit must preserve the original booking selections.
        await Read<QuotationView>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/change-plan", new BookingPlanChange(b.TourId!.Value)));
        b = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
        Assert.Equal("Booked hotel", b.SnapshotHotels![0].OriginalName);
        Assert.Equal("Booked restaurant", b.SnapshotDays![0].Meals[0].OriginalName);
    }
}
