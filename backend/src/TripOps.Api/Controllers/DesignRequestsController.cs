using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Tours;

namespace TripOps.Api.Controllers;

[ApiController, Route("api/v1/tour-design-requests"), Authorize(Roles = "user")]
[Tags("Custom Tour Requests")]
public sealed class CustomerDesignRequestsController(DesignRequestService requests, TourService tours) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet("agencies"), AllowAnonymous]
    [EndpointSummary("List approved Agencies available for a custom tour request")]
    [ProducesResponseType<IReadOnlyList<AgencyChoiceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Agencies(CancellationToken ct) => Ok(await requests.Agencies(ct));
    [HttpPost]
    [EndpointSummary("Customer submits a custom tour design request to one Agency")]
    [ProducesResponseType<DesignRequestDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateDesignRequestInput input, CancellationToken ct)
    {
        var request = await requests.Create(Actor, input, ct);
        return StatusCode(StatusCodes.Status201Created, request);
    }
    [HttpGet]
    [EndpointSummary("List the signed-in customer's design requests")]
    [ProducesResponseType<IReadOnlyList<DesignRequestDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await requests.List(Actor, false, ct));
    [HttpPost("{id:int}/cancel")]
    [EndpointSummary("Cancel a pending custom tour request")]
    [ProducesResponseType<DesignRequestDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct) => Ok(await requests.Cancel(Actor, id, ct));
    [HttpGet("{id:int}/tour")]
    [EndpointSummary("View the completed custom tour belonging to this customer")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Tour(int id, CancellationToken ct) => Ok(await tours.CustomerRequestTour(Actor, id, ct));
    [HttpGet("{id:int}/plans")]
    [EndpointSummary("List all completed custom Tour plans shared with this customer")]
    [ProducesResponseType<IReadOnlyList<TourDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Plans(int id, CancellationToken ct) => Ok(await tours.CustomerRequestTours(Actor, id, ct));
    [HttpGet("{id:int}/history")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.PlanHistory>>(200)]
    public async Task<IActionResult> History(int id, CancellationToken ct) => Ok(await requests.History(Actor, id, false, ct));
    [HttpGet("{id:int}/messages")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.RequestMessage>>(200)]
    public async Task<IActionResult> Messages(int id, CancellationToken ct) => Ok(await requests.Messages(Actor, id, ct));
    [HttpPost("{id:int}/messages")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> SendMessage(int id, DesignRequestService.SendRequestMessage input, CancellationToken ct)
    { await requests.SendMessage(Actor, id, input, ct); return NoContent(); }
    [HttpGet("{id:int}/initial-changes")]
    [ProducesResponseType<System.Text.Json.JsonElement>(200)]
    public async Task<IActionResult> InitialChanges(int id, CancellationToken ct) => Ok(await requests.InitialChanges(Actor, id, ct));
    [HttpGet("{id:int}/source")]
    [ProducesResponseType<System.Text.Json.JsonElement>(200)]
    public async Task<IActionResult> Source(int id, CancellationToken ct) => Ok(await requests.Source(Actor, id, ct));
    [HttpPost("{id:int}/agree-plan")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Agree(int id, DesignRequestService.PlanAgreement input, CancellationToken ct)
    { await requests.Agree(Actor, id, input, ct); return NoContent(); }
    [HttpGet("{id:int}/proposals")]
    [EndpointSummary("List customer changes and Agency replies for a custom tour request")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.PlanProposalDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Proposals(int id, CancellationToken ct) =>
        Ok(await requests.Proposals(Actor, id, false, ct));
    [HttpPost("{id:int}/proposals")]
    [EndpointSummary("Send a customer-owned edited Tour plan to its Agency for review")]
    [ProducesResponseType<DesignRequestService.PlanProposalDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> SubmitProposal(int id, DesignRequestService.PlanProposalInput input, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await requests.SubmitProposal(Actor, id, input, ct));
}

[ApiController, Route("api/v1/agency/tour-design-requests"), Authorize(Roles = "agency")]
[Tags("Custom Tour Requests")]
public sealed class AgencyDesignRequestsController(DesignRequestService requests, TourService tours) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List custom tour requests addressed to the signed-in Agency")]
    [ProducesResponseType<IReadOnlyList<DesignRequestDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await requests.List(Actor, true, ct));
    [HttpPost("{id:int}/action")]
    [EndpointSummary("Review or reject an Agency-owned custom tour request")]
    [ProducesResponseType<DesignRequestDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Act(int id, DesignRequestAction input, CancellationToken ct) => Ok(await requests.Act(Actor, id, input, ct));
    [HttpPost("{id:int}/tours")]
    [EndpointSummary("Create one private tour draft from an Agency-owned customer request")]
    [ProducesResponseType<TourDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTour(int id, TourConfiguration configuration, CancellationToken ct)
    {
        var tour = await tours.CreateForRequest(Actor, id, configuration, ct);
        return Created($"/api/v1/agency/tours/{tour.Id}", tour);
    }
    [HttpGet("{id:int}/history")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.PlanHistory>>(200)]
    public async Task<IActionResult> History(int id, CancellationToken ct) => Ok(await requests.History(Actor, id, true, ct));
    [HttpGet("{id:int}/messages")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.RequestMessage>>(200)]
    public async Task<IActionResult> Messages(int id, CancellationToken ct) => Ok(await requests.Messages(Actor, id, ct));
    [HttpPost("{id:int}/messages")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> SendMessage(int id, DesignRequestService.SendRequestMessage input, CancellationToken ct)
    { await requests.SendMessage(Actor, id, input, ct); return NoContent(); }
    [HttpGet("{id:int}/initial-changes")]
    [ProducesResponseType<System.Text.Json.JsonElement>(200)]
    public async Task<IActionResult> InitialChanges(int id, CancellationToken ct) => Ok(await requests.InitialChanges(Actor, id, ct));
    [HttpGet("{id:int}/source")]
    [ProducesResponseType<System.Text.Json.JsonElement>(200)]
    public async Task<IActionResult> Source(int id, CancellationToken ct) => Ok(await requests.Source(Actor, id, ct));
    [HttpGet("{id:int}/proposals")]
    [EndpointSummary("List customer Tour plan changes addressed to this Agency")]
    [ProducesResponseType<IReadOnlyList<DesignRequestService.PlanProposalDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Proposals(int id, CancellationToken ct) =>
        Ok(await requests.Proposals(Actor, id, true, ct));
    [HttpPost("{id:int}/proposals/{proposalId:int}/reply")]
    [EndpointSummary("Agency responds to a customer's edited Tour plan")]
    [ProducesResponseType<DesignRequestService.PlanProposalDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReplyProposal(int id, int proposalId, DesignRequestService.PlanProposalReply input, CancellationToken ct) =>
        Ok(await requests.ReplyProposal(Actor, id, proposalId, input, ct));
}
