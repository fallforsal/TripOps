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
    HotelChoiceInput[]? HotelChoices = null, MealChoiceInput[]? MealChoices = null, int? TourVersion = null);

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
    [StringLength(2048)] string? PaymentProofUrl,
    [Range(1, int.MaxValue)] int? PaymentRequestId = null);

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
    IReadOnlyList<PaymentTransactionDto>? PaymentTransactions = null,
    CancellationRequestDto? Cancellation = null,
    ContractDto? Contract = null,
    decimal? OriginalTotalPrice = null,
    IReadOnlyList<BookingPriceAdjustmentDto>? PriceAdjustments = null,
    decimal? BaseTourAmount = null, decimal SurchargeAmount = 0, bool HasBeenApproved = false,
    IReadOnlyList<BookingAgencyDto>? BookingAgencies = null,IReadOnlyList<BookingCheckinDto>? AttractionCheckins=null,bool IsPartnerView=false,IReadOnlyList<BookingAgencyIdentityDto>? AgencyDirectory=null);
public sealed record BookingAgencyIdentityDto(string AgencyId,string AgencyName);
public sealed record BookingCheckinDto(int Id,int LocationId,string AgencyId,string GuideId,string GuideName,string Status,DateTime? CheckedAt,string? Note);

public sealed record BookingAgencyDto(int Id,string AgencyId,string AgencyName,bool IsHost,decimal OriginalAmount,decimal FinalAmount,decimal NetPayout,
    string SettlementStatus,string? StageArea=null,TripOps.Service.Tours.PricingTierInput[]? PricingTiers=null,decimal PaidSurchargeAmount=0,decimal UnpaidSurchargeAmount=0);

/// <summary>
/// Hợp đồng hiện hành của đơn. Status: AwaitingSignature | Signed | Verified | ResignRequested.
/// RequiredBeforePayment: khách phải ký (tải bản đã ký) thì mới thanh toán được.
/// </summary>
public sealed record ContractDto(
    int Id, int Version, string ContractNo, decimal TotalAmount, string Status,
    DateTime? SignedAt, string? SignedFileType, string? SignMethod, string? ReviewNote, DateTime? ReviewedAt, DateTime? CreatedAt,
    bool RequiredBeforePayment);

/// <summary>Mã phiên ký trực tuyến (chỉ trả một lần). FE ghép thành đường dẫn #/sign/{Token} cho QR hoặc ký ngay trên máy tính.</summary>
public sealed record SignSessionStartDto(string Token, DateTime ExpiresAt, string ContractNo, int Version);

/// <summary>
/// Trạng thái phiên ký cho trang ký (không lộ thông tin nhạy cảm). Status: open | completed | expired.
/// DevelopmentOtp: chỉ có ở môi trường Development khi chưa cấu hình SMTP, để demo.
/// </summary>
public sealed record SignSessionDto(
    string Status, string ContractNo, int Version, string TourName, DateTime StartDate, string CustomerName,
    string MaskedEmail, decimal TotalAmount, DateTime ExpiresAt, DateTime? OtpSentAt, DateTime? OtpExpiresAt,
    DateTime? CompletedAt, string? DevelopmentOtp = null);

/// <summary>Xác nhận ký: ảnh chữ ký PNG (data URL), mã OTP từ email và xác nhận đã đọc hợp đồng.</summary>
public sealed record WebSignRequest(
    [Required, StringLength(800_000)] string SignaturePng,
    [Required, StringLength(10)] string Otp,
    bool Agreed);

/// <summary>Agency kiểm tra bản ký: verify (hợp lệ) hoặc resign (yêu cầu ký lại, bắt buộc ghi lý do).</summary>
public sealed record ContractReviewRequest(
    [Required, AllowedValues("verify", "resign")] string Decision,
    [StringLength(1000)] string? Note);

/// <summary>
/// Yêu cầu hủy/hoàn tiền mới nhất của đơn (không kèm số tài khoản ngân hàng để Agency không thấy).
/// Reason: CUSTOMER_REQUEST | WEATHER_FORCE_MAJEURE | SERVICE_QUALITY | OTHER (khách) · TOUR_CANCELLED (Agency hủy)
/// · PAYMENT_OVERDUE (quá hạn thanh toán, khách mất số đã trả).
/// Status: Pending | Approved (Admin đã duyệt, đang chi hộ qua payOS) | Completed (đã hoàn, đơn đã hủy) | Rejected.
/// </summary>
public sealed record CancellationRequestDto(
    int Id, string Reason, string ReasonDetail, string Status, string RequestedByRole,
    decimal FeePercent, decimal Fee, decimal PaidAmount, decimal SuggestedRefund, decimal? ApprovedRefundAmount,
    bool HasRefundAccount, string? RefundTransactionCode, string? AdminNote, string? RejectionReason,
    DateTime CreatedAt, DateTime? ReviewedAt, DateTime? CompletedAt);

/// <summary>
/// Báo giá hủy do backend tính theo chính sách chung. Mode: immediate (chưa trả tiền, hủy ngay không cần Admin)
/// | customer (khách hủy, theo bảng phí) | agency (Agency hủy, hoàn 100%) | overdue (quá hạn thanh toán, mất số đã trả).
/// </summary>
public sealed record CancellationQuoteDto(
    int BookingId, string Mode, int DaysBeforeDeparture, bool CoolingOff, decimal FeePercent,
    decimal TotalAmount, decimal PaidAmount, decimal Fee, decimal RefundAmount, string Explanation);

public sealed record CustomerCancellationRequest(
    [Required, AllowedValues("CUSTOMER_REQUEST", "WEATHER_FORCE_MAJEURE", "SERVICE_QUALITY", "OTHER")] string Reason,
    [Required, StringLength(2000, MinimumLength = 3)] string ReasonDetail,
    [StringLength(100)] string? BankName,
    [StringLength(50)] string? AccountNumber,
    [StringLength(150)] string? AccountHolder);

/// <summary>Khách bổ sung tài khoản nhận hoàn (ví dụ khi Agency hủy tour).</summary>
public sealed record RefundAccountRequest(
    [Required, StringLength(100)] string BankName,
    [Required, StringLength(50)] string AccountNumber,
    [Required, StringLength(150)] string AccountHolder);

/// <summary>
/// Admin duyệt hủy. RefundAmount mặc định = số gợi ý theo chính sách; khác số gợi ý thì bắt buộc ghi chú.
/// TransactionCode (mã giao dịch ngân hàng) bắt buộc khi RefundAmount &gt; 0.
/// </summary>
public sealed record RefundApprovalRequest(
    [Range(typeof(decimal), "0", "9999999999")] decimal RefundAmount,
    [StringLength(100)] string? TransactionCode,
    [StringLength(1000)] string? Note);

/// <summary>Admin duyệt và hoàn tự động qua chi hộ payOS. Khác số gợi ý thì bắt buộc ghi chú.</summary>
public sealed record RefundPayoutRequest(
    [Range(typeof(decimal), "1", "9999999999")] decimal RefundAmount,
    [StringLength(1000)] string? Note);

/// <summary>Kênh chuyển tiền payOS: đã cấu hình chưa, số dư hiện tại (Error khi không đọc được).</summary>
public sealed record PayoutAccountDto(bool Configured, string? AccountNumber, string? AccountName, decimal? Balance, string? Error);

public sealed record RefundRejectionRequest([Required, StringLength(1000, MinimumLength = 3)] string Reason);

/// <summary>Một yêu cầu hủy/hoàn tiền trong màn hình Admin (có tài khoản nhận tiền).</summary>
public sealed record AdminRefundDto(
    int Id, int BookingId, string BookingCode, string? TourName, DateTime StartDate,
    string CustomerName, string? CustomerEmail, string? CustomerPhone, string? AgencyName,
    string Reason, string ReasonDetail, string Status, string RequestedByRole,
    decimal TotalAmount, decimal FeePercent, decimal Fee, decimal PaidAmount, decimal SuggestedRefund, decimal? ApprovedRefundAmount,
    string? BankName, string? AccountNumber, string? AccountHolder,
    string? RefundTransactionCode, string? AdminNote, string? RejectionReason,
    DateTime CreatedAt, DateTime? ReviewedAt, DateTime? CompletedAt,
    string? BankBin = null, string? PayoutState = null, string? LastPayoutError = null);

/// <summary>
/// Một đợt trong lịch thanh toán (backend tính, frontend chỉ hiển thị). Stage: "deposit" (cọc) | "balance" (phần còn lại sau tour).
/// Status: Pending | Overdue | Paid | Scheduled (Đợt 2 chờ đủ cọc mới mở) | NotIssued (đơn duyệt trước khi có lịch, chưa phát hành đợt cọc).
/// DueAt: hạn chính xác (UTC, hiển thị theo giờ Việt Nam). Đợt 1: duyệt + 24 giờ; Đợt 2: hết ngày (khởi hành − 8).
/// Warning: hạn bất thường cần chốt quy tắc (hạn cọc sau khởi hành, hạn đợt 2 không sau hạn cọc).
/// </summary>
public sealed record PaymentScheduleItemDto(
    int? Id, string Stage, string Description, decimal Amount, decimal Outstanding,
    DateTime? DueDate, DateTime? DueAt, string Status, DateTime? PaidAt, string? Warning,string? BeneficiaryAgencyId=null,string? BeneficiaryAgencyName=null);

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

public sealed record BookingLocationDto(int Id,string Name,DateTime? Time,string? AttendanceStatus,
    string? OriginalName = null, string? ChangeReason = null,string? AgencyId=null);
public sealed record BookingSupplierDto(string? Address, string? ContactPhone);
public sealed record BookingMealDto(int Id,string MealType,string Name,DateTime? DateService,DateTime? Time,int? ServiceId,decimal PriceDifference, BookingSupplierDto? Supplier = null, string? OriginalName = null,string? AgencyId=null);
public sealed record BookingDayDto(int Id,int DayNumber,string Title,string? Description,IReadOnlyList<BookingLocationDto> Locations,IReadOnlyList<BookingMealDto> Meals);
public sealed record BookingHotelDto(int Id,string Destination,string Name,int? Stars,int? Nights,int? ServiceId,decimal PriceDifference, BookingSupplierDto? Supplier = null, string? OriginalName = null,string? AgencyId=null);

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
