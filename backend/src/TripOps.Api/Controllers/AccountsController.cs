using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using TripOps.Data.Entities;
using TripOps.Service.Accounts;
using static TripOps.Service.Accounts.AccountService;
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
[ApiController, Authorize, Route("api/v1/me/bank-account")]
[Tags("Authentication")]
public sealed class MyBankAccountController(AccountService accounts) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("Get the refund bank account saved in the current user's profile")]
    [ProducesResponseType<BankAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await accounts.GetBankAccount(Actor, ct));
    [HttpPut]
    [EndpointSummary("Save the refund bank account in the current user's profile (holder name becomes UPPERCASE without accents)")]
    [ProducesResponseType<BankAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Put(BankAccountInput input, CancellationToken ct) => Ok(await accounts.SetBankAccount(Actor, input, ct));
    [HttpDelete]
    [EndpointSummary("Remove the saved refund bank account")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(CancellationToken ct) { await accounts.ClearBankAccount(Actor, ct); return NoContent(); }
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
    [HttpPut, RequestSizeLimit(8 * 1024 * 1024)]
    [EndpointSummary("Update the business profile and logo; legal changes go back to review")]
    [ProducesResponseType<AccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Update([FromForm] UpdateBusinessRequest request, IFormFile? logo, IFormFile? license, CancellationToken ct)
    {
        var (logoBytes, logoMime) = await ReadImage(logo, 2 * 1024 * 1024, ct);
        var (licenseBytes, licenseMime) = await ReadImage(license, 5 * 1024 * 1024, ct);
        return Ok(await accounts.UpdateBusiness(User.FindFirstValue(ClaimTypes.NameIdentifier)!, request,
            logoBytes, logoMime, licenseBytes, licenseMime, ct));
    }

    private static async Task<(byte[]?, string?)> ReadImage(IFormFile? file, long maxBytes, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return (null, null);
        if (file.Length > maxBytes) throw new AccountException(400, "Ảnh vượt quá dung lượng cho phép.");
        if (file.ContentType is not ("image/jpeg" or "image/png" or "image/webp"))
            throw new AccountException(400, "Chỉ nhận ảnh JPG, PNG hoặc WebP.");
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        return (stream.ToArray(), file.ContentType);
    }
}
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/partner-applications")]
[Tags("Partner Management")]
public sealed class PartnerApplicationsController(AccountService accounts) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List Agency and Provider business approval applications")]
    [ProducesResponseType<PartnerPageDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, string? role = null, string? search = null, int page = 1, int pageSize = 20, string? userId = null)
        => Ok(await accounts.Partners(status, role, search, page, pageSize, ct, userId));
    [HttpPost("{id:int}/approve")]
    [EndpointSummary("Approve a pending Agency or Provider business profile")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(int id, CancellationToken ct) => Ok(await accounts.Review(id, true, null, ct));
    [HttpPost("{id:int}/reject")]
    [EndpointSummary("Reject a pending business profile with a reason")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(int id, RejectRequest request, CancellationToken ct) => Ok(await accounts.Review(id, false, request.Reason, ct));
    [HttpPost("{id:int}/suspend")]
    [EndpointSummary("Suspend an approved Agency or Provider business profile")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Suspend(int id, CancellationToken ct) => Ok(await accounts.SetSuspended(id, true, ct));

    [HttpPost("{id:int}/activate")]
    [EndpointSummary("Reactivate a suspended Agency or Provider business profile")]
    [ProducesResponseType<ProfileDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Activate(int id, CancellationToken ct) => Ok(await accounts.SetSuspended(id, false, ct));
}
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/accounts")]
[Tags("Account Management")]
public sealed class AdminAccountsController(AccountService accounts) : ControllerBase
{
    [HttpGet]
    [EndpointSummary("List customer, Agency, Provider and Guide accounts with filters")]
    [ProducesResponseType<AdminAccountPageDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? role = null, string? status = null,
        string? search = null, int page = 1, int pageSize = 20)
        => Ok(await accounts.AdminAccounts(role, status, search, page, pageSize, ct));
    [HttpPost("{id}/ban")]
    [EndpointSummary("Ban an account with a required reason")]
    [ProducesResponseType<AdminAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Ban(string id, BanAccountRequest request, CancellationToken ct)
        => Ok(await accounts.SetBanned(id, true, request.Reason, ct));
    [HttpPost("{id}/unban")]
    [EndpointSummary("Revoke an account ban")]
    [ProducesResponseType<AdminAccountDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Unban(string id, CancellationToken ct)
        => Ok(await accounts.SetBanned(id, false, null, ct));
}

