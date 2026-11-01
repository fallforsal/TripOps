using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;

namespace TripOps.Api.Controllers;

public sealed record BookingNotificationDto(int Id, int BookingId, string BookingCode, int Version,
    string EventType, string? Message, DateTime CreatedAt, DateTime? ReadAt);
public sealed record BookingNotificationFeed(IReadOnlyList<BookingNotificationDto> Items, int UnreadCount);

[ApiController, Authorize, Route("api/v1/me/booking-notifications"), Tags("Booking Management")]
public sealed class BookingNotificationsController(TripOpsDbContext db) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("Get the current user's booking proposal notifications")]
    [ProducesResponseType<BookingNotificationFeed>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var query = db.BookingProposalEvents.AsNoTracking().Where(e => e.RecipientId == Actor);
        var unread = await query.CountAsync(e => e.ReadAt == null, ct);
        var rows = await query.OrderByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id).Take(50)
            .Select(e => new BookingNotificationDto(e.Id, e.Snapshot.BookingId, e.Snapshot.Booking.BookingCode,
                e.Snapshot.Version, e.EventType, e.Message, e.CreatedAt, e.ReadAt)).ToListAsync(ct);
        return Ok(new BookingNotificationFeed(rows.Select(e => e with {
            CreatedAt = DateTime.SpecifyKind(e.CreatedAt, DateTimeKind.Utc),
            ReadAt = e.ReadAt is { } at ? DateTime.SpecifyKind(at, DateTimeKind.Utc) : null }).ToList(), unread));
    }

    [HttpPost("{notificationId:int}/read")]
    [EndpointSummary("Mark one of the current user's booking notifications as read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead(int notificationId, CancellationToken ct)
    {
        var item = await db.BookingProposalEvents.SingleOrDefaultAsync(e => e.Id == notificationId && e.RecipientId == Actor, ct);
        if (item is null) return NotFound();
        item.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
