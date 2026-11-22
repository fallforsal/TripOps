using TripOps.Data.Common;
namespace TripOps.Data.Entities;
public class WorkflowNotification : BaseEntity<int>
{
    public string UserId { get; set; } = "";
    public string Message { get; set; } = "";
    public int? RequestId { get; set; }
    public int? BookingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    // Durable post-commit SignalR/FCM delivery. Existing rows are backfilled
    // by migration, preventing old notifications from becoming surprise pushes.
    public DateTime? DispatchedAt { get; set; }
    public DateTime? DispatchClaimedUntil { get; set; }
    public int DispatchAttempts { get; set; }
}
