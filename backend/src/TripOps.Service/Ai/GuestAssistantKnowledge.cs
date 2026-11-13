using System.Globalization;
using System.Text;

namespace TripOps.Service.Ai;

/// <summary>
/// Kiến thức công khai của nền tảng mà chatbot khách vãng lai được phép dùng.
/// Nội dung lấy đúng theo quy tắc đang chạy trong code (PaymentRules, CancellationPolicy) để AI không tự bịa.
/// </summary>
public static class GuestAssistantKnowledge
{
    public const string BookingProcess = """
        QUY TRÌNH ĐẶT TOUR TRÊN TRIPOPS
        1. Tìm tour ở mục "Khám phá tour" (lọc theo điểm đến, ngày khởi hành, số khách) và xem chi tiết lịch trình, giá theo độ tuổi.
        2. Đăng nhập (hoặc đăng ký tài khoản khách hàng), chọn ngày khởi hành, số khách, điền thông tin liên hệ và danh sách hành khách rồi gửi yêu cầu đặt tour.
        3. Công ty lữ hành (Agency) xem và duyệt yêu cầu.
        4. Khách ký hợp đồng điện tử trên hệ thống, sau đó thanh toán theo lịch.
        5. Theo dõi trạng thái đơn, lịch thanh toán, hợp đồng và nhắn tin với Agency trong mục "Đơn của tôi".
        """;

    public const string PaymentPolicy = """
        THANH TOÁN (áp dụng cho mọi tour)
        - Đợt 1: đặt cọc 50% tổng giá trị đơn, hạn 24 giờ kể từ lúc Agency duyệt đơn.
        - Đợt 2: phần còn lại, phải thanh toán xong trước ngày khởi hành 7 ngày (ví dụ khởi hành 30/11 thì hạn chót hết ngày 22/11).
        - Tour sát ngày (không đủ thời gian chia hai đợt): thanh toán một lần 100% trong 24 giờ kể từ lúc duyệt.
        - Quá hạn thanh toán mà chưa trả đủ: đơn bị hủy và khách mất số tiền đã trả.
        """;

    public const string CancellationPolicy = """
        CHÍNH SÁCH HỦY TOUR CHUNG CỦA NỀN TẢNG (khách chủ động hủy)
        Phí hủy tính theo % tổng giá trị tour, dựa trên số ngày còn lại trước ngày khởi hành tại lúc khách gửi yêu cầu hủy:
        - Từ 30 ngày trở lên: 0%
        - 15–29 ngày: 25%
        - 8–14 ngày: 50%
        - 3–7 ngày: 75%
        - 1–2 ngày: 90%
        - Ngày khởi hành trở đi: 100%
        - Trong 72 giờ sau lần thanh toán đầu tiên và còn ít nhất 15 ngày trước khởi hành: miễn phí hủy (0%).
        Tiền hoàn = số tiền đã trả − phí hủy (không âm), chuyển về tài khoản ngân hàng khách cung cấp.
        Nếu Agency hủy tour: khách được hoàn 100% số đã trả.
        """;

    public const string CustomTour = """
        THIẾT KẾ TOUR THEO YÊU CẦU
        Ở mục "Thiết kế tour theo yêu cầu", khách đã đăng nhập mô tả điểm đến, thời gian, số người, ngân sách và mong muốn;
        công ty lữ hành gửi phương án lịch trình và báo giá để khách trao đổi, chỉnh sửa rồi đặt.
        """;

    public static string All => string.Join("\n\n", BookingProcess, PaymentPolicy, CancellationPolicy, CustomTour);

    /// <summary>Chữ thường, bỏ dấu, đ → d, chỉ giữ chữ/số và một dấu cách.</summary>
    public static string Fold(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var decomposed = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            var lower = c is 'đ' or 'Đ' ? 'd' : char.ToLowerInvariant(c);
            builder.Append(char.IsLetterOrDigit(lower) ? lower : ' ');
        }
        return string.Join(' ', builder.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
