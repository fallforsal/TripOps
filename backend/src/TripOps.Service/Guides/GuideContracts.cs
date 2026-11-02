using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Guides;

public sealed record GuideProfileRequest(
    [Required, StringLength(150, MinimumLength = 3)] string Name,
    [Required, EmailAddress, StringLength(191)] string Email,
    [Required, StringLength(30)] string Phone,
    [Range(0, 50)] int ExperienceYears,
    [Required] string[] Languages,
    string[]? Routes,
    string[]? Specialties,
    [StringLength(5000)] string? Bio,
    string? Avatar);

public sealed record CreateGuideRequest(
    [Required] GuideProfileRequest Profile,
    [Required, StringLength(16, MinimumLength = 8)] string Password);
public sealed record GuideAccountStatusRequest(
    [Required] string Action, [StringLength(2000)] string? Reason, bool ConfirmWithUpcomingTours = false);
public sealed record GuideEligibility(bool CanAssign, IReadOnlyList<string> Reasons, string? PrimaryBlocker);
public sealed record GuideAssignmentDto(string Id, string BookingId, string BookingCode,
    string TourId, string TourCode, string TourName, string Destination, string StartDate, string EndDate,
    int GuestCount, string CustomerName, string CustomerPhone, string Role, string Status, string? Notes);
public sealed record AgencyGuideDto(string Id, string Name, string Email, string? Phone, string? Avatar,
    string Role, string CompanyId, string CompanyName, int ExperienceYears, IReadOnlyList<string> Languages,
    IReadOnlyList<string> Routes, IReadOnlyList<string> Specialties, string? Bio, string MobileAccountStatus,
    string WorkStatus, DateTime? SuspendedAt, string? SuspendedReason, bool CanReactivate, bool CanDelete,
    DateTime CreatedAt, DateTime UpdatedAt, IReadOnlyList<GuideAssignmentDto> Assignments);
public sealed record GuideDetailDto(AgencyGuideDto Guide, IReadOnlyList<GuideAssignmentDto> Assignments, GuideEligibility Eligibility);
public sealed record GuideSummary(int TotalGuides, int AvailableCount, int OnTourCount, int SuspendedCount);
public sealed record GuidePage(IReadOnlyList<AgencyGuideDto> Items, int Total, int Page, int PageSize, GuideSummary Summary);
public sealed record GuideAssignmentsPage(string GuideId, IReadOnlyList<GuideAssignmentDto> Items);
public sealed record GuideAccountStatusResponse(AgencyGuideDto Guide, int AffectedUpcomingTourCount);
