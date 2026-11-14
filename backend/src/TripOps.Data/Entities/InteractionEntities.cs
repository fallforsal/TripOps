using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class Feedback : BaseEntity<int> {
public int BookingId { get; set; }
public string CustomerId { get; set; } = string.Empty;
public string AgencyId { get; set; } = string.Empty;
public int Rating { get; set; }
public string? Comment { get; set; }
public int AgencyRating { get; set; }
public string? AgencyComment { get; set; }
public string? Images { get; set; }
public string? AgencyReply { get; set; }
public DateTime? RepliedAt { get; set; }
public FeedbackStatus? Status { get; set; } = FeedbackStatus.Visible;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Customer { get; set; } = null!;
public virtual User Agency { get; set; } = null!;
}

public class Complaint : BaseEntity<int> {
// Khiếu nại "Trip" gắn với một booking (và Agency chủ trì); khiếu nại "Platform" về TripOps thì không có booking/Agency.
public int? BookingId { get; set; }
public string ComplainantId { get; set; } = string.Empty;
public string? TargetId { get; set; }
public string Type { get; set; } = ComplaintTypes.Trip;
public string ReasonCode { get; set; } = "other";
public string Title { get; set; } = string.Empty;
public string Description { get; set; } = string.Empty;
public string? EvidenceUrls { get; set; }
public string? AgencyResponse { get; set; }
public DateTime? AgencyRespondedAt { get; set; }
public string? AdminId { get; set; }
public string? AdminNotes { get; set; }
public ComplaintStatus? Status { get; set; } = ComplaintStatus.Pending;
public DateTime? ResolvedAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public DateTime? DeletedAt { get; set; }
public virtual Booking? Booking { get; set; }
public virtual User Complainant { get; set; } = null!;
public virtual User? Target { get; set; }
public virtual User? Admin { get; set; }
public virtual ICollection<ComplaintMessage> Messages { get; set; } = new List<ComplaintMessage>();
}

public static class ComplaintTypes
{
    public const string Trip = "Trip";
    public const string Platform = "Platform";
}

/// <summary>Trao đổi giữa khách và Admin trong một khiếu nại. Agency không tham gia trên hệ thống.</summary>
public class ComplaintMessage : BaseEntity<int> {
public int ComplaintId { get; set; }
public string SenderId { get; set; } = string.Empty;
/// <summary>"customer" hoặc "admin".</summary>
public string SenderRole { get; set; } = "customer";
public string Content { get; set; } = string.Empty;
public string? AttachmentUrls { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Complaint Complaint { get; set; } = null!;
public virtual User Sender { get; set; } = null!;
}
