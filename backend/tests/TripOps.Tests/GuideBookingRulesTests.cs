using TripOps.Data.Entities;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed class GuideBookingRulesTests
{
    [Fact]
    public void Alliance_attendance_uses_the_agencys_first_stage_day_in_Vietnam()
    {
        var booking = new Booking
        {
            StartDate = new DateTime(2026, 11, 20), Tour = new Tour { AgencyId = "host" },
            BookingAgencies = [new BookingAgency { AgencyId = "host", IsHost = true }, new BookingAgency { AgencyId = "partner" }],
            Timelines = [
                new BookingTimeline { DayNumber = 1, Attractions = [new BookingTimelineAttraction { AgencyId = "host" }] },
                new BookingTimeline { DayNumber = 3, Attractions = [new BookingTimelineAttraction { AgencyId = "partner" }] }
            ]
        };
        var before = new DateTime(2026, 11, 21, 16, 59, 59, DateTimeKind.Utc);
        Assert.False(GuideBookingRules.CanRecordAttendance(booking, "partner", before));
        Assert.True(GuideBookingRules.CanRecordAttendance(booking, "partner", before.AddSeconds(1)));
        Assert.False(GuideBookingRules.CanRecordAttendance(booking, "host", before.AddSeconds(1)));
        Assert.False(GuideBookingRules.CanRecordAttendance(booking, "partner", before.AddDays(1).AddSeconds(1)));
    }

    [Fact]
    public void Single_agency_attendance_still_uses_the_departure_day()
    {
        var booking = new Booking { StartDate = new DateTime(2026, 11, 20),
            Timelines = [new BookingTimeline { DayNumber = 3, Attractions = [new BookingTimelineAttraction { AgencyId = "host" }] }] };
        Assert.True(GuideBookingRules.CanRecordAttendance(booking, "host", new DateTime(2026, 11, 19, 17, 0, 0, DateTimeKind.Utc)));
        Assert.False(GuideBookingRules.CanRecordAttendance(booking, "host", new DateTime(2026, 11, 20, 17, 0, 0, DateTimeKind.Utc)));
    }
}
