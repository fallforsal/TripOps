using TripOps.Data.Common;

namespace TripOps.Data.Entities;

/// <summary>One push registration per device, associated only with its authenticated guide.</summary>
public sealed class NotificationDeviceToken : BaseEntity<int>
{
    public string UserId { get; set; } = "";
    public string Token { get; set; } = "";
    public string Platform { get; set; } = "android";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
}
