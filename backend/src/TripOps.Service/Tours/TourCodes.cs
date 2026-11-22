using System.Globalization;
using System.Text;

namespace TripOps.Service.Tours;

/// <summary>
/// Mã tour dễ đọc theo điểm đến và thời lượng: "Đà Lạt" 4 ngày 3 đêm → "DL4N3D", "TP. Hồ Chí Minh" → "HCM…".
/// Dùng khi Agency (hoặc AI soạn tour) không tự nhập mã; trùng mã thì thêm hậu tố "-2", "-3"...
/// Quy tắc giống frontend (frontend/src/app/lib/tourCode.ts).
/// </summary>
public static class TourCodes
{
    private static readonly HashSet<string> Skip = new(StringComparer.Ordinal) { "TP", "THANH", "PHO", "TINH", "TOUR", "DU", "LICH" };

    public static string Suggest(string? destination, int? days, int? nights)
    {
        var first = (destination ?? string.Empty).Split([',', ';', '/', '-', '–', '&', '|', '('], StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim()).FirstOrDefault(part => part.Length > 0) ?? string.Empty;
        var words = Fold(first).Split(' ', StringSplitOptions.RemoveEmptyEntries).Where(w => !Skip.Contains(w)).ToArray();
        var letters = new string(words.Select(w => w[0]).Where(char.IsLetter).Take(4).ToArray());
        if (letters.Length == 0) letters = "TOUR";
        var d = days is > 0 and < 100 ? days.Value : 1;
        var n = nights is >= 0 and < 100 ? nights.Value : Math.Max(0, d - 1);
        return n > 0 ? $"{letters}{d}N{n}D" : $"{letters}{d}N";
    }

    /// <summary>Mã chưa dùng: thử mã gốc, rồi "-2" đến "-99", cuối cùng thêm 4 ký tự ngẫu nhiên.</summary>
    public static async Task<string> Unique(string baseCode, Func<string, Task<bool>> exists)
    {
        if (!await exists(baseCode)) return baseCode;
        for (var i = 2; i < 100; i++)
            if (!await exists($"{baseCode}-{i}")) return $"{baseCode}-{i}";
        return $"{baseCode}-{Guid.NewGuid().ToString("N")[..4].ToUpperInvariant()}";
    }

    private static string Fold(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var c in value.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            var upper = c is 'đ' or 'Đ' ? 'D' : char.ToUpperInvariant(c);
            builder.Append(char.IsLetterOrDigit(upper) ? upper : ' ');
        }
        return builder.ToString();
    }
}
