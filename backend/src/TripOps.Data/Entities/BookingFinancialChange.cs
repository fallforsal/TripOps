using TripOps.Data.Common;
namespace TripOps.Data.Entities;

public class BookingFinancialChange : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string AgencyId { get; set; } = "";
    public string RequestedBy { get; set; } = "";
    public Guid RequestKey { get; set; }
    public decimal Amount { get; set; }
    public string Reason { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? ReviewedBy { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public int? RefundRequestId { get; set; }
    public virtual RefundRequest? RefundRequest { get; set; }
}
