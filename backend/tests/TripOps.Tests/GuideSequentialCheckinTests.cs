using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
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
        using var app = new App(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:UseLocal"] = "true" })));
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
        async Task<HttpResponseMessage> Check(int locationId)
        {
            using var form = PhotoForm(1);
            return await guide.PostAsync(
                $"/api/v1/guide/bookings/{bookingId}/locations/{locationId}/check-in-with-images", form);
        }
        async Task<HttpResponseMessage> Checkout(int locationId)
        {
            using var form = PhotoForm(1);
            return await guide.PostAsync(
                $"/api/v1/guide/bookings/{bookingId}/locations/{locationId}/check-out-with-images", form);
        }
        var detail = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.False(detail!.CanCheckInLocations);
        Assert.Equal(firstId, detail.NextLocationCheckInId);
        Assert.Equal(HttpStatusCode.Conflict, (await Check(firstId)).StatusCode);

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

        // Reject invalid statuses, photo-less skips, out-of-order check-ins/skips, and duplicate check-ins.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await guide.PostAsJsonAsync(Url(firstId), new { status = "InvalidStatus" })).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsJsonAsync(Url(secondId), new { status = "Skipped" })).StatusCode);
        using (var skipForm = PhotoForm(1, status: "Skipped"))
            Assert.Equal(HttpStatusCode.Conflict,
                (await guide.PostAsync($"/api/v1/guide/bookings/{bookingId}/locations/{secondId}/check-in-with-images", skipForm)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await Check(secondId)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await Check(thirdId)).StatusCode);
        (await Check(firstId)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsJsonAsync(Url(firstId), request)).StatusCode);
        detail = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{bookingId}");
        Assert.Equal(firstId, detail!.NextLocationCheckInId);
        Assert.Equal("CheckedIn", detail.SnapshotDays![0].Locations[0].AttendanceStatus);
        Assert.Equal(HttpStatusCode.Conflict, (await Check(secondId)).StatusCode);
        (await Checkout(firstId)).EnsureSuccessStatusCode();
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
        (await Check(secondId)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await Check(thirdId)).StatusCode);
        (await Checkout(secondId)).EnsureSuccessStatusCode();
        (await Check(thirdId)).EnsureSuccessStatusCode();
        (await Checkout(thirdId)).EnsureSuccessStatusCode();

        detail = await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{bookingId}");
        Assert.Null(detail!.NextLocationCheckInId);
        Assert.All(detail.SnapshotDays!.SelectMany(d => d.Locations),
            x => Assert.Equal("CheckedOut", x.AttendanceStatus));

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
            (await Check(thirdId)).StatusCode);
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
        using var form = PhotoForm(1);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await guide.PostAsync(
                $"/api/v1/guide/bookings/{bookingId}/locations/{otherAgencyStopId}/check-in-with-images",
                form)).StatusCode);
    }

    [Fact]
    public async Task GuideLocationSkip_AdvancesOrderWithoutPhoto_WhileCheckedInStillRequiresCheckout()
    {
        using var app = new App(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:UseLocal"] = "true" })));
        await app.Initialize();
        var today = PaymentRules.VietnamDate(DateTime.UtcNow);
        int bookingId, firstId, secondId, thirdId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = new Booking
            {
                BookingCode = "SKIP-FLOW-" + Guid.NewGuid().ToString("N"),
                TourId = 1, CustomerId = "customer1",
                StartDate = today,
                ContactName = "Test", ContactPhone = "0900000000",
                ContactEmail = "customer1@example.test",
                Status = BookingStatus.Confirmed, TotalAmount = 1000000m,
                BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }],
                AssignedGuides = [new BookingAssignedGuide { GuideId = "guide1", AgencyId = "agency1", Role = "lead_guide" }],
                Timelines =
                [
                    new BookingTimeline
                    {
                        DayNumber = 1, Title = "Day one",
                        Attractions =
                        [
                            new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop 1", CurrentLocationName = "Stop 1", AttendanceStatus = "Pending", Time = today.AddHours(8) },
                            new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop 2", CurrentLocationName = "Stop 2", AttendanceStatus = "Pending", Time = today.AddHours(10) },
                            new BookingTimelineAttraction { AgencyId = "agency1", OriginalLocationName = "Stop 3", CurrentLocationName = "Stop 3", AttendanceStatus = "Pending", Time = today.AddHours(12) }
                        ]
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
        string CheckinUrl(int locationId) => $"/api/v1/guide/bookings/{bookingId}/locations/{locationId}/check-in";
        string CheckinWithImagesUrl(int locationId) => $"/api/v1/guide/bookings/{bookingId}/locations/{locationId}/check-in-with-images";

        // Photo-less skip is rejected.
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsJsonAsync(CheckinUrl(firstId), new { status = "Skipped", note = "Đóng cửa bảo trì" })).StatusCode);

        // Skip active stop 1 with photo & reason -> advances to stop 2.
        HttpResponseMessage skippedFirst;
        using (var form = PhotoForm(1, status: "Skipped", note: "Đóng cửa bảo trì"))
            skippedFirst = await guide.PostAsync(CheckinWithImagesUrl(firstId), form);
        skippedFirst.EnsureSuccessStatusCode();
        var detail = await skippedFirst.Content.ReadFromJsonAsync<BookingDto>();
        Assert.Equal(secondId, detail!.NextLocationCheckInId);
        Assert.Equal("Skipped", detail.SnapshotDays![0].Locations[0].AttendanceStatus);
        Assert.Equal("Đóng cửa bảo trì", detail.SnapshotDays[0].Locations[0].CheckinNote);
        Assert.Single(detail.SnapshotDays[0].Locations[0].PhotoUrls!);

        // Skipped stop cannot be skipped again, checked in, or checked out.
        using (var form = PhotoForm(1, status: "Skipped"))
            Assert.Equal(HttpStatusCode.Conflict, (await guide.PostAsync(CheckinWithImagesUrl(firstId), form)).StatusCode);
        using (var form = PhotoForm(1))
            Assert.Equal(HttpStatusCode.Conflict, (await guide.PostAsync(CheckinWithImagesUrl(firstId), form)).StatusCode);
        using (var form = PhotoForm(1))
            Assert.Equal(HttpStatusCode.Conflict,
                (await guide.PostAsync($"/api/v1/guide/bookings/{bookingId}/locations/{firstId}/check-out-with-images", form)).StatusCode);

        // Stop 2 photo check-in does NOT allow skipping stop 2 or stop 3 until stop 2 is checked out.
        using (var form = PhotoForm(1))
            (await guide.PostAsync(CheckinWithImagesUrl(secondId), form)).EnsureSuccessStatusCode();
        using (var form = PhotoForm(1, status: "Skipped"))
            Assert.Equal(HttpStatusCode.Conflict, (await guide.PostAsync(CheckinWithImagesUrl(secondId), form)).StatusCode);
        using (var form = PhotoForm(1, status: "Skipped"))
            Assert.Equal(HttpStatusCode.Conflict, (await guide.PostAsync(CheckinWithImagesUrl(thirdId), form)).StatusCode);
        using (var form = PhotoForm(1))
            (await guide.PostAsync($"/api/v1/guide/bookings/{bookingId}/locations/{secondId}/check-out-with-images", form)).EnsureSuccessStatusCode();

        // Now stop 3 can be skipped with photo to finish the itinerary.
        HttpResponseMessage skippedThird;
        using (var form = PhotoForm(1, status: "Skipped", note: "Thời tiết xấu"))
            skippedThird = await guide.PostAsync(CheckinWithImagesUrl(thirdId), form);
        skippedThird.EnsureSuccessStatusCode();
        detail = await skippedThird.Content.ReadFromJsonAsync<BookingDto>();
        Assert.Null(detail!.NextLocationCheckInId);
        Assert.Equal("Skipped", detail.SnapshotDays![0].Locations[2].AttendanceStatus);
        Assert.Single(detail.SnapshotDays[0].Locations[2].PhotoUrls!);
    }
}
