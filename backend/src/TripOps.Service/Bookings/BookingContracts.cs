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
    BookingSnapshotDto? AgreedSnapshot = null,
    BookingSnapshotDto? LatestProposal = null,
    BookingSnapshotDto? InitialRequestSnapshot = null,
    string? SnapshotStatus = null,
    int? EffectiveSnapshotVersion = null);

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
    DateTime CreatedAt,
    string? SnapshotStatus = null,
    int? EffectiveSnapshotVersion = null);

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

public sealed record CreateProposalRequest(string? Note);
public sealed record RequestProposalChangesRequest(string Message);
public sealed record ProposalChangeRequestDto(string Message, DateTime CreatedAt);

public sealed record BookingSnapshotSummaryDto(
    int Id,
    int BookingId,
    int Version,
    string SnapshotType,
    int? SourceTourVersion,
    DateTime CreatedAt,
    string CreatedBy,
    DateTime? AcceptedAt,
    string? AcceptedBy,
    ProposalChangeRequestDto? ChangeRequest = null,
    string? ProposalNote = null
);

public sealed record BookingSnapshotDto(
    int Id,
    int BookingId,
    int Version,
    string SnapshotType,
    int? SourceTourVersion,
    BookingSnapshotPayload SnapshotData,
    DateTime CreatedAt,
    string CreatedBy,
    DateTime? AcceptedAt,
    string? AcceptedBy,
    ProposalChangeRequestDto? ChangeRequest = null,
    string? ProposalNote = null
);

public sealed record BookingSnapshotPayload(
    int SchemaVersion,
    int TourId,
    string TourCode,
    string TourName,
    int? SourceTourVersion,
    string? Destination,
    string? DepartureLocation,
    int DurationDays,
    int DurationNights,
    DateTime StartDate,
    DateTime EndDate,
    string AgencyId,
    string? AgencyName,
    decimal BasePrice,
    decimal TotalAmount,
    decimal DepositAmount,
    int? MinGuests,
    int? MaxGuests,
    IReadOnlyList<SnapshotPricingTier> PricingTiers,
    IReadOnlyList<SnapshotPassenger> Passengers,
    IReadOnlyList<SnapshotDay> Itinerary,
    IReadOnlyList<SnapshotHotel> Hotels,
    string? Inclusions,
    string? Exclusions,
    string? CancellationPolicy,
    IReadOnlyList<SnapshotPaymentCondition>? PaymentConditions,
    string? CustomerNotes,
    DateTime GeneratedAt,
    // SchemaVersion >= 2: ghi chú của Agency, tách riêng khỏi yêu cầu của khách (CustomerNotes).
    string? AgencyNote = null
);

public sealed record SnapshotPricingTier(
    int Id,
    string Name,
    int? MinAge,
    int? MaxAge,
    decimal PricePerGuest
);

public sealed record SnapshotPassenger(
    int Index,
    string FullName,
    string? PhoneNumber,
    DateTime? DateOfBirth,
    string? Gender,
    string? IdentityNumber,
    string? TierName,
    decimal Price,
    // SchemaVersion >= 2: ghi chú hành khách tại thời điểm chụp (không gồm dòng số điện thoại).
    string? Note = null,
    string? RoommateNote = null,
    string? RestaurantNote = null
);

public sealed record SnapshotDay(
    int DayNumber,
    string Title,
    string? Description,
    IReadOnlyList<SnapshotLocation> Locations,
    IReadOnlyList<SnapshotMeal> Meals
);

public sealed record SnapshotLocation(
    int DayNumber,
    string Name,
    DateTime? Time
);

public sealed record SnapshotMeal(
    int DayNumber,
    string MealType,
    string Name,
    DateTime? Time,
    int? ServiceId,
    decimal PriceDifference
);

public sealed record SnapshotHotel(
    string Destination,
    string Name,
    int? Stars,
    int? Nights,
    int? ServiceId,
    decimal PriceDifference
);

public sealed record SnapshotPaymentCondition(
    string ConditionType,
    decimal Amount,
    DateTime? DueDate,
    string Description
);
