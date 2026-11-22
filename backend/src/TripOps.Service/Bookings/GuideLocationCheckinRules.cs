using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

/// <summary>
/// Shared itinerary ordering for the API response and the server write check.
/// Each booking snapshot is traversed by day, planned time and stable stop ID.
/// No location coordinates, GPS permission, or geofencing are required.
/// </summary>
public static class GuideLocationCheckinRules
{
    public static IReadOnlyList<BookingTimelineAttraction> OrderedStops(
        IEnumerable<BookingTimeline> days) =>
        days.OrderBy(d => d.DayNumber).ThenBy(d => d.Id)
            .SelectMany(d => d.Attractions.OrderBy(a => a.Time ?? DateTime.MaxValue)
                .ThenBy(a => a.Id)).ToList();

    public static IReadOnlyList<BookingTimelineAttraction> OrderedStopsForGuide(
        Booking booking, string guideId, string agencyId)
    {
        var host = booking.Tour?.AgencyId;
        var agencyStops = OrderedStops(booking.Timelines)
            .Where(a => (a.AgencyId ?? host) == agencyId)
            .ToList();
        var guideStops = agencyStops
            .Where(a => a.Checkins.Any(c => c.GuideId == guideId))
            .ToList();
        if (guideStops.Count == 0) return agencyStops;

        var hasDistinctRouting =
            agencyStops.Any(a => a.Checkins.Any(c => c.GuideId != guideId)) ||
            guideStops.Any(a => a.Checkins.Any(c => c.GuideId == guideId && c.AttendanceStatus == AttractionCheckinStatus.Pending));
        if (hasDistinctRouting) return guideStops;

        return agencyStops
            .Where(a => a.Checkins.Any(c => c.GuideId == guideId) || a.Checkins.Count == 0)
            .ToList();
    }

    public static string GuideStopStatus(BookingTimelineAttraction attraction, string guideId)
    {
        var own = attraction.Checkins.SingleOrDefault(c => c.GuideId == guideId);
        if (own is not null)
            return own.AttendanceStatus?.ToString() ?? "Pending";
        return attraction.Checkins.Count == 0
            ? (attraction.AttendanceStatus ?? "Pending")
            : "Pending";
    }

    public static void SyncAttractionStatus(BookingTimelineAttraction location)
    {
        var statuses = location.Checkins
            .Select(c => c.AttendanceStatus ?? AttractionCheckinStatus.Pending)
            .ToList();
        if (statuses.Count == 0) return;
        location.AttendanceStatus =
            statuses.All(s => s == AttractionCheckinStatus.Skipped) ? "Skipped" :
            statuses.All(s => s is AttractionCheckinStatus.CheckedOut or AttractionCheckinStatus.Skipped) ? "CheckedOut" :
            statuses.Any(s => s is AttractionCheckinStatus.CheckedIn or AttractionCheckinStatus.CheckedOut) ? "CheckedIn" :
            "Pending";
    }

    public static int? NextUncheckedStopId(IEnumerable<BookingTimeline> days) =>
        OrderedStops(days).FirstOrDefault(a => a.AttendanceStatus is not ("CheckedOut" or "Skipped"))?.Id;

    public static int? NextUncheckedStopIdForGuide(
        Booking booking, string guideId, string agencyId) =>
        OrderedStopsForGuide(booking, guideId, agencyId)
            .FirstOrDefault(a => GuideStopStatus(a, guideId) is not ("CheckedOut" or "Skipped"))?.Id;

    public static bool CanCheckIn(Booking booking, DateTime utcNow) =>
        booking.StartDate.Date <= PaymentRules.VietnamDate(utcNow) &&
        booking.Status is BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress;

    public static bool CanCheckIn(Booking booking, string guideId, string agencyId, DateTime utcNow) =>
        GuideBookingRules.Schedule(booking, guideId, agencyId).StartDate <= PaymentRules.VietnamDate(utcNow) &&
        booking.Status is BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress;
}
