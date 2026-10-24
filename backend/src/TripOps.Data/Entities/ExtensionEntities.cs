using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class ChatConversation : BaseEntity<int>
{
    public string UserOneId { get; set; } = null!;
    public string UserTwoId { get; set; } = null!;
    public string? LastMessageContent { get; set; }
    public string? LastMessageSenderId { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public string Status { get; set; } = "active";

    public virtual User UserOne { get; set; } = null!;
    public virtual User UserTwo { get; set; } = null!;
    public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}

public class ChatMessage : BaseEntity<int>
{
    public int ConversationId { get; set; }
    public string SenderId { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string ContentType { get; set; } = "text";
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public int? ReplyToMessageId { get; set; }
    public bool IsEdited { get; set; }
    public bool IsDeleted { get; set; }

    public virtual ChatConversation Conversation { get; set; } = null!;
    public virtual User Sender { get; set; } = null!;
    public virtual ICollection<ChatAttachment> Attachments { get; set; } = new List<ChatAttachment>();
}

public class ChatAttachment : BaseEntity<int>
{
    public int MessageId { get; set; }
    public string FileUrl { get; set; } = null!;
    public string? FileName { get; set; }
    public long? FileSize { get; set; }
    public string? ContentType { get; set; }

    public virtual ChatMessage Message { get; set; } = null!;
}

public class SubscriptionPlan : BaseEntity<int>
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int DurationMonths { get; set; }
    public string? Features { get; set; } // JSON
    public string Status { get; set; } = "active";
}

public class AgencySubscription : BaseEntity<int>
{
    public string AgencyId { get; set; } = null!;
    public int SubscriptionPlanId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

    public virtual User Agency { get; set; } = null!;
    public virtual SubscriptionPlan SubscriptionPlan { get; set; } = null!;
}

public class SubscriptionPaymentHistory : BaseEntity<int>
{
    public int AgencySubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "SUCCESS";
    public string? TransactionCode { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    public virtual AgencySubscription AgencySubscription { get; set; } = null!;
}
