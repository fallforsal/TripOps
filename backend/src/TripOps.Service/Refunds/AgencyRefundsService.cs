using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Service.Refunds;

/// <summary>Một yêu cầu hủy/hoàn tiền trong màn hình Agency (UC-068/UC-069). Chỉ xem, không thao tác — Admin mới duyệt/từ chối.
/// Không trả số tài khoản ngân hàng đầy đủ của khách, chỉ trả dạng che.</summary>
public sealed record AgencyRefundDto(
    int Id, int BookingId, string BookingCode, string? TourName, DateTime StartDate,
    string? CustomerName,
    string Reason, string ReasonDetail, string Status, string RequestedByRole,
    decimal PaidAmount, decimal FeePercent, decimal Fee, decimal SuggestedRefund, decimal? ApprovedRefundAmount,
    string? RefundBankMasked,
    string? AdminNote, string? RejectionReason,
    DateTime CreatedAt, DateTime? ReviewedAt, DateTime? CompletedAt,
    /// <summary>Tiền Agency nhận cho booking này (null = booking không có khoản quyết toán, ví dụ chưa hoàn thành tour).</summary>
    decimal? AgencyNetPayout,
    /// <summary>Trạng thái quyết toán của booking này (Unpaid/Ready/Processing/Paid/Failed/OnHold), null = chưa có.</summary>
    string? AgencySettlementStatus);

/// <summary>
/// Agency chủ trì (IsHost) xem lịch sử và chi tiết các yêu cầu hủy/hoàn tiền của khách trong booking mình chủ trì.
/// Agency đối tác trong booking liên minh không chủ trì thì không xem được (chỉ Agency chủ trì mới thấy, theo quyết định
/// của nhóm: hoàn tiền ảnh hưởng trực tiếp tới tiền Agency chủ trì thu/chia, nên để một đầu mối theo dõi).
/// Chỉ đọc: duyệt/từ chối hoàn tiền vẫn là việc của Admin (xem AdminRefundsController).
/// </summary>
public sealed class AgencyRefundsService(TripOpsDbContext db)
{
    public async Task<IReadOnlyList<AgencyRefundDto>> List(string agencyId, string? status, DateTime? from, DateTime? to, string? search, CancellationToken ct)
    {
        RefundStatus? filter = null;
        if (!string.IsNullOrWhiteSpace(status))
            filter = Enum.TryParse<RefundStatus>(status, true, out var parsed)
                ? parsed : throw new BookingException(400, "Trạng thái lọc không hợp lệ.");

        var rows = await Rows(agencyId).ToListAsync(ct);
        var result = rows.Select(Map).ToList();

        if (filter is { } wanted) result = result.Where(r => r.Status == wanted.ToString()).ToList();
        if (from is { } f) result = result.Where(r => r.CreatedAt >= f.Date).ToList();
        if (to is { } t) result = result.Where(r => r.CreatedAt < t.Date.AddDays(1)).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var needle = search.Trim();
            result = result.Where(r =>
                r.BookingCode.Contains(needle, StringComparison.OrdinalIgnoreCase) ||
                (r.TourName?.Contains(needle, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (r.CustomerName?.Contains(needle, StringComparison.OrdinalIgnoreCase) ?? false)).ToList();
        }

        return result
            .OrderBy(r => r.Status is "Pending" or "Reviewing" ? 0 : 1)
            .ThenByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
            .ToList();
    }

    public async Task<AgencyRefundDto> Get(string agencyId, int id, CancellationToken ct)
    {
        var row = await Rows(agencyId).SingleOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy yêu cầu hoàn tiền.");
        return Map(row);
    }

    // Chỉ các yêu cầu hoàn tiền của booking mà Agency này là Agency CHỦ TRÌ (IsHost).
    private IQueryable<RefundRequest> Rows(string agencyId) => db.RefundRequests.AsNoTracking()
        .Include(r => r.Booking).ThenInclude(b => b.Customer)
        .Include(r => r.Booking).ThenInclude(b => b.Tour)
        .Include(r => r.Booking).ThenInclude(b => b.BookingAgencies)
        .Where(r => r.Booking.BookingAgencies.Any(a => a.AgencyId == agencyId && a.IsHost == true))
        .AsSplitQuery();

    private static AgencyRefundDto Map(RefundRequest refund)
    {
        var booking = refund.Booking;
        var own = booking.BookingAgencies.FirstOrDefault(a => a.IsHost == true);
        return new AgencyRefundDto(
            refund.Id, refund.BookingId, booking.BookingCode, booking.Tour?.Name, booking.StartDate,
            booking.Customer?.Name ?? booking.ContactName,
            refund.Reason, refund.ReasonDetail, refund.Status.ToString(), RequestedByRole(refund),
            refund.OriginalPaidAmount, FeePercentOf(refund, booking.TotalAmount), refund.RefundFee ?? 0,
            SuggestedRefund(refund), refund.ApprovedRefundAmount,
            Mask(refund.RefundBankName, refund.RefundAccountNumber),
            refund.AdminNote, refund.RejectionReason,
            Utc(refund.CreatedAt) ?? DateTime.UnixEpoch, Utc(refund.ReviewedAt), Utc(refund.CompletedAt),
            own?.NetPayout, own?.SettlementStatus?.ToString());
    }

    private static decimal SuggestedRefund(RefundRequest refund) => Math.Max(0, refund.OriginalPaidAmount - (refund.RefundFee ?? 0));

    private static decimal FeePercentOf(RefundRequest refund, decimal total) => refund.Reason switch
    {
        BookingService.ReasonAgencyCancelled => 0m,
        BookingService.ReasonPaymentOverdue => 100m,
        _ => total > 0 ? decimal.Round((refund.RefundFee ?? 0) * 100m / total, 2) : 0m
    };

    private static string RequestedByRole(RefundRequest refund) =>
        refund.Reason is BookingService.ReasonAgencyCancelled or BookingService.ReasonPaymentOverdue ? "agency" : "customer";

    /// <summary>Không lộ số tài khoản khách cho Agency: chỉ "Ngân hàng ****1234".</summary>
    private static string? Mask(string? bankName, string? accountNumber)
    {
        if (string.IsNullOrWhiteSpace(bankName) && string.IsNullOrWhiteSpace(accountNumber)) return null;
        var tail = accountNumber?.Length > 4 ? accountNumber[^4..] : accountNumber;
        return $"{bankName} {(tail is null ? "" : new string('*', 4) + tail)}".Trim();
    }

    private static DateTime? Utc(DateTime? value) => value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
}
