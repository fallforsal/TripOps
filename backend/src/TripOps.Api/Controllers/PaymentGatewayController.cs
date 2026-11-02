using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Api.Controllers;

/// <summary>
/// Điểm nhận từ payOS. Không cần đăng nhập vì payOS/trình duyệt gọi vào:
/// - webhook: chỉ xử lý khi chữ ký HMAC-SHA256 (Checksum Key) hợp lệ;
/// - return: CHỈ chuyển hướng về trang đơn, không đổi dữ liệu (tham số trên URL không phải bằng chứng đã trả tiền).
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/payments/payos")]
[Tags("Payments")]
public sealed class PaymentGatewayController(BookingService bookings, PayOsGateway payOs, ILogger<PaymentGatewayController> logger) : ControllerBase
{
    /// <summary>
    /// Webhook payOS (cần URL public khi triển khai thật; chạy localhost thì dùng tra cứu trạng thái thay thế).
    /// Trả 2xx để payOS không gửi lại; dữ liệu sai chữ ký bị bỏ qua.
    /// </summary>
    [HttpPost("webhook")]
    [EndpointSummary("payOS webhook: verify the signature and confirm the payment through the shared idempotent handler")]
    [ProducesResponseType<PayOsWebhookAckDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Webhook([FromBody] JsonElement body, CancellationToken ct)
    {
        var data = payOs.VerifyWebhook(body);
        if (data is null)
        {
            logger.LogWarning("Rejected payOS webhook with invalid signature or payload");
            return Ok(new PayOsWebhookAckDto(false, "invalid_signature"));
        }
        try
        {
            return Ok(new PayOsWebhookAckDto(true, await bookings.ApplyPayOsWebhook(data, ct)));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            // Lỗi tạm thời (DB...): trả 500 để payOS gửi lại sau.
            logger.LogError(exception, "payOS webhook processing failed for order {OrderCode}", data.OrderCode);
            return StatusCode(StatusCodes.Status500InternalServerError, new PayOsWebhookAckDto(false, "error"));
        }
    }

    /// <summary>returnUrl/cancelUrl: chuyển khách về trang chi tiết đơn, FE sẽ gọi backend tra cứu payOS.</summary>
    [HttpGet("return")]
    [EndpointSummary("payOS return/cancel URL: redirect the customer to the booking page, which then asks the server to verify")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> Return([FromQuery] string? orderCode, CancellationToken ct)
    {
        int? bookingId = null;
        if (long.TryParse(orderCode, NumberStyles.None, CultureInfo.InvariantCulture, out var code))
            bookingId = await bookings.BookingIdForPayOsOrder(code, ct);
        var frontend = payOs.Options.FrontendBaseUrl;
        var baseUrl = string.IsNullOrWhiteSpace(frontend) ? "/" : frontend.TrimEnd('/') + "/";
        return Redirect(bookingId is int id ? $"{baseUrl}#/my-bookings/{id}/payos" : $"{baseUrl}#/my-bookings");
    }
}
