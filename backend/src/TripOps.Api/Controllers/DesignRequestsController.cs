using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Tours;
using TripOps.Service.Accounts;
using TripOps.Api.Infrastructure;

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
    [EndpointSummary("View the current shared snapshot of the customer-owned private tour")]
    [ProducesResponseType<IReadOnlyList<TourDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Plans(int id, CancellationToken ct) => Ok(await tours.CustomerRequestTours(Actor, id, ct));
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

}

[ApiController, Route("api/v1/agency/tour-design-requests"), Authorize(Roles = "agency")]
[Tags("Custom Tour Requests")]
public sealed class AgencyDesignRequestsController(DesignRequestService requests, TourService tours,CloudinaryStorage storage) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List custom tour requests addressed to the signed-in Agency")]
    [ProducesResponseType<IReadOnlyList<DesignRequestDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await requests.List(Actor, true, ct));
    [HttpPost("{id:int}/lifecycle")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Lifecycle(int id,DesignLifecycleInput input,CancellationToken ct) {await requests.Lifecycle(Actor,id,input,ct);return NoContent();}
    [HttpPost("{id:int}/action")]
    [EndpointSummary("Receive an Agency-owned design request or reject it with a reason")]
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
    [HttpPut("{id:int}/tour")]
    [EndpointSummary("Save a private tour draft or completed design atomically with one version increment")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SaveTour(int id, SaveDesignTourInput input, CancellationToken ct) =>
        Ok(await tours.SaveForRequest(Actor, id, input, ct));
    [HttpPut("{id:int}/tour-with-images"), RequestSizeLimit(TourSaveForm.MaxBytes), RequestFormLimits(MultipartBodyLengthLimit=TourSaveForm.MaxBytes)]
    [EndpointSummary("Save the selected design version and upload its local images together")]
    [ProducesResponseType<TourDto>(200)]
    public async Task<IActionResult> SaveWithImages(int id,[FromForm] TourSaveForm form,CancellationToken ct)
    {
        await tours.Agency(Actor,ct);await requests.Source(Actor,id,ct);
        var input=form.Read<SaveDesignTourInput>();
        if(input.Revision.HasValue) {
            var current=await tours.DesignVersion(Actor,id,input.Version??1,ct);
            if(current.Revision!=input.Revision)throw new TourException(409,"Tour đã thay đổi. Vui lòng tải lại.");
        }
        var configuration=await form.Upload(input.Configuration,storage,Actor,ct);
        return Ok(await tours.SaveForRequest(Actor,id,input with {Configuration=configuration},ct));
    }
    [HttpPost("{id:int}/clone")]
    [EndpointSummary("Clone an Agency-owned tour into the accepted design request")]
    [ProducesResponseType<TourDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Clone(int id, DesignCloneInput input, CancellationToken ct) =>
        StatusCode(201, await tours.CloneForRequest(Actor, id, input, ct));
    [HttpPost("{id:int}/share")]
    [EndpointSummary("Share the completed working version without publishing it publicly")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Share(int id, ShareDesignVersionInput input, CancellationToken ct) =>
        Ok(await tours.ShareForRequest(Actor, id, input, ct));
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
}
