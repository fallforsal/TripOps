using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Accounts;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/subscription")]
public sealed class AgencySubscriptionController(AccountService accounts) : ControllerBase
{
    public sealed record SubscriptionInput(bool Active);
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(new {
        active = (await accounts.Current(User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct)).AgencyAiSubscribed
    });

    [HttpPut]
    public async Task<IActionResult> Update(SubscriptionInput input, CancellationToken ct) =>
        Ok(new { active = await accounts.SetAgencySubscription(User.FindFirstValue(ClaimTypes.NameIdentifier)!, input.Active, ct) });
}
