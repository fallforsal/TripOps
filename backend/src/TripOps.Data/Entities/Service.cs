using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class Service : BaseEntity<int> {
public string ProviderId { get; set; } = string.Empty;
public ServiceCategory Category { get; set; }
public string? SubCategory { get; set; }
public string Name { get; set; } = string.Empty;
public string? Description { get; set; }
public decimal Price { get; set; } = 0m;
public decimal? PriceFrom { get; set; }
public decimal? PriceTo { get; set; }
public int? Capacity { get; set; } = 0;
public int? StarRating { get; set; }
public string? Amenities { get; set; }
public string? Policies { get; set; }
public string Province { get; set; } = string.Empty;
public string? Ward { get; set; }
public string? Street { get; set; }
public string? FullAddress { get; set; }
public string? OperatingHours { get; set; }
public decimal? Latitude { get; set; }
public decimal? Longitude { get; set; }
public string ThumbnailUrl { get; set; } = string.Empty;
public string? Images { get; set; }
public decimal? Rating { get; set; } = 5m;
public ServiceStatus? Status { get; set; } = ServiceStatus.Pending;
public bool IsPaused { get; set; }
public string? RejectionReason { get; set; }
public string? HiddenReason { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Provider { get; set; } = null!;
}
