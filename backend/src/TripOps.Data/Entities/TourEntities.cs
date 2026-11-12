using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class Tour : BaseEntity<int> {
public string AgencyId { get; set; } = string.Empty;
public string Code { get; set; } = string.Empty;
public string? Name { get; set; }
public string? Destination { get; set; }
public string? DepartureLocation { get; set; }
public string? DurationTour { get; set; }
public string? OperationPeriod { get; set; }
public int? DurationDays { get; set; }
public int? DurationNights { get; set; }
public decimal? BasePrice { get; set; }
public int? MinGuests { get; set; }
public int? MaxGuests { get; set; }
public string? Highlights { get; set; }
public string? Inclusions { get; set; }
public string? Exclusions { get; set; }
public string? CancellationPolicy { get; set; }
public string? Message { get; set; }
public string? ThumbnailUrls { get; set; }
public string? Images { get; set; }
public TourStatus? Status { get; set; } = TourStatus.Draft;
public TourVisibility? Visibility { get; set; } = TourVisibility.Hidden;
public bool? IsRequest { get; set; } = false;
public int? Version { get; set; } = 1;
public int Revision { get; set; } = 1;
public string? ConfigurationData { get; set; }
public bool HasDraftChanges { get; set; }
public string? ChangeNote { get; set; }
public int? DesignRequestId { get; set; }
public int? SharedVersion { get; set; }
public int? ClonedFromTourId { get; set; }
public bool? IsAiGenerated { get; set; } = false;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Agency { get; set; } = null!;
public virtual ICollection<TourPricingTier> PricingTiers { get; set; } = new List<TourPricingTier>();
public virtual ICollection<TourTimeline> Timelines { get; set; } = new List<TourTimeline>();
public virtual ICollection<TourVersion> Versions { get; set; } = new List<TourVersion>();
public virtual ICollection<TourAccommodation> Accommodations { get; set; } = new List<TourAccommodation>();
public virtual ICollection<TourProvince> Provinces { get; set; } = new List<TourProvince>();
}

public class TourPricingTier : BaseEntity<int> {
public int TourId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public string? Name { get; set; }
public int? MinAge { get; set; }
public int? MaxAge { get; set; }
public decimal? PricePerGuest { get; set; }
public int? DisplayOrder { get; set; } = 0;
public virtual Tour Tour { get; set; } = null!;
}

public class TourTimeline : BaseEntity<int> {
public int TourId { get; set; }
public int DayNumber { get; set; }
public string? Title { get; set; }
public string? Description { get; set; }
public virtual Tour Tour { get; set; } = null!;
public virtual ICollection<TouristAttraction> Attractions { get; set; } = new List<TouristAttraction>();
public virtual ICollection<TourMeal> Meals { get; set; } = new List<TourMeal>();
}

public class TouristAttraction : BaseEntity<int> {
public int TourTimelineId { get; set; }
public DateTime? Time { get; set; }
public string? Name { get; set; }
public string? AgencyId { get; set; }
public virtual TourTimeline TourTimeline { get; set; } = null!;
}

public class TourMeal : BaseEntity<int> {
public int? ServiceId { get; set; }
public int TourTimelineId { get; set; }
public string? AgencyId { get; set; }
public string? SupplierSource { get; set; }
public int? AgencySupplierId { get; set; }
public string? SupplierSnapshot { get; set; }
public DateTime? Time { get; set; }
public string MealType { get; set; } = string.Empty;
public string RestaurantName { get; set; } = string.Empty;
public string? Description { get; set; }
public bool IsDefault { get; set; } = false;
public decimal PriceDifference { get; set; } = 0m;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual TourTimeline TourTimeline { get; set; } = null!;
}

public class TourAccommodation : BaseEntity<int> {
public int TourId { get; set; }
public int? ServiceId { get; set; }
public string DestinationName { get; set; } = string.Empty;
public string HotelName { get; set; } = string.Empty;
public int? StarRating { get; set; } = 3;
public int? NightsCount { get; set; } = 1;
public bool? IsDefault { get; set; } = false;
public decimal? PriceDifference { get; set; } = 0m;
public string? AddressNotes { get; set; }
public string? SupplierSource { get; set; }
public int? AgencySupplierId { get; set; }
public string? SupplierSnapshot { get; set; }
public string? AgencyId { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Tour Tour { get; set; } = null!;
}

public class TourDesignRequest : BaseEntity<int> {
public DateTime? ClosedAt { get; set; }
public string? CloseReason { get; set; }
public string? InitialChangesJson { get; set; }
public int? SourceTourId { get; set; }
public string? SourceSnapshotJson { get; set; }
public string? RejectionReason { get; set; }
public DateTime? RespondedAt { get; set; }
public int Revision { get; set; }

public string? CustomerId { get; set; }
public string? AgencyId { get; set; }
public string? BusinessName { get; set; }
public string ContactName { get; set; } = string.Empty;
public string ContactEmail { get; set; } = string.Empty;
public string ContactPhone { get; set; } = string.Empty;
public string Destination { get; set; } = string.Empty;
public DateTime StartDate { get; set; }
public DateTime? EndDate { get; set; }
public int? NumberOfGuests { get; set; }
public decimal? BudgetPerPerson { get; set; }
public string? HotelRatingRequirement { get; set; }
public string? SpecialRequirements { get; set; }
public CustomRequestStatus? Status { get; set; } = CustomRequestStatus.Pending;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Customer { get; set; } = null!;
}

public class TourVersion : BaseEntity<int> {
public DateTime? SharedAt { get; set; }
public string? SharedBy { get; set; }
public int? RestoredFromVersion { get; set; }
public int? NumberOfGuests { get; set; }

public int TourId { get; set; }
public int VersionNumber { get; set; }
public string? ChangeLog { get; set; }
public decimal? Price { get; set; }
public string SnapshotData { get; set; } = string.Empty;
public string? CreatedBy { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Tour Tour { get; set; } = null!;
}

public class TourProvince : BaseEntity<int> {
public int TourId { get; set; }
public string ProvinceCode { get; set; } = string.Empty;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Tour Tour { get; set; } = null!;
}
