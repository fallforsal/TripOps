using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class ChatConversation : BaseEntity<int> {
public string UserOneId { get; set; } = string.Empty;
public string UserTwoId { get; set; } = string.Empty;
public string? LastMessageContent { get; set; }
public string? LastMessageSenderId { get; set; }
public DateTime? LastMessageAt { get; set; }
public string Status { get; set; } = "active";
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User UserOne { get; set; } = null!;
public virtual User UserTwo { get; set; } = null!;
public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public class ChatMessage : BaseEntity<int> {
public string? ContextData { get; set; }
public Guid? ClientMessageId { get; set; }
public int ConversationId { get; set; }
public int? DesignRequestId { get; set; }
public string SenderId { get; set; } = string.Empty;
public string Content { get; set; } = string.Empty;
public string ContentType { get; set; } = "text";
public bool? IsRead { get; set; } = false;
public DateTime? ReadAt { get; set; }
public int? ReplyToMessageId { get; set; }
public bool? IsEdited { get; set; } = false;
public bool? IsDeleted { get; set; } = false;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual ChatConversation Conversation { get; set; } = null!;
public virtual User Sender { get; set; } = null!;
public virtual ICollection<ChatAttachment> Attachments { get; set; } = new List<ChatAttachment>();
}

public class ChatAttachment : BaseEntity<int> {
public int MessageId { get; set; }
public string FileName { get; set; } = string.Empty;
public string FileUrl { get; set; } = string.Empty;
public string? ContentType { get; set; }
public int? FileSize { get; set; }
public string? ThumbnailUrl { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual ChatMessage Message { get; set; } = null!;
}
