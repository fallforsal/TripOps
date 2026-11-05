using TripOps.Data.Common;

namespace TripOps.Data.Entities;

// Customer-owned working copy. Agency tours and published tour versions are never mutated here.
public class TourPlanProposal : BaseEntity<int>
{
    public int RequestId { get; set; }
    public int TourId { get; set; }
    public string CustomerId { get; set; } = string.Empty;
    public string AgencyId { get; set; } = string.Empty;
    public int BaseTourVersion { get; set; }
    public string ProposalJson { get; set; } = "{}";
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string? AgencyReply { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
}
