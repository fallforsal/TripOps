using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Data.Entities;
using TripOps.Service.Notifications;
namespace TripOps.Api.Controllers;
[ApiController, Authorize, Route("api/v1/notifications"), Tags("Notifications")]
public sealed class WorkflowNotificationsController(WorkflowNotificationService notifications) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet, EndpointSummary("List the signed-in user's workflow notifications")]
    [ProducesResponseType<IReadOnlyList<WorkflowNotification>>(200)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await notifications.List(Actor, ct));
    [HttpPost("{id:int}/read"), EndpointSummary("Mark an owned notification as read")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Read(int id, CancellationToken ct) =>
        await notifications.Read(Actor, id, ct) ? NoContent() : NotFound();
}
