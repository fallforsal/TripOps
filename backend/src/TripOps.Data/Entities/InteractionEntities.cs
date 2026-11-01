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
public int BookingId { get; set; }
public string ComplainantId { get; set; } = string.Empty;
public string TargetId { get; set; } = string.Empty;
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
public virtual Booking Booking { get; set; } = null!;
public virtual User Complainant { get; set; } = null!;
public virtual User Target { get; set; } = null!;
public virtual User? Admin { get; set; }
}
