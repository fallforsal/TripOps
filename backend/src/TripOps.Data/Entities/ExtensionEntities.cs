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

public class SubscriptionPlan : BaseEntity<int> {
public string Name { get; set; } = string.Empty;
public string Slug { get; set; } = string.Empty;
public string? Description { get; set; }
public decimal PriceMonthly { get; set; }
public decimal? PriceYearly { get; set; }
public bool? IsPopular { get; set; } = false;
public int? SortOrder { get; set; } = 0;
public string? Status { get; set; } = "active";
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AgencySubscription : BaseEntity<int> {
public string AgencyId { get; set; } = string.Empty;
public int SubscriptionPlanId { get; set; }
public string BillingCycle { get; set; } = "monthly";
public decimal Price { get; set; }
public DateTime StartDate { get; set; }
public DateTime EndDate { get; set; }
public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
public bool? AutoRenew { get; set; } = true;
public DateTime? CancelledAt { get; set; }
public string? CancelReason { get; set; }
public DateTime? LastPaymentDate { get; set; }
public DateTime? NextPaymentDate { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
public virtual User Agency { get; set; } = null!;
public virtual SubscriptionPlan SubscriptionPlan { get; set; } = null!;
}

public class SubscriptionPaymentHistory : BaseEntity<int> {
public int AgencySubscriptionId { get; set; }
public string CompanyId { get; set; } = string.Empty;
public int PlanId { get; set; }
public decimal Amount { get; set; }
public string PaymentMethod { get; set; } = string.Empty;
public string? TransactionCode { get; set; }
public string Status { get; set; } = "PENDING";
public DateTime BillingPeriodStart { get; set; }
public DateTime BillingPeriodEnd { get; set; }
public DateTime? PaymentDate { get; set; }
public string? AdminNote { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual AgencySubscription AgencySubscription { get; set; } = null!;
}
