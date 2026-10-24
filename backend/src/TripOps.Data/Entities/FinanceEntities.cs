using TripOps.Data.Common;
using TripOps.Data.Enums;

namespace TripOps.Data.Entities;

public class PaymentRequest : BaseEntity<int>
{
    public int BookingId { get; set; }
    public decimal Amount { get; set; }
    public string Type { get; set; } = "DEPOSIT"; // DEPOSIT, REMAINING
    public PaymentRequestStatus Status { get; set; } = PaymentRequestStatus.Pending;
    public DateTime? DueDate { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
}

public class PaymentTransaction : BaseEntity<int>
{
    public int? PaymentRequestId { get; set; }
    public int BookingId { get; set; }
    public string TransactionCode { get; set; } = null!;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "VIETQR";
    public PaymentTransactionStatus Status { get; set; } = PaymentTransactionStatus.Pending;
    public string? BankReference { get; set; }
    public string? ProofImageUrl { get; set; }
    public string? ConfirmedBy { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual PaymentRequest? PaymentRequest { get; set; }
    public virtual User? Confirmer { get; set; }
}

public class RefundRequest : BaseEntity<int>
{
    public int BookingId { get; set; }
    public string RequestedBy { get; set; } = null!;
    public decimal Amount { get; set; }
    public string Reason { get; set; } = null!;
    public RefundStatus Status { get; set; } = RefundStatus.Pending;
    public string? AdminNote { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime? ProcessedAt { get; set; }

    public virtual Booking Booking { get; set; } = null!;
    public virtual User Requester { get; set; } = null!;
    public virtual User? Reviewer { get; set; }
}

public class SystemBankAccount : BaseEntity<int>
{
    public string BankName { get; set; } = null!;
    public string AccountNumber { get; set; } = null!;
    public string AccountHolderName { get; set; } = null!;
    public string? QrTemplate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SystemCommissionConfig : BaseEntity<int>
{
    public string Name { get; set; } = null!;
    public decimal Percentage { get; set; } = 8.00m; // 8% theo Q9
    public bool IsActive { get; set; } = true;
}
