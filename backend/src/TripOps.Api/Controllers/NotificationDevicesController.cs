using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;

namespace TripOps.Api.Controllers;

public sealed record NotificationDeviceRegistration(
    [Required, StringLength(512, MinimumLength = 16)] string Token,
    [Required, AllowedValues("android", "ios")] string Platform);

[ApiController, Authorize(Roles = "guide"), Route("api/v1/notifications/devices"), Tags("Notifications")]
public sealed class NotificationDevicesController(TripOpsDbContext db) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Register or refresh this authenticated guide's own Firebase token.</summary>
    [HttpPost]
    public async Task<IActionResult> Register(NotificationDeviceRegistration input, CancellationToken ct)
    {
        var token = input.Token.Trim();
        if (token.Length < 16 || token.Length > 512) return BadRequest();
        var existing = await db.NotificationDeviceTokens.SingleOrDefaultAsync(t => t.Token == token, ct);
        if (existing is null)
        {
            db.NotificationDeviceTokens.Add(new NotificationDeviceToken
            {
                UserId = Actor, Token = token, Platform = input.Platform,
                CreatedAt = DateTime.UtcNow, LastSeenAt = DateTime.UtcNow
            });
        }
        else
        {
            // A shared device must never continue receiving the previous guide's messages.
            existing.UserId = Actor;
            existing.Platform = input.Platform;
            existing.LastSeenAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Remove this device's registration on sign-out.</summary>
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] NotificationDeviceRegistration input, CancellationToken ct)
    {
        await db.NotificationDeviceTokens
            .Where(t => t.UserId == Actor && t.Token == input.Token.Trim())
            .ExecuteDeleteAsync(ct);
        return NoContent();
    }
}
