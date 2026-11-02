using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Services;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/services")]
[Tags("Service Moderation")]
public sealed class AdminServicesController(ServiceModerationService services) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List all Provider service posts with status, category, search and pagination")]
    [ProducesResponseType<AdminServicePage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] AdminServiceQuery query, CancellationToken ct) =>
        Ok(await services.List(query, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Read the full service post and Provider contact details for moderation")]
    [ProducesResponseType<AdminServiceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await services.Get(id, ct));

    [HttpPost("{id:int}/approve")]
    [EndpointSummary("Approve a pending or rejected service post and clear previous moderation reasons")]
    [ProducesResponseType<ServiceModerationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Approve(int id, CancellationToken ct) => Ok(await services.Approve(id, ct));

    [HttpPost("{id:int}/reject")]
    [EndpointSummary("Reject a pending service post with a required rejection reason")]
    [ProducesResponseType<ServiceModerationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(int id, RejectServiceRequest request, CancellationToken ct) =>
        Ok(await services.Reject(id, request, ct));

    [HttpPost("{id:int}/toggle-hide")]
    [EndpointSummary("Hide an approved post with a reason, or unhide a hidden post")]
    [ProducesResponseType<ServiceModerationResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ToggleHide(int id, ToggleServiceVisibilityRequest request, CancellationToken ct) =>
        Ok(await services.ToggleHide(id, request, ct));
}
