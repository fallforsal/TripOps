using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Settlements;

namespace TripOps.Api.Controllers;

/// <summary>
/// Admin quyết toán tiền cho Agency sau khi tour hoàn thành: tự động (tác vụ chạy ngầm) và thủ công.
/// Chi hộ payOS là TIỀN THẬT.
/// </summary>
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/settlements")]
[Tags("Settlements")]
public sealed class AdminSettlementsController(AgencySettlementService settlements) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List agency settlements of completed tours; filter by status Ready, Processing, Paid, Failed or OnHold")]
    [ProducesResponseType<IReadOnlyList<SettlementDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null) =>
        Ok(await settlements.List(status, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get one agency settlement with the reasons it cannot be paid yet")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await settlements.Get(id, ct));

    [HttpPost("{id:int}/payout")]
    [EndpointSummary("Pay the agency now through payOS payout (real money)")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Payout(int id, SettlementPayoutRequest request, CancellationToken ct) =>
        Ok(await settlements.PayoutNow(Actor, id, request, ct));

    [HttpPost("{id:int}/payout/sync")]
    [EndpointSummary("Ask payOS for the real state of the running settlement payout and apply it")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> Sync(int id, CancellationToken ct) => Ok(await settlements.Sync(id, ct));

    [HttpPost("{id:int}/manual")]
    [EndpointSummary("Record a bank transfer the admin made by hand and mark the settlement paid")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Manual(int id, SettlementManualRequest request, CancellationToken ct) =>
        Ok(await settlements.RecordManual(Actor, id, request, ct));

    [HttpPost("{id:int}/hold")]
    [EndpointSummary("Hold the settlement so automatic payout skips it")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Hold(int id, SettlementHoldRequest request, CancellationToken ct) =>
        Ok(await settlements.Hold(Actor, id, request, ct));

    [HttpPost("{id:int}/release")]
    [EndpointSummary("Release a held settlement back to waiting for payout")]
    [ProducesResponseType<SettlementDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Release(int id, CancellationToken ct) => Ok(await settlements.Release(Actor, id, ct));

    [HttpPost("run")]
    [EndpointSummary("Run the automatic settlement pass now (same rules as the background job)")]
    [ProducesResponseType<SettlementRunResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Run(CancellationToken ct) => Ok(await settlements.RunDue(ct));
}

/// <summary>Admin cấu hình tài khoản ngân hàng của sàn và phí sàn (trang "STK Sàn").</summary>
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/platform-bank-account")]
[Tags("Settlements")]
public sealed class AdminPlatformAccountController(AgencySettlementService settlements) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("Get the platform bank account and the current platform fee percent")]
    [ProducesResponseType<PlatformBankAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await settlements.GetPlatformAccount(ct));

    [HttpPut]
    [EndpointSummary("Save the platform bank account; a changed fee percent applies to tours completed from now on")]
    [ProducesResponseType<PlatformBankAccountDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Save(PlatformBankAccountInput request, CancellationToken ct) =>
        Ok(await settlements.SavePlatformAccount(Actor, request, ct));
}

/// <summary>Agency nhập tài khoản nhận tiền và theo dõi các khoản quyết toán của mình.</summary>
[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency")]
[Tags("Settlements")]
public sealed class AgencySettlementsController(AgencySettlementService settlements) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("payout-account")]
    [EndpointSummary("Get the bank account that receives settlement payouts")]
    [ProducesResponseType<AgencyPayoutAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAccount(CancellationToken ct) => Ok(await settlements.GetAccount(Actor, ct));

    [HttpPut("payout-account")]
    [EndpointSummary("Set the bank account that receives settlement payouts")]
    [ProducesResponseType<AgencyPayoutAccountDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> SetAccount(PayoutAccountInput request, CancellationToken ct) =>
        Ok(await settlements.SetAccount(Actor, request, ct));

    [HttpGet("settlements")]
    [EndpointSummary("List this agency's settlements of completed tours")]
    [ProducesResponseType<IReadOnlyList<SettlementDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await settlements.AgencySettlements(Actor, ct));
}
