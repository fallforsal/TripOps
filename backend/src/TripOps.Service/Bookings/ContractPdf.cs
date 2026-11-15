using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace TripOps.Service.Bookings;

/// <summary>Một ngày trong lịch trình: tiêu đề, các bữa ăn đã bao gồm và nơi lưu trú đêm đó.</summary>
public sealed record ContractDay(int Day, DateTime Date, string Title, string? Meals, string? Stay);

/// <summary>Agency đồng tổ chức trong tour liên minh và số tiền phần việc của Agency đó.</summary>
public sealed record ContractCoHost(string Name, string? TaxCode, decimal Amount);

/// <summary>Dữ liệu điền vào hợp đồng (backend lấy từ booking đã duyệt; số tiền và hạn là của máy chủ).</summary>
public sealed record ContractData(
    string ContractNo, int Version, DateTime IssuedAtVietnam, DateTime? BookedAtVietnam,
    string AgencyName, string? AgencyTaxCode, string? AgencyAddress, string? AgencyEmail, string? AgencyPhone,
    IReadOnlyList<ContractCoHost> CoHosts,
    string CustomerName, string? CustomerPhone, string? CustomerEmail, string? CustomerOrganization,
    string BookingCode, string TourName, DateTime StartDate, DateTime EndDate, int Guests,
    IReadOnlyList<(string Name, string? Tier, decimal? Price)> Participants,
    IReadOnlyList<ContractDay> Days,
    decimal TotalAmount,
    IReadOnlyList<(string Stage, decimal Amount, string Deadline)> Schedule);

/// <summary>Chữ ký trực tuyến của Bên B (ảnh PNG khách vẽ) và thông tin xác thực ghi vào bản đã ký.</summary>
public sealed record ContractSignature(byte[] Png, DateTime SignedAtVietnam, string MaskedEmail, string SessionRef);

/// <summary>
/// Hợp đồng dịch vụ du lịch theo đoàn (hợp đồng lữ hành nội địa) dạng PDF (QuestPDF). Nội dung theo Luật Du lịch 2017
/// Điều 39: chương trình, giá và cách thanh toán, điều kiện hủy và trách nhiệm tài chính, bất khả kháng, bảo hiểm.
/// Trình bày theo kiểu phiếu xác nhận: bảng chi tiết đơn, bảng giá, lịch thanh toán, điều khoản đánh số, phần ký của cả đoàn.
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
    private static string Number(decimal value) => value.ToString("N0", Vi);
    private static string Date(DateTime value) => value.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
    private static string DateTimeText(DateTime value) => value.ToString("HH:mm dd/MM/yyyy", CultureInfo.InvariantCulture);

    public static byte[] Generate(ContractData d, ContractSignature? signature = null) => Document.Create(document =>
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
                header.Item().PaddingTop(8).AlignCenter().Text("HỢP ĐỒNG DỊCH VỤ DU LỊCH THEO ĐOÀN").Bold().FontSize(15);
                header.Item().AlignCenter().Text("(Hợp đồng lữ hành nội địa)").Italic();
                header.Item().AlignCenter().Text($"Số: {d.ContractNo} · Phiên bản {d.Version.ToString(CultureInfo.InvariantCulture)} · Lập ngày {Date(d.IssuedAtVietnam)} trên nền tảng TripOps");
            });

            page.Content().PaddingTop(12).Column(col =>
            {
                col.Spacing(6);
                KeyValues(col, "Thông tin đơn", [
                    ("Mã đặt chỗ", d.BookingCode),
                    ("Thời gian tạo đơn", d.BookedAtVietnam is { } booked ? DateTimeText(booked) : null),
                    ("Thời gian lập hợp đồng (Bên A duyệt đơn)", DateTimeText(d.IssuedAtVietnam))]);
                col.Item().Text("Căn cứ Bộ luật Dân sự 2015, Luật Du lịch 2017 (Điều 39 về hợp đồng lữ hành), Luật Bảo vệ quyền lợi người tiêu dùng 2023 " +
                    "và Luật Giao dịch điện tử 2023, các bên thống nhất ký hợp đồng thông qua nền tảng TripOps với các điều khoản sau.").Italic();

                Section(col, "CÁC BÊN");
                col.Item().Text("Bên A – Doanh nghiệp lữ hành chủ trì tour").Bold();
                KeyValues(col, null, [
                    ("Tên doanh nghiệp", d.AgencyName),
                    ("Mã số thuế", d.AgencyTaxCode),
                    ("Địa chỉ", d.AgencyAddress),
                    ("Điện thoại / Email", Join(d.AgencyPhone, d.AgencyEmail))]);
                if (d.CoHosts.Count > 0)
                {
                    col.Item().Text("Doanh nghiệp đồng tổ chức (tour liên minh)").Bold();
                    Table(col, ["Doanh nghiệp", "Mã số thuế", "Giá trị phần việc"], [3, 2, 2],
                        d.CoHosts.Select(c => new[] { c.Name, c.TaxCode ?? "", Money(c.Amount) }), alignRightLast: true);
                    col.Item().Text("Bên A chịu trách nhiệm chính với Bên B trên toàn bộ hành trình.");
                }
                col.Item().Text("Bên B – Khách du lịch (đại diện đoàn)").Bold();
                KeyValues(col, null, [
                    ("Họ tên người đại diện", d.CustomerName),
                    ("Điện thoại / Email", Join(d.CustomerPhone, d.CustomerEmail)),
                    ("Đơn vị / cơ quan", d.CustomerOrganization),
                    ("Số khách trong đoàn", d.Guests.ToString(CultureInfo.InvariantCulture))]);
                col.Item().Text("Bên B ký thay mặt cả đoàn và cam kết đã được các thành viên đồng ý.");
                col.Item().Text(t =>
                {
                    t.Span("Nền tảng TripOps").Bold();
                    t.Span(" là bên trung gian: thu hộ tiền tour, hoàn tiền theo chính sách và thanh toán cho Bên A sau khi tour kết thúc; " +
                        "không phải bên cung cấp dịch vụ du lịch.");
                });

                Section(col, "ĐIỀU 1. CHƯƠNG TRÌNH DU LỊCH");
                KeyValues(col, "Chi tiết tour", [
                    ("Tên tour", d.TourName),
                    ("Ngày khởi hành – ngày kết thúc", $"{Date(d.StartDate)} – {Date(d.EndDate)}"),
                    ("Số khách", d.Guests.ToString(CultureInfo.InvariantCulture)),
                    ("Hướng dẫn viên", "Bên A phân công và báo tên, số điện thoại trước ngày khởi hành")]);
                if (d.Days.Count > 0)
                {
                    col.Item().Text("Lịch trình").Bold();
                    Table(col, ["Ngày", "Nội dung", "Bữa ăn", "Lưu trú"], [1.3f, 4, 1.6f, 2.6f],
                        d.Days.Select(x => new[] { $"{x.Day.ToString(CultureInfo.InvariantCulture)} – {x.Date:dd/MM}", x.Title, x.Meals ?? "–", x.Stay ?? "–" }));
                }
                col.Item().Text("Phương án khách đã chọn khác phương án mặc định (đổi khách sạn, đổi nhà hàng) được ghi trong lịch trình và tính vào giá tại Điều 2.");

                Section(col, "ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG");
                col.Item().Text(t => { t.Span("Tổng giá trị hợp đồng là "); t.Span(Money(d.TotalAmount)).Bold(); t.Span(" (đã gồm các dịch vụ nêu tại Điều 1), tính theo khung giá độ tuổi tại ngày khởi hành."); });
                var groups = d.Participants.GroupBy(p => (Tier: p.Tier ?? "Khách", Price: p.Price ?? 0m))
                    .Select(g => new[] { g.Key.Tier, g.Count().ToString(CultureInfo.InvariantCulture), Number(g.Key.Price), Number(g.Key.Price * g.Count()) })
                    .ToList();
                groups.Add(["Tổng cộng", d.Participants.Count.ToString(CultureInfo.InvariantCulture), "", Number(d.TotalAmount)]);
                Table(col, ["Khung giá", "Số khách", "Đơn giá (đ/khách)", "Thành tiền (đ)"], [3, 1.3f, 2, 2], groups, alignRightLast: true, boldLastRow: true);
                col.Item().Text("Đơn giá đã gồm phụ thu của phương án khách chọn. Phụ thu phát sinh sau khi ký (đổi dịch vụ, thêm khách) được lập thành khoản thu riêng " +
                    "trên TripOps và Bên B xác nhận trước khi thanh toán.");

                Section(col, "ĐIỀU 3. PHƯƠNG THỨC VÀ TIẾN ĐỘ THANH TOÁN");
                col.Item().Text("Bên B thanh toán qua cổng payOS trên TripOps (chuyển khoản QR), không chuyển thẳng cho Bên A. Giờ ghi theo giờ Việt Nam.");
                if (d.Schedule.Count > 0)
                    Table(col, ["Đợt", "Số tiền (đ)", "Hạn thanh toán"], [3, 2, 3],
                        d.Schedule.Select(s => new[] { s.Stage, Number(s.Amount), s.Deadline }));
                Numbered(col, [
                    "Bên B phải ký hợp đồng trước khi thanh toán Đợt 1.",
                    "Đợt 1 (đặt cọc) bằng 50% tổng giá trị, hạn 24 giờ kể từ khi Bên A duyệt. Đợt 2 (phần còn lại) hạn hết ngày trước ngày khởi hành 8 ngày. " +
                        "Tour được duyệt khi còn dưới 8 ngày đến ngày khởi hành thì thanh toán một lần 100% trong 24 giờ.",
                    "Quá hạn một đợt thì không thanh toán được đợt đó nữa và áp dụng mục c) Điều 4.",
                    "Khoản thanh toán chỉ được ghi nhận khi payOS báo đã nhận đúng số tiền. Chuyển thiếu hoặc dư sẽ được Quản trị viên TripOps đối soát, không tự cộng vào đơn.",
                    "TripOps chuyển tiền cho Bên A (đã trừ phí sàn) 2 ngày sau khi tour kết thúc, khi Bên B đã thanh toán đủ; khiếu nại đang mở phải được Quản trị viên giải quyết trước."]);

                col.Item().ShowEntire().Column(cancellation =>
                {
                    cancellation.Spacing(6);
                    Section(cancellation, "ĐIỀU 4. HỦY HỢP ĐỒNG VÀ HOÀN TIỀN");
                    cancellation.Item().Text(t =>
                    {
                        t.Span("a) Bên B hủy. ").Bold();
                        t.Span("Phí hủy tính trên tổng giá trị tour, theo số ngày còn lại trước ngày khởi hành lúc gửi yêu cầu. " +
                            "Miễn phí (0%) nếu gửi trong 72 giờ sau khi thanh toán và còn từ 15 ngày trở lên.");
                    });
                    Table(cancellation, ["Thời điểm hủy trước ngày khởi hành", "Phí hủy (% tổng giá trị tour)"], [3, 2], new[]
                    {
                        new[] { "Từ 30 ngày trở lên", "0%" },
                        new[] { "Từ 15 đến 29 ngày", "25%" },
                        new[] { "Từ 8 đến 14 ngày", "50%" },
                        new[] { "Từ 3 đến 7 ngày", "75%" },
                        new[] { "Từ 1 đến 2 ngày", "90%" },
                        new[] { "Ngày khởi hành hoặc không tham gia", "100%" }
                    }, alignRightLast: true);
                    cancellation.Item().Text(t =>
                    {
                        t.Span("Số tiền hoàn = Số tiền đã thanh toán − Phí hủy").Bold();
                        t.Span(" (tối thiểu 0 đ).");
                    });
                });
                Lettered(col, "b) Bên A hủy tour:", "Bên B được hoàn 100% số tiền đã thanh toán.");
                Lettered(col, "c) Bên B không thanh toán đủ đúng hạn:", "Bên A có quyền hủy hợp đồng và Bên B mất số tiền đã thanh toán.");
                Lettered(col, "d)", "Hợp đồng chỉ chấm dứt khi Quản trị viên TripOps duyệt yêu cầu hủy. Tiền hoàn chuyển vào tài khoản Bên B khai báo trong 7 ngày làm việc kể từ khi duyệt.");

                Section(col, "ĐIỀU 5. THAY ĐỔI DỊCH VỤ, BẤT KHẢ KHÁNG, BẢO HIỂM");
                Numbered(col, [
                    "Bên A đổi dịch vụ (khách sạn, nhà hàng, điểm tham quan) phải báo Bên B và dùng dịch vụ cùng hạng trở lên; chênh lệch tăng giá do Bên A chịu.",
                    "Thiên tai, dịch bệnh, quyết định của cơ quan nhà nước khiến tour không thực hiện được: các bên được miễn bồi thường; " +
                        "TripOps quyết định hoàn 100% hoặc dời ngày, chỉ khấu trừ chi phí thực tế có chứng từ.",
                    "Bên A mua bảo hiểm du lịch cho toàn bộ thành viên trong đoàn suốt hành trình."]);

                Section(col, "ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ");
                Bulleted(col, "Bên A:", "thực hiện đúng chương trình và chất lượng đã cam kết; cử hướng dẫn viên; điểm danh khách mỗi ngày; báo ngay mọi thay đổi trên TripOps.");
                Bulleted(col, "Bên B:", "cung cấp đúng thông tin từng thành viên; thanh toán đúng hạn; phổ biến hợp đồng cho cả đoàn; có mặt đúng giờ tập trung; tuân thủ hướng dẫn của hướng dẫn viên.");
                Bulleted(col, "Trẻ em", "đi cùng người giám hộ có tên trong danh sách đoàn.");

                col.Item().ShowEntire().Column(closing =>
                {
                    closing.Spacing(6);
                    Section(closing, "ĐIỀU 7. KHIẾU NẠI VÀ HIỆU LỰC");
                    Numbered(closing, [
                        "Bên B gửi khiếu nại về chuyến đi trên TripOps trong 1 ngày sau khi tour kết thúc. Quản trị viên TripOps kết luận khiếu nại và báo kết quả cho các bên.",
                        "Tranh chấp giải quyết bằng thương lượng; không thành thì đưa ra Tòa án có thẩm quyền.",
                        "Hợp đồng lập bằng tiếng Việt, có hiệu lực khi Bên B ký (trực tuyến hoặc tải bản đã ký lên TripOps); mỗi bên lưu một bản điện tử. " +
                            "Mỗi lần đổi giá trị hợp đồng lập phiên bản mới và ký lại."]);

                    closing.Item().PaddingTop(16).Row(row =>
                    {
                        row.Spacing(10);
                        row.RelativeItem().Column(a => Signer(a, "ĐẠI DIỆN BÊN A", "(Đã xác nhận điện tử khi duyệt đơn trên TripOps)", d.AgencyName));
                        if (d.CoHosts.Count > 0)
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().AlignCenter().Text("ĐỒNG TỔ CHỨC").Bold();
                                c.Item().AlignCenter().Text("(Đã xác nhận điện tử khi nhận chặng)").Italic().FontSize(8);
                                c.Item().PaddingTop(30);
                                foreach (var host in d.CoHosts) c.Item().AlignCenter().Text(host.Name);
                            });
                        row.RelativeItem().Column(b =>
                        {
                            b.Item().AlignCenter().Text("ĐẠI DIỆN BÊN B").Bold();
                            b.Item().AlignCenter().Text("(Trưởng đoàn, ký thay cả đoàn)").Italic().FontSize(8);
                            if (signature is null)
                            {
                                b.Item().AlignCenter().Text("(Ký và ghi rõ họ tên)").Italic().FontSize(8);
                                b.Item().PaddingTop(30).AlignCenter().Text(d.CustomerName);
                            }
                            else
                            {
                                b.Item().AlignCenter().Text("(Đã ký trực tuyến trên TripOps)").Italic().FontSize(8);
                                b.Item().Height(55).AlignCenter().Image(signature.Png).FitArea();
                                b.Item().AlignCenter().Text(d.CustomerName);
                            }
                        });
                    });

                    if (signature is not null)
                        closing.Item().PaddingTop(10).Border(0.5f).BorderColor(Colors.Grey.Lighten1).Background(Colors.Grey.Lighten4).Padding(8).Column(audit =>
                        {
                            audit.Spacing(2);
                            audit.Item().Text("XÁC NHẬN KÝ ĐIỆN TỬ").Bold().FontSize(9);
                            audit.Item().Text($"Bên B ({d.CustomerName}) đã đọc và ký hợp đồng số {d.ContractNo}, phiên bản {d.Version.ToString(CultureInfo.InvariantCulture)}, " +
                                $"lúc {signature.SignedAtVietnam.ToString("HH:mm:ss dd/MM/yyyy", CultureInfo.InvariantCulture)} (giờ Việt Nam).").FontSize(8);
                            audit.Item().Text($"Xác thực bằng mã OTP gửi tới email {signature.MaskedEmail}. Mã phiên ký: {signature.SessionRef}.").FontSize(8);
                            audit.Item().Text("Chữ ký điện tử theo Luật Giao dịch điện tử 2023. Mã băm SHA-256 của file này được TripOps lưu để kiểm tra file không bị sửa.").FontSize(8);
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

    private static string? Join(string? first, string? second) =>
        string.Join(" · ", new[] { first, second }.Where(s => !string.IsNullOrWhiteSpace(s))) is { Length: > 0 } text ? text : null;

    private static void Section(ColumnDescriptor col, string title) =>
        col.Item().PaddingTop(6).Text(title).Bold().FontSize(11);

    private static void Signer(ColumnDescriptor col, string title, string note, string name)
    {
        col.Item().AlignCenter().Text(title).Bold();
        col.Item().AlignCenter().Text(note).Italic().FontSize(8);
        col.Item().PaddingTop(30).AlignCenter().Text(name);
    }

    /// <summary>Bảng hai cột "nhãn – giá trị"; dòng không có giá trị thì bỏ.</summary>
    private static void KeyValues(ColumnDescriptor col, string? title, (string Label, string? Value)[] rows)
    {
        var shown = rows.Where(r => !string.IsNullOrWhiteSpace(r.Value)).ToArray();
        if (shown.Length == 0) return;
        col.Item().Table(table =>
        {
            table.ColumnsDefinition(c => { c.RelativeColumn(2); c.RelativeColumn(4); });
            if (title is not null)
                table.Header(h => h.Cell().ColumnSpan(2).Background(Colors.Grey.Lighten3).Padding(4).Text(title).Bold());
            foreach (var (label, value) in shown)
            {
                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(label);
                table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4).Text(value!);
            }
        });
    }

    private static void Table(ColumnDescriptor col, string[] headers, float[] widths, IEnumerable<string[]> rows,
        bool alignRightLast = false, bool boldLastRow = false)
    {
        var list = rows.ToList();
        col.Item().Table(table =>
        {
            table.ColumnsDefinition(c => { foreach (var w in widths) c.RelativeColumn(w); });
            table.Header(h =>
            {
                foreach (var title in headers)
                    h.Cell().Background(Colors.Grey.Lighten3).Padding(4).Text(title).Bold();
            });
            for (var r = 0; r < list.Count; r++)
                for (var c = 0; c < headers.Length; c++)
                {
                    var cell = table.Cell().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Padding(4);
                    if (alignRightLast && c == headers.Length - 1) cell = cell.AlignRight();
                    var text = cell.Text(c < list[r].Length ? list[r][c] : "");
                    if (boldLastRow && r == list.Count - 1) text.Bold();
                }
        });
    }

    private static void Numbered(ColumnDescriptor col, string[] items)
    {
        for (var i = 0; i < items.Length; i++)
        {
            var number = (i + 1).ToString(CultureInfo.InvariantCulture);
            var text = items[i];
            col.Item().PaddingLeft(6).Row(row =>
            {
                row.ConstantItem(16).Text(number + ".");
                row.RelativeItem().Text(text);
            });
        }
    }

    private static void Lettered(ColumnDescriptor col, string label, string text) =>
        col.Item().Text(t => { t.Span(label + " ").Bold(); t.Span(text); });

    private static void Bulleted(ColumnDescriptor col, string label, string text) =>
        col.Item().PaddingLeft(6).Row(row =>
        {
            row.ConstantItem(12).Text("•");
            row.RelativeItem().Text(t => { t.Span(label + " ").Bold(); t.Span(text); });
        });
}
