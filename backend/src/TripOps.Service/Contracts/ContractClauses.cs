namespace TripOps.Service.Contracts;

/// <summary>
/// Một điều của hợp đồng theo mẫu TripOps. <see cref="AutoContent"/> là phần hệ thống tự điền từ đơn đặt (bảng lịch trình,
/// bảng giá, lịch thanh toán, bảng phí hủy) và luôn in trước nội dung chữ; Agency chỉ sửa phần chữ.
/// </summary>
public sealed record ContractClause(string Key, string Title, string? AutoContent, string DefaultText);

/// <summary>Các điều của hợp đồng (trừ điều khoản bổ sung). Thứ tự là thứ tự in trong hợp đồng.</summary>
public static class ContractClauses
{
    public const string Program = "program";
    public const string Price = "price";
    public const string Payment = "payment";
    public const string Cancellation = "cancellation";
    public const string Changes = "changes";
    public const string Duties = "duties";
    public const string Closing = "closing";

    public const int MaxLength = 8000;

    public static readonly IReadOnlyList<ContractClause> All =
    [
        new(Program, "CHƯƠNG TRÌNH DU LỊCH", "Bảng chi tiết tour và lịch trình từng ngày theo đơn đặt",
            "Phương án khách đã chọn khác phương án mặc định (đổi khách sạn, đổi nhà hàng) được ghi trong lịch trình và tính vào giá tại Điều 2."),
        new(Price, "GIÁ TRỊ HỢP ĐỒNG", "Tổng giá trị hợp đồng và bảng giá theo khung độ tuổi",
            "Đơn giá đã gồm phụ thu của phương án khách chọn. Phụ thu phát sinh sau khi ký (đổi dịch vụ, thêm khách) được lập thành khoản thu riêng " +
            "trên TripOps và Bên B xác nhận trước khi thanh toán."),
        new(Payment, "PHƯƠNG THỨC VÀ TIẾN ĐỘ THANH TOÁN", "Bảng các đợt thanh toán, số tiền và hạn của đơn",
            "Bên B thanh toán qua cổng payOS trên TripOps (chuyển khoản QR), không chuyển thẳng cho Bên A. Giờ ghi theo giờ Việt Nam.\n" +
            "1. Bên B phải ký hợp đồng trước khi thanh toán Đợt 1.\n" +
            "2. Đợt 1 (đặt cọc) bằng 50% tổng giá trị, hạn 24 giờ kể từ khi Bên A duyệt. Đợt 2 (phần còn lại) hạn hết ngày trước ngày khởi hành 8 ngày. " +
            "Tour được duyệt khi còn dưới 8 ngày đến ngày khởi hành thì thanh toán một lần 100% trong 24 giờ.\n" +
            "3. Quá hạn một đợt thì không thanh toán được đợt đó nữa và áp dụng mục c) Điều 4.\n" +
            "4. Khoản thanh toán chỉ được ghi nhận khi payOS báo đã nhận đúng số tiền. Chuyển thiếu hoặc dư sẽ được Quản trị viên TripOps đối soát, không tự cộng vào đơn.\n" +
            "5. TripOps chuyển tiền cho Bên A (đã trừ phí sàn) 2 ngày sau khi tour kết thúc, khi Bên B đã thanh toán đủ; khiếu nại đang mở phải được Quản trị viên giải quyết trước."),
        new(Cancellation, "HỦY HỢP ĐỒNG VÀ HOÀN TIỀN", "Bảng phí hủy theo các mốc công ty đặt bên dưới và ghi chú chính sách hủy",
            "a) Bên B hủy: phí hủy theo bảng trên, tính trên tổng giá trị tour, theo số ngày còn lại trước ngày khởi hành lúc gửi yêu cầu. " +
            "Miễn phí (0%) nếu gửi trong 72 giờ sau khi thanh toán và còn từ 15 ngày trở lên. Số tiền hoàn = Số tiền đã thanh toán − Phí hủy (tối thiểu 0 đ).\n" +
            "b) Bên A hủy tour: Bên B được hoàn 100% số tiền đã thanh toán.\n" +
            "c) Bên B không thanh toán đủ đúng hạn: Bên A có quyền hủy hợp đồng và Bên B mất số tiền đã thanh toán.\n" +
            "d) Hợp đồng chấm dứt ngay khi yêu cầu hủy được gửi trên TripOps. Tiền hoàn chuyển vào tài khoản ngân hàng Bên B khai báo trong hồ sơ trong 7 ngày làm việc."),
        new(Changes, "THAY ĐỔI DỊCH VỤ, BẤT KHẢ KHÁNG, BẢO HIỂM", null,
            "1. Bên A đổi dịch vụ (khách sạn, nhà hàng, điểm tham quan) phải báo Bên B và dùng dịch vụ cùng hạng trở lên; chênh lệch tăng giá do Bên A chịu.\n" +
            "2. Thiên tai, dịch bệnh, quyết định của cơ quan nhà nước khiến tour không thực hiện được: các bên được miễn bồi thường; " +
            "TripOps quyết định hoàn 100% hoặc dời ngày, chỉ khấu trừ chi phí thực tế có chứng từ.\n" +
            "3. Bên A mua bảo hiểm du lịch cho toàn bộ thành viên trong đoàn suốt hành trình."),
        new(Duties, "QUYỀN VÀ NGHĨA VỤ", null,
            "• Bên A: thực hiện đúng chương trình và chất lượng đã cam kết; cử hướng dẫn viên; điểm danh khách mỗi ngày; báo ngay mọi thay đổi trên TripOps.\n" +
            "• Bên B: cung cấp đúng thông tin từng thành viên; thanh toán đúng hạn; phổ biến hợp đồng cho cả đoàn; có mặt đúng giờ tập trung; tuân thủ hướng dẫn của hướng dẫn viên.\n" +
            "• Trẻ em đi cùng người giám hộ có tên trong danh sách đoàn."),
        new(Closing, "KHIẾU NẠI VÀ HIỆU LỰC", "Phần ký của các bên và xác nhận ký điện tử",
            "1. Bên B gửi khiếu nại về chuyến đi trên TripOps trong 1 ngày sau khi tour kết thúc. Quản trị viên TripOps kết luận khiếu nại và báo kết quả cho các bên.\n" +
            "2. Tranh chấp giải quyết bằng thương lượng; không thành thì đưa ra Tòa án có thẩm quyền.\n" +
            "3. Hợp đồng lập bằng tiếng Việt, có hiệu lực khi Bên B ký (trực tuyến hoặc tải bản đã ký lên TripOps); mỗi bên lưu một bản điện tử. " +
            "Mỗi lần đổi giá trị hợp đồng lập phiên bản mới và ký lại."),
    ];

    public static ContractClause Get(string key) => All.First(c => c.Key == key);

    public static bool IsKnown(string key) => All.Any(c => c.Key == key);

    /// <summary>Chuẩn hóa xuống dòng và khoảng trắng để so với bản mặc định.</summary>
    public static string Normalize(string text) =>
        string.Join('\n', text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n').Select(l => l.TrimEnd())).Trim();
}
