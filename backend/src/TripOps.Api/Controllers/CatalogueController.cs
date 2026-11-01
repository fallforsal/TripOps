using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Common;

namespace TripOps.Api.Controllers;

public sealed record CatalogueItem(string Id, string ProviderId, string ProviderName, string Name, string Category,
    string? Description, decimal Price, decimal? PriceFrom, decimal? PriceTo, decimal PricePerPerson,
    string Province, string Location, string Image, string[] Images, int? Stars, decimal? Rating,
    string Status, decimal? Latitude, decimal? Longitude,
    string? SubCategory = null, string? FullAddress = null, string? OperatingHours = null,
    string? HiddenReason = null, int? Capacity = null, bool IsPaused = false)
{
    public string ThumbnailUrl => Image;
}

[ApiController, Route("api/v1/catalogue"), Tags("Service Management")]
public sealed class CatalogueController(TripOpsDbContext db) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Browse approved services from active approved Providers")]
    [ProducesResponseType<CatalogueItem[]>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var items = await db.Services.AsNoTracking().Include(s => s.Provider).ThenInclude(p => p.BusinessProfile)
            .Where(s => s.Status == ServiceStatus.Approved && !s.IsPaused && s.Provider.Status == UserStatus.Active &&
                s.Provider.Role == UserRole.Provider && s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved)
            .OrderBy(s => s.Name).Take(500).ToListAsync(ct);
        return Ok(items.Select(s => new CatalogueItem(
            s.Id.ToString(), s.ProviderId, s.Provider.BusinessProfile?.BusinessName ?? s.Provider.Name,
            s.Name, s.Category.ToString().ToLowerInvariant(), s.Description,
            s.Price, s.PriceFrom, s.PriceTo, s.Price, s.Province,
            !string.IsNullOrWhiteSpace(s.FullAddress) ? s.FullAddress : string.Join(", ", new[] { s.Street, s.Ward, s.Province }.Where(x => !string.IsNullOrWhiteSpace(x))),
            s.ThumbnailUrl, ServiceMedia.AdditionalImages(s.Images, s.ThumbnailUrl), s.StarRating, s.Rating,
            "approved", s.Latitude, s.Longitude,
            s.SubCategory, s.FullAddress, s.OperatingHours, s.HiddenReason, s.Capacity, s.IsPaused)));
    }
}
