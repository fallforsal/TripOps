using TripOps.Data.Common;
namespace TripOps.Data.Entities;

public class TourDesignRequestAgency : BaseEntity<int>
{
    public int TourDesignRequestId { get; set; }
    public string AgencyId { get; set; } = "";
    public string StageArea { get; set; } = "";
    public bool IsHost { get; set; }
    public decimal? SuggestedBudget { get; set; }
    public string? CommunicationNotes { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    public DateTime? ArchivedAt { get; set; }
    public TourDesignRequest TourDesignRequest { get; set; } = null!;
    public User Agency { get; set; } = null!;
}
