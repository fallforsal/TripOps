using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Refunds;

namespace TripOps.Api.Controllers;

/// <summary>
/// Agency chủ trì xem (chỉ đọc) lịch sử và chi tiết các yêu cầu hủy/hoàn tiền của khách trong các booking mình chủ trì
/// (UC-068 View Refund History, UC-069 View Refund Details). Duyệt/từ chối hoàn tiền vẫn do Admin thực hiện.
/// </summary>
[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/refunds")]
[Tags("Refunds")]
public sealed class AgencyRefundsController(AgencyRefundsService refunds) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List this agency's own refund requests (bookings it hosts); filter by status, date range or search text")]
    [ProducesResponseType<IReadOnlyList<AgencyRefundDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, DateTime? from = null, DateTime? to = null, string? search = null) =>
        Ok(await refunds.List(Actor, status, from, to, search, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get one refund request's detail, scoped to this agency's hosted bookings")]
    [ProducesResponseType<AgencyRefundDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await refunds.Get(Actor, id, ct));
}
