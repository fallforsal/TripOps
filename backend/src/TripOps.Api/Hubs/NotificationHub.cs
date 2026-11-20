using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TripOps.Api.Hubs;

/// <summary>Server-to-user event channel; client cannot subscribe to other users.</summary>
[Authorize]
public sealed class NotificationHub : Hub
{
    // Default SignalR UserIdentifier is the authenticated NameIdentifier claim.
    // No arbitrary group joining or client-generated notification methods.
}
