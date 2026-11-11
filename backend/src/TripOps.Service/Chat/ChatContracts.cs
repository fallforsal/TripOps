namespace TripOps.Service.Chat;

public record ChatContact(string Id, string Name);
public record MessageDto(int Id, int ConversationId, string SenderId, string Content, DateTime? CreatedAt, DateTime? ReadAt, Guid? ClientMessageId);
public record ConversationDto(int Id, ChatContact Contact, MessageDto? LastMessage, int UnreadCount);
public record MessagePage(IReadOnlyList<MessageDto> Items, int? NextCursor);
public record ReadDto(int ConversationId, string UserId, int ThroughMessageId, DateTime ReadAt);
public interface IChatEvents
{
    Task Message(string[] users, MessageDto message);
    Task Updated(string[] users, int conversationId);
    Task Read(string[] users, ReadDto receipt);
}

