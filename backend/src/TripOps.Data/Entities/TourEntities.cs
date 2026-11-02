using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class Tour : BaseEntity<int>, ISoftDelete
{
    public string AgencyId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string? Code { get; set; }
    public int DurationDays { get; set; }
    public int DurationNights { get; set; }
    public decimal BasePrice { get; set; }
    public int? MinGuests { get; set; }
    public int? MaxGuests { get; set; }
    public string? Highlights { get; set; }
    public string? Inclusions { get; set; }
    public string? Exclusions { get; set; }
    public string? CancellationPolicy { get; set; }
    public string? Images { get; set; }
    public TourStatus Status { get; set; } = TourStatus.Draft;
    public TourVisibility Visibility { get; set; } = TourVisibility.Hidden;
    public bool IsRequest { get; set; }
    public int Version { get; set; } = 1;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public virtual User Agency { get; set; } = null!;
    public virtual ICollection<TourPricingTier> PricingTiers { get; set; } = new List<TourPricingTier>();
    public virtual ICollection<TourTimeline> Timelines { get; set; } = new List<TourTimeline>();
    public virtual ICollection<TourVersion> Versions { get; set; } = new List<TourVersion>();
}

public class TourPricingTier : BaseEntity<int>
{
    public int TourId { get; set; }
    public string Name { get; set; } = null!;
    public int MinGuests { get; set; }
    public int MaxGuests { get; set; }
    public decimal PricePerGuest { get; set; }

    public virtual Tour Tour { get; set; } = null!;
}

public class TourTimeline : BaseEntity<int>
{
    public int TourId { get; set; }
    public int DayNumber { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }

    public virtual Tour Tour { get; set; } = null!;
    public virtual ICollection<TouristAttraction> Attractions { get; set; } = new List<TouristAttraction>();
    public virtual ICollection<TourMeal> Meals { get; set; } = new List<TourMeal>();
    public virtual ICollection<TourAccommodation> Accommodations { get; set; } = new List<TourAccommodation>();
}

public class TouristAttraction : BaseEntity<int>
{
    public int TourTimelineId { get; set; }
    public int? ServiceId { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public TimeSpan? EstimatedTime { get; set; }
    public int OrderIndex { get; set; }

    public virtual TourTimeline TourTimeline { get; set; } = null!;
    public virtual Service? Service { get; set; }
}

public class TourMeal : BaseEntity<int>
{
    public int TourTimelineId { get; set; }
    public int? ServiceId { get; set; }
    public string MealType { get; set; } = null!; // breakfast, lunch, dinner
    public string? Description { get; set; }

    public virtual TourTimeline TourTimeline { get; set; } = null!;
    public virtual Service? Service { get; set; }
}

public class TourAccommodation : BaseEntity<int>
{
    public int TourTimelineId { get; set; }
    public int? ServiceId { get; set; }
    public string? HotelName { get; set; }
    public string? RoomType { get; set; }

    public virtual TourTimeline TourTimeline { get; set; } = null!;
    public virtual Service? Service { get; set; }
}

public class TourVersion : BaseEntity<int>
{
    public int TourId { get; set; }
    public int VersionNumber { get; set; }
    public string SnapshotData { get; set; } = null!; // JSON
    public string? ChangeLog { get; set; }

    public virtual Tour Tour { get; set; } = null!;
}

public class TourCustomRequest : BaseEntity<int>, ISoftDelete
{
    public string CustomerId { get; set; } = null!;
    public string? Title { get; set; }
    public int NumberOfGuests { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? ExpectedBudget { get; set; }
    public string? Destination { get; set; }
    public string? SpecialRequirements { get; set; }
    public CustomRequestStatus Status { get; set; } = CustomRequestStatus.Pending;

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual User Customer { get; set; } = null!;
    public virtual ICollection<TourCustomRequestAgency> RequestAgencies { get; set; } = new List<TourCustomRequestAgency>();
}

public class TourCustomRequestAgency : BaseEntity<int>
{
    public int TourCustomRequestId { get; set; }
    public string AgencyId { get; set; } = null!;
    public string Status { get; set; } = "PENDING";
    public decimal? QuotedPrice { get; set; }
    public string? ProposalNotes { get; set; }

    public virtual TourCustomRequest TourCustomRequest { get; set; } = null!;
    public virtual User Agency { get; set; } = null!;
}
