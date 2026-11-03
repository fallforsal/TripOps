using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
