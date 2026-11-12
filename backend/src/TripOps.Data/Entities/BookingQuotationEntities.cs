using TripOps.Data.Common;

namespace TripOps.Data.Entities;

// One request per selected in-platform service. Replacements remain in the audit trail.
public class BookingSupplierRequest : BaseEntity<int> {
public DateTime? ReplyDeadline { get; set; }
public DateTime? HoldUntil { get; set; }
public decimal? AvailableQuantity { get; set; }
public bool PriceConfirmed { get; set; }
public bool AvailabilityConfirmed { get; set; }
public string ResponseHistoryJson { get; set; } = "[]";

    public int? ParentRequestId { get; set; }
    public string? ParticipantIndicesJson { get; set; }
    public int BookingId { get; set; }
    public int? ServiceId { get; set; }
    public int? AgencySupplierId { get; set; }
    public string? ProviderId { get; set; }
    public string SlotKey { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public DateTime? ServiceDateFrom { get; set; }
    public DateTime? ServiceDateTo { get; set; }
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = string.Empty;
    public decimal EstimatedCost { get; set; }
    public decimal? QuotedCost { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    public virtual Booking Booking { get; set; } = null!;
}

// A new revision is inserted for each costing change. Sent/accepted revisions are immutable.
public class BookingQuotation : BaseEntity<int> {
public DateTime? ValidUntil { get; set; }
public string PlanSnapshotJson { get; set; } = "{}";
public string PaymentPolicy { get; set; } = "Đặt cọc 50% sau khi chấp nhận báo giá.";
public int NumberOfGuests { get; set; }

    public int BookingId { get; set; }
    public int Version { get; set; }
    public int TourId { get; set; }
    public int TourVersion { get; set; }
    public string Status { get; set; } = "Draft";
    public decimal EstimatedSale { get; set; }
    public decimal TotalCost { get; set; }
    public decimal AgencyProfit { get; set; }
    public decimal SaleTotal { get; set; }
    public string LinesJson { get; set; } = "[]";
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SentAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public virtual Booking Booking { get; set; } = null!;
}
