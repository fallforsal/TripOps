using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Accounts;
using TripOps.Service.Services;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "provider"), Route("api/v1/provider/services"), Tags("Service Management")]
public sealed class ProviderServicesController(ProviderServiceService services, CloudinaryStorage storage) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet, EndpointSummary("List the current approved Provider's own posts in every status")]
    [ProducesResponseType<AdminServicePage>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] AdminServiceQuery query, CancellationToken ct) => Ok(await services.List(Actor, query, ct));

    [HttpGet("{id:int}"), EndpointSummary("Read a service post owned by the current Provider")]
    [ProducesResponseType<AdminServiceDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await services.Get(Actor, id, ct));

    [HttpPost, EndpointSummary("Create a Provider service post and submit it for moderation")]
    [ProducesResponseType<AdminServiceDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(SaveProviderServiceRequest request, CancellationToken ct)
    {
        var item = await services.Create(Actor, request, ct);
        return Created($"/api/v1/provider/services/{item.Id}", item);
    }

    [HttpPut("{id:int}"), EndpointSummary("Edit an owned service and resubmit it; Admin-hidden posts are locked")]
    [ProducesResponseType<AdminServiceDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, SaveProviderServiceRequest request, CancellationToken ct) => Ok(await services.Update(Actor, id, request, ct));

    [HttpDelete("{id:int}"), EndpointSummary("Delete an owned service that is unused by tours and bookings")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { await services.Delete(Actor, id, ct); return NoContent(); }

    [HttpPost("{id:int}/availability"), EndpointSummary("Pause or resume the Provider's service without changing Admin moderation")]
    [ProducesResponseType<AdminServiceDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Availability(int id, SetServiceAvailabilityRequest request, CancellationToken ct) =>
        Ok(await services.SetAvailability(Actor, id, request, ct));

    [HttpPost("images"), RequestSizeLimit(6 * 1024 * 1024), EndpointSummary("Upload a Provider service PNG or JPEG image up to 5 MB")]
    [ProducesResponseType<ServiceImageResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UploadImage(IFormFile? image, CancellationToken ct)
    {
        await services.Provider(Actor, ct);
        if (image is null || image.Length is <= 0 or > 5 * 1024 * 1024)
            throw new ServiceModerationException(400, "Vui lòng chọn ảnh PNG/JPEG tối đa 5 MB.");
        using var stream = new MemoryStream();
        await image.CopyToAsync(stream, ct);
        return Ok(new ServiceImageResponse(await storage.UploadServiceImage(Actor, stream.ToArray(), image.ContentType, ct)));
    }
}
