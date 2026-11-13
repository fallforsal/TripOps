using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using TripOps.Data.Entities;
using TripOps.Data.Repositories;

namespace TripOps.Service.Ai;

/// <summary>Tiêu chí tìm tour công khai. Mọi trường đều tùy chọn.</summary>
public sealed record TourSearchCriteria(string? Text, decimal? MaxPrice, int? Guests, int? MaxDays, int Limit = 5);

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

    public async Task<IReadOnlyList<Tour>> Search(TourSearchCriteria criteria, CancellationToken ct)
    {
        var catalogue = await tours.PublicCatalogue(CatalogueSize, ct);
        IEnumerable<Tour> rows = catalogue;
        if (criteria.MaxPrice is { } maxPrice) rows = rows.Where(t => LowestPrice(t) is not { } price || price <= maxPrice);
        if (criteria.Guests is { } guests) rows = rows.Where(t => (t.MinGuests ?? 1) <= guests && (t.MaxGuests is not { } max || max >= guests));
        if (criteria.MaxDays is { } maxDays) rows = rows.Where(t => t.DurationDays is not { } days || days <= maxDays);
        var limit = Math.Clamp(criteria.Limit, 1, 8);

        var query = GuestAssistantKnowledge.Fold(criteria.Text);
        if (query.Length == 0) return rows.Take(limit).ToList();

        var words = query.Split(' ').Where(w => w.Length >= 2 && !StopWords.Contains(w)).ToArray();
        var allWords = query.Split(' ');
        var bigrams = allWords.Zip(allWords.Skip(1), (a, b) => $"{a} {b}")
            .Where(b => b.Split(' ').Any(w => !StopWords.Contains(w))).Distinct().ToArray();
        if (words.Length == 0 && bigrams.Length == 0) return rows.Take(limit).ToList();

        var scored = rows.Select(t => (Tour: t, Score: Score(t, words, bigrams))).Where(x => x.Score > 0).ToList();
        if (scored.Count == 0) return [];
        var best = scored.Max(x => x.Score);
        return scored.Where(x => x.Score * 2 >= best).OrderByDescending(x => x.Score).Take(limit).Select(x => x.Tour).ToList();
    }

    public Task<Tour?> Detail(int id, CancellationToken ct) => tours.Find(id, null, true, ct);

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

    public static object Details(Tour tour) => new
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
