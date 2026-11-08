using System.ComponentModel.DataAnnotations;
namespace TripOps.Service.Accounts;
public sealed record RegisterRequest(
    [Required, StringLength(150, MinimumLength = 2)] string Name,
    [Required, EmailAddress, StringLength(191)] string Email,
    [Required, StringLength(128, MinimumLength = 8)] string Password,
    [Required] string Role, bool AcceptedTerms);
public sealed record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public sealed record ChangeGuidePasswordRequest(
    [Required, StringLength(16, MinimumLength = 8)] string NewPassword,
    [Required] string ConfirmPassword);
public sealed record RejectRequest([Required, StringLength(2000)] string Reason);
public sealed record ProfileRequest(
    [Required, StringLength(255)] string BusinessName,
    [Required, StringLength(50)] string TaxCode,
    [Required, StringLength(30)] string Phone,
    [Required, StringLength(2000)] string BusinessAddress,
    [StringLength(5000)] string? Description);
public sealed record ProfileDto(int Id, string UserId, string? BusinessName, string? TaxCode,
    string? BusinessAddress, string? BusinessLicenseUrl, string? Description, string Status,
    string? RejectionReason, DateTime? ApprovedAt, DateTime CreatedAt, DateTime UpdatedAt, string? LogoUrl);

//admin user management
public sealed record AdminAccountBusinessDto(int ProfileId, string BusinessName, string? LogoUrl,
    string? Address, string? Status, DateTime? CreatedAt);
public sealed record AdminAccountDto(string Id, string Name, string Email, string? Phone, string Role,
    string Status, string? AvatarUrl, DateTime? CreatedAt, DateTime? UpdatedAt, string? BanReason,
    DateTime? BannedAt, AdminAccountBusinessDto? Business);
public sealed record AdminAccountCountsDto(int All, int Customer, int Agency, int Provider);
public sealed record AdminAccountPageDto(IReadOnlyList<AdminAccountDto> Items, int Total, int Page,
    int PageSize, AdminAccountCountsDto Counts);
public sealed record BanAccountRequest([Required, StringLength(1000, MinimumLength = 5)] string Reason);

public sealed record AccountDto(string Id, string Name, string Email, string? Phone,
    string Role, ProfileDto? BusinessProfile);
public sealed record PartnerDto(ProfileDto Profile, string Name, string Email, string? Phone, string Role);
// Describes the existing anonymous list response without changing its runtime shape.
public sealed record PartnerPageDto(IReadOnlyList<PartnerDto> Items, int Total, int Page, int PageSize);
public sealed class AccountException(int status, string message) : Exception(message)
{ public int Status { get; } = status; }
