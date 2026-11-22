using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

public readonly record struct GuideSchedule(DateTime StartDate, DateTime EndDate, bool IsAssignedToDayOne);

public static class GuideBookingRules
{
    public static GuideSchedule Schedule(Booking booking, string guideId, string agencyId)
    {
        var host = booking.Tour?.AgencyId ?? agencyId;
        var agencyStops = booking.Timelines
            .SelectMany(d => d.Attractions.Select(a => (d.DayNumber, Attraction: a)))
            .Where(x => (x.Attraction.AgencyId ?? host) == agencyId)
            .ToList();
        var guideRoutedDays = agencyStops
            .Where(x => x.Attraction.Checkins.Any(c => c.GuideId == guideId))
            .Select(x => x.DayNumber)
            .ToList();
        if (guideRoutedDays.Count > 0)
        {
            var hasDistinctRouting =
                agencyStops.Any(x => x.Attraction.Checkins.Any(c => c.GuideId != guideId)) ||
                agencyStops.Any(x => x.Attraction.Checkins.Any(c => c.GuideId == guideId && c.AttendanceStatus == AttractionCheckinStatus.Pending));
            var effectiveDays = hasDistinctRouting
                ? guideRoutedDays
                : agencyStops
                    .Where(x => x.Attraction.Checkins.Any(c => c.GuideId == guideId) || x.Attraction.Checkins.Count == 0)
                    .Select(x => x.DayNumber)
                    .ToList();
            var minDay = effectiveDays.Min();
            var maxDay = effectiveDays.Max();
            return new GuideSchedule(
                booking.StartDate.Date.AddDays(Math.Max(0, minDay - 1)),
                booking.StartDate.Date.AddDays(Math.Max(0, maxDay - 1)),
                minDay == 1);
        }

        var tourMaxDay = Math.Max(1, booking.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(booking.Tour?.DurationDays ?? 1).Max());
        var tourEnd = booking.StartDate.Date.AddDays(tourMaxDay - 1);
        if (booking.BookingAgencies.Count <= 1)
            return new GuideSchedule(booking.StartDate.Date, tourEnd, true);

        var ownedDays = booking.Timelines
            .Where(d =>
                d.Attractions.Any(a => (a.AgencyId ?? host) == agencyId) ||
                d.Meals.Any(m => (m.AgencyId ?? host) == agencyId))
            .Select(d => d.DayNumber)
            .ToList();
        var dayDates = ownedDays.Select(d => booking.StartDate.Date.AddDays(Math.Max(0, d - 1))).ToList();
        var stayDates = booking.Accommodations
            .Where(h => (h.AgencyId ?? host) == agencyId)
            .SelectMany(h => new[] { h.DateFrom?.Date, h.DateTo?.Date })
            .Where(d => d.HasValue)
            .Select(d => d!.Value)
            .ToList();
        var allDates = dayDates.Concat(stayDates).ToList();
        if (allDates.Count == 0)
            return new GuideSchedule(booking.StartDate.Date, tourEnd, agencyId == host);

        var start = allDates.Min();
        var end = allDates.Max();
        var isDayOne = ownedDays.Contains(1) || (ownedDays.Count == 0 && start == booking.StartDate.Date && agencyId == host);
        return new GuideSchedule(start, end, isDayOne);
    }

    public static bool IsAssignedToDayOne(Booking booking, string guideId, string agencyId) =>
        Schedule(booking, guideId, agencyId).IsAssignedToDayOne;

    public static bool CanStartTour(Booking booking, string guideId, string agencyId, DateTime utcNow) =>
        IsAssignedToDayOne(booking, guideId, agencyId) &&
        booking.Status is BookingStatus.Confirmed or BookingStatus.Paid &&
        booking.StartDate.Date <= PaymentRules.VietnamDate(utcNow);

    public static DateTime AttendanceDate(Booking booking, string agencyId)
    {
        if (booking.BookingAgencies.Count <= 1) return booking.StartDate.Date;
        var host = booking.Tour!.AgencyId;
        var days = booking.Timelines.Where(d =>
            d.Attractions.Any(a => (a.AgencyId ?? host) == agencyId) ||
            d.Meals.Any(m => (m.AgencyId ?? host) == agencyId))
            .Select(d => booking.StartDate.Date.AddDays(Math.Max(0, d.DayNumber - 1)));
        var stays = booking.Accommodations.Where(h => (h.AgencyId ?? host) == agencyId && h.DateFrom.HasValue)
            .Select(h => h.DateFrom!.Value.Date);
        return days.Concat(stays).DefaultIfEmpty(booking.StartDate.Date).Min();
    }

    public static bool CanRecordAttendance(Booking booking, string agencyId, DateTime utcNow) =>
        AttendanceDate(booking, agencyId) == PaymentRules.VietnamDate(utcNow);

    public static bool CanRecordAttendance(Booking booking, string guideId, string agencyId, DateTime utcNow) =>
        Schedule(booking, guideId, agencyId).StartDate == PaymentRules.VietnamDate(utcNow);
}
