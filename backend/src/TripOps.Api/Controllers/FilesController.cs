using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace TripOps.Api.Controllers;

[ApiController, Route("api/v1/files"), Tags("Media")]
public sealed class FilesController(IWebHostEnvironment environment) : ControllerBase
{
    private IActionResult Read(string kind, string owner, string name)
    {
        if (!Regex.IsMatch(owner, @"^[a-zA-Z0-9-]{1,36}$") || !Regex.IsMatch(name, @"^[a-f0-9]{32}\.(png|jpg|webp)$")) return NotFound();
        var file = Path.Combine(environment.ContentRootPath, "App_Data", "uploads", kind, owner, name);
        if (!System.IO.File.Exists(file)) return NotFound();
        Response.Headers.CacheControl = kind == "licenses" ? "private, no-store" : "public, max-age=3600";
        Response.Headers.XContentTypeOptions = "nosniff";
        return PhysicalFile(file, name.EndsWith(".png") ? "image/png" : name.EndsWith(".webp") ? "image/webp" : "image/jpeg");
    }
    [HttpGet("tours/{owner}/{name}")]
    [EndpointSummary("Read an uploaded public tour image")]
    [Produces("image/png", "image/jpeg")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Tour(string owner, string name) => Read("tours", owner, name);

    [HttpGet("services/{owner}/{name}")]
    [EndpointSummary("Read an uploaded public service image")]
    [Produces("image/png", "image/jpeg")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Service(string owner, string name) => Read("services", owner, name);

    [HttpGet("guides/{owner}/{name}")]
    [EndpointSummary("Read a public guide avatar uploaded in local development mode")]
    [Produces("image/png", "image/jpeg", "image/webp")]
    public IActionResult Guide(string owner, string name) => Read("guides", owner, name);

    [HttpGet("licenses/{owner}/{name}"), Authorize]
    [EndpointSummary("Read a business license as its owner or an Admin")]
    [Produces("image/png", "image/jpeg")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult License(string owner, string name)
    {
        if (User.FindFirstValue(ClaimTypes.NameIdentifier) != owner && !User.IsInRole("admin")) return Forbid();
        return Read("licenses", owner, name);
    }
}
