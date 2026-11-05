using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Locations;

namespace TripOps.Api.Controllers;

[ApiController, AllowAnonymous, Route("api/v1/locations"), Tags("Administrative Locations")]
public sealed class LocationsController(VietnamAdministrativeService locations) : ControllerBase
{
    [HttpGet("provinces")]
    [EndpointSummary("Current Vietnam provinces and cities (Province Open API v2)")]
    [ProducesResponseType<ProvinceOption[]>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Provinces(CancellationToken ct)
    {
        try { return Ok(await locations.Provinces(ct)); }
        catch (AdministrativeLocationException e) { return Problem(statusCode: e.Status, title: e.Message); }
    }

    [HttpGet("provinces/{provinceCode}/wards")]
    [EndpointSummary("Current wards, communes and special zones of a province")]
    [ProducesResponseType<WardOption[]>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Wards(string provinceCode, CancellationToken ct)
    {
        try { return Ok(await locations.Wards(provinceCode, ct)); }
        catch (AdministrativeLocationException e) { return Problem(statusCode: e.Status, title: e.Message); }
    }
}
