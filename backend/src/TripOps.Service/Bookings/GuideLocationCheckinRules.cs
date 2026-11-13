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

    public static int? NextUncheckedStopId(IEnumerable<BookingTimeline> days) =>
        OrderedStops(days).FirstOrDefault(a => a.AttendanceStatus != "CheckedIn")?.Id;

    public static bool CanCheckIn(Booking booking, DateTime utcNow) =>
        booking.StartDate.Date <= PaymentRules.VietnamDate(utcNow) &&
        booking.Status is BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress;
}
