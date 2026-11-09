using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Service.Bookings;
using TripOps.Service.Common;

namespace TripOps.Api.Controllers;

// Deliberately omit supplier prices and internal confirmation/quotation data.
public sealed record CustomerBookedService(string Id, string ProviderId, string ProviderName, string Name,
    string Category, string? Description, string Image, string ThumbnailUrl, string[] Images,
    string Province, string? Ward, string? Street, string Location, string? FullAddress,
    decimal? Latitude, decimal? Longitude, string? SubCategory, string? OperatingHours,
    int? Stars, int? Capacity, decimal Rating, string[] Amenities, string[] Policies, string Status);

[ApiController, Authorize(Roles = "user"), Route("api/v1/bookings/{id:int}/services"), Tags("Booking Management")]
public sealed class CustomerBookingServicesController(TripOpsDbContext db) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("View the services currently booked by this customer, without supplier prices")]
    [ProducesResponseType<CustomerBookedService[]>(200)]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var actor = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        if (!await db.Bookings.AsNoTracking().AnyAsync(b => b.Id == id && b.CustomerId == actor, ct))
            throw new BookingException(404, "Không tìm thấy booking.");
        var hotelIds = db.BookingAccommodations.Where(h => h.BookingId == id && h.ServiceId != null).Select(h => h.ServiceId!.Value);
        var mealIds = db.BookingTimelineMeals.Where(m => m.BookingTimeline.BookingId == id && m.ServiceId != null).Select(m => m.ServiceId!.Value);
        // A paused/hidden listing already in the booking still needs to be readable by its customer.
        var rows = await db.Services.AsNoTracking().Include(s => s.Provider).ThenInclude(p => p.BusinessProfile)
            .Where(s => hotelIds.Contains(s.Id) || mealIds.Contains(s.Id)).ToListAsync(ct);
        return Ok(rows.Select(s => new CustomerBookedService(s.Id.ToString(), s.ProviderId,
            s.Provider.BusinessProfile?.BusinessName ?? s.Provider.Name, s.Name,
            s.Category.ToString().ToLowerInvariant(), s.Description, s.ThumbnailUrl, s.ThumbnailUrl,
            new[] { s.ThumbnailUrl }.Concat(ServiceMedia.AdditionalImages(s.Images, s.ThumbnailUrl))
                .Where(url => !string.IsNullOrWhiteSpace(url)).Distinct().ToArray(),
            s.Province, s.Ward, s.Street, s.FullAddress ?? string.Join(", ", new[] { s.Street, s.Ward, s.Province }.Where(x => !string.IsNullOrWhiteSpace(x))),
            s.FullAddress, s.Latitude, s.Longitude, s.SubCategory, s.OperatingHours, s.StarRating,
            s.Capacity, s.Rating ?? 0, Strings(s.Amenities), Strings(s.Policies), s.Status?.ToString().ToLowerInvariant() ?? "pending")));
    }

    private static string[] Strings(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        try {
            using var json = JsonDocument.Parse(value);
            if (json.RootElement.ValueKind == JsonValueKind.Array)
                return json.RootElement.EnumerateArray().Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!).Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
        } catch (JsonException) { }
        return [value];
    }
}
