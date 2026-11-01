using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class BusinessProfile : BaseEntity<int> {
public string UserId { get; set; } = string.Empty;
public string? BusinessName { get; set; }
public string? TaxCode { get; set; }
public string? BusinessAddress { get; set; }
public string? BusinessLicenseUrl { get; set; }
public string? Description { get; set; }
public BusinessProfileStatus? Status { get; set; }
public string? RejectionReason { get; set; }
public DateTime? ApprovedAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User User { get; set; } = null!;
}
