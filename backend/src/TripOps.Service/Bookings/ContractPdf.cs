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
    IReadOnlyList<(string Stage, decimal Amount, string Deadline)> Schedule,
    Contracts.ContractTerms? Terms = null);

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

    /// <param name="sample">Bản xem trước với dữ liệu mẫu (Agency soạn mẫu, khách xem trước khi đặt): in dòng cảnh báo ở đầu và cuối trang.</param>
    public static byte[] Generate(ContractData d, ContractSignature? signature = null, bool sample = false)
    {
        var terms = d.Terms ?? Contracts.ContractTerms.Default;
        return Document.Create(document =>
    {
        document.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.8f, Unit.Centimetre);
            page.DefaultTextStyle(style => style.FontSize(10).FontFamily("Arial").LineHeight(1.3f));

            page.Content().Column(col =>
            {
                col.Spacing(6);
                col.Item().Column(header =>
                {
                    header.Item().AlignCenter().Text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM").Bold();
                    header.Item().AlignCenter().Text("Độc lập – Tự do – Hạnh phúc").Italic();
                    header.Item().PaddingTop(8).AlignCenter().Text("HỢP ĐỒNG DỊCH VỤ DU LỊCH THEO ĐOÀN").Bold().FontSize(15);
                    header.Item().AlignCenter().Text("(Hợp đồng lữ hành nội địa)").Italic();
                        if (sample)
                        header.Item().PaddingTop(4).Border(0.5f).BorderColor(Colors.Red.Medium).Background(Colors.Red.Lighten5).Padding(4).AlignCenter()
                            .Text("BẢN XEM TRƯỚC – thông tin khách, giá và lịch thanh toán là dữ liệu mẫu, không có giá trị pháp lý").FontSize(9).Bold().FontColor(Colors.Red.Darken2);
                header.Item().PaddingBottom(6).AlignCenter().Text($"Số: {d.ContractNo} · Phiên bản {d.Version.ToString(CultureInfo.InvariantCulture)} · Lập ngày {Date(d.IssuedAtVietnam)} trên nền tảng TripOps");
                });
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

                Section(col, Heading(1, Contracts.ContractClauses.Program));
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
                Body(col, terms.ClauseText(Contracts.ContractClauses.Program));

                Section(col, Heading(2, Contracts.ContractClauses.Price));
                col.Item().Text(t => { t.Span("Tổng giá trị hợp đồng là "); t.Span(Money(d.TotalAmount)).Bold(); t.Span(" (đã gồm các dịch vụ nêu tại Điều 1), tính theo khung giá độ tuổi tại ngày khởi hành."); });
                var groups = d.Participants.GroupBy(p => (Tier: p.Tier ?? "Khách", Price: p.Price ?? 0m))
                    .Select(g => new[] { g.Key.Tier, g.Count().ToString(CultureInfo.InvariantCulture), Number(g.Key.Price), Number(g.Key.Price * g.Count()) })
                    .ToList();
                groups.Add(["Tổng cộng", d.Participants.Count.ToString(CultureInfo.InvariantCulture), "", Number(d.TotalAmount)]);
                Table(col, ["Khung giá", "Số khách", "Đơn giá (đ/khách)", "Thành tiền (đ)"], [3, 1.3f, 2, 2], groups, alignRightLast: true, boldLastRow: true);
                Body(col, terms.ClauseText(Contracts.ContractClauses.Price));

                Section(col, Heading(3, Contracts.ContractClauses.Payment));
                if (d.Schedule.Count > 0)
                    Table(col, ["Đợt", "Số tiền (đ)", "Hạn thanh toán"], [3, 2, 3],
                        d.Schedule.Select(s => new[] { s.Stage, Number(s.Amount), s.Deadline }));
                Body(col, terms.ClauseText(Contracts.ContractClauses.Payment));

                col.Item().ShowEntire().Column(cancellation =>
                {
                    cancellation.Spacing(6);
                    Section(cancellation, Heading(4, Contracts.ContractClauses.Cancellation));
                    cancellation.Item().Text($"Bảng phí hủy theo chính sách hủy của {(ReferenceEquals(terms, Contracts.ContractTerms.Default) ? "TripOps" : "Bên A")}:").Bold();
                    Table(cancellation, ["Thời điểm hủy trước ngày khởi hành", "Phí hủy (% tổng giá trị tour)"], [3, 2],
                        terms.TableRows().Select(r => new[] { r.Range, r.Fee }).ToArray(), alignRightLast: true);
                    if (terms.CancellationNote is { } note)
                        cancellation.Item().Text(t => { t.Span("Ghi chú của Bên A: ").Bold(); t.Span(note); });
                });
                Body(col, terms.ClauseText(Contracts.ContractClauses.Cancellation));

                Section(col, Heading(5, Contracts.ContractClauses.Changes));
                Body(col, terms.ClauseText(Contracts.ContractClauses.Changes));

                Section(col, Heading(6, Contracts.ContractClauses.Duties));
                Body(col, terms.ClauseText(Contracts.ContractClauses.Duties));

                if (terms.AdditionalTerms is { } extra)
                {
                    // Điều khoản riêng do Agency soạn trong mẫu hợp đồng; các điều khác giữ format chung.
                    Section(col, "ĐIỀU 7. ĐIỀU KHOẢN BỔ SUNG CỦA BÊN A");
                    foreach (var line in extra.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0))
                        col.Item().Text(line);
                }

                col.Item().ShowEntire().Column(closing =>
                {
                    closing.Spacing(6);
                    Section(closing, Heading(terms.AdditionalTerms is null ? 7 : 8, Contracts.ContractClauses.Closing));
                    Body(closing, terms.ClauseText(Contracts.ContractClauses.Closing));

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
                t.Span($"{(sample ? "Bản xem trước · " : "")}{d.ContractNo} · Trang ");
                t.CurrentPageNumber();
                t.Span(" / ");
                t.TotalPages();
            });
        });
    }).GeneratePdf();
    }

    private static string? Join(string? first, string? second) =>
        string.Join(" · ", new[] { first, second }.Where(s => !string.IsNullOrWhiteSpace(s))) is { Length: > 0 } text ? text : null;

    private static string Heading(int number, string key) =>
        $"ĐIỀU {number.ToString(CultureInfo.InvariantCulture)}. {Contracts.ContractClauses.Get(key).Title}";

    /// <summary>Nội dung chữ của một điều (bản mặc định hoặc bản Agency sửa): mỗi dòng một đoạn.</summary>
    private static void Body(ColumnDescriptor col, string text)
    {
        foreach (var line in text.Replace("\r\n", "\n").Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0))
            col.Item().PaddingLeft(char.IsDigit(line[0]) || line[0] == '•' ? 6 : 0).Text(line);
    }

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
}
