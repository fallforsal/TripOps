using System.Globalization;
using System.Text.Json;
using TripOps.Service.Bookings;

namespace TripOps.Service.Contracts;

/// <summary>Một mốc phí hủy: còn từ <see cref="MinDays"/> ngày trở lên trước khởi hành thì phí là <see cref="FeePercent"/>% tổng giá trị tour.</summary>
public sealed record CancellationTier(int MinDays, decimal FeePercent);

/// <summary>
/// Phần hợp đồng do Agency tự soạn: bảng phí hủy (Điều 4), ghi chú chính sách hủy, điều khoản bổ sung và nội dung
/// các điều Agency sửa lại (<see cref="Clauses"/>, theo mã điều trong <see cref="ContractClauses"/>; điều không sửa dùng
/// bản mặc định của TripOps). Booking lưu bản chụp lúc đặt để Agency đổi mẫu sau không ảnh hưởng đơn cũ.
/// Phí và tiền hoàn luôn tính theo bảng mốc, không theo chữ trong các điều.
/// Luật cố định của nền tảng (không do Agency chọn): ngày khởi hành trở đi phí 100%; hủy trong 72 giờ sau lần trả tiền
/// đầu tiên và còn từ 15 ngày trở lên thì miễn phí.
/// </summary>
public sealed record ContractTerms(IReadOnlyList<CancellationTier> Tiers, string? CancellationNote, string? AdditionalTerms,
    IReadOnlyDictionary<string, string>? Clauses = null)
{
    public const int MaxTiers = 10;
    public const int MaxMinDays = 365;
    public const int MaxNoteLength = 2000;
    public const int MaxAdditionalTermsLength = 8000;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    private static readonly CultureInfo Vi = new("vi-VN");

    /// <summary>Chính sách mặc định của TripOps (dùng khi Agency chưa soạn mẫu hoặc đơn đặt trước khi có tính năng này).</summary>
    public static readonly ContractTerms Default = new(
        [new(30, 0m), new(15, 25m), new(8, 50m), new(3, 75m), new(1, 90m)], null, null);

    /// <summary>Phí hủy (% tổng giá trị tour): mốc có số ngày lớn nhất mà vẫn ≤ số ngày còn lại; không có mốc nào thì 100%.</summary>
    public decimal FeePercent(int daysBeforeDeparture, bool coolingOff)
    {
        if (daysBeforeDeparture <= 0) return 100m;
        if (coolingOff) return 0m;
        var tier = Tiers.Where(t => t.MinDays <= daysBeforeDeparture).OrderByDescending(t => t.MinDays).FirstOrDefault();
        return tier?.FeePercent ?? 100m;
    }

    /// <summary>Dòng bảng phí hủy cho hợp đồng và màn hình: "Từ 15 đến 29 ngày" → "25%".</summary>
    public IReadOnlyList<(string Range, string Fee)> TableRows()
    {
        var ordered = Tiers.OrderByDescending(t => t.MinDays).ToList();
        var rows = new List<(string, string)>();
        for (var i = 0; i < ordered.Count; i++)
        {
            var t = ordered[i];
            var range = i == 0 ? $"Từ {t.MinDays} ngày trở lên"
                : ordered[i - 1].MinDays - 1 == t.MinDays ? $"{t.MinDays} ngày"
                : $"Từ {t.MinDays} đến {ordered[i - 1].MinDays - 1} ngày";
            rows.Add((range, Percent(t.FeePercent)));
        }
        var lowest = ordered.Count == 0 ? 1 : ordered[^1].MinDays;
        if (lowest > 1) rows.Add((lowest - 1 == 1 ? "1 ngày" : $"Từ 1 đến {lowest - 1} ngày", "100%"));
        rows.Add(("Ngày khởi hành hoặc không tham gia", "100%"));
        return rows;
    }

    /// <summary>Nội dung chữ của một điều: bản Agency sửa nếu có, không thì bản mặc định của TripOps.</summary>
    public string ClauseText(string key) =>
        Clauses is not null && Clauses.TryGetValue(key, out var text) ? text : ContractClauses.Get(key).DefaultText;

    public bool IsCustomClause(string key) => Clauses?.ContainsKey(key) == true;

    public static string Percent(decimal value) => value.ToString("0.##", Vi) + "%";

    /// <summary>Kiểm tra dữ liệu Agency nhập; trả về chính sách đã chuẩn hóa (sắp xếp, cắt khoảng trắng).</summary>
    public static ContractTerms Validate(IReadOnlyList<CancellationTier>? tiers, string? note, string? additionalTerms,
        IReadOnlyDictionary<string, string?>? clauses = null)
    {
        if (tiers is null || tiers.Count == 0)
            throw new BookingException(422, "Cần ít nhất một mốc phí hủy.");
        if (tiers.Count > MaxTiers)
            throw new BookingException(422, $"Tối đa {MaxTiers} mốc phí hủy.");
        if (tiers.Any(t => t.MinDays is < 1 or > MaxMinDays))
            throw new BookingException(422, $"Số ngày trước khởi hành phải từ 1 đến {MaxMinDays}.");
        if (tiers.Any(t => t.FeePercent is < 0 or > 100))
            throw new BookingException(422, "Phí hủy phải từ 0% đến 100%.");
        if (tiers.Any(t => decimal.Round(t.FeePercent, 2) != t.FeePercent))
            throw new BookingException(422, "Phí hủy chỉ được có tối đa 2 chữ số thập phân.");
        if (tiers.GroupBy(t => t.MinDays).Any(g => g.Count() > 1))
            throw new BookingException(422, "Hai mốc phí hủy không được trùng số ngày.");
        var ordered = tiers.OrderByDescending(t => t.MinDays).ToList();
        for (var i = 1; i < ordered.Count; i++)
            if (ordered[i].FeePercent < ordered[i - 1].FeePercent)
                throw new BookingException(422, "Hủy càng sát ngày khởi hành thì phí không được thấp hơn mốc xa hơn.");
        note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        additionalTerms = string.IsNullOrWhiteSpace(additionalTerms) ? null : additionalTerms.Trim();
        if (note?.Length > MaxNoteLength)
            throw new BookingException(422, $"Ghi chú chính sách hủy tối đa {MaxNoteLength} ký tự.");
        if (additionalTerms?.Length > MaxAdditionalTermsLength)
            throw new BookingException(422, $"Điều khoản bổ sung tối đa {MaxAdditionalTermsLength} ký tự.");
        return new(ordered, note, additionalTerms, ValidateClauses(clauses));
    }

    /// <summary>Chỉ giữ các điều Agency thực sự sửa; để trống hoặc trùng bản mặc định thì dùng bản mặc định.</summary>
    private static IReadOnlyDictionary<string, string>? ValidateClauses(IReadOnlyDictionary<string, string?>? clauses)
    {
        if (clauses is null) return null;
        var kept = new Dictionary<string, string>();
        foreach (var (key, value) in clauses)
        {
            if (!ContractClauses.IsKnown(key))
                throw new BookingException(422, $"Không có điều khoản '{key}' trong mẫu hợp đồng.");
            if (value is null) continue;
            var text = ContractClauses.Normalize(value);
            if (text.Length == 0 || text == ContractClauses.Normalize(ContractClauses.Get(key).DefaultText)) continue;
            if (text.Length > ContractClauses.MaxLength)
                throw new BookingException(422, $"Mỗi điều tối đa {ContractClauses.MaxLength} ký tự.");
            kept[key] = text;
        }
        return kept.Count == 0 ? null : kept;
    }

    public string ToJson() => JsonSerializer.Serialize(
        new Stored(Tiers.ToList(), CancellationNote, AdditionalTerms, Clauses?.ToDictionary(c => c.Key, c => c.Value)), Json);

    /// <summary>Đọc bản chụp đã lưu; rỗng hoặc hỏng thì dùng chính sách mặc định của TripOps.</summary>
    public static ContractTerms Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Default;
        try
        {
            var stored = JsonSerializer.Deserialize<Stored>(json, Json);
            if (stored?.Tiers is not { Count: > 0 } tiers) return Default;
            return new(tiers.OrderByDescending(t => t.MinDays).ToList(), stored.CancellationNote, stored.AdditionalTerms, Known(stored.Clauses));
        }
        catch (JsonException)
        {
            return Default;
        }
    }

    /// <summary>Mô tả ngắn để AI trả lời khách theo đúng chính sách của tour.</summary>
    public string Describe() =>
        string.Join("; ", TableRows().Select(r => $"{r.Range}: phí {r.Fee}")) +
        ". Hủy trong 72 giờ sau lần thanh toán đầu tiên và còn từ 15 ngày trở lên: miễn phí." +
        (CancellationNote is null ? "" : " Ghi chú: " + CancellationNote);

    /// <summary>Chỉ bảng mốc (cột cancellation_tiers của mẫu hợp đồng).</summary>
    public string TiersJson() => JsonSerializer.Serialize(Tiers.ToList(), Json);

    public static IReadOnlyList<CancellationTier> ParseTiers(string? json)
    {
        try
        {
            var tiers = string.IsNullOrWhiteSpace(json) ? null : JsonSerializer.Deserialize<List<CancellationTier>>(json, Json);
            return tiers is { Count: > 0 } ? tiers.OrderByDescending(t => t.MinDays).ToList() : Default.Tiers;
        }
        catch (JsonException)
        {
            return Default.Tiers;
        }
    }

    /// <summary>Cột clauses của mẫu hợp đồng (null khi Agency chưa sửa điều nào).</summary>
    public string? ClausesJson() => Clauses is null ? null : JsonSerializer.Serialize(Clauses, Json);

    public static IReadOnlyDictionary<string, string>? ParseClauses(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return Known(JsonSerializer.Deserialize<Dictionary<string, string>>(json, Json));
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static IReadOnlyDictionary<string, string>? Known(Dictionary<string, string>? clauses)
    {
        var kept = clauses?.Where(c => ContractClauses.IsKnown(c.Key) && !string.IsNullOrWhiteSpace(c.Value))
            .ToDictionary(c => c.Key, c => c.Value);
        return kept is { Count: > 0 } ? kept : null;
    }

    private sealed record Stored(List<CancellationTier> Tiers, string? CancellationNote, string? AdditionalTerms,
        Dictionary<string, string>? Clauses = null);
}

/// <summary>Mẫu hợp đồng Agency đang dùng. IsDefault = Agency chưa soạn, đang hiển thị chính sách mặc định của TripOps.</summary>
public sealed record ContractTemplateDto(IReadOnlyList<CancellationTier> Tiers, string? CancellationNote, string? AdditionalTerms,
    bool IsDefault, DateTime? UpdatedAt, IReadOnlyList<ContractPolicyRow> Preview, IReadOnlyList<ContractClauseDto> Clauses);

/// <summary>Một điều trong mẫu: nội dung đang dùng, bản mặc định để khôi phục, phần hệ thống tự điền.</summary>
public sealed record ContractClauseDto(string Key, string Title, string? AutoContent, string Text, string DefaultText, bool IsCustom);

public sealed record ContractPolicyRow(string Range, string Fee);

public sealed record ContractTemplateRequest(IReadOnlyList<CancellationTier>? Tiers, string? CancellationNote, string? AdditionalTerms,
    IReadOnlyDictionary<string, string?>? Clauses = null);

/// <summary>Chính sách hủy hiển thị cho khách (trang tour, báo giá hủy).</summary>
public sealed record CancellationPolicyDto(IReadOnlyList<ContractPolicyRow> Rows, string? Note, bool IsDefault)
{
    public static CancellationPolicyDto Of(ContractTerms terms) =>
        new(terms.TableRows().Select(r => new ContractPolicyRow(r.Range, r.Fee)).ToList(), terms.CancellationNote,
            ReferenceEquals(terms, ContractTerms.Default));
}
