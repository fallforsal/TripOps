using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using TripOps.Data.Entities;
using TripOps.Data.Repositories;

namespace TripOps.Service.Ai;

/// <summary>Tiêu chí tìm tour công khai. Mọi trường đều tùy chọn.</summary>
public sealed record TourSearchCriteria(string? Text, decimal? MaxPrice, int? Guests, int? MaxDays, int Limit = 5);

/// <summary>
/// Kết quả tìm tour. <see cref="Places"/>: địa danh khách hỏi (rỗng nếu không nhắc địa danh cụ thể).
/// <see cref="Nearby"/> = true: không có tour đúng địa danh, các tour trả về thuộc tỉnh giáp ranh (<see cref="NearbyPlaces"/>).
/// </summary>
public sealed record TourSearchResult(IReadOnlyList<Tour> Tours, IReadOnlyList<string> Places, bool Nearby, IReadOnlyList<string> NearbyPlaces)
{
    public static TourSearchResult Plain(IReadOnlyList<Tour> tours) => new(tours, [], false, []);
}

/// <summary>
/// Tìm tour CÔNG KHAI cho chatbot khách vãng lai. Chỉ đọc tour đang mở bán của Agency đã được duyệt
/// (cùng điều kiện với trang "Khám phá tour"), không đụng tới booking hay dữ liệu cá nhân.
/// So khớp không dấu nên "da lat", "Đà Lạt", "dalat" đều tìm được.
/// </summary>
public sealed partial class PublicTourFinder(TourRepository tours)
{
    private const int CatalogueSize = 300;

    // Từ phổ biến trong câu hỏi, không dùng để so khớp tên tour.
    private static readonly HashSet<string> StopWords = new(StringComparer.Ordinal)
    {
        "tour", "tours", "du", "lich", "di", "den", "toi", "minh", "chung", "em", "anh", "chi", "ban", "cho", "voi", "cua", "va",
        "hay", "nao", "gi", "khong", "co", "mot", "nhung", "cac", "nguoi", "khach", "ngay", "dem", "gia", "bao", "nhieu", "re",
        "nhat", "muon", "can", "tim", "goi", "y", "giup", "o", "tai", "tu", "trong", "thang", "nam", "duoi", "tren", "khoang",
        "trieu", "tr", "nghin", "k", "dong", "vnd", "the", "nhe", "a", "oi", "xin", "chao", "hello", "hi", "can", "nen", "la",
        "duoc", "khong", "kg", "ko", "dang", "con", "cho", "doan", "gia", "dinh", "nhom", "ban", "be", "vui", "dep", "hot", "tot"
    };

    public async Task<IReadOnlyList<Tour>> Search(TourSearchCriteria criteria, CancellationToken ct) => (await Find(criteria, ct)).Tours;

    /// <summary>
    /// Tìm tour. Khách nhắc địa danh cụ thể (vd "Hà Giang") thì chỉ trả tour đi đúng địa danh đó; không có thì trả tour ở
    /// tỉnh giáp ranh (Nearby = true); vẫn không có thì trả rỗng, không lấy tour ở nơi xa cho đủ số lượng.
    /// </summary>
    public async Task<TourSearchResult> Find(TourSearchCriteria criteria, CancellationToken ct)
    {
        var catalogue = await tours.PublicCatalogue(CatalogueSize, ct);
        IEnumerable<Tour> rows = catalogue;
        if (criteria.MaxPrice is { } maxPrice) rows = rows.Where(t => LowestPrice(t) is not { } price || price <= maxPrice);
        if (criteria.Guests is { } guests) rows = rows.Where(t => (t.MinGuests ?? 1) <= guests && (t.MaxGuests is not { } max || max >= guests));
        if (criteria.MaxDays is { } maxDays) rows = rows.Where(t => t.DurationDays is not { } days || days <= maxDays);
        var limit = Math.Clamp(criteria.Limit, 1, 8);

        var query = GuestAssistantKnowledge.Fold(criteria.Text);
        if (query.Length == 0) return TourSearchResult.Plain(rows.Take(limit).ToList());

        // "tour miền Tây", "Tây Bắc 4 ngày": lọc theo tỉnh/địa danh thuộc vùng, phần còn lại của câu dùng để xếp hạng.
        if (VietnamRegions.Detect(query) is { } region)
        {
            var inRegion = rows.Where(t => VietnamRegions.Matches(t.Provinces.Select(p => p.ProvinceCode),
                $"{GuestAssistantKnowledge.Fold(t.Name)} {GuestAssistantKnowledge.Fold(t.Destination)}", region.Codes)).ToList();
            var (restWords, restBigrams) = Terms(region.Remainder);
            return TourSearchResult.Plain(inRegion.Select(t => (Tour: t, Score: Score(t, restWords, restBigrams)))
                .OrderByDescending(x => x.Score).Take(limit).Select(x => x.Tour).ToList());
        }

        // "tour Hà Giang", "Sapa 3 ngày": lọc theo tỉnh của địa danh, không so khớp từng chữ ("giang" không được khớp An Giang).
        if (VietnamRegions.DetectPlaces(query) is { } places)
        {
            var (restWords, restBigrams) = Terms(places.Remainder);
            List<Tour> Ranked(IEnumerable<Tour> list) => list.Select(t => (Tour: t, Score: Score(t, restWords, restBigrams)))
                .OrderByDescending(x => x.Score).Take(limit).Select(x => x.Tour).ToList();
            var exact = rows.Where(t => t.Provinces.Any(p => places.Codes.Contains(p.ProvinceCode.Trim().ToUpperInvariant()) && VietnamRegions.IsSpecific(p.ProvinceCode))
                || VietnamRegions.Matches(t.Provinces.Select(p => p.ProvinceCode), TourText(t), places.Codes)).ToList();
            if (exact.Count > 0) return new TourSearchResult(Ranked(exact), places.Names, false, []);
            var nearbyCodes = VietnamRegions.NearbyOf(places.Codes);
            var nearby = rows.Where(t => VietnamRegions.Touches(t.Provinces.Select(p => p.ProvinceCode), TourText(t), nearbyCodes, places.Codes)).ToList();
            var nearbyNames = nearbyCodes.Select(VietnamRegions.Name).OrderBy(n => n, StringComparer.Create(new CultureInfo("vi-VN"), false)).ToList();
            return new TourSearchResult(Ranked(nearby), places.Names, nearby.Count > 0, nearbyNames);
        }

        var (words, bigrams) = Terms(query);
        if (words.Length == 0 && bigrams.Length == 0) return TourSearchResult.Plain(rows.Take(limit).ToList());

        var scored = rows.Select(t => (Tour: t, Score: Score(t, words, bigrams))).Where(x => x.Score > 0).ToList();
        if (scored.Count == 0) return TourSearchResult.Plain([]);
        var best = scored.Max(x => x.Score);
        return TourSearchResult.Plain(scored.Where(x => x.Score * 2 >= best).OrderByDescending(x => x.Score).Take(limit).Select(x => x.Tour).ToList());
    }

    private static string TourText(Tour t) => $"{GuestAssistantKnowledge.Fold(t.Name)} {GuestAssistantKnowledge.Fold(t.Destination)}";

    private static (string[] Words, string[] Bigrams) Terms(string query)
    {
        var allWords = query.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var words = allWords.Where(w => w.Length >= 2 && !StopWords.Contains(w)).ToArray();
        var bigrams = allWords.Zip(allWords.Skip(1), (a, b) => $"{a} {b}")
            .Where(b => b.Split(' ').Any(w => !StopWords.Contains(w))).Distinct().ToArray();
        return (words, bigrams);
    }

    public Task<Tour?> Detail(int id, CancellationToken ct) => tours.Find(id, null, true, ct);

    public static bool IsStopWord(string folded) => StopWords.Contains(folded);

    /// <summary>
    /// Tải lại các tour theo ID frontend gửi (danh sách vừa gợi ý). Chỉ lấy tour còn công khai, giữ đúng thứ tự cũ;
    /// mọi giá và nội dung lấy từ hệ thống, không dùng dữ liệu client.
    /// </summary>
    public async Task<GuestTourContext> Context(IEnumerable<int>? ids, CancellationToken ct)
    {
        var wanted = (ids ?? []).Where(id => id > 0).Distinct().Take(8).ToList();
        if (wanted.Count == 0) return GuestTourContext.Empty;
        var found = (await tours.PublicByIds(wanted, ct)).ToDictionary(t => t.Id);
        var ordered = wanted.Where(found.ContainsKey).Select(id => found[id]).ToList();
        return new GuestTourContext(ordered, wanted.Count - ordered.Count);
    }

    /// <summary>Câu có từ khóa thật để tìm tour không (khác lời chào, câu chung chung)?</summary>
    public static bool HasKeywords(string? text) =>
        GuestAssistantKnowledge.Fold(text).Split(' ', StringSplitOptions.RemoveEmptyEntries).Any(w => w.Length >= 3 && !StopWords.Contains(w) && !w.All(char.IsDigit));

    private static int Score(Tour tour, string[] words, string[] bigrams)
    {
        var main = $" {GuestAssistantKnowledge.Fold(tour.Name)} {GuestAssistantKnowledge.Fold(tour.Destination)} ";
        var compact = main.Replace(" ", string.Empty);
        var score = 0;
        foreach (var bigram in bigrams)
            if (main.Contains($" {bigram} ", StringComparison.Ordinal)) score += 4;
        foreach (var word in words)
        {
            if (main.Contains($" {word} ", StringComparison.Ordinal)) score += word.Length >= 3 ? 2 : 1;
            else if (word.Length >= 4 && compact.Contains(word, StringComparison.Ordinal)) score += 2; // "dalat", "phuquoc"
        }
        if (score == 0 && GuestAssistantKnowledge.Fold(tour.DepartureLocation) is { Length: > 0 } departure)
            foreach (var bigram in bigrams)
                if ($" {departure} ".Contains($" {bigram} ", StringComparison.Ordinal)) score += 1;
        return score;
    }

    public static decimal? LowestPrice(Tour tour)
    {
        var tiers = tour.PricingTiers.Where(p => p.PricePerGuest is > 0).Select(p => p.PricePerGuest!.Value).ToList();
        var adult = tour.PricingTiers.Where(p => p.PricePerGuest is > 0 && (p.MaxAge is null || p.MaxAge >= 18))
            .Select(p => p.PricePerGuest!.Value).DefaultIfEmpty().Min();
        if (tour.BasePrice is > 0) return tour.BasePrice;
        if (adult > 0) return adult;
        return tiers.Count > 0 ? tiers.Min() : null;
    }

    public static AiTourCard Card(Tour tour) => new(tour.Id, tour.Name ?? tour.Code, tour.Destination, tour.DurationDays, tour.DurationNights,
        LowestPrice(tour), FirstImage(tour.ThumbnailUrls) ?? FirstImage(tour.Images),
        tour.Agency?.BusinessProfile?.BusinessName ?? tour.Agency?.Name, tour.MinGuests, tour.MaxGuests);

    /// <summary>Dữ liệu gửi cho model: chỉ thông tin công khai, rút gọn.</summary>
    public static object Summary(Tour tour) => new
    {
        id = tour.Id,
        name = tour.Name,
        destination = tour.Destination,
        departure = tour.DepartureLocation,
        duration = Duration(tour),
        price_from_vnd = LowestPrice(tour),
        guests = $"{tour.MinGuests ?? 1}–{(tour.MaxGuests is { } max ? max.ToString(CultureInfo.InvariantCulture) : "không giới hạn")}",
        agency = tour.Agency?.BusinessProfile?.BusinessName ?? tour.Agency?.Name,
    };

    /// <summary>Chi tiết tour cho AI; <paramref name="terms"/> là chính sách hủy của Agency chủ trì (null = mặc định TripOps).</summary>
    public static object Details(Tour tour, Contracts.ContractTerms? terms = null) => new
    {
        id = tour.Id,
        name = tour.Name,
        destination = tour.Destination,
        departure = tour.DepartureLocation,
        duration = Duration(tour),
        operation_period = Clip(tour.OperationPeriod, 200),
        price_from_vnd = LowestPrice(tour),
        prices_by_age = tour.PricingTiers.OrderBy(p => p.DisplayOrder).ThenBy(p => p.MinAge)
            .Select(p => new { name = p.Name, min_age = p.MinAge, max_age = p.MaxAge, price_vnd = p.PricePerGuest }),
        guests = $"{tour.MinGuests ?? 1}–{(tour.MaxGuests is { } max ? max.ToString(CultureInfo.InvariantCulture) : "không giới hạn")}",
        highlights = Clip(tour.Highlights, 700),
        inclusions = Clip(tour.Inclusions, 600),
        exclusions = Clip(tour.Exclusions, 400),
        agency_policy_note = Clip(tour.CancellationPolicy, 400),
        cancellation_policy = (terms ?? Contracts.ContractTerms.Default).Describe(),
        itinerary = tour.Timelines.OrderBy(d => d.DayNumber)
            .Select(d => new { day = d.DayNumber, title = Clip(d.Title, 120), places = d.Attractions.Select(a => a.Name).Where(n => !string.IsNullOrWhiteSpace(n)).Take(6) }),
    };

    private static string? Duration(Tour tour) => tour.DurationDays is { } days
        ? $"{days} ngày{(tour.DurationNights is { } nights ? $" {nights} đêm" : string.Empty)}"
        : tour.DurationTour;

    private static string? Clip(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var text = HtmlTag().Replace(value, " ").Trim();
        return text.Length <= max ? text : text[..max] + "…";
    }

    public static string? FirstImage(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return null;
        var text = stored.Trim();
        if (text.StartsWith('['))
        {
            try
            {
                using var json = JsonDocument.Parse(text);
                foreach (var item in json.RootElement.EnumerateArray())
                {
                    if (item.ValueKind == JsonValueKind.String && Url(item.GetString()) is { } url) return url;
                    if (item.ValueKind == JsonValueKind.Object)
                        foreach (var name in new[] { "url", "Url", "secureUrl", "src" })
                            if (item.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String && Url(value.GetString()) is { } found)
                                return found;
                }
            }
            catch (JsonException) { return null; }
            return null;
        }
        return text.Split(new[] { ',', '\n', ';' }, StringSplitOptions.RemoveEmptyEntries).Select(s => Url(s.Trim())).FirstOrDefault(u => u != null);
    }

    private static string? Url(string? value) =>
        value is not null && (value.StartsWith("https://", StringComparison.OrdinalIgnoreCase) || value.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || value.StartsWith('/'))
            ? value : null;

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTag();
}
