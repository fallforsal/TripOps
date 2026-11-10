using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Bookings;

public static class BookingBilling
{
    public static bool IsSurcharge(PaymentRequest request) => request.Stage?.StartsWith("fee:", StringComparison.Ordinal) == true;
    public static decimal SurchargeTotal(Booking booking) => booking.PaymentRequests
        .Where(p => IsSurcharge(p) && p.Status != PaymentRequestStatus.Cancelled).Sum(p => p.Amount);
    public static decimal BaseTourAmount(Booking booking) => booking.TotalAmount - SurchargeTotal(booking);
    public static bool HasBeenApproved(Booking booking) => booking.Contracts.Count > 0 || booking.Status is
        BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid or BookingStatus.InProgress or BookingStatus.Completed;
}
