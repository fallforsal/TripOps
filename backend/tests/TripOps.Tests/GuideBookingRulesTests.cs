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

    [Fact]
    public void Guide_schedule_uses_routed_days_and_restricts_tour_start_to_day_one()
    {
        var booking = new Booking
        {
            StartDate = new DateTime(2026, 11, 19),
            Status = TripOps.Data.Enums.BookingStatus.Paid,
            Tour = new Tour { AgencyId = "host", DurationDays = 4 },
            BookingAgencies = [new BookingAgency { AgencyId = "host", IsHost = true }, new BookingAgency { AgencyId = "partner" }],
            Timelines = [
                new BookingTimeline {
                    DayNumber = 1,
                    Attractions = [new BookingTimelineAttraction { AgencyId = "host", Checkins = [new BookingAttractionCheckin { GuideId = "g-day1", AgencyId = "host" }] }]
                },
                new BookingTimeline {
                    DayNumber = 2,
                    Attractions = [new BookingTimelineAttraction { AgencyId = "host", Checkins = [new BookingAttractionCheckin { GuideId = "g-day1", AgencyId = "host" }] }]
                },
                new BookingTimeline {
                    DayNumber = 3,
                    Attractions = [new BookingTimelineAttraction { AgencyId = "partner", Checkins = [new BookingAttractionCheckin { GuideId = "g-partner", AgencyId = "partner" }] }]
                },
                new BookingTimeline {
                    DayNumber = 4,
                    Attractions = [new BookingTimelineAttraction { AgencyId = "partner", Checkins = [new BookingAttractionCheckin { GuideId = "g-partner", AgencyId = "partner" }] }]
                }
            ]
        };

        var leadSchedule = GuideBookingRules.Schedule(booking, "g-day1", "host");
        Assert.Equal(new DateTime(2026, 11, 19), leadSchedule.StartDate);
        Assert.Equal(new DateTime(2026, 11, 20), leadSchedule.EndDate);
        Assert.True(leadSchedule.IsAssignedToDayOne);

        var partnerSchedule = GuideBookingRules.Schedule(booking, "g-partner", "partner");
        Assert.Equal(new DateTime(2026, 11, 21), partnerSchedule.StartDate);
        Assert.Equal(new DateTime(2026, 11, 22), partnerSchedule.EndDate);
        Assert.False(partnerSchedule.IsAssignedToDayOne);

        var day1Utc = new DateTime(2026, 11, 19, 3, 0, 0, DateTimeKind.Utc);
        Assert.True(GuideBookingRules.CanStartTour(booking, "g-day1", "host", day1Utc));
        Assert.False(GuideBookingRules.CanStartTour(booking, "g-partner", "partner", day1Utc));
        Assert.False(GuideLocationCheckinRules.CanCheckIn(booking, "g-partner", "partner", day1Utc));

        var day3Utc = new DateTime(2026, 11, 21, 3, 0, 0, DateTimeKind.Utc);
        Assert.True(GuideLocationCheckinRules.CanCheckIn(booking, "g-partner", "partner", day3Utc));
        Assert.True(GuideBookingRules.CanRecordAttendance(booking, "g-partner", "partner", day3Utc));
    }

    [Fact]
    public void Stop_date_uses_original_booking_start_and_Vietnam_midnight()
    {
        var booking = new Booking
        {
            StartDate = new DateTime(2026, 11, 28),
            Timelines = [
                new BookingTimeline { DayNumber = 1, Attractions = [new BookingTimelineAttraction { Id = 1 }] },
                new BookingTimeline { DayNumber = 2, Attractions = [new BookingTimelineAttraction { Id = 2 }] }
            ]
        };
        var before = new DateTime(2026, 11, 28, 16, 59, 59, DateTimeKind.Utc);
        Assert.Equal(new DateOnly(2026, 11, 29), GuideLocationCheckinRules.ScheduledDate(booking, 2));
        Assert.True(GuideLocationCheckinRules.IsStopDateReached(booking, 1, before));
        Assert.False(GuideLocationCheckinRules.IsStopDateReached(booking, 2, before));
        Assert.True(GuideLocationCheckinRules.IsStopDateReached(booking, 2, before.AddSeconds(1)));
        Assert.True(GuideLocationCheckinRules.IsStopDateReached(booking, 1, before.AddDays(1)));
        Assert.False(GuideLocationCheckinRules.IsStopDateReached(booking, 999, before));
    }

    [Fact]
    public void GuideLocationCheckin_RouteAndScheduleDoNotExpandWhenLastAssignmentIsCompleted()
    {
        var start = new DateTime(2026, 11, 19);
        var assigned = new BookingAttractionCheckin { GuideId = "guide", AgencyId = "host" };
        var booking = new Booking
        {
            StartDate = start,
            Status = TripOps.Data.Enums.BookingStatus.Confirmed,
            Tour = new Tour { AgencyId = "host" },
            Timelines = [
                new BookingTimeline { DayNumber = 1, Attractions = [new BookingTimelineAttraction { Id = 1, AgencyId = "host" }] },
                new BookingTimeline { DayNumber = 2, Attractions = [new BookingTimelineAttraction { Id = 2, AgencyId = "host", Checkins = [assigned] }] },
                new BookingTimeline { DayNumber = 3, Attractions = [new BookingTimelineAttraction { Id = 3, AgencyId = "host" }] }
            ]
        };
        var before = GuideBookingRules.Schedule(booking, "guide", "host");
        Assert.Equal(start.AddDays(1), before.StartDate);
        Assert.Equal(start.AddDays(1), before.EndDate);
        Assert.False(before.IsAssignedToDayOne);
        Assert.Equal(2, GuideLocationCheckinRules.NextUncheckedStopIdForGuide(booking, "guide", "host"));

        assigned.AttendanceStatus = TripOps.Data.Enums.AttractionCheckinStatus.CheckedOut;
        Assert.Equal(before, GuideBookingRules.Schedule(booking, "guide", "host"));
        Assert.Equal(2, Assert.Single(GuideLocationCheckinRules.OrderedStopsForGuide(booking, "guide", "host")).Id);
        Assert.Null(GuideLocationCheckinRules.NextUncheckedStopIdForGuide(booking, "guide", "host"));

        booking.Timelines.Single(d => d.DayNumber == 2).Attractions.Single().Checkins.Clear();
        Assert.Empty(GuideLocationCheckinRules.OrderedStopsForGuide(booking, "guide", "host"));
        Assert.False(GuideBookingRules.IsAssignedToDayOne(booking, "guide", "host"));
        Assert.False(GuideLocationCheckinRules.CanCheckIn(booking, "guide", "host", start.AddDays(3)));
    }

}
