using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Bookings;

public static class BookingBilling
{
    public const string PriceReductionReason = "PRICE_REDUCTION";
    public static decimal NetPaidAmount(Booking b) => b.PaymentTransactions.Where(t=>t.Status==PaymentTransactionStatus.Success).Sum(t=>t.Amount)
        - b.RefundRequests.Where(r=>r.Reason==PriceReductionReason&&r.Status==RefundStatus.Completed).Sum(r=>r.ApprovedRefundAmount??0);
    public static bool IsSurcharge(PaymentRequest request) => request.Stage?.StartsWith("fee:", StringComparison.Ordinal) == true;
    public static decimal SurchargeTotal(Booking booking) => booking.PaymentRequests
        .Where(p => IsSurcharge(p) && p.Status != PaymentRequestStatus.Cancelled).Sum(p => p.Amount);
    public static decimal BaseTourAmount(Booking booking) => booking.Contracts.OrderBy(c=>c.Version).FirstOrDefault()?.TotalAmount ?? booking.TotalAmount - SurchargeTotal(booking);
    public static bool HasBeenApproved(Booking booking) => booking.Contracts.Count > 0 || booking.Status is
        BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid or BookingStatus.InProgress or BookingStatus.Completed;
}
