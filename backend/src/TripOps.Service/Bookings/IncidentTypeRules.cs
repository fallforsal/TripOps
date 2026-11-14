namespace TripOps.Service.Bookings;

/// <summary>Canonical incident categories shared by the Guide API and Agency UI.</summary>
public static class IncidentTypeRules
{
    public static readonly IReadOnlyList<string> Allowed = [
        "HEALTH", "VEHICLE", "WEATHER", "CUSTOMER",
        "SECURITY", "SERVICE_PROVIDER", "SCHEDULE", "OTHER"
    ];

    private static readonly HashSet<string> Values = new(Allowed, StringComparer.Ordinal);

    public static bool IsAllowed(string? incidentType) =>
        !string.IsNullOrWhiteSpace(incidentType) &&
        Values.Contains(incidentType.Trim().ToUpperInvariant());
}
