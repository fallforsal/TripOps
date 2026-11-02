using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Diagnostics;

namespace TripOps.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController(ISystemStatusService status) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<SystemStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<SystemStatusResponse> Get() => Ok(status.GetStatus());
}
