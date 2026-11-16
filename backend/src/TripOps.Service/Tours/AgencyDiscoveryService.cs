using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Reviews;

namespace TripOps.Service.Tours;

public sealed record AgencyTourExample(int Id, string Name, string? Destination, string? ThumbnailUrl);
public sealed record AgencyAreaExperience(string ProvinceCode, int CompletedTrips, DateTime? LastCompletedAt);
public sealed record AgencyEvidenceDto(int PublishedTourCount, int MatchedTourCount, int CompletedTrips,
    int MatchedCompletedTrips, int UnattributedCompletedTrips, DateTime? LastCompletedAt,
    decimal? RatingAverage, int ReviewCount, string[] MatchedProvinceCodes,
    AgencyAreaExperience[] Areas, AgencyTourExample[] Examples);
public sealed record AgencyDiscoveryDto(string Id, string Name, string Address, string Phone, string Email,
    string? LogoUrl, string? Description, AgencyEvidenceDto Evidence);

/// <summary>
/// Evidence of activity, not a certification of regional expertise. Completed trips come from booking
/// snapshots, never today's mutable tour or the number of tour versions. Ambiguous alliance regions
/// are deliberately left unattributed rather than credited to every partner.
/// </summary>
public sealed class AgencyDiscoveryService(TripOpsDbContext db)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static string[] ParseProvinces(string? value)
    {
        var codes = VietnamProvinceCatalog.NormalizeDistinct(value?.Split(',', StringSplitOptions.RemoveEmptyEntries));
        if (codes.Any(c => !VietnamProvinceCatalog.IsValidCode(c)))
            throw new TourException(400, "Mã tỉnh/thành tìm Agency không hợp lệ.");
        return VietnamProvinceCatalog.CurrentCodes(codes);
    }

    public async Task<IReadOnlyList<AgencyDiscoveryDto>> List(string? provinceCode, CancellationToken ct,
        string? excludeAgencyId = null, bool matchesOnly = false)
    {
        var codes = ParseProvinces(provinceCode);
        var agencies = await db.Users.AsNoTracking().Include(u => u.BusinessProfile)
            .Where(u => u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active &&
                u.BusinessProfile != null && u.BusinessProfile.Status == BusinessProfileStatus.Approved && u.Id != excludeAgencyId)
            .ToListAsync(ct);
        var ids = agencies.Select(a => a.Id).ToArray();
        var tours = await db.Tours.AsNoTracking().Include(t => t.Provinces)
            .Where(t => ids.Contains(t.AgencyId) && t.Status == TourStatus.Completed &&
                t.Visibility == TourVisibility.Public && t.IsRequest != true)
            .ToListAsync(ct);
        var bookings = await db.Bookings.AsNoTracking().Include(b => b.BookingAgencies)
            .Where(b => b.Status == BookingStatus.Completed && b.BookingAgencies.Any(a => ids.Contains(a.AgencyId)))
            .AsSplitQuery().ToListAsync(ct);
        var reviews = await db.Feedbacks.AsNoTracking()
            .Where(f => ids.Contains(f.AgencyId) && f.Status == FeedbackStatus.Visible)
            .Select(f => new { f.AgencyId, f.Rating }).ToListAsync(ct);

        var rows = agencies.Select(a =>
        {
            var offered = tours.Where(t => t.AgencyId == a.Id).ToArray();
            var matchedTours = offered.Where(t => codes.Length == 0 || t.Provinces.Any(p => codes.Contains(VietnamProvinceCatalog.CurrentCode(p.ProvinceCode)))).ToArray();
            var done = bookings.Where(b => b.BookingAgencies.Any(x => x.AgencyId == a.Id))
                .Select(b => new { Booking = b, Provinces = CompletedRegions(b, a.Id), At = ReviewRules.CompletedAt(b) }).ToArray();
            var regional = done.Where(x => codes.Length == 0 || x.Provinces.Intersect(codes).Any()).ToArray();
            var areas = done.SelectMany(x => x.Provinces).Distinct().OrderBy(c => c)
                .Select(c => new AgencyAreaExperience(c, done.Count(x => x.Provinces.Contains(c)),
                    done.Where(x => x.Provinces.Contains(c)).Max(x => x.At))).ToArray();
            var matches = offered.SelectMany(t => t.Provinces.Select(p => VietnamProvinceCatalog.CurrentCode(p.ProvinceCode)))
                .Concat(areas.Select(x => x.ProvinceCode)).Where(c => codes.Contains(c)).Distinct().OrderBy(c => c).ToArray();
            var ratings = reviews.Where(r => r.AgencyId == a.Id).Select(r => r.Rating).ToArray();
            return new AgencyDiscoveryDto(a.Id, a.BusinessProfile!.BusinessName ?? a.Name ?? "Agency",
                a.BusinessProfile.BusinessAddress ?? "", a.Phone ?? "", a.Email,
                a.BusinessProfile.LogoUrl ?? a.Avatar, a.BusinessProfile.Description,
                new AgencyEvidenceDto(offered.Length, matchedTours.Length, done.Length, regional.Length,
                    done.Count(x => x.Provinces.Length == 0), regional.Select(x => x.At).DefaultIfEmpty().Max(),
                    ratings.Length == 0 ? null : decimal.Round((decimal)ratings.Average(), 2), ratings.Length,
                    matches, areas, matchedTours.OrderByDescending(t => t.CreatedAt).ThenBy(t => t.Id).Take(3)
                        .Select(t => new AgencyTourExample(t.Id, t.Name ?? "Tour", t.Destination, Thumbnail(t.Images))).ToArray()));
        });
        if (matchesOnly) rows = rows.Where(a => a.Evidence.MatchedProvinceCodes.Length > 0);
        return rows.OrderByDescending(a => a.Evidence.MatchedProvinceCodes.Length)
            .ThenByDescending(a => a.Evidence.MatchedCompletedTrips)
            .ThenByDescending(a => a.Evidence.MatchedTourCount)
            .ThenByDescending(a => a.Evidence.ReviewCount)
            .ThenByDescending(a => a.Evidence.RatingAverage)
            .ThenBy(a => a.Name).ThenBy(a => a.Id).ToArray();
    }

    internal static string[] CompletedRegions(Booking booking, string agencyId)
    {
        // Without a frozen configuration, do not infer historical regions from the current tour.
        if (string.IsNullOrWhiteSpace(booking.TourConfigurationData)) return [];
        TourConfiguration? c;
        try { c = JsonSerializer.Deserialize<TourConfiguration>(booking.TourConfigurationData, Json); }
        catch (JsonException) { return []; }
        if (c is null) return [];
        var provinces = VietnamProvinceCatalog.CurrentCodes(c.ProvinceCodes).Where(VietnamProvinceCatalog.IsValidCode).ToArray();
        var agencies = booking.BookingAgencies.Select(a => a.AgencyId).Distinct().ToArray();
        if (!agencies.Contains(agencyId)) return [];
        // One operator covers the route; a single-province alliance cannot cross-credit another province.
        if (agencies.Length == 1 || provinces.Length <= 1) return provinces;

        // On multi-province alliances only an explicit province in that agency's frozen supplier
        // area/destination is evidence. Do not guess from headquarters, day titles or current services.
        var sources = (c.Timelines ?? []).SelectMany(d =>
            (d.Accommodations ?? []).Where(h => h.IsDefault && (h.AgencyId ?? d.AgencyId) == agencyId)
                .SelectMany(h => new[] { h.Supplier?.Area, h.DestinationName })
            .Concat((d.Meals ?? []).Where(m => m.IsDefault && (m.AgencyId ?? d.AgencyId) == agencyId)
                .Select(m => m.Supplier?.Area)));
        return provinces.Where(p => sources.Any(s => VietnamProvinceCatalog.MatchesName(s, p)))
            .Distinct().ToArray();
    }

    private static string? Thumbnail(string? images)
    {
        if (string.IsNullOrWhiteSpace(images)) return null;
        try { return JsonSerializer.Deserialize<string[]>(images, Json)?.FirstOrDefault(); }
        catch (JsonException) { return null; }
    }
}
