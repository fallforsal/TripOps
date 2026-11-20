using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TripOps.Service.Chat;
using TripOps.Service.Accounts;
namespace TripOps.Api.Hubs;

[Authorize]
public sealed class ChatHub(ChatService chat) : Hub
{
    string Actor => Context.UserIdentifier ?? throw new HubException("Chưa đăng nhập.");
    public override async Task OnConnectedAsync() {
        await chat.Active(Actor, Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }
    async Task<T> Run<T>(Func<Task<T>> action) {
        try { return await action(); }
        catch (AccountException e) { throw new HubException(e.Message); }
    }
    public Task JoinConversation(int conversationId) => Run(async () => {
        await chat.Access(Actor, conversationId, Context.ConnectionAborted);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{conversationId}"); return true;
    });
    public Task LeaveConversation(int conversationId) => Run(async () => {
        await chat.Access(Actor, conversationId, Context.ConnectionAborted);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat:{conversationId}"); return true;
    });
    public Task<MessageDto> SendMessage(int conversationId, string content, Guid clientMessageId) =>
        Run(() => chat.Send(Actor, conversationId, content, clientMessageId, Context.ConnectionAborted));
    public Task<ReadDto> MarkAsRead(int conversationId, int? throughMessageId = null) =>
        Run(() => chat.MarkRead(Actor, conversationId, throughMessageId, Context.ConnectionAborted));
    // SignalR removes connection group membership automatically on disconnect.
}
public sealed class SignalRChatEvents(IHubContext<ChatHub> hub) : IChatEvents
{
    public async Task Message(string[] users, MessageDto message) {
        await hub.Clients.Users(users).SendAsync("ReceiveMessage", message);
        await Updated(users, message.ConversationId);
    }
    public Task Updated(string[] users, int conversationId) => hub.Clients.Users(users).SendAsync("ConversationUpdated", new { conversationId });
    public async Task Read(string[] users, ReadDto receipt) {
        await hub.Clients.Users(users).SendAsync("MessagesRead", receipt);
        await Updated(users, receipt.ConversationId);
    }
}
