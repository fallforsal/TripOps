using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Chat;
namespace TripOps.Api.Controllers;
[ApiController, Authorize, Route("api/v1/chat"), Tags("Chat")]
public sealed class ChatController(ChatService chat) : ControllerBase
{
    string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    public record CreateRequest([Required, StringLength(36)] string UserId);
    public record ConversationIdDto(int Id);
    public record SendRequest([Required, StringLength(2000)] string Content, Guid ClientMessageId);
    public record ReadRequest(int? ThroughMessageId);
    [HttpGet("contacts"), EndpointSummary("List other active accounts available for direct chat")]
    [ProducesResponseType<List<ChatContact>>(200)]
    public async Task<IActionResult> Contacts(CancellationToken ct) => Ok(await chat.Contacts(Actor, ct));
    [HttpGet("conversations"), EndpointSummary("List owned direct conversations with latest message and unread counts")]
    [ProducesResponseType<List<ConversationDto>>(200)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await chat.List(Actor, ct));
    [HttpPost("conversations"), EndpointSummary("Find or create one direct conversation with a permitted contact")]
    [ProducesResponseType<ConversationIdDto>(200)]
    public async Task<IActionResult> Create(CreateRequest request, CancellationToken ct) => Ok(new ConversationIdDto(await chat.Create(Actor, request.UserId, ct)));
    [HttpGet("conversations/{id:int}/messages"), EndpointSummary("Read message history before an exclusive message ID cursor")]
    [ProducesResponseType<MessagePage>(200), ProducesResponseType(404)]
    public async Task<IActionResult> Messages(int id, CancellationToken ct, int? cursor = null, int limit = 50) => Ok(await chat.History(Actor, id, cursor, limit, ct));
    [HttpPost("conversations/{id:int}/messages"), EndpointSummary("Persist and broadcast a text message with an idempotency key")]
    [ProducesResponseType<MessageDto>(200), ProducesResponseType(404), ProducesResponseType(409)]
    public async Task<IActionResult> Send(int id, SendRequest request, CancellationToken ct) => Ok(await chat.Send(Actor, id, request.Content, request.ClientMessageId, ct));
    [HttpPatch("conversations/{id:int}/read"), EndpointSummary("Mark received messages through the viewed message ID as read")]
    [ProducesResponseType<ReadDto>(200), ProducesResponseType(404)]
    public async Task<IActionResult> Read(int id, ReadRequest request, CancellationToken ct) => Ok(await chat.MarkRead(Actor, id, request.ThroughMessageId, ct));
}
