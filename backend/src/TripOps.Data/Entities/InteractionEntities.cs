using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class Feedback : BaseEntity<int>, ISoftDelete
{
    public int BookingId { get; set; }
    public string CustomerId { get; set; } = null!;
    public string AgencyId { get; set; } = null!;
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public FeedbackStatus Status { get; set; } = FeedbackStatus.Visible;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Customer { get; set; } = null!;
    public virtual User Agency { get; set; } = null!;
}

public class Complaint : BaseEntity<int>, ISoftDelete
{
    public int BookingId { get; set; }
    public string ComplainantId { get; set; } = null!; // Customer
    public string TargetId { get; set; } = null!; // Agency/Guide/Provider
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public ComplaintStatus Status { get; set; } = ComplaintStatus.Pending;
    public string? AdminId { get; set; }
    public string? AdminNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Complainant { get; set; } = null!;
    public virtual User Target { get; set; } = null!;
    public virtual User? Admin { get; set; }
}
