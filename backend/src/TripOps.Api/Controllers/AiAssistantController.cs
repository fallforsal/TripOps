using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Ai;

namespace TripOps.Api.Controllers;

/// <summary>Chatbot AI cho khách vãng lai: chỉ dùng tour công khai và chính sách chung, không cần đăng nhập.</summary>
[ApiController, AllowAnonymous, Route("api/v1/ai/guest-chat"), Tags("AI Assistant")]
public sealed class AiAssistantController(GuestAssistantService assistant) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("ai-chat")]
    [EndpointSummary("Ask the public TripOps assistant about published tours, booking process and public policies")]
    [ProducesResponseType<AiChatResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Chat(AiChatRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await assistant.Reply(request, ct));
        }
        catch (AiAssistantException ex)
        {
            return Problem(statusCode: ex.Status, title: ex.Message);
        }
    }
}

/// <summary>
/// UC-038: trợ lý AI cho Agency trong cùng cửa sổ chat. Góp ý thiết kế tour (chỗ ở, ăn uống, lịch trình) cho khung tour
/// AI vừa soạn, thay vì trả lời như đang tư vấn khách mua tour.
/// </summary>
[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/ai/chat"), Tags("AI Assistant")]
public sealed class AgencyAssistantController(AgencyAssistantService assistant, TripOps.Service.Accounts.AccountService accounts) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("ai-chat")]
    [EndpointSummary("Ask the Agency assistant for tour design advice, optionally about the AI draft being reviewed")]
    [ProducesResponseType<AiChatResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Chat(AgencyChatRequest request, CancellationToken ct)
    {
        await accounts.RequireAgencyAi(User.FindFirstValue(ClaimTypes.NameIdentifier)!, ct);
        try
        {
            return Ok(await assistant.Reply(User.FindFirstValue(ClaimTypes.NameIdentifier)!, request, ct));
        }
        catch (AiAssistantException ex)
        {
            return Problem(statusCode: ex.Status, title: ex.Message);
        }
    }
}
