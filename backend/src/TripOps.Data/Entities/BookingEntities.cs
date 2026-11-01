using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class Booking : BaseEntity<int> {
public string BookingCode { get; set; } = string.Empty;
public string? CustomerId { get; set; }
public int? TourId { get; set; }
public int? DesignRequestId { get; set; }
public DateTime StartDate { get; set; }
public string ContactName { get; set; } = string.Empty;
public string ContactPhone { get; set; } = string.Empty;
public string ContactEmail { get; set; } = string.Empty;
public string? SpecialRequests { get; set; }
public PaymentStatus? PaymentStatus { get; set; } = TripOps.Data.Enums.PaymentStatus.Unpaid;
public bool? HasCustomization { get; set; } = false;
public decimal? OriginalTotalPrice { get; set; }
public decimal TotalAmount { get; set; }
public BookingStatus? Status { get; set; } = BookingStatus.Pending;
public string? CancelReason { get; set; }
public DateTime? CancelledAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Customer { get; set; } = null!;
public virtual Tour? Tour { get; set; }
public virtual ICollection<BookingParticipant> Participants { get; set; } = new List<BookingParticipant>();
public virtual ICollection<BookingAssignedGuide> AssignedGuides { get; set; } = new List<BookingAssignedGuide>();
public virtual ICollection<BookingTimeline> Timelines { get; set; } = new List<BookingTimeline>();
public virtual ICollection<BookingAccommodation> Accommodations { get; set; } = new List<BookingAccommodation>();
public virtual ICollection<BookingAgency> BookingAgencies { get; set; } = new List<BookingAgency>();
public virtual ICollection<BookingPriceAdjustment> PriceAdjustments { get; set; } = new List<BookingPriceAdjustment>();
public virtual ICollection<BookingIncident> Incidents { get; set; } = new List<BookingIncident>();
public virtual ICollection<PaymentRequest> PaymentRequests { get; set; } = new List<PaymentRequest>();
public virtual ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
public virtual ICollection<BookingSnapshot> Snapshots { get; set; } = new List<BookingSnapshot>();
}

public class BookingSnapshot : BaseEntity<int> {
public int BookingId { get; set; }
public int Version { get; set; }
public string SnapshotType { get; set; } = string.Empty;
public string SnapshotData { get; set; } = string.Empty;
public int? SourceTourVersion { get; set; }
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
public string CreatedBy { get; set; } = string.Empty;
public DateTime? AcceptedAt { get; set; }
public string? AcceptedBy { get; set; }
public virtual Booking Booking { get; set; } = null!;
public virtual User Creator { get; set; } = null!;
public virtual User? Acceptor { get; set; }
public virtual ICollection<BookingProposalEvent> Events { get; set; } = new List<BookingProposalEvent>();
}

public class BookingProposalEvent : BaseEntity<int> {
public int SnapshotId { get; set; }
public string ActorId { get; set; } = string.Empty;
public string RecipientId { get; set; } = string.Empty;
public string EventType { get; set; } = string.Empty;
public string? Message { get; set; }
public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? ReadAt { get; set; }
public virtual BookingSnapshot Snapshot { get; set; } = null!;
}

public class BookingParticipant : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public int ParticipantIndex { get; set; }
public bool IsPrimary { get; set; } = true;
public string FullName { get; set; } = string.Empty;
public DateTime? DateOfBirth { get; set; }
public string? Gender { get; set; }
public string? IdentityNumber { get; set; }
public string? Note { get; set; }
public string? TierName { get; set; }
public decimal Price { get; set; } = 0m;
public string? AssignedGuideId { get; set; }
public AttendanceStatus? AttendanceStatus { get; set; } = TripOps.Data.Enums.AttendanceStatus.Pending;
public string? CheckedBy { get; set; }
public DateTime? CheckedAt { get; set; }
public string? Status { get; set; } = "ACTIVE";
public string? StatusNote { get; set; }
public string? RoommateNote { get; set; }
public string? RestaurantNote { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User? AssignedGuide { get; set; }
}

public class BookingAssignedGuide : BaseEntity<int> {
public int BookingId { get; set; }
public string GuideId { get; set; } = string.Empty;
public string AgencyId { get; set; } = string.Empty;
public string? Role { get; set; } = "lead_guide";
public string? Notes { get; set; }
public DateTime? AssignedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Guide { get; set; } = null!;
}

public class BookingTimeline : BaseEntity<int> {
public int BookingId { get; set; }
public int DayNumber { get; set; }
public string Title { get; set; } = string.Empty;
public string? Description { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual ICollection<BookingTimelineAttraction> Attractions { get; set; } = new List<BookingTimelineAttraction>();
public virtual ICollection<BookingTimelineMeal> Meals { get; set; } = new List<BookingTimelineMeal>();
}

public class BookingTimelineAttraction : BaseEntity<int> {
public int BookingTimelineId { get; set; }
public DateTime? Time { get; set; }
public string? AgencyId { get; set; }
public string OriginalLocationName { get; set; } = string.Empty;
public string? CustomizedLocationName { get; set; }
public bool? IsCustomized { get; set; } = false;
public string? CustomerNote { get; set; }
public decimal? PriceDifference { get; set; } = 0m;
public string? Status { get; set; } = "approved";
public string? AttendanceStatus { get; set; }
public string? GuideId { get; set; }
public virtual BookingTimeline BookingTimeline { get; set; } = null!;
public virtual ICollection<BookingAttractionCheckin> Checkins { get; set; } = new List<BookingAttractionCheckin>();
}

public class BookingTimelineMeal : BaseEntity<int> {
public int? ServiceId { get; set; }
public int BookingTimelineId { get; set; }
public DateTime? DateService { get; set; }
public DateTime? Time { get; set; }
public string MealType { get; set; } = string.Empty;
public string OriginalRestaurantName { get; set; } = string.Empty;
public string? CustomizedRestaurantName { get; set; }
public decimal? PriceDifference { get; set; } = 0m;
public bool IsCustomized { get; set; } = false;
public decimal? TotalPrice { get; set; }
public string? ProviderResponse { get; set; }
public string? Status { get; set; } = "approved";
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual BookingTimeline BookingTimeline { get; set; } = null!;
}

public class BookingAccommodation : BaseEntity<int> {
public int BookingId { get; set; }
public int? ServiceId { get; set; }
public string Destination { get; set; } = string.Empty;
public DateTime? DateFrom { get; set; }
public DateTime? DateTo { get; set; }
public string OriginalHotelName { get; set; } = string.Empty;
public int? OriginalStars { get; set; } = 5;
public string? CustomizedHotelName { get; set; }
public int? CustomizedStars { get; set; }
public string? ProviderResponse { get; set; }
public int? NightsCount { get; set; } = 1;
public decimal? PriceDifference { get; set; } = 0m;
public bool? IsCustomized { get; set; } = false;
public string? Status { get; set; } = "approved";
public decimal? TotalPrice { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
}

public class BookingAttractionCheckin : BaseEntity<int> {
public int BookingTimelineAttractionId { get; set; }
public string GuideId { get; set; } = string.Empty;
public string AgencyId { get; set; } = string.Empty;
public AttractionCheckinStatus? AttendanceStatus { get; set; } = AttractionCheckinStatus.Pending;
public DateTime? CheckinTime { get; set; }
public string? PhotoUrl { get; set; }
public string? Note { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual BookingTimelineAttraction BookingTimelineAttraction { get; set; } = null!;
public virtual User Guide { get; set; } = null!;
}

public class BookingIncident : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public string ReportedBy { get; set; } = string.Empty;
public string? IncidentType { get; set; } = "OTHER";
public string Title { get; set; } = string.Empty;
public string Description { get; set; } = string.Empty;
public IncidentStatus? Status { get; set; } = IncidentStatus.Reported;
public string? EvidenceUrls { get; set; }
public DateTime? ResolvedAt { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Reporter { get; set; } = null!;
}

public class BookingPriceAdjustment : BaseEntity<int> {
public int BookingId { get; set; }
public string? AgencyId { get; set; }
public string AdjustedBy { get; set; } = string.Empty;
public decimal PreviousTotalPrice { get; set; }
public decimal Amount { get; set; }
public decimal NewTotalPrice { get; set; }
public string Reason { get; set; } = string.Empty;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Adjuster { get; set; } = null!;
}

public class BookingAgency : BaseEntity<int> {
public int BookingId { get; set; }
public string AgencyId { get; set; } = string.Empty;
public bool? IsHost { get; set; } = false;
public decimal? OriginalAmount { get; set; } = 0m;
public decimal FinalAmount { get; set; } = 0m;
public decimal? PlatformFee { get; set; } = 0m;
public decimal? NetPayout { get; set; } = 0m;
public SettlementStatus? SettlementStatus { get; set; } = TripOps.Data.Enums.SettlementStatus.Unpaid;
public DateTime? PayoutTransferredAt { get; set; }
public string? BankReferenceCode { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual User Agency { get; set; } = null!;
}
