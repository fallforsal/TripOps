using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Services;

public sealed class AdminServiceQuery
{
    public string? Status { get; init; } = "all";
    public string? Category { get; init; }
    public bool? IsPaused { get; init; }
    [StringLength(200)] public string? Search { get; init; }
    [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
    [Range(1, 100)] public int PageSize { get; init; } = 20;
}

public sealed record RejectServiceRequest([Required] string RejectionReason);
public sealed record ToggleServiceVisibilityRequest([Required] string Action, string? HiddenReason = null);
public sealed record ServiceProviderDto(string Id, string BusinessName, string? Hotline, string Email);

public sealed record AdminServiceDto
{
    public required string Id { get; init; }
    public required string ProviderId { get; init; }
    public required string ProviderName { get; init; }
    public string? ProviderHotline { get; init; }
    public required string ProviderEmail { get; init; }
    public required ServiceProviderDto Provider { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public string? SubCategory { get; init; }
    public string? Description { get; init; }
    public string? PriceUnit { get; init; }
    public decimal Price { get; init; }
    public decimal? PriceFrom { get; init; }
    public decimal? PriceTo { get; init; }
    public decimal PricePerPerson { get; init; }
    public int? Capacity { get; init; }
    public int? Stars { get; init; }
    public decimal Rating { get; init; }
    public required string Province { get; init; }
    public string? Ward { get; init; }
    public string? Street { get; init; }
    public string? FullAddress { get; init; }
    public required string Location { get; init; }
    public decimal? Latitude { get; init; }
    public decimal? Longitude { get; init; }
    public string? OperatingHours { get; init; }
    public required string Image { get; init; }
    public required string ThumbnailUrl { get; init; }
    public required string[] Images { get; init; }
    public required string[] Amenities { get; init; }
    public required string[] Policies { get; init; }
    public required string Status { get; init; }
    public bool IsPaused { get; init; }
    public string? RejectionReason { get; init; }
    public string? HiddenReason { get; init; }
    public DateTime? CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public sealed record AdminServicePage(IReadOnlyList<AdminServiceDto> Items, int Total, int Page, int PageSize);
public sealed record ServiceModerationResponse(string Message, AdminServiceDto Service);
public sealed class ServiceModerationException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}
