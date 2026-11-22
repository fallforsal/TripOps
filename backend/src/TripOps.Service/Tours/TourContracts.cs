using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Tours;

public sealed record TourConfiguration(
    [Required, StringLength(255)] string Name,
    [StringLength(10000)] string? Description = null,
    [StringLength(255)] string? Destination = null,
    [Range(1, 365)] int DurationDays = 1,
    [Range(0, 365)] int DurationNights = 0,
    [Range(typeof(decimal), "0", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal BasePrice = 0,
    [Range(1, 100000)] int? MinGuests = null,
    [Range(1, 100000)] int? MaxGuests = null,
    [StringLength(255)] string? OperationPeriod = null,
    [StringLength(10000)] string? Highlights = null,
    [StringLength(10000)] string? Inclusions = null,
    [StringLength(10000)] string? Exclusions = null,
    [StringLength(10000)] string? CancellationPolicy = null,
    [StringLength(10000)] string? Message = null,
    string[]? Images = null,
    PricingTierInput[]? PricingTiers = null,
    TimelineInput[]? Timelines = null,
    [StringLength(255)] string? DepartureLocation = null,
    [StringLength(50)] string? Code = null,
    string[]? ProvinceCodes = null, [Range(1, 1000)] int? NumberOfGuests = null, DesignCoHostDto[]? CoHosts = null, AgencyPricingInput[]? AgencyPricing = null,
    OwnedTextItem[]? OwnedHighlights = null, OwnedTextItem[]? OwnedInclusions = null, OwnedTextItem[]? OwnedExclusions = null,
    OwnedTextItem[]? OwnedCancellationPolicy = null, OwnedImageItem[]? OwnedImages = null, bool ShareAllVersions = false);

public sealed record OwnedTextItem([Required, StringLength(2000)] string Text, [StringLength(100)] string? Id = null, [StringLength(36)] string? AgencyId = null);
public sealed record OwnedImageItem([Required, StringLength(1000)] string Url, [StringLength(100)] string? Id = null, [StringLength(36)] string? AgencyId = null);

public sealed record PricingTierInput([Required, StringLength(100)] string Name,
    [Required, Range(0, 150)] int? MinAge, [Range(0, 150)] int? MaxAge,
    [Range(typeof(decimal), "0", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal PricePerGuest, [Range(0, 1000)] int DisplayOrder = 0,
    [StringLength(100)] string? Key = null);
public sealed record AgencyPricingInput(string AgencyId, PricingTierInput[] Tiers);
public sealed record TimelineInput([Range(1, 365)] int DayNumber, [Required, StringLength(255)] string Title,
    [StringLength(10000)] string? Description = null,
    ActivityInput[]? Activities = null, MealInput[]? Meals = null, AccommodationInput[]? Accommodations = null, string? AgencyId = null);
public sealed record ActivityInput([Required, StringLength(255)] string Name,
    [StringLength(10000)] string? Description = null, TimeSpan? EstimatedTime = null, [Range(0, 1000)] int OrderIndex = 0, [StringLength(100)] string? Id = null, [StringLength(36)] string? AgencyId = null);
/// <summary>Per-tour snapshot of an Agency-supplied hotel/restaurant (kept in the immutable tour version).</summary>
public sealed record SupplierSnapshotInput([StringLength(500)] string? Address = null, [StringLength(255)] string? Area = null,
    [StringLength(150)] string? ContactName = null, [StringLength(30)] string? ContactPhone = null,
    [Range(typeof(decimal), "0", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal? ReferencePrice = null, [StringLength(2000)] string? Conditions = null);
public sealed record MealInput([Required, AllowedValues("breakfast", "lunch", "dinner")] string MealType, [Required, StringLength(255)] string RestaurantName,
    [StringLength(10000)] string? Description = null, bool IsDefault = true,
    [Range(typeof(decimal), "-9999999999", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal PriceDifference = 0,
    int? ServiceId = null, TimeSpan? Time = null,
    [StringLength(20)] string? SupplierSource = null, int? AgencySupplierId = null, SupplierSnapshotInput? Supplier = null, [StringLength(100)] string? Id = null, [StringLength(36)] string? AgencyId = null);
public sealed record AccommodationInput([Required, StringLength(255)] string HotelName,
    [Required, StringLength(255)] string DestinationName,
    [StringLength(100)] string? RoomType = null, [Range(0, 365)] int NightsCount = 1,
    [Range(1, 5)] int StarRating = 3, bool IsDefault = true,
    [Range(typeof(decimal), "-9999999999", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal PriceDifference = 0,
    [StringLength(10000)] string? AddressNotes = null, int? ServiceId = null,
    [StringLength(20)] string? SupplierSource = null, int? AgencySupplierId = null, SupplierSnapshotInput? Supplier = null, [StringLength(100)] string? Id = null, [StringLength(36)] string? AgencyId = null);

public sealed record SupplierRequest([Required, AllowedValues("HOTEL", "RESTAURANT")] string Type,
    [Required, StringLength(255)] string Name, [StringLength(500)] string? Address = null, [StringLength(255)] string? Area = null,
    [StringLength(150)] string? ContactName = null, [StringLength(30)] string? ContactPhone = null,
    [EmailAddress, StringLength(191)] string? ContactEmail = null, [Range(1, 5)] int? StarRating = null,
    [Range(typeof(decimal), "0", "9999999999", ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)] decimal? ReferencePrice = null,
    [StringLength(2000)] string? Conditions = null, [StringLength(2000)] string? Notes = null,
    [AllowedValues("ACTIVE", "ARCHIVED")] string Status = "ACTIVE");
public sealed record SupplierDto(int Id, string Type, string Name, string? Address, string? Area, string? ContactName,
    string? ContactPhone, string? ContactEmail, int? StarRating, decimal? ReferencePrice, string? Conditions, string? Notes,
    string Status, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record UpdateTourRequest([Range(1, int.MaxValue)] int Revision,
    [Required] TourConfiguration Configuration, [Required, StringLength(2000)] string ChangeNote);
public sealed record TourCommand([Range(1, int.MaxValue)] int Revision, [StringLength(2000)] string? Reason = null);
public sealed record DuplicateTourRequest([Required, StringLength(255)] string Name);
/// <param name="GroupSize">Số khách dự kiến của đoàn; dùng để AI chọn khách sạn, nhà hàng đủ sức chứa.</param>
public sealed record AiDraftRequest([Required, StringLength(255)] string Destination,
    [Range(1, 365)] int DurationDays, [StringLength(2000)] string? Style = null, [Range(1, 1000)] int? GroupSize = null);

/// <summary>
/// UC-038: khách sạn/nhà hàng AI được phép chọn khi soạn tour, theo thứ tự ưu tiên:
/// "A" = danh bạ nhà cung cấp của chính Agency, "P" = dịch vụ Provider đã duyệt trên TripOps.
/// Key ("A12", "P34") là mã AI dùng để chọn; backend chỉ nhận key có trong danh sách này.
/// </summary>
public sealed record AiServiceCandidate(string Key, string Source, int Id, string Type, string Name, string? Area,
    int? StarRating = null, int? Capacity = null, decimal? PriceFrom = null, decimal? PriceTo = null, string? Address = null);

/// <summary>Lựa chọn của AI cho một đêm lưu trú hoặc một bữa ăn: một key trong danh sách, hoặc gợi ý bên ngoài.</summary>
public sealed record AiServiceChoice(int Day, string? MealType, string? Key, string? ExternalName, string? ExternalArea,
    int? StarRating = null, string? Note = null);
public sealed record AiServicePlan(IReadOnlyList<AiServiceChoice> Stays, IReadOnlyList<AiServiceChoice> Meals)
{
    public static readonly AiServicePlan Empty = new([], []);
}

public sealed record TourDto(int Id, string AgencyId, string? Code, string Status, string Visibility,
    bool IsRequest, bool IsAiGenerated, int Version, TourConfiguration Configuration,
    DateTime CreatedAt, DateTime UpdatedAt, int? DesignRequestId = null, int? SharedVersion = null, int Revision = 1, bool HasDraftChanges = false, TourAgencyContact? Agency = null);
public sealed record TourAgencyContact(string Id, string Name, string? LogoUrl, string? Phone, string? Email);
public sealed record PublicTourDto(int Id, string? Code, int Version, TourConfiguration Configuration, string? AgencyId = null, TourAgencyContact? Agency = null,
    Contracts.CancellationPolicyDto? CancellationPolicy = null);
public sealed record TourServiceReference(int Id, string ProviderId, string Category, string Name, decimal Price,
    string? SubCategory = null, string? FullAddress = null, string? OperatingHours = null,
    string? HiddenReason = null, string? ThumbnailUrl = null, string[]? Images = null, int? Capacity = null, bool IsPaused = false);
public sealed record TourListItem(int Id, string Name, string? Destination, decimal BasePrice,
    string Status, string Visibility, int Version, string[]? ProvinceCodes = null);
public sealed record CandidateAgencyDto(
    string AgencyId,
    string BusinessName,
    string? Email,
    string? Phone,
    string? Avatar,
    string[] MatchedProvinceCodes,
    int MatchedTourCount, AgencyEvidenceDto? Evidence = null);
public sealed record TourPage<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
public sealed record TourVersionDto(int Version, string? ChangeNote, string? CreatedBy, decimal? Price,
    DateTime CreatedAt, string? SnapshotData);
public sealed record TourSnapshot(int SchemaVersion, int Version, bool IsRequest, bool IsAiGenerated, string Status, string Visibility,
    TourConfiguration Configuration);
public sealed record TourValidationResult(bool IsValid, IReadOnlyList<string> Errors);
public sealed class TourException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

// No provider, credentials or response contract is specified by the project.
public interface IItineraryDraftGenerator
{
    Task<TourConfiguration> Generate(AiDraftRequest request, CancellationToken ct);

    /// <summary>Bước 2: chọn chỗ ở, ăn uống cho khung tour từ danh sách ứng viên (ưu tiên A → P → bên ngoài).</summary>
    Task<AiServicePlan> PlanServices(TourConfiguration outline, AiDraftRequest request, IReadOnlyList<AiServiceCandidate> candidates, CancellationToken ct)
        => Task.FromResult(AiServicePlan.Empty);
}
public sealed class UnconfiguredItineraryDraftGenerator : IItineraryDraftGenerator
{
    public Task<TourConfiguration> Generate(AiDraftRequest request, CancellationToken ct) =>
        throw new TourException(503, "Tính năng soạn tour bằng AI chưa được cấu hình. Bạn vẫn có thể tạo tour thủ công.");
}

public sealed record DesignCloneInput([Range(1, int.MaxValue)] int TourId);

public sealed record SaveDesignTourInput(int? Revision, [Required] TourConfiguration Configuration, bool Complete = false, [StringLength(2000)] string? Reason = null, bool CreateNewVersion = false, int? Version = null);
public sealed record ShareDesignVersionInput(int Revision, int? Version = null, bool Hidden = false, bool ShareAll = false);
