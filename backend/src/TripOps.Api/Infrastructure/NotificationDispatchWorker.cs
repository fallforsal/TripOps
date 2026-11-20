using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TripOps.Api.Hubs;
using TripOps.Data;

namespace TripOps.Api.Infrastructure;

/// <summary>
/// Transaction-safe notification outbox. Each notification is persisted first,
/// then leased atomically across instances before SignalR and FCM delivery.
/// Polling remains a fallback if a device disconnects or push is disabled.
/// </summary>
public sealed class NotificationDispatchWorker(
    IServiceScopeFactory scopes, IHubContext<NotificationHub> hub,
    INotificationPushGateway push, ILogger<NotificationDispatchWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(2));
        try
        {
            do
            {
                try { await DispatchBatch(stoppingToken); }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
                catch (Exception ex) { logger.LogWarning(ex, "Notification dispatch attempt failed"); }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }

    private async Task DispatchBatch(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var now = DateTime.UtcNow;
        var ids = await db.WorkflowNotifications.AsNoTracking()
            .Where(n => n.DispatchedAt == null && n.DispatchAttempts < 12 &&
                (n.DispatchClaimedUntil == null || n.DispatchClaimedUntil < now))
            .OrderBy(n => n.Id).Select(n => n.Id).Take(40).ToArrayAsync(ct);

        foreach (var id in ids)
        {
            var claimTime = DateTime.UtcNow;
            var claimed = await db.WorkflowNotifications
                .Where(n => n.Id == id && n.DispatchedAt == null && n.DispatchAttempts < 12 &&
                    (n.DispatchClaimedUntil == null || n.DispatchClaimedUntil < claimTime))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(n => n.DispatchClaimedUntil, claimTime.AddMinutes(3))
                    .SetProperty(n => n.DispatchAttempts, n => n.DispatchAttempts + 1), ct);
            if (claimed != 1) continue;

            var notification = await db.WorkflowNotifications.AsNoTracking()
                .SingleAsync(n => n.Id == id, ct);
            try
            {
                // Notify only the owner. The payload is a hint; the client reloads
                // protected notifications from the API rather than trusting a push.
                await hub.Clients.User(notification.UserId).SendAsync("NotificationCreated",
                    new { notification.Id, notification.BookingId, notification.RequestId }, ct);

                if (push.Enabled)
                {
                    var minSeen = DateTime.UtcNow.AddDays(-60);
                    var devices = await db.NotificationDeviceTokens.AsNoTracking()
                        .Where(t => t.UserId == notification.UserId && t.LastSeenAt >= minSeen)
                        .ToListAsync(ct);
                    foreach (var device in devices)
                    {
                        var valid = await push.SendAsync(device, notification, ct);
                        if (!valid)
                            await db.NotificationDeviceTokens.Where(t => t.Id == device.Id).ExecuteDeleteAsync(ct);
                    }
                }
                await db.WorkflowNotifications.Where(n => n.Id == id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(n => n.DispatchedAt, DateTime.UtcNow)
                        .SetProperty(n => n.DispatchClaimedUntil, (DateTime?)null), ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex)
            {
                // Back off instead of exhausting attempts in a few seconds
                // when Firebase credentials or the network are unavailable.
                logger.LogWarning(ex, "Notification {NotificationId} delivery failed (will retry)", id);
                var seconds = Math.Min(1800, Math.Pow(2, Math.Min(notification.DispatchAttempts, 9)) * 3);
                var retryAt = DateTime.UtcNow.AddSeconds(seconds);
                await db.WorkflowNotifications.Where(n => n.Id == id)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(n => n.DispatchClaimedUntil, retryAt), ct);
            }
        }
    }
}
