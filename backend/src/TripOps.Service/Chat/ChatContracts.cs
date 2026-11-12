namespace TripOps.Service.Chat;

public record ChatContact(string Id, string Name, string? BusinessName = null, string? Role = null, string? Avatar = null);
public record ChatContextInput(string Kind, int Id, int? Version = null);
public record ChatContextDto(string Kind, int Id, string Title, string? ThumbnailUrl = null, string? Subtitle = null, int? Version = null);
public record MessageDto(int Id, int ConversationId, string SenderId, string Content, DateTime? CreatedAt, DateTime? ReadAt, Guid? ClientMessageId, ChatContextDto? Context = null);
public record ConversationDto(int Id, ChatContact Contact, MessageDto? LastMessage, int UnreadCount);
public record MessagePage(IReadOnlyList<MessageDto> Items, int? NextCursor);
public record ReadDto(int ConversationId, string UserId, int ThroughMessageId, DateTime ReadAt);
public interface IChatEvents
{
    Task Message(string[] users, MessageDto message);
    Task Updated(string[] users, int conversationId);
    Task Read(string[] users, ReadDto receipt);
}
