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
}
