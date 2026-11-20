using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using TripOps.Data.Entities;

namespace TripOps.Api.Infrastructure;

public interface INotificationPushGateway
{
    bool Enabled { get; }
    Task<bool> SendAsync(NotificationDeviceToken device, WorkflowNotification notification, CancellationToken ct);
}

/// <summary>Firebase Cloud Messaging HTTP v1. Uses ADC, never a hard-coded service account.</summary>
public sealed class FcmPushGateway(
    HttpClient http, IConfiguration config, ILogger<FcmPushGateway> logger) : INotificationPushGateway
{
    private const string Scope = "https://www.googleapis.com/auth/firebase.messaging";
    private readonly string _projectId = config["Firebase:ProjectId"]?.Trim() ?? "";
    private readonly SemaphoreSlim _credentialLock = new(1, 1);
    private GoogleCredential? _credential;

    public bool Enabled => !string.IsNullOrWhiteSpace(_projectId);

    private async Task<string> AccessToken(CancellationToken ct)
    {
        if (_credential is null)
        {
            await _credentialLock.WaitAsync(ct);
            try
            {
                _credential ??= (await GoogleCredential.GetApplicationDefaultAsync(ct))
                    .CreateScoped(Scope);
            }
            finally { _credentialLock.Release(); }
        }
        return await _credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: ct);
    }

    /// <returns>False if the token is permanently invalid and should be removed.</returns>
    public async Task<bool> SendAsync(NotificationDeviceToken device, WorkflowNotification notification, CancellationToken ct)
    {
        if (!Enabled) return true;
        var uri = $"https://fcm.googleapis.com/v1/projects/{Uri.EscapeDataString(_projectId)}/messages:send";
        var payload = new
        {
            message = new
            {
                token = device.Token,
                // Avoid showing potentially sensitive incident/customer details
                // on the lock screen; authenticated inbox displays full content.
                notification = new { title = "TripOps", body = "Bạn có thông báo mới. Mở ứng dụng để xem chi tiết." },
                data = new Dictionary<string, string>
                {
                    ["notificationId"] = notification.Id.ToString(),
                    ["bookingId"] = notification.BookingId?.ToString() ?? "",
                    ["requestId"] = notification.RequestId?.ToString() ?? ""
                },
                android = new { priority = "high" }
            }
        };
        using var request = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await AccessToken(ct));
        using var response = await http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return true;
        var body = await response.Content.ReadAsStringAsync(ct);
        if (body.Contains("UNREGISTERED", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation("Deleting invalid FCM device registration id {DeviceId}", device.Id);
            return false;
        }
        // No logging of token or response body (may contain sensitive diagnostics).
        throw new HttpRequestException($"FCM HTTP {(int)response.StatusCode} for push registration {device.Id}",
            null, response.StatusCode);
    }
}
