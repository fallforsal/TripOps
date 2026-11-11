using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Tours;

public sealed record CreateDesignRequestInput(
    [Required, StringLength(36)] string AgencyId,
    [Required, StringLength(150)] string ContactName,
    [Required, EmailAddress, StringLength(191)] string ContactEmail,
    [Required, StringLength(30)] string ContactPhone,
    [Required, StringLength(255)] string Destination,
    DateTime DepartureDate, DateTime ReturnDate,
    [Range(1, 1000)] int NumberOfPeople,
    [Range(typeof(decimal), "0", "9999999999")] decimal? BudgetPerPerson = null,
    [StringLength(50)] string? HotelStars = null,
    [StringLength(10000)] string? AdditionalInfo = null,
    [StringLength(255)] string? BusinessName = null,
    int? SourceTourId = null, System.Text.Json.JsonElement? InitialChanges = null);

public sealed record AgencyChoiceDto(string Id, string Name, string Address, string Phone, string Email,string? LogoUrl = null);

public sealed record DesignRequestDto(int Id, string CustomerId, string AgencyId, string AgencyName,
    string ContactName, string ContactEmail, string ContactPhone, string Destination,
    DateTime DepartureDate, DateTime? ReturnDate, int NumberOfPeople, decimal? BudgetPerPerson,
    string? HotelStars, string? AdditionalInfo, string? BusinessName, string Status, DateTime CreatedAt, int? DesignedTourId, int? CurrentVersion,
    decimal? QuotedPricePerPerson, string? RejectionReason = null, DateTime? RespondedAt = null, int? SharedVersion = null, DesignCoHostDto[]? CoHosts = null, string? SharedTourThumbnail = null, string? SharedTourName = null);

public sealed record DesignCoHostDto(string CompanyId, string CompanyName, string Role, string Status,
    int[] AssignedDays, string? AssignedSegments = null, decimal? EstimatedBudgetPerGuest = null,
    decimal? QuoteAdult = null, decimal? QuoteChild = null, decimal? QuoteInfant = null,
    string? QuoteNote = null, DateTime? QuotedAt = null, string? Notes = null,
    string? RejectionReason = null, DateTime? InvitedAt = null, DateTime? RespondedAt = null,
    string? CompanyPhone = null, string? CompanyEmail = null);
public sealed record InviteDesignCoHost([Required] string AgencyId, [StringLength(255)] string? Segment = null,
    [Range(typeof(decimal), "0", "9999999999")] decimal? Budget = null, [StringLength(2000)] string? Notes = null);
public sealed record DesignCoHostDecision([Required, AllowedValues("accept", "reject")] string Action, [StringLength(2000)] string? Reason = null);
public sealed record DesignSegmentInput(int Revision, [Required] TimelineInput[] Timelines, [Required] PricingTierInput[] PricingTiers);

public sealed record DesignRequestAction([Required, AllowedValues("review", "reject")] string Action, [StringLength(2000)] string? Reason = null);
