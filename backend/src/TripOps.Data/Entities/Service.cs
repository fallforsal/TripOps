using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class Service : BaseEntity<int>, ISoftDelete
{
    public string ProviderId { get; set; } = null!;
    public ServiceCategory Category { get; set; }
    public string? SubCategory { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public decimal Price { get; set; }
    public decimal? PriceFrom { get; set; }
    public decimal? PriceTo { get; set; }

    public int? Capacity { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Country { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    public string? Images { get; set; }
    public string? Amenities { get; set; }
    public string? Policies { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }

    public ServiceStatus Status { get; set; } = ServiceStatus.Active;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public virtual User Provider { get; set; } = null!;
}
