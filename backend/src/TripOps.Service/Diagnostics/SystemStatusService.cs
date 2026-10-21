using TripOps.Data;

namespace TripOps.Service.Diagnostics;

public interface ISystemStatusService
{
    SystemStatusResponse GetStatus();
}

public sealed class SystemStatusService(DataConfiguration configuration) : ISystemStatusService
{
    public SystemStatusResponse GetStatus() => new(
        "ok", "TripOps.Api",
        configuration.IsConfigured ? "configured_not_checked" : "not_configured",
        "api_liveness_only", DateTimeOffset.UtcNow);
}
