using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Accounts;
using TripOps.Data.Entities;
namespace TripOps.Api.Controllers;
[ApiController, Route("api/v1/auth")]
[Tags("Authentication")]
public sealed class AccountsController(AccountService accounts) : ControllerBase
{
    private async Task SignIn(User user) => await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
        new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Role, AccountService.RoleName(user.Role)) }, CookieAuthenticationDefaults.AuthenticationScheme)));
    [HttpPost("register"), EnableRateLimiting("auth")]
    [EndpointSummary("Register an account and start a cookie session")]
    [ProducesResponseType<AccountDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    { var user = await accounts.Register(request, ct); await SignIn(user); return StatusCode(201, accounts.Dto(user)); }
    [HttpPost("login"), EnableRateLimiting("auth")]
    [EndpointSummary("Sign in; the browser stores the HttpOnly session cookie")]
    [ProducesResponseType<AccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    { var user = await accounts.Login(request, ct); await SignIn(user); return Ok(accounts.Dto(user)); }
    [HttpGet("me"), Authorize]
    [EndpointSummary("Get the current account and business approval status")]
    [ProducesResponseType<AccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken ct) => Ok(accounts.Dto(await accounts.Current(User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct)));
    [HttpPost("logout")]
    [EndpointSummary("Clear the current browser's session cookie")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout() { await HttpContext.SignOutAsync(); return NoContent(); }
}
[ApiController, Authorize, Route("api/v1/me/business-profile")]
[Tags("Partner Management")]
public sealed class BusinessProfilesController(AccountService accounts) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("Get the current Agency or Provider business profile; 204 if absent")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(accounts.Dto(await accounts.Current(User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct)).BusinessProfile);
    [HttpPost("submit"), RequestSizeLimit(6 * 1024 * 1024)]
    [EndpointSummary("Submit or resubmit a business profile and PNG/JPEG license")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Submit([FromForm] ProfileRequest request, IFormFile? license, CancellationToken ct)
    {
        byte[]? image = null;
        if (license is not null) {
            if (license.Length is <= 0 or > 5 * 1024 * 1024) throw new AccountException(400, "Ảnh tối đa 5 MB.");
            using var stream = new MemoryStream(); await license.CopyToAsync(stream, ct); image = stream.ToArray();
        }
        return Ok(await accounts.Submit(User.FindFirstValue(ClaimTypes.NameIdentifier)!, request, image, license?.ContentType, ct));
    }
}
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/partner-applications")]
[Tags("Partner Management")]
public sealed class PartnerApplicationsController(AccountService accounts) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List Agency and Provider business approval applications")]
    [ProducesResponseType<PartnerPageDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, string? role = null, string? search = null, int page = 1, int pageSize = 20)
        => Ok(await accounts.Partners(status, role, search, page, pageSize, ct));
    [HttpPost("{id:int}/approve")]
    [EndpointSummary("Approve a pending Agency or Provider business profile")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(int id, CancellationToken ct) => Ok(await accounts.Review(id, true, null, ct));
    [HttpPost("{id:int}/reject")]
    [EndpointSummary("Reject a pending business profile with a reason")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(int id, RejectRequest request, CancellationToken ct) => Ok(await accounts.Review(id, false, request.Reason, ct));
}
