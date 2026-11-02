using TripOps.Data.Common;

namespace TripOps.Data.Entities;

/// <summary>
/// Private hotel/restaurant directory owned by one Agency. It is NOT a Platform Partner:
/// no user/provider account, no booking or settlement is created for it by the platform.
/// </summary>
public class AgencySupplier : BaseEntity<int>
{
    public const string Hotel = "HOTEL";
    public const string Restaurant = "RESTAURANT";
    public const string Active = "ACTIVE";
    public const string Archived = "ARCHIVED";

    public string AgencyId { get; set; } = string.Empty;
    public string SupplierType { get; set; } = Hotel;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Area { get; set; }
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public int? StarRating { get; set; }
    public decimal? ReferencePrice { get; set; }
    public string? Conditions { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = Active;
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual User Agency { get; set; } = null!;
}
