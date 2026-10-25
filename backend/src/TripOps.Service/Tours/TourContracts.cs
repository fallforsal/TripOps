using System.ComponentModel.DataAnnotations;

namespace TripOps.Service.Tours;

public sealed record TourConfiguration(
    [Required, StringLength(255)] string Name,
    [StringLength(10000)] string? Description = null,
    [StringLength(255)] string? Destination = null,
    [Range(1, 365)] int DurationDays = 1,
    [Range(0, 365)] int DurationNights = 0,
    [Range(typeof(decimal), "0", "9999999999")] decimal BasePrice = 0,
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
    [StringLength(255)] string? DepartureLocation = null);

public sealed record PricingTierInput([Required, StringLength(100)] string Name,
    [Required, Range(0, 150)] int? MinAge, [Range(0, 150)] int? MaxAge,
    [Range(typeof(decimal), "0", "9999999999")] decimal PricePerGuest, [Range(0, 1000)] int DisplayOrder = 0);
public sealed record TimelineInput([Range(1, 365)] int DayNumber, [Required, StringLength(255)] string Title,
    [StringLength(10000)] string? Description = null, [Range(1, int.MaxValue)] int? TransportationServiceId = null,
    ActivityInput[]? Activities = null, MealInput[]? Meals = null, AccommodationInput[]? Accommodations = null);
public sealed record ActivityInput([Required, StringLength(255)] string Name, [Range(1, int.MaxValue)] int? ServiceId = null,
    [StringLength(10000)] string? Description = null, TimeSpan? EstimatedTime = null, [Range(0, 1000)] int OrderIndex = 0);
public sealed record MealInput([Required, AllowedValues("breakfast", "lunch", "dinner")] string MealType, [Required, StringLength(255)] string RestaurantName,
    [Range(1, int.MaxValue)] int? ServiceId = null, [StringLength(10000)] string? Description = null, bool IsDefault = true,
    [Range(typeof(decimal), "-9999999999", "9999999999")] decimal PriceDifference = 0);
public sealed record AccommodationInput([Required, StringLength(255)] string HotelName,
    [Required, StringLength(255)] string DestinationName, [Range(1, int.MaxValue)] int? ServiceId = null,
    [StringLength(100)] string? RoomType = null, [Range(0, 365)] int NightsCount = 1,
    [Range(1, 5)] int StarRating = 3, bool IsDefault = true,
    [Range(typeof(decimal), "-9999999999", "9999999999")] decimal PriceDifference = 0,
    [StringLength(10000)] string? AddressNotes = null);

public sealed record UpdateTourRequest([Range(1, int.MaxValue)] int Version,
    [Required] TourConfiguration Configuration, [Required, StringLength(2000)] string ChangeNote);
public sealed record TourCommand([Range(1, int.MaxValue)] int Version, [StringLength(2000)] string? Reason = null);
public sealed record DuplicateTourRequest([Required, StringLength(255)] string Name);
public sealed record AiDraftRequest([Required, StringLength(255)] string Destination,
    [Range(1, 365)] int DurationDays, [StringLength(2000)] string? Style = null);

public sealed record TourDto(int Id, string AgencyId, string? Code, string Status, string Visibility,
    bool IsRequest, bool IsAiGenerated, int Version, TourConfiguration Configuration,
    DateTime CreatedAt, DateTime UpdatedAt);
public sealed record PublicTourDto(int Id, string? Code, int Version, TourConfiguration Configuration);
public sealed record TourServiceReference(int Id, string ProviderId, string Category, string Name, decimal Price);
public sealed record TourListItem(int Id, string Name, string? Destination, decimal BasePrice,
    string Status, string Visibility, int Version);
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
}
public sealed class UnconfiguredItineraryDraftGenerator : IItineraryDraftGenerator
{
    public Task<TourConfiguration> Generate(AiDraftRequest request, CancellationToken ct) =>
        throw new TourException(503, "AI itinerary generation is not configured.");
}
