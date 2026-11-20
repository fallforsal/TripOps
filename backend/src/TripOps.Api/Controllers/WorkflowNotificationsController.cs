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
    [HttpGet("unread-count"), EndpointSummary("Unread workflow notifications for the signed-in user")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct) =>
        Ok(new { count = await notifications.UnreadCount(Actor, ct) });

    [HttpPost("read-all"), EndpointSummary("Mark all owned workflow notifications as read")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        await notifications.ReadAll(Actor, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/read"), EndpointSummary("Mark an owned notification as read")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Read(int id, CancellationToken ct) =>
        await notifications.Read(Actor, id, ct) ? NoContent() : NotFound();
}
