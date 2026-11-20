using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Chat;
using TripOps.Service.Tours;
namespace TripOps.Api.Controllers;
[ApiController, Authorize, Route("api/v1/chat"), Tags("Chat")]
public sealed class ChatController(ChatService chat) : ControllerBase
{
    string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    public record CreateRequest([Required, StringLength(36)] string UserId);
    public record ConversationIdDto(int Id, ChatContact? Contact = null);
    public record SendRequest([StringLength(2000)] string? Content, Guid ClientMessageId, ChatContextInput? Context = null);
    public record ReadRequest(int? ThroughMessageId);
    [HttpGet("conversations"), EndpointSummary("List owned direct conversations with latest message and unread counts")]
    [ProducesResponseType<List<ConversationDto>>(200)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await chat.List(Actor, ct));
    [HttpPost("conversations"), EndpointSummary("Find or create one direct conversation with a permitted contact")]
    [ProducesResponseType<ConversationIdDto>(200)]
    public async Task<IActionResult> Create(CreateRequest request, CancellationToken ct) {
        var id = await chat.Create(Actor, request.UserId, ct);
        return Ok(new ConversationIdDto(id, await chat.Contact(Actor, id, ct)));
    }
    [HttpGet("conversations/{id:int}/messages/{messageId:int}/tour"), EndpointSummary("View the permitted tour referenced by a message")]
    [ProducesResponseType<TourDto>(200), ProducesResponseType(403), ProducesResponseType(404)]
    public async Task<IActionResult> Tour(int id, int messageId, [FromServices] TourService tours, CancellationToken ct) =>
        Ok(await chat.TourFromMessage(Actor, id, messageId, tours, ct));
    [HttpGet("conversations/{id:int}/messages"), EndpointSummary("Read message history before an exclusive message ID cursor")]
    [ProducesResponseType<MessagePage>(200), ProducesResponseType(404)]
    public async Task<IActionResult> Messages(int id, CancellationToken ct, int? cursor = null, int limit = 50) => Ok(await chat.History(Actor, id, cursor, limit, ct));
    [HttpPost("conversations/{id:int}/messages"), EndpointSummary("Persist and broadcast text or a validated business context card with an idempotency key")]
    [ProducesResponseType<MessageDto>(200), ProducesResponseType(404), ProducesResponseType(409)]
    public async Task<IActionResult> Send(int id, SendRequest request, CancellationToken ct) => Ok(await chat.Send(Actor, id, request.Content, request.ClientMessageId, ct, request.Context));
    [HttpPatch("conversations/{id:int}/read"), EndpointSummary("Mark received messages through the viewed message ID as read")]
    [ProducesResponseType<ReadDto>(200), ProducesResponseType(404)]
    public async Task<IActionResult> Read(int id, ReadRequest request, CancellationToken ct) => Ok(await chat.MarkRead(Actor, id, request.ThroughMessageId, ct));
}
