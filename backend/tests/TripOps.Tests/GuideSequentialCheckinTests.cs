using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task GuideLocationCheckin_RequiresDepartureAndStrictItineraryOrder_WithoutGps()
    {
        using var app = new App();
        await app.Initialize();
        var today = PaymentRules.VietnamDate(DateTime.UtcNow);
        int bookingId, firstId, secondId, thirdId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = new Booking
            {
                BookingCode = "SEQ-" + Guid.NewGuid().ToString("N"),
                TourId = 1, CustomerId = "customer1",
                StartDate = today.AddDays(1),
                ContactName = "Test", ContactPhone = "0900000000",
                ContactEmail = "customer1@example.test",
                Status = BookingStatus.Confirmed,
                TotalAmount = 1000000m,
                BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }],
                AssignedGuides = [new BookingAssignedGuide { GuideId = "guide1", AgencyId = "agency1", Role = "lead_guide" }],
                Timelines =
                [
                    new BookingTimeline
                    {
                        DayNumber = 1, Title = "Day one",
                        Attractions =
                        [
                            new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop A", CurrentLocationName = "Stop A", AttendanceStatus = "Pending", Time = today.AddHours(8) },
                            new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop B", CurrentLocationName = "Stop B", AttendanceStatus = "Pending", Time = today.AddHours(10) }
                        ]
                    },
                    new BookingTimeline
                    {
                        DayNumber = 2, Title = "Day two",
                        Attractions = [new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop C", CurrentLocationName = "Stop C", AttendanceStatus = "Pending", Time = today.AddDays(1).AddHours(8) }]
                    }
                ]
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
            var days = await db.BookingTimelines.Include(x => x.Attractions)
                .Where(x => x.BookingId == bookingId).ToListAsync();
            var ordered = GuideLocationCheckinRules.OrderedStops(days);
            firstId = ordered[0].Id;
            secondId = ordered[1].Id;
            thirdId = ordered[2].Id;
        }

        using var guide = await app.Client("guide1@example.test");
        using var customer = await app.Client("customer1@example.test");
        string Url(int locationId) => $"/api/v1/guide/bookings/{bookingId}/locations/{locationId}/check-in";
        var request = new { status = "CheckedIn", note = "Arrived, no location data" };
        var detail = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.False(detail!.CanCheckInLocations);
        Assert.Equal(firstId, detail.NextLocationCheckInId);
        Assert.Equal(HttpStatusCode.Conflict, (await guide.PostAsJsonAsync(Url(firstId), request)).StatusCode);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = await db.Bookings.SingleAsync(x => x.Id == bookingId);
            booking.StartDate = today;
            await db.SaveChangesAsync();
        }
        detail = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.True(detail!.CanCheckInLocations);
        Assert.Equal(firstId, detail.NextLocationCheckInId);

        // Reject skipping, out-of-order and duplicate check-ins.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await guide.PostAsJsonAsync(Url(firstId), new { status = "Skipped" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(Url(secondId), request)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(Url(thirdId), request)).StatusCode);
        (await guide.PostAsJsonAsync(Url(firstId), request)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(Url(firstId), request)).StatusCode);
        detail = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.Equal(secondId, detail!.NextLocationCheckInId);

        // Multi-day tour: the guide may still check in after the departure day.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = await db.Bookings.SingleAsync(x => x.Id == bookingId);
            booking.StartDate = today.AddDays(-1);
            await db.SaveChangesAsync();
        }
        (await guide.PostAsJsonAsync(Url(secondId), request)).EnsureSuccessStatusCode();
        (await guide.PostAsJsonAsync(Url(thirdId), request)).EnsureSuccessStatusCode();

        detail = await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{bookingId}");
        Assert.Null(detail!.NextLocationCheckInId);
        Assert.All(detail.SnapshotDays!.SelectMany(d => d.Locations),
            x => Assert.Equal("CheckedIn", x.AttendanceStatus));

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            Assert.Equal(3, await db.BookingAttractionCheckins.CountAsync(
                x => x.BookingTimelineAttraction.BookingTimeline.BookingId == bookingId));
        }

        // A completed booking must not accept any further check-ins.
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = await db.Bookings.SingleAsync(x => x.Id == bookingId);
            booking.Status = BookingStatus.Completed;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(Url(thirdId), request)).StatusCode);
    }

    [Fact]
    public async Task GuideLocationCheckin_CannotCheckOtherAgencysStage()
    {
        using var app = new App();
        await app.Initialize();
        var today = PaymentRules.VietnamDate(DateTime.UtcNow);
        int bookingId, otherAgencyStopId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = new Booking
            {
                BookingCode = "SEQ-AGENCY-" + Guid.NewGuid().ToString("N"),
                TourId = 1, CustomerId = "customer1",
                StartDate = today,
                ContactName = "Test", ContactPhone = "0900000000",
                ContactEmail = "customer1@example.test",
                Status = BookingStatus.Confirmed, TotalAmount = 1000000m,
                BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }, new BookingAgency { AgencyId = "agency2" }],
                AssignedGuides = [new BookingAssignedGuide { GuideId = "guide1", AgencyId = "agency1", Role = "lead_guide" }],
                Timelines = [new BookingTimeline
                {
                    DayNumber = 1, Title = "Agency-specific stage",
                    Attractions = [new BookingTimelineAttraction { AgencyId = "agency2", OriginalLocationName = "Partner stop", AttendanceStatus = "Pending" }]
                }]
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
            otherAgencyStopId = await db.BookingTimelineAttractions
                .Where(x => x.BookingTimeline.BookingId == bookingId).Select(x => x.Id).SingleAsync();
        }
        using var guide = await app.Client("guide1@example.test");
        Assert.Equal(HttpStatusCode.Forbidden,
            (await guide.PostAsJsonAsync(
                $"/api/v1/guide/bookings/{bookingId}/locations/{otherAgencyStopId}/check-in",
                new { status = "CheckedIn" })).StatusCode);
    }
}
