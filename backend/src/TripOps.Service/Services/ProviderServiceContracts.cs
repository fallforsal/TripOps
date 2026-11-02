using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Services;

// Only editable fields are accepted; identity, owner, rating and moderation are server-controlled.
public sealed record SaveProviderServiceRequest
{
    [Required, StringLength(255)] public string Name { get; init; } = "";
    [Required] public string Category { get; init; } = "";
    [StringLength(100)] public string? SubCategory { get; init; }
    public string? Description { get; init; }
    [Range(typeof(decimal), "0", "9999999999.99")] public decimal Price { get; init; }
    [Range(typeof(decimal), "0", "9999999999.99")] public decimal? PriceFrom { get; init; }
    [Range(typeof(decimal), "0", "9999999999.99")] public decimal? PriceTo { get; init; }
    [Range(0, int.MaxValue)] public int? Capacity { get; init; }
    [Range(1, 5)] public int? Stars { get; init; }
    [Required, StringLength(100)] public string Province { get; init; } = "";
    [StringLength(100)] public string? Ward { get; init; }
    [StringLength(255)] public string? Street { get; init; }
    [StringLength(500)] public string? FullAddress { get; init; }
    [StringLength(100)] public string? OperatingHours { get; init; }
    [Range(typeof(decimal), "-90", "90")] public decimal? Latitude { get; init; }
    [Range(typeof(decimal), "-180", "180")] public decimal? Longitude { get; init; }
    [Required, StringLength(2048)] public string ThumbnailUrl { get; init; } = "";
    public string[]? Images { get; init; }
    public string[]? Amenities { get; init; }
    public string[]? Policies { get; init; }
}

public sealed record ServiceImageResponse(string Url);
public sealed record SetServiceAvailabilityRequest([Required] bool? IsPaused);
