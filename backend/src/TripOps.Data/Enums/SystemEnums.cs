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
    Approved,
    Pending,
    Rejected
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
    Cancelled,
    Rejected
}

public enum BookingStatus
{
    Pending,
    Deposited,
    Confirmed,
    Paid,
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
    Refunded,
    /// <summary>Khách hủy trên trang cổng thanh toán.</summary>
    Cancelled,
    /// <summary>Link thanh toán hết hạn mà chưa nhận tiền.</summary>
    Expired,
    /// <summary>Cổng báo có tiền nhưng không khớp (thiếu/dư/sai số tiền): chưa cộng vào đơn, chờ đối soát.</summary>
    NeedsReview
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
