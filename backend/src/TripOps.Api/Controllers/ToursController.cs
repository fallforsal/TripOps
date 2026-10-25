using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Accounts;
using TripOps.Service.Tours;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/tours")]
[Tags("Tour Management")]
public sealed class AgencyToursController(TourService tours, CloudinaryStorage storage) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("images"), RequestSizeLimit(6 * 1024 * 1024)]
    [EndpointSummary("Upload a PNG or JPEG tour image from the Agency's computer")]
    [ProducesResponseType<TourImageUploadResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadImage(IFormFile? image, CancellationToken ct)
    {
        await tours.Agency(Actor, ct);
        if (image is null || image.Length is <= 0 or > 5 * 1024 * 1024)
            throw new TourException(400, "A PNG or JPEG image up to 5 MB is required.");
        using var stream = new MemoryStream();
        await image.CopyToAsync(stream, ct);
        return Ok(new TourImageUploadResponse(await storage.UploadTourImage(Actor, stream.ToArray(), image.ContentType, ct)));
    }

    [HttpPost]
    [EndpointSummary("Create a tour draft")]
    [ProducesResponseType<TourDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(TourConfiguration request, CancellationToken ct)
    {
        var tour = await tours.Create(Actor, request, ct);
        return CreatedAtAction(nameof(Get), new { id = tour.Id }, tour);
    }
    [HttpGet]
    [EndpointSummary("List the authenticated Agency's tours")]
    [ProducesResponseType<TourPage<TourListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null,
        string? search = null, int page = 1, int pageSize = 20) =>
        Ok(await tours.List(Actor, false, status, search, null, null, null, page, pageSize, ct));
    [HttpGet("{id:int}")]
    [EndpointSummary("Get an Agency-owned tour and its configuration")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await tours.Get(Actor, id, false, ct));
    [HttpPut("{id:int}")]
    [EndpointSummary("Replace itinerary, services, options and pricing as a new draft version")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, UpdateTourRequest request, CancellationToken ct) => Ok(await tours.Update(Actor, id, request, ct));
    [HttpGet("{id:int}/validation")]
    [EndpointSummary("Check whether the draft is ready for direct publication")]
    [ProducesResponseType<TourValidationResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Validate(int id, CancellationToken ct) => Ok(await tours.ValidateDraft(Actor, id, ct));
    [HttpPost("{id:int}/publish")]
    [Tags("Tour Publishing"), EndpointSummary("Publish a complete Agency tour directly")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Publish(int id, TourCommand request, CancellationToken ct) => Ok(await tours.Command(Actor, id, "publish", request, ct));
    [HttpPost("{id:int}/hide")]
    [Tags("Tour Publishing"), EndpointSummary("Hide a published tour with a reason")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Hide(int id, TourCommand request, CancellationToken ct) => Ok(await tours.Command(Actor, id, "hide", request, ct));
    [HttpDelete("{id:int}")]
    [EndpointSummary("Soft archive a hidden tour and preserve its history")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, [FromQuery] int version, CancellationToken ct)
    { await tours.Command(Actor, id, "delete", new(version), ct); return NoContent(); }
    [HttpPost("{id:int}/duplicate")]
    [EndpointSummary("Duplicate a tour into an independent draft")]
    [ProducesResponseType<TourDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Duplicate(int id, DuplicateTourRequest request, CancellationToken ct)
    {
        var tour = await tours.Duplicate(Actor, id, request, ct);
        return CreatedAtAction(nameof(Get), new { id = tour.Id }, tour);
    }
    [HttpGet("{id:int}/versions")]
    [EndpointSummary("List immutable tour version metadata")]
    [ProducesResponseType<TourPage<TourVersionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Versions(int id, CancellationToken ct, int page = 1, int pageSize = 20) => Ok(await tours.Versions(Actor, id, page, pageSize, ct));
    [HttpGet("{id:int}/versions/{number:int}")]
    [EndpointSummary("Get an immutable historical tour snapshot")]
    [ProducesResponseType<TourVersionDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Version(int id, int number, CancellationToken ct) => Ok(await tours.Version(Actor, id, number, ct));
    [HttpPost("{id:int}/versions/{number:int}/restore")]
    [EndpointSummary("Restore historical configuration into a new draft version")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Restore(int id, int number, TourCommand request, CancellationToken ct) => Ok(await tours.Restore(Actor, id, number, request, ct));
}

[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/tours")]
[Tags("Tour Moderation")]
public sealed class AdminToursController(TourService tours) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List tours for post-publication moderation")]
    [ProducesResponseType<TourPage<TourListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = "completed", string? search = null,
        int page = 1, int pageSize = 20) => Ok(await tours.List(Actor, true, status, search, null, null, null, page, pageSize, ct));
    [HttpGet("{id:int}")]
    [EndpointSummary("Inspect a tour for moderation")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await tours.Get(Actor, id, true, ct));
    [HttpPost("{id:int}/hide")]
    [EndpointSummary("Admin hides a published tour with a reason")]
    [ProducesResponseType<TourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Hide(int id, TourCommand request, CancellationToken ct) => Ok(await tours.Command(Actor, id, "hide", request, ct, administrator: true));
}

[ApiController, Route("api/v1/tours")]
[Tags("Tour Publishing")]
public sealed class ToursController(TourService tours) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Browse published tours with filtering and pagination")]
    [ProducesResponseType<TourPage<TourListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? search = null, string? destination = null,
        decimal? maxPrice = null, int? headcount = null, int page = 1, int pageSize = 20) =>
        Ok(await tours.List(null, false, null, search, destination, maxPrice, headcount, page, pageSize, ct));
    [HttpGet("{id:int}")]
    [EndpointSummary("Get a public published tour")]
    [ProducesResponseType<PublicTourDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await tours.PublicGet(id, ct));
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/ai/itinerary-drafts")]
[Tags("Tour Management")]
public sealed class ItineraryDraftsController(TourService tours) : ControllerBase
{
    [HttpPost]
    [EndpointSummary("Generate an AI-assisted draft (503 until the integration is configured)")]
    [ProducesResponseType<TourDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(AiDraftRequest request, CancellationToken ct)
    {
        var tour = await tours.AiCreate(User.FindFirstValue(ClaimTypes.NameIdentifier)!, request, ct);
        return Created($"/api/v1/agency/tours/{tour.Id}", tour);
    }
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/services")]
[Tags("Service Management")]
public sealed class TourServicesController(TourService tours) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Browse approved Provider services eligible for tour configuration")]
    [ProducesResponseType<TourPage<TourServiceReference>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? category = null, string? search = null,
        int page = 1, int pageSize = 20) => Ok(await tours.Catalogue(User.FindFirstValue(ClaimTypes.NameIdentifier)!, category, search, page, pageSize, ct));
    [HttpGet("{id:int}")]
    [EndpointSummary("Get an eligible service and its authoritative Provider reference")]
    [ProducesResponseType<TourServiceReference>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await tours.CatalogueService(User.FindFirstValue(ClaimTypes.NameIdentifier)!, id, ct));
}
