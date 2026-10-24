using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class Booking : BaseEntity<int>, ISoftDelete
{
    public string CustomerId { get; set; } = null!;
    public int? TourId { get; set; }
    public string BookingCode { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalGuests { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? SpecialRequests { get; set; }

    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public virtual User Customer { get; set; } = null!;
    public virtual Tour? Tour { get; set; }
    public virtual ICollection<BookingParticipant> Participants { get; set; } = new List<BookingParticipant>();
    public virtual ICollection<BookingAssignedGuide> AssignedGuides { get; set; } = new List<BookingAssignedGuide>();
    public virtual ICollection<BookingTimeline> Timelines { get; set; } = new List<BookingTimeline>();
    public virtual ICollection<BookingAccommodation> Accommodations { get; set; } = new List<BookingAccommodation>();
    public virtual ICollection<BookingAgency> BookingAgencies { get; set; } = new List<BookingAgency>();
    public virtual ICollection<BookingPriceAdjustment> PriceAdjustments { get; set; } = new List<BookingPriceAdjustment>();
    public virtual ICollection<BookingIncident> Incidents { get; set; } = new List<BookingIncident>();
}

public class BookingParticipant : BaseEntity<int>
{
    public int BookingId { get; set; }
    public int? AssignedGuideId { get; set; }
    public string FullName { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? IdentityNumber { get; set; }
    public AttendanceStatus AttendanceStatus { get; set; } = AttendanceStatus.Pending;
    public string Status { get; set; } = "ACTIVE";
    public string? StatusNote { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual BookingAssignedGuide? AssignedGuide { get; set; }
}

public class BookingAssignedGuide : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string GuideId { get; set; } = null!;
    public string? Role { get; set; } // Lead, Assistant
    public string Status { get; set; } = "ASSIGNED";
    public string? Notes { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Guide { get; set; } = null!;
    public virtual ICollection<BookingParticipant> Participants { get; set; } = new List<BookingParticipant>();
}

public class BookingTimeline : BaseEntity<int>
{
    public int BookingId { get; set; }
    public int DayNumber { get; set; }
    public DateTime Date { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual ICollection<BookingTimelineAttraction> Attractions { get; set; } = new List<BookingTimelineAttraction>();
    public virtual ICollection<BookingTimelineMeal> Meals { get; set; } = new List<BookingTimelineMeal>();
}

public class BookingTimelineAttraction : BaseEntity<int>
{
    public int BookingTimelineId { get; set; }
    public int? ServiceId { get; set; }
    public string Name { get; set; } = null!;
    public TimeSpan? EstimatedTime { get; set; }
    public int OrderIndex { get; set; }
    public string Status { get; set; } = "approved";

    public virtual BookingTimeline BookingTimeline { get; set; } = null!;
    public virtual Service? Service { get; set; }
    public virtual ICollection<BookingAttractionCheckin> Checkins { get; set; } = new List<BookingAttractionCheckin>();
}

public class BookingTimelineMeal : BaseEntity<int>
{
    public int BookingTimelineId { get; set; }
    public int? ServiceId { get; set; }
    public string MealType { get; set; } = null!;
    public decimal? Cost { get; set; }
    public string Status { get; set; } = "approved";

    public virtual BookingTimeline BookingTimeline { get; set; } = null!;
    public virtual Service? Service { get; set; }
}

public class BookingAccommodation : BaseEntity<int>
{
    public int BookingId { get; set; }
    public int? ServiceId { get; set; }
    public string? HotelName { get; set; }
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public string Status { get; set; } = "approved";

    public virtual Booking Booking { get; set; } = null!;
    public virtual Service? Service { get; set; }
}

public class BookingAttractionCheckin : BaseEntity<int>
{
    public int BookingTimelineAttractionId { get; set; }
    public string GuideId { get; set; } = null!;
    public string? AgencyId { get; set; }
    public AttractionCheckinStatus AttendanceStatus { get; set; } = AttractionCheckinStatus.Pending;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Note { get; set; }
    public DateTime? CheckinTime { get; set; }

    public virtual BookingTimelineAttraction BookingTimelineAttraction { get; set; } = null!;
    public virtual User Guide { get; set; } = null!;
}

public class BookingIncident : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string ReportedBy { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public IncidentStatus Status { get; set; } = IncidentStatus.Reported;
    public string? ResolutionNotes { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Reporter { get; set; } = null!;
}

public class BookingPriceAdjustment : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string Reason { get; set; } = null!;
    public decimal Amount { get; set; }
    public string AdjustedBy { get; set; } = null!;

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Adjuster { get; set; } = null!;
}

public class BookingAgency : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string AgencyId { get; set; } = null!;
    public string Role { get; set; } = "HOST"; // HOST, PARTNER
    public decimal AgreedAmount { get; set; }
    public decimal PlatformFee { get; set; }
    public decimal NetPayout { get; set; }
    public SettlementStatus SettlementStatus { get; set; } = SettlementStatus.Unpaid;

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Agency { get; set; } = null!;
}
