namespace TripOps.Data.Entities;

public sealed class GuideProfile
{
    public string UserId { get; set; } = string.Empty;
    public short ExperienceYears { get; set; }
    public string Languages { get; set; } = "[]";
    public string Routes { get; set; } = "[]";
    public string Specialties { get; set; } = "[]";
    public string? Bio { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspendedReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}
