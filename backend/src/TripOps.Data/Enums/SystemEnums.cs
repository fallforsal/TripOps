namespace TripOps.Data.Enums;

public enum UserRole
{
    User,
    Admin,
    TravelAgency,
    Provider,
    TourGuide,
    Customer
}

public enum UserStatus
{
    Active,
    Inactive,
    Banned
}

public enum BusinessProfileStatus
{
    Pending,
    Approved,
    Rejected,
    Suspended
}

public enum ServiceCategory
{
    Hotel,
    Fnb,
    Transportation,
    Attraction
}

public enum ServiceStatus
{
    Active,
    Draft,
    Hidden,
    Suspended,
    Approved
}

public enum TourApprovalStatus { NotSubmitted, Pending, Approved, Rejected }

public enum TourStatus
{
    Draft,
    Completed,
    Deleted
}

public enum TourVisibility
{
    Hidden,
    Public
}

public enum CustomRequestStatus
{
    Pending,
    Contacted,
    Quoted,
    Accepted,
    Cancelled
}

public enum BookingStatus
{
    Pending,
    Confirmed,
    InProgress,
    Completed,
    Cancelled,
    Rejected
}

public enum PaymentStatus
{
    Unpaid,
    PartiallyPaid,
    Paid,
    Refunded
}

public enum AttendanceStatus
{
    Pending,
    CheckedIn,
    Absent
}

public enum AttractionCheckinStatus
{
    Pending,
    CheckedIn,
    Skipped
}

public enum IncidentStatus
{
    Reported,
    InProgress,
    Resolved
}

public enum PaymentRequestStatus
{
    Pending,
    Paid,
    Overdue,
    Cancelled
}

public enum PaymentTransactionStatus
{
    Pending,
    Success,
    Failed,
    Refunded
}

public enum SettlementStatus
{
    Unpaid,
    Ready,
    Paid
}

public enum ComplaintStatus
{
    Pending,
    InReview,
    Resolved,
    Rejected
}

public enum FeedbackStatus
{
    Visible,
    Hidden,
    Pending
}

public enum RefundStatus
{
    Pending,
    Reviewing,
    Approved,
    Rejected,
    Completed
}

public enum SubscriptionStatus
{
    Active,
    PastDue,
    Cancelled,
    Expired
}
