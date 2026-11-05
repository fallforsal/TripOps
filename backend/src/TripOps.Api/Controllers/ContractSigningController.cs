using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

/// <summary>
/// Trang ký hợp đồng trực tuyến (mở từ mã QR trên điện thoại hoặc ngay trên máy tính). Không cần đăng nhập:
/// quyền ký dựa trên mã phiên một lần (15 phút) + OTP gửi về email tài khoản khách.
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/contract-signing/{token}"), EnableRateLimiting("contract-signing")]
[Tags("Booking Management")]
public sealed class ContractSigningController(BookingService bookings) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Read the signing session: contract number, version, tour and masked email")]
    [ProducesResponseType<SignSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string token, CancellationToken ct) =>
        Ok(await bookings.SignSessionInfo(token, ct));

    [HttpPost("otp")]
    [EndpointSummary("Send a 6-digit OTP (valid 5 minutes) to the customer's account email")]
    [ProducesResponseType<SignSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SendOtp(string token, CancellationToken ct) =>
        Ok(await bookings.SendSignOtp(token, ct));

    [HttpPost("sign")]
    [EndpointSummary("Confirm the signature with the OTP; the server stamps the signature into the PDF and stores it")]
    [ProducesResponseType<SignSessionDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Sign(string token, WebSignRequest request, CancellationToken ct) =>
        Ok(await bookings.CompleteWebSign(token, request, HttpContext.Connection.RemoteIpAddress?.ToString(),
            Request.Headers.UserAgent.ToString(), ct));
}
