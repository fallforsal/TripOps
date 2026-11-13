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
