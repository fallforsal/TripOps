using TripOps.Data.Common;
namespace TripOps.Data.Entities;

public class TourVersionAgency : BaseEntity<int>
{
    public int TourVersionId { get; set; }
    public string AgencyId { get; set; } = "";
    public bool IsHost { get; set; }
    public string Status { get; set; } = "pending";
    public string StageArea { get; set; } = "";
    public decimal? SuggestedBudget { get; set; }
    public string? CommunicationNotes { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }
    public TourVersion TourVersion { get; set; } = null!;
    public User Agency { get; set; } = null!;
}
