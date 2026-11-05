using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

/// <summary>Tải hợp đồng lữ hành (PDF do hệ thống lập) và bản khách đã ký. Chỉ khách chủ đơn, Agency chủ tour và Admin.</summary>
[ApiController, Authorize, Route("api/v1/files/contracts"), Tags("Media")]
public sealed class ContractFilesController(BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("{bookingId:int}/document")]
    [EndpointSummary("Download the travel contract PDF generated from the approved booking")]
    [Produces("application/pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Document(int bookingId, CancellationToken ct)
    {
        var (content, fileName) = await bookings.ContractPdfFile(Actor, bookingId, ct);
        Response.Headers.CacheControl = "private, no-store";
        return File(content, "application/pdf", fileName);
    }

    [HttpGet("signing/{token}/document"), AllowAnonymous, EnableRateLimiting("contract-signing")]
    [EndpointSummary("Read the contract on the online signing page (unsigned while the session is open, signed copy after completion)")]
    [Produces("application/pdf")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SigningDocument(string token, CancellationToken ct)
    {
        var (content, fileName) = await bookings.SignSessionDocument(token, ct);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers["Referrer-Policy"] = "no-referrer";
        return File(content, "application/pdf", fileName);
    }

    [HttpGet("{bookingId:int}/signed")]
    [EndpointSummary("Download the contract copy signed and uploaded by the customer")]
    [Produces("application/pdf", "image/png", "image/jpeg")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Signed(int bookingId, CancellationToken ct)
    {
        var (content, type, fileName) = await bookings.SignedContractFile(Actor, bookingId, ct);
        Response.Headers.CacheControl = "private, no-store";
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(content, type, fileName);
    }
}
