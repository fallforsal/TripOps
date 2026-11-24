using System.Globalization;
using System.Text;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;
using TripOps.Service.Tours;

namespace TripOps.Service.Ai;

/// <summary>
/// Tóm tắt đơn đặt tour của CHÍNH khách đang đăng nhập để chatbot trả lời "đơn của tôi" (trạng thái, đã trả, còn phải trả,
/// hạn thanh toán, hợp đồng, phí hủy nếu hủy hôm nay). Chỉ đọc; model không tự truy vấn nên không thấy được đơn của người khác.
/// Không gửi số điện thoại, email, danh sách hành khách hay tài khoản ngân hàng cho nhà cung cấp AI.
/// </summary>
public sealed class CustomerBookingDigest(BookingService bookings, DesignRequestService designRequests)
{
    private const int MaxBookings = 8;
    private const int MaxDesignRequests = 8;
    private static readonly CultureInfo Vi = new("vi-VN");

    /// <summary>Ghi chú hệ thống gửi model (khách chưa có đơn thì ghi rõ là chưa có).</summary>
    public async Task<string> Note(string customerId, CancellationToken ct)
    {
        var page = await bookings.ListForCustomer(customerId, null, 1, MaxBookings, ct);
        IReadOnlyList<DesignRequestDto> requests;
        try { requests = await designRequests.List(customerId, false, ct); }
        catch (TourException) { requests = []; } // tài khoản không phải khách hàng thì không có yêu cầu thiết kế
        var requestByBooking = requests.Where(r => r.BookingId.HasValue).GroupBy(r => r.BookingId!.Value).ToDictionary(g => g.Key, g => g.First().Id);
        var now = DateTime.UtcNow;
        var text = new StringBuilder();
        AppendDesignRequests(text, requests, page.Items.ToDictionary(b => b.Id, b => b.BookingCode));
        text.AppendLine($"ĐƠN CỦA KHÁCH (dữ liệu hệ thống lúc {Vietnam(now):HH:mm dd/MM/yyyy}, chỉ gồm đơn của chính khách đang đăng nhập; mới nhất trước):");
        if (page.Items.Count == 0)
        {
            text.AppendLine("Khách chưa có đơn đặt tour nào (chưa đặt tour nào, kể cả tour thiết kế riêng).");
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
                .Append(requestByBooking.TryGetValue(item.Id, out var requestId) ? $" (tour thiết kế riêng theo yêu cầu #{requestId})" : " (tour đặt sẵn)")
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

    /// <summary>Yêu cầu thiết kế tour riêng khách đã gửi (kể cả yêu cầu đã đặt tour, đã đóng hoặc bị từ chối).</summary>
    private static void AppendDesignRequests(StringBuilder text, IReadOnlyList<DesignRequestDto> requests, IReadOnlyDictionary<int, string> bookingCodes)
    {
        text.AppendLine("YÊU CẦU THIẾT KẾ TOUR RIÊNG KHÁCH ĐÃ GỬI (mục \"Thiết kế tour theo yêu cầu\" / \"Yêu cầu thiết kế tour của tôi\"; mới nhất trước):");
        if (requests.Count == 0)
        {
            text.AppendLine("Khách chưa gửi yêu cầu thiết kế tour nào.");
            return;
        }
        var shown = requests.OrderByDescending(r => r.CreatedAt).Take(MaxDesignRequests).ToList();
        for (var i = 0; i < shown.Count; i++)
        {
            var r = shown[i];
            text.Append(i + 1).Append(". Yêu cầu #").Append(r.Id);
            if (!string.IsNullOrWhiteSpace(r.SharedTourName)) text.Append(" – phương án \"").Append(r.SharedTourName).Append('"');
            text.Append(", điểm đến ").Append(r.Destination)
                .Append(r.DepartureProvinceName is { } from ? $", khởi hành từ {from}{(string.IsNullOrWhiteSpace(r.DeparturePoint) ? "" : $" ({r.DeparturePoint})")}" : "")
                .Append(", ").Append(Vietnam(r.DepartureDate).ToString("dd/MM/yyyy", Vi))
                .Append(r.ReturnDate is { } back ? " – " + Vietnam(back).ToString("dd/MM/yyyy", Vi) : "")
                .Append(", ").Append(r.NumberOfPeople).Append(" khách")
                .Append(r.BudgetPerPerson is { } budget ? $", ngân sách {Money(budget)}/khách" : "")
                .Append(", gửi cho ").Append(r.AgencyName)
                .Append(" ngày ").Append(Vietnam(r.CreatedAt).ToString("dd/MM/yyyy", Vi))
                .Append(". Trạng thái: ").Append(DesignStatusText(r.Status));
            if (r.QuotedPricePerPerson is { } quote && r.Status is "designed" or "booked") text.Append(", giá phương án ").Append(Money(quote)).Append("/khách");
            if (r.BookingId is { } bookingId)
                text.Append(", đã đặt thành đơn ").Append(bookingCodes.TryGetValue(bookingId, out var code) ? code : $"#{bookingId}");
            var partners = r.CoHosts?.Where(h => h.Role != "lead" && h.Status == "accepted").Select(h => h.CompanyName).Distinct().ToArray() ?? [];
            if (partners.Length > 0) text.Append(", đối tác cùng tổ chức: ").Append(string.Join(", ", partners));
            if (!string.IsNullOrWhiteSpace(r.RejectionReason) && r.RejectionReason.Trim('.', ' ').Length > 0) text.Append(", lý do từ chối: ").Append(r.RejectionReason.Trim());
            else if (!string.IsNullOrWhiteSpace(r.CloseReason) && r.CloseReason.Trim('.', ' ').Length > 0) text.Append(", lý do đóng: ").Append(r.CloseReason.Trim());
            text.AppendLine(".");
        }
        if (requests.Count > shown.Count)
            text.AppendLine($"(Khách còn {requests.Count - shown.Count} yêu cầu cũ hơn, xem trong mục \"Yêu cầu thiết kế tour của tôi\".)");
    }

    private static string DesignStatusText(string status) => status switch
    {
        "pending" => "chờ công ty lữ hành tiếp nhận",
        "reviewing" => "công ty lữ hành đang thiết kế phương án",
        "designed" => "đã có phương án, khách có thể xem và đặt tour",
        "booked" => "đã đặt tour",
        "closed" => "đã đóng yêu cầu",
        "cancelled" => "khách đã hủy yêu cầu",
        "rejected" => "công ty lữ hành không nhận",
        _ => status,
    };

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
