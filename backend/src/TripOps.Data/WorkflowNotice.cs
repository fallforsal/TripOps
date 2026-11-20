using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Data;

/// <summary>Queues cross-actor notices inside the business transaction.</summary>
public static class WorkflowNotice
{
    public static void Queue(TripOpsDbContext db, string? recipientId, string message,
        int? bookingId = null, int? requestId = null, string? actorId = null)
    {
        if (string.IsNullOrWhiteSpace(recipientId) || recipientId == actorId) return;
        db.WorkflowNotifications.Add(new WorkflowNotification
        {
            UserId = recipientId, Message = message, BookingId = bookingId, RequestId = requestId
        });
    }

    public static async Task QueueAdminsAsync(TripOpsDbContext db, string message,
        CancellationToken ct, int? bookingId = null, string? actorId = null)
    {
        var ids = await db.Users.AsNoTracking()
            .Where(u => u.Role == UserRole.Admin && u.Status == UserStatus.Active)
            .Select(u => u.Id).ToArrayAsync(ct);
        foreach (var id in ids) Queue(db, id, message, bookingId, actorId: actorId);
    }
}
