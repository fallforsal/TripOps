using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Api.Infrastructure;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task GuideGpsDemoSeed_IsRepeatable_AndTourIsReadyToday()
    {
        using var app = new App();
        await app.Initialize();

        var first = await GuideCheckinDemoSeed.Run(app.Services, applyMigrations: false);
        var repeated = await GuideCheckinDemoSeed.Run(app.Services, applyMigrations: false);

        Assert.True(first.Created);
        Assert.False(repeated.Created);
        Assert.Equal(first.BookingId, repeated.BookingId);
        Assert.Equal(PaymentRules.VietnamDate(DateTime.UtcNow), first.DepartureDate);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            Assert.Equal(1, await db.Bookings.CountAsync(b => b.BookingCode == first.BookingCode));
            Assert.Equal(1, await db.Tours.CountAsync(t => t.Code == first.TourCode));

            var booking = await db.Bookings
                .Include(b => b.Participants)
                .Include(b => b.AssignedGuides)
                .Include(b => b.Timelines).ThenInclude(d => d.Attractions)
                .SingleAsync(b => b.Id == first.BookingId);

            Assert.Equal(BookingStatus.Confirmed, booking.Status);
            Assert.Equal(4, booking.Participants.Count);
            Assert.All(booking.Participants, p => Assert.Equal(AttendanceStatus.Pending, p.AttendanceStatus));
            Assert.Single(booking.AssignedGuides);
            var stops = booking.Timelines.Single().Attractions.OrderBy(x => x.VisitOrder).ToList();
            Assert.Equal(new[] { 1, 2, 3 }, stops.Select(s => s.VisitOrder).ToArray());
            Assert.All(stops, s =>
            {
                Assert.NotNull(s.Latitude);
                Assert.NotNull(s.Longitude);
                Assert.Equal(300, s.GeofenceRadiusMeters);
                Assert.Equal("Pending", s.AttendanceStatus);
            });
        }

        using var guide = app.CreateClient();
        (await guide.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = GuideCheckinDemoSeed.GuideEmail,
            password = GuideCheckinDemoSeed.DemoPassword
        })).EnsureSuccessStatusCode();

        var detail = await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{first.BookingId}");
        Assert.NotNull(detail);
        Assert.True(detail.CanRecordAttendance);
        Assert.True(detail.CanCheckInLocations);
        Assert.Equal(3, detail.SnapshotDays![0].Locations.Count);
        Assert.Equal(detail.SnapshotDays[0].Locations[0].Id, detail.NextLocationCheckInId);
        Assert.All(detail.Participants, p => Assert.NotNull(p.PhoneNumber));

        // Repeating the fixture should not reset attendance or recorded GPS.
        var participantId = detail.Participants[0].Id;
        var attendanceResponse = await guide.PostAsJsonAsync(
            $"/api/v1/guide/bookings/{first.BookingId}/attendance",
            new AttendanceCheckinRequest(participantId, "CheckedIn"));
        Assert.Equal(HttpStatusCode.OK, attendanceResponse.StatusCode);
        var checkInResponse = await guide.PostAsJsonAsync(
            $"/api/v1/guide/bookings/{first.BookingId}/locations/{detail.NextLocationCheckInId}/check-in",
            new
            {
                status = "CheckedIn", latitude = 10.342, longitude = 107.082,
                accuracyMeters = 10.0, recordedAtUtc = DateTime.UtcNow
            });
        checkInResponse.EnsureSuccessStatusCode();

        var again = await GuideCheckinDemoSeed.Run(app.Services, applyMigrations: false);
        Assert.False(again.Created);
        var after = await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{first.BookingId}");
        Assert.Equal("CheckedIn", after!.Participants[0].AttendanceStatus);
        Assert.Equal("CheckedIn", after.SnapshotDays![0].Locations[0].AttendanceStatus);
        Assert.Equal(after.SnapshotDays[0].Locations[1].Id, after.NextLocationCheckInId);
    }
}
