using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

/// <summary>
/// Admin xử lý yêu cầu hủy/hoàn tiền. Đơn chỉ bị hủy khi Admin duyệt. Tiền hoàn hiện chuyển khoản thủ công:
/// Admin chuyển xong rồi nhập mã giao dịch ngân hàng để hệ thống ghi nhận.
/// </summary>
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/refunds")]
[Tags("Refunds")]
public sealed class AdminRefundsController(BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List cancellation/refund requests (pending first); filter by status Pending, Completed or Rejected")]
    [ProducesResponseType<IReadOnlyList<AdminRefundDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null) =>
        Ok(await bookings.ListRefunds(status, ct));

    [HttpPost("{id:int}/approve")]
    [EndpointSummary("Approve: record the refund bank transfer (if any) and cancel the booking")]
    [ProducesResponseType<AdminRefundDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Approve(int id, RefundApprovalRequest request, CancellationToken ct) =>
        Ok(await bookings.ApproveRefund(Actor, id, request, ct));

    [HttpGet("payout-account")]
    [EndpointSummary("payOS payout channel status and current balance")]
    [ProducesResponseType<PayoutAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> PayoutAccount(CancellationToken ct) =>
        Ok(await bookings.PayoutAccount(ct));

    [HttpPost("{id:int}/payout")]
    [EndpointSummary("Approve and send the refund automatically through payOS payout; the booking is cancelled when payOS reports success")]
    [ProducesResponseType<AdminRefundDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Payout(int id, RefundPayoutRequest request, CancellationToken ct) =>
        Ok(await bookings.PayoutRefund(Actor, id, request, ct));

    [HttpPost("{id:int}/payout/sync")]
    [EndpointSummary("Ask payOS for the real state of the running payout and apply it")]
    [ProducesResponseType<AdminRefundDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> SyncPayout(int id, CancellationToken ct) =>
        Ok(await bookings.SyncPayout(id, ct));

    [HttpPost("{id:int}/reject")]
    [EndpointSummary("Reject the cancellation request; the booking stays as it was")]
    [ProducesResponseType<AdminRefundDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Reject(int id, RefundRejectionRequest request, CancellationToken ct) =>
        Ok(await bookings.RejectRefund(Actor, id, request, ct));
}
