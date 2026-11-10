using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
namespace TripOps.Service.Notifications;
public sealed class WorkflowNotificationService(TripOpsDbContext db)
{
    public async Task<IReadOnlyList<WorkflowNotification>> List(string actor, CancellationToken ct) =>
        await db.WorkflowNotifications.AsNoTracking().Where(n => n.UserId == actor)
            .OrderByDescending(n => n.CreatedAt).Take(100).ToListAsync(ct);
    public async Task<bool> Read(string actor, int id, CancellationToken ct)
    {
        var n = await db.WorkflowNotifications.SingleOrDefaultAsync(n => n.Id == id && n.UserId == actor, ct);
        if (n is null) return false;
        n.ReadAt ??= DateTime.UtcNow; await db.SaveChangesAsync(ct); return true;
    }
}
