using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Bookings;

public sealed record CreateBookingRequest(
    [Range(1, int.MaxValue)] int TourId,
    [Required] DateTime StartDate,
    [Required, StringLength(150)] string ContactName,
    [Required, Phone, StringLength(30)] string ContactPhone,
    [Required, EmailAddress, StringLength(191)] string ContactEmail,
    [StringLength(1000)] string? SpecialRequests,
    [Required, MinLength(1)] ParticipantInput[] Participants);

public sealed record ParticipantInput(
    [Required, StringLength(150)] string FullName,
    [Phone, StringLength(30)] string? PhoneNumber,
    DateTime? DateOfBirth,
    [StringLength(20)] string? Gender,
    [StringLength(50)] string? IdentityNumber,
    [Range(1, int.MaxValue)] int? PricingTierId);

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
    DateTime? UpdatedAt);

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
    string? AssignedGuideName);

public sealed record AssignedGuideDto(
    int Id,
    string GuideId,
    string GuideName,
    string? GuidePhone,
    string? Role,
    string Status,
    string? Notes);

public sealed record IncidentDto(
    int Id,
    int BookingId,
    string Title,
    string Description,
    string? ResolutionNotes,
    string Status,
    DateTime CreatedAt);

public sealed record BookingPage<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
