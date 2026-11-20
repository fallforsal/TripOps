using System.Globalization;
using System.Text;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Ai;

/// <summary>
/// Tóm tắt đơn đặt tour của CHÍNH khách đang đăng nhập để chatbot trả lời "đơn của tôi" (trạng thái, đã trả, còn phải trả,
/// hạn thanh toán, hợp đồng, phí hủy nếu hủy hôm nay). Chỉ đọc; model không tự truy vấn nên không thấy được đơn của người khác.
/// Không gửi số điện thoại, email, danh sách hành khách hay tài khoản ngân hàng cho nhà cung cấp AI.
/// </summary>
public sealed class CustomerBookingDigest(BookingService bookings)
{
    private const int MaxBookings = 8;
    private static readonly CultureInfo Vi = new("vi-VN");

    /// <summary>Ghi chú hệ thống gửi model (khách chưa có đơn thì ghi rõ là chưa có).</summary>
    public async Task<string> Note(string customerId, CancellationToken ct)
    {
        var page = await bookings.ListForCustomer(customerId, null, 1, MaxBookings, ct);
        var now = DateTime.UtcNow;
        var text = new StringBuilder();
        text.AppendLine($"ĐƠN CỦA KHÁCH (dữ liệu hệ thống lúc {Vietnam(now):HH:mm dd/MM/yyyy}, chỉ gồm đơn của chính khách đang đăng nhập; mới nhất trước):");
        if (page.Items.Count == 0)
        {
            text.AppendLine("Khách chưa có đơn đặt tour nào.");
            return text.ToString();
        }
        for (var i = 0; i < page.Items.Count; i++)
        {
            var item = page.Items[i];
            BookingDto? detail = null;
            try { detail = await bookings.Get(customerId, item.Id, ct); }
            catch (BookingException) { /* đơn không đọc được chi tiết: vẫn nêu thông tin tóm tắt */ }

            text.Append(i + 1).Append(". Mã đơn ").Append(item.BookingCode)
                .Append(" – tour \"").Append(item.TourName ?? "(không tên)").Append('"')
                .Append(", khởi hành ").Append(Vietnam(item.StartDate).ToString("dd/MM/yyyy", Vi))
                .Append(", ").Append(item.TotalGuests).Append(" khách")
                .Append(". Trạng thái: ").Append(StatusText(item.Status))
                .Append(". Tổng ").Append(Money(item.TotalAmount)).Append(", đã trả ").Append(Money(item.PaidAmount))
                .Append(", còn lại ").Append(Money(Math.Max(0, item.TotalAmount - item.PaidAmount))).AppendLine(".");

            if (detail?.PaymentSchedule is { Count: > 0 } schedule)
                foreach (var s in schedule)
                    text.Append("   - ").Append(s.Description).Append(": ").Append(Money(s.Amount))
                        .Append(s.Outstanding > 0 && s.Status != "Paid" ? $", còn phải trả {Money(s.Outstanding)}" : "")
                        .Append(Due(s))
                        .Append(", ").Append(PaymentText(s.Status)).AppendLine(".");

            if (detail?.Contract is { } contract)
                text.Append("   - Hợp đồng ").Append(contract.ContractNo).Append(" (phiên bản ").Append(contract.Version).Append("): ")
                    .Append(ContractText(contract.Status)).AppendLine(".");

            if (detail?.Cancellation is { } cancellation)
                text.Append("   - Đã gửi yêu cầu hủy").Append(cancellation.SuggestedRefund is { } refund ? $", tiền hoàn dự kiến {Money(refund)}" : "").AppendLine(".");
            else if (item.Status is not ("Cancelled" or "Rejected" or "Completed"))
            {
                try
                {
                    var quote = await bookings.CustomerCancellationQuote(customerId, item.Id, ct);
                    text.Append("   - Nếu hủy ngay bây giờ (còn ").Append(quote.DaysBeforeDeparture).Append(" ngày): phí ")
                        .Append(quote.FeePercent.ToString("0.##", Vi)).Append("% = ").Append(Money(quote.Fee))
                        .Append(", được hoàn ").Append(Money(quote.RefundAmount))
                        .Append(quote.CoolingOff ? " (đang trong 72 giờ cân nhắc nên miễn phí)" : "").AppendLine(".");
                }
                catch (BookingException ex)
                {
                    text.Append("   - Hủy trực tuyến: chưa thực hiện được (").Append(ex.Message).AppendLine(").");
                }
            }
        }
        if (page.Total > page.Items.Count)
            text.AppendLine($"(Khách còn {page.Total - page.Items.Count} đơn cũ hơn, xem trong mục \"Đơn của tôi\".)");
        return text.ToString();
    }

    private static DateTime Vietnam(DateTime utc) => utc.Kind == DateTimeKind.Unspecified && utc.TimeOfDay == TimeSpan.Zero
        ? utc
        : DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(PaymentRules.VietnamOffset);

    /// <summary>Hạn thanh toán: "hạn 14:30 21/11/2026", hạn đúng nửa đêm thì ghi "hạn hết ngày 22/12/2026".</summary>
    private static string Due(PaymentScheduleItemDto item)
    {
        if (item.DueAt is not { } due) return item.DueDate is { } day ? $", hạn hết ngày {day.ToString("dd/MM/yyyy", Vi)}" : "";
        var local = Vietnam(due);
        return local.TimeOfDay == TimeSpan.Zero
            ? $", hạn hết ngày {local.AddDays(-1).ToString("dd/MM/yyyy", Vi)}"
            : $", hạn {local.ToString("HH:mm dd/MM/yyyy", Vi)}";
    }

    private static string Money(decimal value) => value.ToString("#,##0", Vi) + "đ";

    private static string StatusText(string status) => status switch
    {
        "Pending" => "chờ công ty lữ hành duyệt",
        "Confirmed" => "đã được công ty lữ hành duyệt, chờ thanh toán đặt cọc",
        "Deposited" => "đã đặt cọc, chờ thanh toán phần còn lại",
        "Paid" => "đã thanh toán đủ, chờ khởi hành",
        "InProgress" => "tour đang diễn ra",
        "Completed" => "tour đã kết thúc",
        "Cancelled" => "đã hủy",
        "Rejected" => "công ty lữ hành đã từ chối",
        _ => status,
    };

    private static string PaymentText(string status) => status switch
    {
        "Paid" => "đã thanh toán",
        "Overdue" => "ĐÃ QUÁ HẠN",
        "Pending" => "chưa thanh toán",
        "Scheduled" => "chưa đến lượt (sau khi đặt cọc)",
        "NotIssued" => "chưa phát hành",
        _ => status,
    };

    private static string ContractText(string status) => status switch
    {
        "AwaitingSignature" => "chờ khách ký",
        "Signed" => "khách đã ký, chờ công ty xác nhận",
        "Verified" => "đã xác nhận hợp lệ",
        "ResignRequested" => "cần ký lại",
        _ => status,
    };
}
