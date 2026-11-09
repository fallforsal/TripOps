using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Customer_views_current_booked_services_without_supplier_prices_even_when_listing_is_hidden()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var other = await app.Login("other");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        await app.Inspect(async db => {
            var service = await db.Services.SingleAsync(s => s.Id == 102);
            service.ThumbnailUrl = "https://example.test/hotel.jpg";
            service.Images = "[\"https://example.test/room.jpg\"]";
            service.Price = 987654; service.PriceFrom = 876543; service.PriceTo = 999999;
            service.Status = ServiceStatus.Hidden; service.IsPaused = true;
            service.Amenities = "[\"Wifi\"]"; service.Policies = "Check-in from 14:00";
            await db.SaveChangesAsync();
        });
        var url = $"/api/v1/bookings/{b.Id}/services";
        var response = await customer.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var rows = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToArray();
        Assert.Equal(2, rows.Length);
        Assert.All(rows, row => Assert.DoesNotContain(row.EnumerateObject(), p => p.Name.Contains("price", StringComparison.OrdinalIgnoreCase)
            || p.Name.Contains("cost", StringComparison.OrdinalIgnoreCase) || p.Name.Contains("quoted", StringComparison.OrdinalIgnoreCase)));
        var hotel = rows.Single(row => row.GetProperty("id").GetString() == "102");
        Assert.Equal("https://example.test/hotel.jpg", hotel.GetProperty("thumbnailUrl").GetString());
        Assert.Equal(2, hotel.GetProperty("images").GetArrayLength());
        Assert.Equal("Wifi", hotel.GetProperty("amenities")[0].GetString());
        Assert.Equal("Check-in from 14:00", hotel.GetProperty("policies")[0].GetString());
        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await customer.GetAsync("/api/v1/bookings/2147483647/services")).StatusCode);
        // Selecting an Agency supplier must not keep displaying the old Provider's article.
        var own = await Read<SupplierDto>(await agency.PostAsJsonAsync("/api/v1/agency/suppliers",
            new SupplierRequest("HOTEL", "Private hotel", "Private address", ReferencePrice: 500000)));
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/service-changes",
            new BookingServiceChange("hotel", b.SnapshotHotels!.Single().Id, "Changed hotel", b.TotalAmount, AgencySupplierId: own.Id)));
        var updated = await customer.GetFromJsonAsync<JsonElement>(url);
        Assert.Single(updated.EnumerateArray());
        Assert.Equal("103", updated[0].GetProperty("id").GetString());
    }
}
