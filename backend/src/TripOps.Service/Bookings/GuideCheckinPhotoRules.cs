using System.Text;
using System.Text.Json;

namespace TripOps.Service.Bookings;

/// <summary>
/// Check-in photo limits are enforced in the API, not just the mobile UI.
/// Existing PhotoUrl nvarchar(max) stores JSON URLs; legacy single URLs remain readable.
/// </summary>
public static class GuideCheckinPhotoRules
{
    public const int MaxPhotos = 5;
    public const long MaxPhotoBytes = 5 * 1024 * 1024;
    public const long MaxTotalBytes = 20 * 1024 * 1024;

    public static void ValidateFiles(IReadOnlyList<(long Length, string Mime)> files)
    {
        if (files.Count is < 1 or > MaxPhotos)
            throw new BookingException(422, "Mỗi lần check-in cần 1–5 ảnh.");
        if (files.Any(f => f.Length <= 0 || f.Length > MaxPhotoBytes) ||
            files.Sum(f => f.Length) > MaxTotalBytes)
            throw new BookingException(413, "Tối đa 5 MB mỗi ảnh và 20 MB tổng dung lượng.");
        if (files.Any(f => f.Mime is not ("image/jpeg" or "image/png" or "image/webp")))
            throw new BookingException(422, "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
    }

    public static bool IsValidImage(byte[] bytes, string mime) =>
        mime switch
        {
            "image/png" => bytes.Length >= 8 && bytes.AsSpan(0, 8).SequenceEqual(
                new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
            "image/jpeg" => bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255,
            "image/webp" => bytes.Length >= 12 &&
                Encoding.ASCII.GetString(bytes, 0, 4) == "RIFF" &&
                Encoding.ASCII.GetString(bytes, 8, 4) == "WEBP",
            _ => false
        };

    public static string Encode(IReadOnlyList<string> urls) => JsonSerializer.Serialize(urls);

    public static IReadOnlyList<string> Decode(string? stored)
    {
        if (string.IsNullOrWhiteSpace(stored)) return [];
        var trimmed = stored.Trim();
        if (!trimmed.StartsWith('[')) return [trimmed]; // legacy single photo URL
        try
        {
            return JsonSerializer.Deserialize<string[]>(trimmed)?
                .Where(s => !string.IsNullOrWhiteSpace(s)).ToArray() ?? [];
        }
        catch (JsonException) { return []; }
    }
}
