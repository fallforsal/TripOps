using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Accounts;
using TripOps.Service.Guides;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/guides")]
[Tags("Agency Guides")]
public sealed class AgencyGuidesController(AccountService accounts, AgencyGuideService guides) : ControllerBase
{
    private string AgencyId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List the Agency workforce with search, work status and pagination")]
    public async Task<ActionResult<GuidePage>> List(CancellationToken ct, string? search = null,
        string? mobileAccountStatus = null, string? workStatus = null, int page = 1, int pageSize = 20)
        => Ok(await guides.List(AgencyId, search, mobileAccountStatus, workStatus, page, pageSize, ct));

    [HttpGet("{guideId}")]
    [EndpointSummary("Get an owned guide profile, eligibility and assignment history")]
    public async Task<ActionResult<GuideDetailDto>> Detail(string guideId, CancellationToken ct)
        => Ok(await guides.Detail(AgencyId, guideId, ct));

    [HttpPost, RequestSizeLimit(3 * 1024 * 1024)]
    [EndpointSummary("Create a guide login account and professional profile atomically")]
    [ProducesResponseType<AgencyGuideDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<AgencyGuideDto>> Create(CreateGuideRequest request, CancellationToken ct)
    {
        var guide = await guides.Create(AgencyId, request, ct);
        return CreatedAtAction(nameof(Detail), new { guideId = guide.Id }, guide);
    }
    [HttpPut("{guideId}"), RequestSizeLimit(3 * 1024 * 1024)]
    [EndpointSummary("Update the owned guide profile without altering password, account status or history")]
    public async Task<ActionResult<AgencyGuideDto>> Update(string guideId, GuideProfileRequest request, CancellationToken ct)
        => Ok(await guides.Update(AgencyId, guideId, request, ct));

    [HttpPatch("{guideId}/account-status")]
    [EndpointSummary("Suspend or reactivate an owned guide account; confirm existing trips before suspension")]
    public async Task<ActionResult<GuideAccountStatusResponse>> Status(string guideId, GuideAccountStatusRequest request, CancellationToken ct)
        => Ok(await guides.ChangeStatus(AgencyId, guideId, request, ct));

    [HttpGet("{guideId}/assignments")]
    [EndpointSummary("List and filter an owned guide's real booking assignments")]
    public async Task<ActionResult<GuideAssignmentsPage>> Assignments(string guideId, CancellationToken ct, string? status = null)
        => Ok(await guides.Assignments(AgencyId, guideId, status, ct));

    [HttpDelete("{guideId}")]
    [EndpointSummary("Delete an unused guide account and profile; retain accounts referenced by activity history")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(string guideId, CancellationToken ct)
    { await guides.Delete(AgencyId, guideId, ct); return NoContent(); }

    [HttpPut("{guideId}/password")]
    [EndpointSummary("Agency changes the password of its own guide without changing account status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangePassword(string guideId, ChangeGuidePasswordRequest request, CancellationToken ct)
    {
        await accounts.ChangeGuidePassword(User.FindFirstValue(ClaimTypes.NameIdentifier)!, guideId, request, ct);
        return NoContent();
    }
}
