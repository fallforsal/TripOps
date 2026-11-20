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

    public const string PricingPolicy = """
        GIÁ TOUR VÀ GIÁ TRẺ EM
        - Giá hiển thị "từ ...đ/khách" là giá cho MỖI KHÁCH, không phải giá cả đoàn.
        - Mỗi tour có bảng "Giá theo độ tuổi" do công ty lữ hành (Agency) của tour đó đặt, ví dụ nhóm trẻ em và nhóm người lớn.
          Độ tuổi và mức giá từng nhóm khác nhau giữa các tour, nên phải xem đúng bảng giá của tour.
        - Mỗi hành khách được tính theo nhóm tuổi của mình; tuổi tính tại ngày khởi hành, theo ngày sinh khai khi đặt tour.
        - Tổng giá đơn = cộng giá của từng hành khách trong đoàn.

        GIÁ CÓ CỐ ĐỊNH KHÔNG
        - Tour trên TripOps không gò theo vài đợt cố định trong năm: khách tự chọn ngày khởi hành phù hợp với đoàn.
        - Vì vậy giá đang hiển thị là giá tham khảo theo bảng giá của công ty lữ hành. Giá thực tế có thể cao hơn hoặc thấp hơn một chút
          tùy ngày khởi hành (mùa cao điểm, lễ Tết), số khách và lựa chọn khách sạn, nhà hàng của đoàn.
        - Giá chính thức được công ty lữ hành xác nhận khi duyệt đơn đặt tour và ghi trong hợp đồng; khách xem rõ trước khi ký và thanh toán.
        - Sau khi ký hợp đồng, giá đã chốt. Nếu phát sinh điều chỉnh (đổi dịch vụ, thêm khách) thì khách được báo trên TripOps,
          và mỗi lần giá trị hợp đồng thay đổi sẽ lập phiên bản hợp đồng mới để khách ký lại.
        """;

    public const string PaymentPolicy = """
        THANH TOÁN (áp dụng cho mọi tour)
        - Đợt 1: đặt cọc 50% tổng giá trị đơn, hạn 24 giờ kể từ lúc Agency duyệt đơn.
        - Đợt 2: phần còn lại, phải thanh toán xong trước ngày khởi hành 7 ngày (ví dụ khởi hành 30/11 thì hạn chót hết ngày 22/11).
        - Tour sát ngày (không đủ thời gian chia hai đợt): thanh toán một lần 100% trong 24 giờ kể từ lúc duyệt.
        - Quá hạn thanh toán mà chưa trả đủ: đơn bị hủy và khách mất số tiền đã trả.
        """;

    public const string CancellationPolicy = """
        CHÍNH SÁCH HỦY MẶC ĐỊNH CỦA NỀN TẢNG (khách chủ động hủy)
        Mỗi công ty lữ hành có thể soạn chính sách hủy riêng trong hợp đồng: khi khách hỏi về một tour cụ thể,
        dùng trường cancellation_policy trong chi tiết tour đó; bảng dưới chỉ áp dụng cho tour của công ty chưa soạn chính sách riêng.
        Phí hủy tính theo % TỔNG GIÁ TRỊ TOUR, dựa trên số ngày còn lại trước ngày khởi hành tại lúc khách gửi yêu cầu hủy
        (trong ngoặc: phần được hoàn nếu khách đã thanh toán đủ 100%):
        - Từ 30 ngày trở lên: 0% (hoàn 100%)
        - 15–29 ngày: 25% (hoàn 75%)
        - 8–14 ngày: 50% (hoàn 50%)
        - 3–7 ngày: 75% (hoàn 25%)
        - 1–2 ngày: 90% (hoàn 10%)
        - Ngày khởi hành trở đi: 100% (không hoàn)
        - Trong 72 giờ sau lần thanh toán đầu tiên và còn ít nhất 15 ngày trước khởi hành: miễn phí hủy (0%).
        Ví dụ tour 10.000.000đ đã trả đủ, hủy trước 2 ngày: phí 9.000.000đ, hoàn 1.000.000đ.
        """;

    /// <summary>Chi tiết hoàn tiền: chỉ nêu khi khách hỏi đúng ý (cách tính, mới đặt cọc, Agency hủy), không kèm bảng phí hủy mặc định.</summary>
    public const string RefundDetails = """
        CHI TIẾT HOÀN TIỀN (CHỈ nêu khi khách hỏi đúng ý này)
        - Cách tính: tiền hoàn = số tiền đã trả − phí hủy (không âm), chuyển về tài khoản ngân hàng trong hồ sơ của khách.
        - Mới đặt cọc 50% mà hủy trong 3–7 ngày: phí 75% lớn hơn số đã trả nên không được hoàn.
        - Agency hủy tour: khách được hoàn 100% số đã trả.
        """;

    public const string CustomTour = """
        THIẾT KẾ TOUR THEO YÊU CẦU
        Ở mục "Thiết kế tour theo yêu cầu", khách đã đăng nhập mô tả điểm đến, thời gian, số người, ngân sách và mong muốn;
        công ty lữ hành gửi phương án lịch trình và báo giá để khách trao đổi, chỉnh sửa rồi đặt.
        """;

    public static string All => string.Join("\n\n", BookingProcess, PricingPolicy, PaymentPolicy, CancellationPolicy, RefundDetails, CustomTour);

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
