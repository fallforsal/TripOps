using TripOps.Data.Enums;
using TripOps.Service.Payments;
using TripOps.Service.Settlements;

namespace TripOps.Service.Bookings;

public sealed partial class BookingService
{
    public async Task<BookingDto> Complete(string agencyId, int id, AgencySettlementService settlements, CancellationToken ct)
    {
        // Serialize completion with payments/cancellation so retries cannot move the payout deadline.
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency chủ trì được hoàn thành booking.");

        if (booking.Status == BookingStatus.Completed)
        {
            await transaction.CommitAsync(ct);
            return await Get(agencyId, id, ct);
        }
        if (booking.Status != BookingStatus.InProgress)
            throw new BookingException(409, "Chỉ có thể hoàn thành booking đang diễn ra.");

        if (booking.BookingAgencies.Count > 1)
        {
            var lastDay = booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(1).Max();
            if (booking.StartDate.Date.AddDays(Math.Max(0, lastDay - 1)) > PaymentRules.VietnamDate(UtcNow))
                throw new BookingException(409, "Tour liên minh chưa đến ngày kết thúc để quyết toán.");
        }

        booking.Status = BookingStatus.Completed;
        booking.UpdatedAt = UtcNow;
        await settlements.MarkTourCompleted(booking, ct);
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(agencyId, id, ct);
    }
}
