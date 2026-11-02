using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Diagnostics;

namespace TripOps.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
[Tags("Health")]
public sealed class HealthController(ISystemStatusService status) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Check API liveness; this does not verify database readiness")]
    [ProducesResponseType<SystemStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<SystemStatusResponse> Get() => Ok(status.GetStatus());
}
