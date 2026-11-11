using System.Text.Json;

namespace TripOps.Service.Common;

public static class ServiceMedia
{
    // thumbnail_url is the primary image; images contains only the additional gallery.
    public static string[] AdditionalImages(string? json, string? thumbnailUrl)
    {
        try
        {
            return (JsonSerializer.Deserialize<string?[]>(json ?? "[]") ?? [])
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Select(url => url!.Trim())
                .Where(url => !string.Equals(url, thumbnailUrl?.Trim(), StringComparison.Ordinal))
                .Distinct(StringComparer.Ordinal)
                .ToArray();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    public static string[] TextItems(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return [];
        try
        {
            using var json = JsonDocument.Parse(value);
            if (json.RootElement.ValueKind == JsonValueKind.Array)
                return json.RootElement.EnumerateArray().Where(e => e.ValueKind == JsonValueKind.String)
                    .Select(e => e.GetString()!).Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
            if (json.RootElement.ValueKind == JsonValueKind.String)
                return [json.RootElement.GetString()!];
        }
        catch (JsonException) { }
        // Older records may contain a plain text policy or amenity instead of a JSON array.
        return [value];
    }
}
