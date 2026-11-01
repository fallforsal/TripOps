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
}
