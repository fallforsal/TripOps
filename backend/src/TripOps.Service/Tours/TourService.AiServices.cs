using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Tours;

/// <summary>
/// UC-038: gợi ý chỗ ở, ăn uống khi AI soạn tour.
/// Thứ tự ưu tiên: (1) danh bạ nhà cung cấp của chính Agency, (2) dịch vụ Provider đã duyệt trên TripOps, (3) gợi ý bên ngoài.
/// AI chỉ được chọn theo key trong danh sách ứng viên; tên, địa chỉ, giá luôn lấy lại từ DB, không lấy từ câu trả lời của AI.
/// </summary>
public sealed partial class TourService
{
    public const string AgencySource = "A";
    public const string PlatformSource = "P";
    private const int MaxHotelsPerSource = 12;
    private const int MaxRestaurantsPerSource = 20;
    public const string ExternalNote = "Gợi ý ngoài TripOps: cần xác minh, liên hệ và nhập giá tham khảo trước khi đăng tour.";

    /// <summary>Khách sạn, nhà hàng ở đúng khu vực của tour mà Agency được dùng (danh bạ riêng trước, dịch vụ trên sàn sau).</summary>
    public async Task<IReadOnlyList<AiServiceCandidate>> AiServiceCandidates(string actor, TourConfiguration outline, int? groupSize, CancellationToken ct)
    {
        var keys = PlaceKeys(outline);
        if (keys.Count == 0) return [];
        bool Near(params string?[] texts) => keys.Any(Normalize(string.Join(' ', texts)).Contains);
        bool Fits(int? capacity, bool hotel) => groupSize is not { } size || capacity is not > 0 || capacity >= (hotel ? (size + 1) / 2 : size);

        var own = (await db.AgencySuppliers.AsNoTracking()
                .Where(s => s.AgencyId == actor && s.Status == AgencySupplier.Active)
                .OrderBy(s => s.Name).Take(500).ToListAsync(ct))
            .Where(s => Near(s.Area, s.Address, s.Name)).ToList();

        var platform = (await db.Services.AsNoTracking()
                .Where(s => (s.Category == ServiceCategory.Hotel || s.Category == ServiceCategory.Fnb)
                    && s.Status == ServiceStatus.Approved && !s.IsPaused
                    && s.Provider.Status == UserStatus.Active && s.Provider.Role == UserRole.Provider
                    && s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.Status == BusinessProfileStatus.Approved)
                .OrderByDescending(s => s.Rating).ThenBy(s => s.Id).Take(2000)
                .Select(s => new { s.Id, s.Category, s.Name, s.Province, s.Ward, s.FullAddress, s.StarRating, s.Capacity, s.PriceFrom, s.PriceTo, s.Price })
                .ToListAsync(ct))
            .Where(s => Near(s.Province, s.Ward, s.FullAddress)).ToList();

        var result = new List<AiServiceCandidate>();
        foreach (var hotel in new[] { true, false })
        {
            var type = hotel ? "hotel" : "restaurant";
            var max = hotel ? MaxHotelsPerSource : MaxRestaurantsPerSource;
            result.AddRange(own.Where(s => s.SupplierType == (hotel ? AgencySupplier.Hotel : AgencySupplier.Restaurant)).Take(max)
                .Select(s => new AiServiceCandidate($"{AgencySource}{s.Id}", AgencySource, s.Id, type, s.Name, s.Area,
                    s.StarRating, null, s.ReferencePrice, s.ReferencePrice, s.Address)));
            result.AddRange(platform.Where(s => s.Category == (hotel ? ServiceCategory.Hotel : ServiceCategory.Fnb) && Fits(s.Capacity, hotel)).Take(max)
                .Select(s => new AiServiceCandidate($"{PlatformSource}{s.Id}", PlatformSource, s.Id, type, s.Name, s.Province,
                    s.StarRating, s.Capacity, s.PriceFrom ?? (s.Price > 0 ? s.Price : null), s.PriceTo, s.FullAddress)));
        }
        return result;
    }

    /// <summary>Đưa lựa chọn của AI vào lịch trình: đêm liên tiếp cùng khách sạn gộp thành một lần lưu trú; mỗi bữa một nơi.</summary>
    public static TourConfiguration ApplyServicePlan(TourConfiguration outline, AiServicePlan plan, IReadOnlyList<AiServiceCandidate> candidates)
    {
        var byKey = candidates.ToDictionary(c => c.Key, StringComparer.OrdinalIgnoreCase);
        var nights = outline.DurationNights;
        var destination = Cut(outline.Destination, 255) ?? "Điểm đến";

        AccommodationInput? Stay(AiServiceChoice c, int count)
        {
            var note = Cut(c.Note, 1000);
            if (c.Key is { } key && byKey.TryGetValue(key, out var s) && s.Type == "hotel")
                return s.Source == PlatformSource
                    ? new AccommodationInput(Cut(s.Name, 255)!, Cut(s.Area, 255) ?? destination, NightsCount: count, StarRating: Stars(s.StarRating),
                        AddressNotes: Join(s.Address, note), ServiceId: s.Id, SupplierSource: SupplierSources.PlatformPartner)
                    : new AccommodationInput(Cut(s.Name, 255)!, Cut(s.Area, 255) ?? destination, NightsCount: count, StarRating: Stars(s.StarRating),
                        AddressNotes: note, SupplierSource: SupplierSources.AgencySupplier, AgencySupplierId: s.Id,
                        Supplier: new SupplierSnapshotInput(Cut(s.Address, 500), Cut(s.Area, 255), ReferencePrice: s.PriceFrom));
            if (Cut(c.ExternalName, 255) is not { } name) return null;
            var area = Cut(c.ExternalArea, 255);
            return new AccommodationInput(name, area ?? destination, NightsCount: count, StarRating: Stars(c.StarRating),
                AddressNotes: Join(ExternalNote, note), SupplierSource: SupplierSources.AgencySupplier,
                Supplier: area is null ? null : new SupplierSnapshotInput(Area: area));
        }

        MealInput? Meal(AiServiceChoice c, string type)
        {
            var note = Cut(c.Note, 1000);
            var time = type == "lunch" ? new TimeSpan(12, 0, 0) : new TimeSpan(18, 30, 0);
            if (c.Key is { } key && byKey.TryGetValue(key, out var s) && s.Type == "restaurant")
                return s.Source == PlatformSource
                    ? new MealInput(type, Cut(s.Name, 255)!, Join(note, s.Address), ServiceId: s.Id, Time: time, SupplierSource: SupplierSources.PlatformPartner)
                    : new MealInput(type, Cut(s.Name, 255)!, note, Time: time, SupplierSource: SupplierSources.AgencySupplier, AgencySupplierId: s.Id,
                        Supplier: new SupplierSnapshotInput(Cut(s.Address, 500), Cut(s.Area, 255), ReferencePrice: s.PriceFrom));
            if (Cut(c.ExternalName, 255) is not { } name) return null;
            var area = Cut(c.ExternalArea, 255);
            return new MealInput(type, name, Join(ExternalNote, note), Time: time, SupplierSource: SupplierSources.AgencySupplier,
                Supplier: area is null ? null : new SupplierSnapshotInput(Area: area));
        }

        // Một lựa chọn cho mỗi đêm; đêm liên tiếp cùng nơi ở thì gộp vào ngày nhận phòng.
        var perNight = plan.Stays.Where(c => c.Day >= 1 && c.Day <= nights).GroupBy(c => c.Day).ToDictionary(g => g.Key, g => g.First());
        var stays = new Dictionary<int, AccommodationInput>();
        for (var night = 1; night <= nights; night++)
        {
            if (!perNight.TryGetValue(night, out var choice)) continue;
            var identity = Identity(choice);
            var count = 1;
            while (night + count <= nights && perNight.TryGetValue(night + count, out var next) && Identity(next) == identity) count++;
            if (Stay(choice, count) is { } stay) stays[night] = stay;
            night += count - 1;
        }

        var meals = plan.Meals.Where(c => c.MealType is "lunch" or "dinner")
            .GroupBy(c => (c.Day, c.MealType!))
            .Select(g => (g.Key.Day, Input: Meal(g.First(), g.Key.Item2)))
            .Where(x => x.Input is not null)
            .ToLookup(x => x.Day, x => x.Input!);

        return outline with
        {
            Timelines = (outline.Timelines ?? []).Select(day => day with
            {
                Meals = meals[day.DayNumber].OrderBy(m => m.Time).ToArray(),
                Accommodations = stays.TryGetValue(day.DayNumber, out var stay) ? [stay] : [],
            }).ToArray(),
        };

        string Identity(AiServiceChoice c) => c.Key is { } k && byKey.ContainsKey(k) ? k.ToUpperInvariant() : "X:" + Normalize(c.ExternalName ?? "");
    }

    /// <summary>Từ khóa khu vực: tên tỉnh của tour và các phần của ô điểm đến (VD: "Nha Trang, Khánh Hòa").</summary>
    private static HashSet<string> PlaceKeys(TourConfiguration outline)
    {
        var keys = new HashSet<string>();
        foreach (var code in outline.ProvinceCodes ?? [])
            if (VietnamProvinceCatalog.Find(code) is { } province) keys.Add(Normalize(province.Name));
        foreach (var part in (outline.Destination ?? "").Split([',', ';', '/', '-', '–', '&'], StringSplitOptions.RemoveEmptyEntries))
            keys.Add(Normalize(part.Replace(" và ", " ")));
        keys.RemoveWhere(k => k.Length < 3);
        return keys;
    }

    /// <summary>Bỏ dấu, chữ thường, bỏ tiền tố "TP.", "Thành phố", "Tỉnh" để so khớp địa danh nhập tự do.</summary>
    public static string Normalize(string? text)
    {
        var value = (text ?? "").Replace('đ', 'd').Replace('Đ', 'D').Normalize(NormalizationForm.FormD);
        var plain = new StringBuilder(value.Length);
        foreach (var ch in value)
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark) plain.Append(char.ToLowerInvariant(ch));
        var result = " " + string.Join(' ', plain.ToString().Split([' ', '.', '\t', '\n'], StringSplitOptions.RemoveEmptyEntries)) + " ";
        foreach (var prefix in new[] { " tp ", " thanh pho ", " tinh " }) result = result.Replace(prefix, " ");
        return result.Trim();
    }

    private static int Stars(int? stars) => Math.Clamp(stars ?? 3, 1, 5);
    private static string? Cut(string? text, int max) => string.IsNullOrWhiteSpace(text) ? null : text.Trim().Length <= max ? text.Trim() : text.Trim()[..max];
    private static string? Join(params string?[] parts)
    {
        var text = string.Join(" ", parts.Where(p => !string.IsNullOrWhiteSpace(p)).Select(p => p!.Trim()));
        return text.Length == 0 ? null : text;
    }
}
