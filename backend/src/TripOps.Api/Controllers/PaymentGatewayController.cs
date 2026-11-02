using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Api.Controllers;

/// <summary>
/// Điểm nhận kết quả từ VNPAY (sandbox). Không cần đăng nhập vì VNPAY/trình duyệt gọi vào;
/// mọi dữ liệu đều được kiểm tra chữ ký HMAC-SHA512 bằng HashSecret trước khi xử lý.
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/payments/vnpay")]
[Tags("Payments")]
public sealed class PaymentGatewayController(BookingService bookings, VnPayOptions options, ILogger<PaymentGatewayController> logger) : ControllerBase
{
    private List<KeyValuePair<string, string>> Query() =>
        Request.Query.Select(q => new KeyValuePair<string, string>(q.Key, q.Value.ToString())).ToList();

    /// <summary>IPN: VNPAY gọi server-to-server (cần URL public, ví dụ qua ngrok, khai báo trên cổng merchant sandbox).</summary>
    [HttpGet("ipn")]
    [EndpointSummary("VNPAY IPN callback: verify signature and confirm the deposit transaction idempotently")]
    [ProducesResponseType<VnPayIpnResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Ipn(CancellationToken ct)
    {
        try
        {
            var result = await bookings.ConfirmVnPay(Query(), ct);
            return Ok(new VnPayIpnResponse(result.RspCode, result.Message));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "VNPAY IPN processing failed");
            return Ok(new VnPayIpnResponse("99", "Unknown error"));
        }
    }

    /// <summary>
    /// Return URL: trình duyệt của khách quay về đây. Dữ liệu cũng đã được VNPAY ký nên được xác nhận như IPN
    /// (idempotent) — cần thiết khi chạy localhost mà VNPAY không gọi được IPN. Sau đó chuyển về trang đơn trên FE.
    /// </summary>
    [HttpGet("return")]
    [EndpointSummary("VNPAY return URL: verify the result and redirect the customer back to the booking page")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    public async Task<IActionResult> Return(CancellationToken ct)
    {
        VnPayConfirmation result;
        try { result = await bookings.ConfirmVnPay(Query(), ct); }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogError(exception, "VNPAY return processing failed");
            result = new VnPayConfirmation("99", "Unknown error", null, null);
        }

        var outcome = result.Outcome ?? (result.RspCode == "97" ? "invalid" : "error");
        var baseUrl = string.IsNullOrWhiteSpace(options.FrontendBaseUrl) ? "/" : options.FrontendBaseUrl.TrimEnd('/') + "/";
        var route = result.BookingId is int bookingId ? $"#/my-bookings/{bookingId}" : "#/my-bookings";
        return Redirect($"{baseUrl}{route}?payment={outcome}");
    }
}
