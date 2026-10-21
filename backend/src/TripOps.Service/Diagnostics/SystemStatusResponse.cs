namespace TripOps.Service.Diagnostics;

// Public response DTO; future business DTOs are separate from EF models.
public sealed record SystemStatusResponse(
    string Status, string Application, string Database, string Scope, DateTimeOffset TimestampUtc);
