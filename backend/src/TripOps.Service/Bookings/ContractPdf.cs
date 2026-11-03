using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace TripOps.Service.Bookings;

/// <summary>Dữ liệu điền vào hợp đồng (backend lấy từ booking đã duyệt; số tiền và hạn là của máy chủ).</summary>
public sealed record ContractData(
    string ContractNo, int Version, DateTime IssuedAtVietnam,
    string AgencyName, string? AgencyTaxCode, string? AgencyAddress, string? AgencyEmail, string? AgencyPhone,
    string CustomerName, string? CustomerPhone, string? CustomerEmail,
    string BookingCode, string TourName, DateTime StartDate, DateTime EndDate, int Guests,
    IReadOnlyList<(string Name, string? Tier, decimal? Price)> Participants,
    IReadOnlyList<(int Day, string Title)> Days,
    IReadOnlyList<(string Destination, string Hotel, int? Nights)> Hotels,
    decimal TotalAmount,
    IReadOnlyList<(string Stage, decimal Amount, string Deadline)> Schedule);

/// <summary>
/// Tạo hợp đồng lữ hành nội địa dạng PDF (QuestPDF). Nội dung theo Luật Du lịch 2017 Điều 39: chương trình,
/// giá và cách thanh toán, điều kiện hủy và trách nhiệm tài chính, bất khả kháng, bảo hiểm.
/// </summary>
public static class ContractPdf
{
    private static readonly CultureInfo Vi = new("vi-VN");

    static ContractPdf()
    {
        // Giấy phép Community: miễn phí cho cá nhân/tổ chức doanh thu dưới 1 triệu USD/năm (đồ án sinh viên).
        QuestPDF.Settings.License = LicenseType.Community;
        // Font hệ thống (Arial trên Windows) có đủ dấu tiếng Việt; không chặn khi máy thiếu font.
        QuestPDF.Settings.CheckIfAllTextGlyphsAreAvailable = false;
    }

    private static string Money(decimal value) => value.ToString("N0", Vi) + " đ";
    private static string Date(DateTime value) => value.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

    public static byte[] Generate(ContractData d) => Document.Create(document =>
    {
        document.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.8f, Unit.Centimetre);
            page.DefaultTextStyle(style => style.FontSize(10).FontFamily("Arial").LineHeight(1.3f));

            page.Header().Column(header =>
            {
                header.Item().AlignCenter().Text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").Bold();
                header.Item().AlignCenter().Text("Độc lập – Tự do – Hạnh phúc").Italic();
                header.Item().PaddingTop(8).AlignCenter().Text("HỢP ĐỒNG LỮ HÀNH NỘI ĐỊA").Bold().FontSize(15);
                header.Item().AlignCenter().Text($"Số: {d.ContractNo} · Phiên bản {d.Version} · Lập ngày {Date(d.IssuedAtVietnam)}");
            });

            page.Content().PaddingTop(12).Column(col =>
            {
                col.Spacing(6);
                col.Item().Text("Căn cứ Bộ luật Dân sự 2015, Luật Du lịch 2017 (Điều 39 về hợp đồng lữ hành) và Luật Bảo vệ quyền lợi người tiêu dùng 2023; " +
                    "các bên thống nhất ký hợp đồng thông qua nền tảng TripOps với các điều khoản sau.").Italic();

                Section(col, "CÁC BÊN");
                col.Item().Text(t =>
                {
                    t.Span("Bên A (Doanh nghiệp kinh doanh dịch vụ lữ hành): ").Bold();
                    t.Span(d.AgencyName);
                    if (!string.IsNullOrWhiteSpace(d.AgencyTaxCode)) t.Span($" · MST: {d.AgencyTaxCode}");
                    if (!string.IsNullOrWhiteSpace(d.AgencyAddress)) t.Span($" · Địa chỉ: {d.AgencyAddress}");
                    if (!string.IsNullOrWhiteSpace(d.AgencyPhone)) t.Span($" · ĐT: {d.AgencyPhone}");
                    if (!string.IsNullOrWhiteSpace(d.AgencyEmail)) t.Span($" · Email: {d.AgencyEmail}");
                });
                col.Item().Text(t =>
                {
                    t.Span("Bên B (Khách du lịch, đại diện đoàn): ").Bold();
                    t.Span(d.CustomerName);
                    if (!string.IsNullOrWhiteSpace(d.CustomerPhone)) t.Span($" · ĐT: {d.CustomerPhone}");
                    if (!string.IsNullOrWhiteSpace(d.CustomerEmail)) t.Span($" · Email: {d.CustomerEmail}");
                });
                col.Item().Text("Nền tảng TripOps là bên trung gian: thu hộ tiền tour, hoàn tiền theo chính sách và thanh toán cho Bên A sau khi tour kết thúc.");

                Section(col, "ĐIỀU 1. CHƯƠNG TRÌNH DU LỊCH");
                col.Item().Text($"Tour: {d.TourName} · Mã đặt chỗ: {d.BookingCode}");
                col.Item().Text($"Thời gian: từ {Date(d.StartDate)} đến {Date(d.EndDate)} · Số khách: {d.Guests}");
                if (d.Days.Count > 0)
                    col.Item().Text(string.Join("\n", d.Days.Select(x => $"Ngày {x.Day}: {x.Title}")));
                if (d.Hotels.Count > 0)
                    col.Item().Text("Lưu trú: " + string.Join("; ", d.Hotels.Select(h => $"{h.Destination} – {h.Hotel}{(h.Nights is int n ? $" ({n} đêm)" : "")}")));
                if (d.Participants.Count > 0)
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.ConstantColumn(28); c.RelativeColumn(4); c.RelativeColumn(2); c.RelativeColumn(2); });
                        table.Header(h =>
                        {
                            foreach (var title in new[] { "STT", "Họ tên khách", "Đối tượng", "Giá" })
                                h.Cell().Background(Colors.Grey.Lighten3).Padding(3).Text(title).Bold();
                        });
                        var i = 1;
                        foreach (var p in d.Participants)
                        {
                            table.Cell().Padding(3).Text((i++).ToString(CultureInfo.InvariantCulture));
                            table.Cell().Padding(3).Text(p.Name);
                            table.Cell().Padding(3).Text(p.Tier ?? "");
                            table.Cell().Padding(3).AlignRight().Text(p.Price is decimal price ? Money(price) : "");
                        }
                    });

                Section(col, "ĐIỀU 2. GIÁ TOUR VÀ PHƯƠNG THỨC THANH TOÁN");
                col.Item().Text(t => { t.Span("Tổng giá trị hợp đồng: "); t.Span(Money(d.TotalAmount)).Bold(); t.Span(" (đã gồm các dịch vụ trong chương trình)."); });
                col.Item().Text("Bên B thanh toán qua cổng payOS trên TripOps theo lịch sau (giờ Việt Nam). Quá hạn thì không thanh toán được khoản đó nữa:");
                foreach (var s in d.Schedule)
                    col.Item().PaddingLeft(10).Text($"• {s.Stage}: {Money(s.Amount)} – hạn {s.Deadline}");
                col.Item().Text("Đợt 1 (đặt cọc) bằng 50% tổng giá trị, hạn 24 giờ kể từ khi Bên A duyệt. Đợt 2 (phần còn lại) hạn hết ngày trước ngày khởi hành 8 ngày. " +
                    "Tour được duyệt sát ngày khởi hành thì thanh toán một lần 100% trong 24 giờ.");

                Section(col, "ĐIỀU 3. HỦY HỢP ĐỒNG VÀ HOÀN TIỀN");
                col.Item().Text("a) Bên B hủy: phí hủy tính trên tổng giá trị tour theo số ngày còn lại trước khởi hành tại lúc gửi yêu cầu: " +
                    "trong 72 giờ sau khi thanh toán và còn từ 15 ngày: 0%; còn từ 30 ngày: 0%; 15–29 ngày: 25%; 8–14 ngày: 50%; 3–7 ngày: 75%; " +
                    "1–2 ngày: 90%; ngày khởi hành hoặc không tham gia: 100%. Số tiền hoàn = số đã thanh toán − phí hủy (không âm).");
                col.Item().Text("b) Bên A hủy tour: Bên B được hoàn 100% số tiền đã thanh toán.");
                col.Item().Text("c) Bên B không thanh toán đủ đúng hạn: Bên A có quyền hủy hợp đồng và Bên B mất số tiền đã thanh toán (Bộ luật Dân sự 2015, Điều 328 về đặt cọc).");
                col.Item().Text("d) Hợp đồng chỉ chấm dứt khi Quản trị viên TripOps duyệt yêu cầu hủy. Tiền hoàn được chuyển trong 7 ngày làm việc kể từ khi duyệt.");

                Section(col, "ĐIỀU 4. BẤT KHẢ KHÁNG");
                col.Item().Text("Trường hợp thiên tai, dịch bệnh, quyết định của cơ quan nhà nước hoặc sự kiện khách quan khác (Bộ luật Dân sự 2015, Điều 156) " +
                    "khiến tour không thể thực hiện, các bên được miễn trách nhiệm bồi thường. Quản trị viên TripOps quyết định hoàn 100% hoặc dời ngày; " +
                    "chỉ khấu trừ chi phí thực tế không thu hồi được nếu Bên A có chứng từ.");

                Section(col, "ĐIỀU 5. BẢO HIỂM");
                col.Item().Text("Bên A mua bảo hiểm du lịch cho khách trong suốt hành trình theo quy định của pháp luật về du lịch và bảo hiểm.");

                Section(col, "ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ");
                col.Item().Text("Bên A thực hiện đúng chương trình, chất lượng dịch vụ đã cam kết và thông báo kịp thời mọi thay đổi. " +
                    "Bên B cung cấp thông tin chính xác, thanh toán đúng hạn và tuân thủ hướng dẫn của hướng dẫn viên.");

                Section(col, "ĐIỀU 7. HIỆU LỰC");
                col.Item().Text("Hợp đồng có hiệu lực khi Bên B ký và tải bản đã ký lên TripOps. Tranh chấp được giải quyết bằng thương lượng; " +
                    "không thương lượng được thì đưa ra Tòa án có thẩm quyền. Hợp đồng lập bằng tiếng Việt, mỗi bên lưu một bản điện tử trên TripOps.");

                col.Item().PaddingTop(16).Row(row =>
                {
                    row.RelativeItem().Column(a =>
                    {
                        a.Item().AlignCenter().Text("ĐẠI DIỆN BÊN A").Bold();
                        a.Item().AlignCenter().Text("(Đã xác nhận điện tử khi duyệt đơn trên TripOps)").Italic().FontSize(8);
                        a.Item().PaddingTop(30).AlignCenter().Text(d.AgencyName);
                    });
                    row.RelativeItem().Column(b =>
                    {
                        b.Item().AlignCenter().Text("BÊN B").Bold();
                        b.Item().AlignCenter().Text("(Ký và ghi rõ họ tên)").Italic().FontSize(8);
                        b.Item().PaddingTop(30).AlignCenter().Text(d.CustomerName);
                    });
                });
            });

            page.Footer().AlignCenter().Text(t =>
            {
                t.DefaultTextStyle(s => s.FontSize(8));
                t.Span($"{d.ContractNo} · Trang ");
                t.CurrentPageNumber();
                t.Span(" / ");
                t.TotalPages();
            });
        });
    }).GeneratePdf();

    private static void Section(ColumnDescriptor col, string title) =>
        col.Item().PaddingTop(6).Text(title).Bold().FontSize(11);
}
