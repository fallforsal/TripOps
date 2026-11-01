using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Enums;
using System.Text.Json;

namespace TripOps.Api.Controllers;

public sealed record CatalogueItem(string Id, string ProviderId, string ProviderName, string Name, string Category,
    string? Description, decimal Price, decimal? PriceFrom, decimal? PriceTo, decimal PricePerPerson,
    string Province, string Location, string Image, string[] Images, int? Stars, decimal? Rating,
    string Status, decimal? Latitude, decimal? Longitude);

[ApiController, Route("api/v1/catalogue"), Tags("Service Management")]
public sealed class CatalogueController(TripOpsDbContext db) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Browse approved services from active approved Providers")]
    [ProducesResponseType<CatalogueItem[]>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var items = await db.Services.AsNoTracking().Include(s => s.Provider).ThenInclude(p => p.BusinessProfile)
            .Where(s => s.Status == ServiceStatus.Approved && s.Provider.Status == UserStatus.Active &&
                s.Provider.Role == UserRole.Provider && s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved)
            .OrderBy(s => s.Name).Take(500).ToListAsync(ct);
        return Ok(items.Select(s => new
        {
            id = s.Id.ToString(),
            providerId = s.ProviderId,
            providerName = s.Provider.BusinessProfile?.BusinessName ?? s.Provider.Name,
            name = s.Name,
            category = s.Category.ToString().ToLowerInvariant(),
            description = s.Description,
            price = s.Price,
            priceFrom = s.PriceFrom,
            priceTo = s.PriceTo,
            pricePerPerson = s.Price,
            province = s.Province,
            location = string.Join(", ", new[] { s.Street, s.Ward, s.Province }.Where(x => !string.IsNullOrWhiteSpace(x))),
            image = s.ThumbnailUrl,
            images = Images(s.Images, s.ThumbnailUrl),
            stars = s.StarRating,
            rating = s.Rating,
            status = "approved",
            latitude = s.Latitude,
            longitude = s.Longitude
        }));
    }
    private static string[] Images(string? json, string? fallback)
    { try { return JsonSerializer.Deserialize<string[]>(json ?? "[]") ?? []; } catch (JsonException) { return fallback is null ? [] : [fallback]; } }
}
