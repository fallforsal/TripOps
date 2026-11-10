using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Tours;
namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles="agency"), Route("api/v1/agency/tour-design-requests/{id:int}")]
[Tags("Tour Co-hosting")]
public sealed class DesignCoHostsController(TourService tours) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("co-hosts")]
    [EndpointSummary("List the lead Agency and invited co-host partners")]
    public async Task<ActionResult<DesignCoHostDto[]>> List(int id,CancellationToken ct) => Ok(await tours.GetCoHosts(Actor,id,ct));
    [HttpPost("co-hosts")]
    [EndpointSummary("Lead Agency invites an approved partner with optional collaboration notes")]
    public async Task<ActionResult<DesignCoHostDto[]>> Invite(int id,InviteDesignCoHost input,CancellationToken ct) => Ok(await tours.InviteCoHost(Actor,id,input,ct));
    [HttpPost("co-hosts/decision")]
    [EndpointSummary("Invited partner accepts or rejects with a reason")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Decide(int id,DesignCoHostDecision input,CancellationToken ct) { await tours.DecideCoHost(Actor,id,input,ct); return NoContent(); }
    [HttpDelete("co-hosts/{partner}")]
    [EndpointSummary("Lead Agency withdraws a co-host invitation or partnership")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Remove(int id,string partner,CancellationToken ct) {await tours.RemoveCoHost(Actor,id,partner,ct);return NoContent();}
    [HttpGet("working-tour")]
    [EndpointSummary("Lead or accepted co-host reads the current private working tour")]
    public async Task<ActionResult<TourDto>> WorkingTour(int id,CancellationToken ct) => Ok(await tours.CollaborativeTour(Actor,id,ct));
    [HttpGet("versions/{number:int}")]
    public async Task<ActionResult<TourDto>> Version(int id,int number,CancellationToken ct) => Ok(await tours.DesignVersion(Actor,id,number,ct));
    [HttpPut("segment")]
    [EndpointSummary("Accepted co-host saves its own content and age-price table; day metadata is shared")]
    public async Task<ActionResult<TourDto>> SaveSegment(int id,DesignSegmentInput input,CancellationToken ct) => Ok(await tours.SaveSegment(Actor,id,input,ct));
}
