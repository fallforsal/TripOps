using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Bookings;

public sealed record CreateBookingRequest(
    [Range(1, int.MaxValue)] int TourId,
    [Required] DateTime StartDate,
    [Required, StringLength(150)] string ContactName,
    [Required, Phone, StringLength(30)] string ContactPhone,
    [Required, EmailAddress, StringLength(191)] string ContactEmail,
    [StringLength(1000)] string? SpecialRequests,
    [Required, MinLength(1)] ParticipantInput[] Participants,
    HotelChoiceInput[]? HotelChoices = null, MealChoiceInput[]? MealChoices = null);

public sealed record HotelChoiceInput(string Destination, string Name, int? ServiceId = null);
public sealed record MealChoiceInput(int DayNumber, string MealType, string Name, int? ServiceId = null);

public sealed record ParticipantInput(
    [Required, StringLength(150)] string FullName,
    [Phone, StringLength(30)] string? PhoneNumber,
    DateTime? DateOfBirth,
    [StringLength(20)] string? Gender,
    [StringLength(50)] string? IdentityNumber,
    [Range(1, int.MaxValue)] int? PricingTierId,
    [StringLength(2000)] string? Note = null,
    [StringLength(2000)] string? RoommateNote = null, [StringLength(2000)] string? RestaurantNote = null);

public sealed record BookingDecisionRequest(
    [Required, AllowedValues("approve", "reject")] string Decision,
    [StringLength(1000)] string? Reason);

public sealed record BookingDepositRequest(
    [Range(typeof(decimal), "1", "9999999999")] decimal Amount,
    [StringLength(100)] string? TransactionReference,
    [StringLength(2048)] string? PaymentProofUrl);

public sealed record BookingCancellationRequest(
    [Required, StringLength(1000)] string Reason);

public sealed record GuideAssignmentRequest(
    [Required] string GuideId,
    [StringLength(50)] string? Role,
    [StringLength(500)] string? Notes);

public sealed record AttendanceCheckinRequest(
    [Range(1, int.MaxValue)] int ParticipantId,
    [Required, AllowedValues("CheckedIn", "Absent", "Pending")] string Status);

public sealed record ReportIncidentRequest(
    [Required, StringLength(100)] string IncidentType,
    [Required, StringLength(255)] string Title,
    [Required, StringLength(2000)] string Description,
    [StringLength(50)] string? Severity);

public sealed record BookingDto(
    int Id,
    string BookingCode,
    string CustomerId,
    string CustomerName,
    int? TourId,
    string? TourName,
    string? AgencyId,
    string? AgencyName,
    DateTime StartDate,
    DateTime EndDate,
    int TotalGuests,
    decimal TotalAmount,
    decimal DepositAmount,
    decimal PaidAmount,
    string Status,
    string PaymentStatus,
    string? ContactName,
    string? ContactPhone,
    string? ContactEmail,
    string? SpecialRequests,
    IReadOnlyList<ParticipantDto> Participants,
    IReadOnlyList<AssignedGuideDto> AssignedGuides,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<IncidentDto>? Incidents = null,
    IReadOnlyList<BookingDayDto>? SnapshotDays = null,
    IReadOnlyList<BookingHotelDto>? SnapshotHotels = null,
    IReadOnlyList<PaymentScheduleItemDto>? PaymentSchedule = null,
    IReadOnlyList<PaymentTransactionDto>? PaymentTransactions = null);

/// <summary>
/// Một đợt trong lịch thanh toán (backend tính, frontend chỉ hiển thị). Stage: "deposit" (cọc) | "balance" (phần còn lại sau tour).
/// Status: Pending | Overdue | Paid | Scheduled (Đợt 2 chờ đủ cọc mới mở) | NotIssued (đơn duyệt trước khi có lịch, chưa phát hành đợt cọc).
/// DueAt: hạn chính xác (UTC, hiển thị theo giờ Việt Nam). Đợt 1: duyệt + 24 giờ; Đợt 2: hết ngày (khởi hành − 8).
/// Warning: hạn bất thường cần chốt quy tắc (hạn cọc sau khởi hành, hạn đợt 2 không sau hạn cọc).
/// </summary>
public sealed record PaymentScheduleItemDto(
    int? Id, string Stage, string Description, decimal Amount, decimal Outstanding,
    DateTime? DueDate, DateTime? DueAt, string Status, DateTime? PaidAt, string? Warning);

/// <summary>
/// Giao dịch tiền. Method: PAYOS | DEMO (mô phỏng Development) | VNPAY (lịch sử cũ).
/// Status: Pending | Success | Failed | Cancelled | Expired | NeedsReview | Refunded.
/// </summary>
public sealed record PaymentTransactionDto(
    int Id, int? PaymentRequestId, string TransactionCode, string PaymentMethod, decimal Amount,
    string Status, DateTime? PaidAt, DateTime? CreatedAt, string? GatewayTransactionNo,
    DateTime? ExpiresAt = null, string? ReviewNote = null);

/// <summary>Phiên thanh toán payOS: FE chuyển trình duyệt tới CheckoutUrl. Reused = dùng lại link còn hạn.</summary>
public sealed record PayOsCheckoutDto(string CheckoutUrl, string TransactionCode, decimal Amount, DateTime ExpiresAt, bool Reused);

/// <summary>Kết quả tra cứu payOS. Outcome: paid | pending | cancelled | expired | review | failed | none.</summary>
public sealed record PaymentSyncResultDto(string Outcome, string Message, BookingDto Booking);

/// <summary>Phản hồi cho payOS khi nhận webhook (payOS chỉ cần mã HTTP 2xx).</summary>
public sealed record PayOsWebhookAckDto(bool Success, string Result);

public sealed record BookingLocationDto(int Id,string Name,DateTime? Time,string? AttendanceStatus);
public sealed record BookingMealDto(int Id,string MealType,string Name,DateTime? DateService,DateTime? Time,int? ServiceId,decimal PriceDifference);
public sealed record BookingDayDto(int Id,int DayNumber,string Title,string? Description,IReadOnlyList<BookingLocationDto> Locations,IReadOnlyList<BookingMealDto> Meals);
public sealed record BookingHotelDto(int Id,string Destination,string Name,int? Stars,int? Nights,int? ServiceId,decimal PriceDifference);

public sealed record AvailableGuideDto(string Id, string Name, string? Phone);

public sealed record BookingListItem(
    int Id,
    string BookingCode,
    string? TourName,
    string? CustomerName,
    string? ContactPhone,
    DateTime StartDate,
    int TotalGuests,
    decimal TotalAmount,
    decimal PaidAmount,
    string Status,
    string PaymentStatus,
    DateTime CreatedAt);

public sealed record ParticipantDto(
    int Id,
    string FullName,
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? IdentityNumber,
    string AttendanceStatus,
    string Status,
    string? AssignedGuideName,
    decimal? Price = null,
    string? TierName = null,
    string? AgencyId = null,
    int? ParticipantIndex = null,
    bool? IsPrimary = null,
    string? Note = null, string? RoommateNote = null, string? RestaurantNote = null,
    string? CheckedBy = null, DateTime? CheckedAt = null, string? AssignedGuideId = null);

public sealed record AssignedGuideDto(
    int Id,
    string GuideId,
    string GuideName,
    string? GuidePhone,
    string? Role,
    string Status,
    string? Notes,
    DateTime? AssignedAt = null,
    string? AgencyId = null);

public sealed record IncidentDto(
    int Id,
    int BookingId,
    string Title,
    string Description,
    string? ResolutionNotes,
    string Status,
    DateTime CreatedAt);

public sealed record BookingPage<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
