using TripOps.Data.Entities;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

public static class GuideBookingRules
{
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
}
