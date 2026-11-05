using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class Booking : BaseEntity<int> {
public string BookingCode { get; set; } = string.Empty;
public string? CustomerId { get; set; }
public int? TourId { get; set; }
public int? DesignRequestId { get; set; }
public DateTime StartDate { get; set; }
public string ContactName { get; set; } = string.Empty;
public string ContactPhone { get; set; } = string.Empty;
public string ContactEmail { get; set; } = string.Empty;
public string? SpecialRequests { get; set; }
public PaymentStatus? PaymentStatus { get; set; } = TripOps.Data.Enums.PaymentStatus.Unpaid;
public bool? HasCustomization { get; set; } = false;
public decimal? OriginalTotalPrice { get; set; }
public decimal TotalAmount { get; set; }
public BookingStatus? Status { get; set; } = BookingStatus.Pending;
public string? CancelReason { get; set; }
public DateTime? CancelledAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Customer { get; set; } = null!;
public virtual Tour? Tour { get; set; }
public virtual ICollection<BookingParticipant> Participants { get; set; } = new List<BookingParticipant>();
public virtual ICollection<BookingAssignedGuide> AssignedGuides { get; set; } = new List<BookingAssignedGuide>();
public virtual ICollection<BookingTimeline> Timelines { get; set; } = new List<BookingTimeline>();
public virtual ICollection<BookingAccommodation> Accommodations { get; set; } = new List<BookingAccommodation>();
public virtual ICollection<BookingAgency> BookingAgencies { get; set; } = new List<BookingAgency>();
public virtual ICollection<BookingPriceAdjustment> PriceAdjustments { get; set; } = new List<BookingPriceAdjustment>();
public virtual ICollection<BookingIncident> Incidents { get; set; } = new List<BookingIncident>();
public virtual ICollection<PaymentRequest> PaymentRequests { get; set; } = new List<PaymentRequest>();
public virtual ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
public virtual ICollection<RefundRequest> RefundRequests { get; set; } = new List<RefundRequest>();
public virtual ICollection<BookingContract> Contracts { get; set; } = new List<BookingContract>();
}

/// <summary>
/// Hợp đồng lữ hành của một booking (Luật Du lịch 2017 Điều 39). Mỗi lần giá thay đổi sau khi duyệt tạo phiên bản mới.
/// Status: AwaitingSignature | Signed (khách đã tải bản ký) | Verified (Agency xác nhận) | ResignRequested | Superseded.
/// </summary>
public class BookingContract : BaseEntity<int> {
public int BookingId { get; set; }
public int Version { get; set; }
public string ContractNo { get; set; } = string.Empty;
public decimal TotalAmount { get; set; }
public string Status { get; set; } = "AwaitingSignature";
public string? SignedFileName { get; set; }
public string? SignedFileType { get; set; }
public string? SignedFileSha256 { get; set; }
public DateTime? SignedAt { get; set; }
public string? SignMethod { get; set; }
public string? ReviewedBy { get; set; }
public DateTime? ReviewedAt { get; set; }
public string? ReviewNote { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual ICollection<ContractSignSession> SignSessions { get; set; } = new List<ContractSignSession>();
}

/// <summary>
/// Phiên ký hợp đồng trực tuyến (mở bằng mã QR hoặc ngay trên máy tính). Mã phiên chỉ lưu dạng băm SHA-256,
/// dùng một lần, hết hạn sau 15 phút; xác nhận ký bằng OTP gửi về email tài khoản khách.
/// </summary>
public class ContractSignSession : BaseEntity<int> {
public int ContractId { get; set; }
public string TokenHash { get; set; } = string.Empty;
public DateTime ExpiresAt { get; set; }
public string? OtpHash { get; set; }
public DateTime? OtpExpiresAt { get; set; }
public DateTime? OtpSentAt { get; set; }
public int OtpSendCount { get; set; }
public int OtpAttempts { get; set; }
public DateTime? CompletedAt { get; set; }
public string? SignerIp { get; set; }
public string? SignerUserAgent { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual BookingContract Contract { get; set; } = null!;
}

public class BookingParticipant : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public int ParticipantIndex { get; set; }
public bool IsPrimary { get; set; } = true;
public string FullName { get; set; } = string.Empty;
public DateTime? DateOfBirth { get; set; }
public string? Gender { get; set; }
public string? IdentityNumber { get; set; }
public string? Note { get; set; }
public string? TierName { get; set; }
public decimal Price { get; set; } = 0m;
public string? AssignedGuideId { get; set; }
public AttendanceStatus? AttendanceStatus { get; set; } = TripOps.Data.Enums.AttendanceStatus.Pending;
public string? CheckedBy { get; set; }
public DateTime? CheckedAt { get; set; }
public string? Status { get; set; } = "ACTIVE";
public string? StatusNote { get; set; }
public string? RoommateNote { get; set; }
public string? RestaurantNote { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User? AssignedGuide { get; set; }
}

public class BookingAssignedGuide : BaseEntity<int> {
public int BookingId { get; set; }
public string GuideId { get; set; } = string.Empty;
public string AgencyId { get; set; } = string.Empty;
public string? Role { get; set; } = "lead_guide";
public string? Notes { get; set; }
public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Guide { get; set; } = null!;
}

public class BookingTimeline : BaseEntity<int> {
public int BookingId { get; set; }
public int DayNumber { get; set; }
public string Title { get; set; } = string.Empty;
public string? Description { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual ICollection<BookingTimelineAttraction> Attractions { get; set; } = new List<BookingTimelineAttraction>();
public virtual ICollection<BookingTimelineMeal> Meals { get; set; } = new List<BookingTimelineMeal>();
}

public class BookingTimelineAttraction : BaseEntity<int> {
public int BookingTimelineId { get; set; }
public DateTime? Time { get; set; }
public string? AgencyId { get; set; }
public string OriginalLocationName { get; set; } = string.Empty;
public string? CustomizedLocationName { get; set; }
public bool? IsCustomized { get; set; } = false;
public string? CustomerNote { get; set; }
public decimal? PriceDifference { get; set; } = 0m;
public string? Status { get; set; } = "approved";
public string? AttendanceStatus { get; set; }
public string? GuideId { get; set; }
public virtual BookingTimeline BookingTimeline { get; set; } = null!;
public virtual ICollection<BookingAttractionCheckin> Checkins { get; set; } = new List<BookingAttractionCheckin>();
}

public class BookingTimelineMeal : BaseEntity<int> {
public int? ServiceId { get; set; }
public int BookingTimelineId { get; set; }
public DateTime? DateService { get; set; }
public DateTime? Time { get; set; }
public string MealType { get; set; } = string.Empty;
public string OriginalRestaurantName { get; set; } = string.Empty;
public string? CustomizedRestaurantName { get; set; }
public decimal? PriceDifference { get; set; } = 0m;
public bool IsCustomized { get; set; } = false;
public decimal? TotalPrice { get; set; }
public string? ProviderResponse { get; set; }
public string? Status { get; set; } = "approved";
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual BookingTimeline BookingTimeline { get; set; } = null!;
}

public class BookingAccommodation : BaseEntity<int> {
public int BookingId { get; set; }
public int? ServiceId { get; set; }
public string Destination { get; set; } = string.Empty;
public DateTime? DateFrom { get; set; }
public DateTime? DateTo { get; set; }
public string OriginalHotelName { get; set; } = string.Empty;
public int? OriginalStars { get; set; } = 5;
public string? CustomizedHotelName { get; set; }
public int? CustomizedStars { get; set; }
public string? ProviderResponse { get; set; }
public int? NightsCount { get; set; } = 1;
public decimal? PriceDifference { get; set; } = 0m;
public bool? IsCustomized { get; set; } = false;
public string? Status { get; set; } = "approved";
public decimal? TotalPrice { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
}

public class BookingAttractionCheckin : BaseEntity<int> {
public int BookingTimelineAttractionId { get; set; }
public string GuideId { get; set; } = string.Empty;
public string AgencyId { get; set; } = string.Empty;
public AttractionCheckinStatus? AttendanceStatus { get; set; } = AttractionCheckinStatus.Pending;
public DateTime? CheckinTime { get; set; }
public string? PhotoUrl { get; set; }
public string? Note { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual BookingTimelineAttraction BookingTimelineAttraction { get; set; } = null!;
public virtual User Guide { get; set; } = null!;
}

public class BookingIncident : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public string ReportedBy { get; set; } = string.Empty;
public string? IncidentType { get; set; } = "OTHER";
public string Title { get; set; } = string.Empty;
public string Description { get; set; } = string.Empty;
public IncidentStatus? Status { get; set; } = IncidentStatus.Reported;
public string? EvidenceUrls { get; set; }
public DateTime? ResolvedAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Reporter { get; set; } = null!;
}

public class BookingPriceAdjustment : BaseEntity<int> {
public int BookingId { get; set; }
public string? AgencyId { get; set; }
public string AdjustedBy { get; set; } = string.Empty;
public decimal PreviousTotalPrice { get; set; }
public decimal Amount { get; set; }
public decimal NewTotalPrice { get; set; }
public string Reason { get; set; } = string.Empty;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Adjuster { get; set; } = null!;
}

public class BookingAgency : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public bool? IsHost { get; set; } = false;
public decimal? OriginalAmount { get; set; } = 0m;
public decimal FinalAmount { get; set; } = 0m;
public decimal? PlatformFee { get; set; } = 0m;
public decimal? NetPayout { get; set; } = 0m;
public SettlementStatus? SettlementStatus { get; set; } = TripOps.Data.Enums.SettlementStatus.Unpaid;
public DateTime? PayoutTransferredAt { get; set; }
public string? BankReferenceCode { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Agency { get; set; } = null!;
}
