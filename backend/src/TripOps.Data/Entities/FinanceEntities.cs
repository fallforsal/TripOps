using TripOps.Data.Common;
using TripOps.Data.Enums;
namespace TripOps.Data.Entities;
public class PaymentRequest : BaseEntity<int> {
public int BookingId { get; set; }
/// <summary>Đợt thu: "deposit" (cọc) hoặc "balance" (phần còn lại). NULL = khoản cũ trước khi có lịch thanh toán.</summary>
public string? Stage { get; set; }
public string Description { get; set; } = string.Empty;
public decimal Amount { get; set; }
public DateTime? DueDate { get; set; }
public PaymentRequestStatus? Status { get; set; } = PaymentRequestStatus.Pending;
public string? CreatedBy { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? PaidAt { get; set; }
public virtual Booking Booking { get; set; } = null!;
public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
}

public class PaymentTransaction : BaseEntity<int> {
public int BookingId { get; set; }
public int? PaymentRequestId { get; set; }
public string TransactionCode { get; set; } = string.Empty;
public string PaymentMethod { get; set; } = string.Empty;
public decimal Amount { get; set; }
public PaymentTransactionStatus? Status { get; set; } = PaymentTransactionStatus.Success;
public string? PayerName { get; set; }
public string? ProofImageUrl { get; set; }
public DateTime? PaidAt { get; set; } = DateTime.UtcNow;
/// <summary>Mã giao dịch phía cổng thanh toán (VNPAY: vnp_TransactionNo).</summary>
public string? GatewayTransactionNo { get; set; }
/// <summary>Mã kết quả cổng trả về (VNPAY: vnp_ResponseCode).</summary>
public string? GatewayResponseCode { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public virtual Booking Booking { get; set; } = null!;
public virtual PaymentRequest? PaymentRequest { get; set; }
}

public class RefundRequest : BaseEntity<int> {
public int BookingId { get; set; }
public string RequestedBy { get; set; } = string.Empty;
public string Reason { get; set; } = string.Empty;
public string ReasonDetail { get; set; } = string.Empty;
public string? EvidenceUrls { get; set; }
public decimal OriginalPaidAmount { get; set; }
public decimal? ApprovedRefundAmount { get; set; }
public decimal? RefundFee { get; set; } = 0m;
public string? RefundBankName { get; set; }
public string? RefundAccountNumber { get; set; }
public string? RefundAccountHolder { get; set; }
public RefundStatus Status { get; set; } = RefundStatus.Pending;
public string? ReviewedBy { get; set; }
public string? AdminNote { get; set; }
public string? RejectionReason { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? ReviewedAt { get; set; }
public DateTime? CompletedAt { get; set; }
public virtual Booking Booking { get; set; } = null!;
public virtual User Requester { get; set; } = null!;
public virtual User? Reviewer { get; set; }
}

public class SystemBankAccount : BaseEntity<int> {
public string BankName { get; set; } = string.Empty;
public string BankCode { get; set; } = string.Empty;
public string AccountNumber { get; set; } = string.Empty;
public string AccountHolderName { get; set; } = string.Empty;
public string? Branch { get; set; }
public bool? IsDefault { get; set; } = true;
public string? Status { get; set; } = "ACTIVE";
public string? Notes { get; set; }
public string? UpdatedBy { get; set; }
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class SystemCommissionConfig : BaseEntity<int> {
public decimal Percentage { get; set; }
public string? Note { get; set; }
public bool? IsActive { get; set; } = true;
public DateTime? AppliedFrom { get; set; } = DateTime.UtcNow;
public string CreatedBy { get; set; } = string.Empty;
public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
}
