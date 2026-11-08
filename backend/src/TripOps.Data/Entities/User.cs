using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class User : BaseEntity<string> {
public string Name { get; set; } = string.Empty;
public string Email { get; set; } = string.Empty;
public string? Phone { get; set; }
public string? PasswordHash { get; set; }
public UserRole Role { get; set; } = UserRole.User;
public string? Avatar { get; set; }
public bool IsVerified { get; set; } = true;
public string? AgencyId { get; set; }
public UserStatus Status { get; set; } = UserStatus.Active;
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual BusinessProfile? BusinessProfile { get; set; }
public virtual GuideProfile? GuideProfile { get; set; }
public string? BanReason { get; set; }
public DateTime? BannedAt { get; set; }
}
