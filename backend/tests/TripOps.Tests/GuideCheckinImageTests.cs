using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
    public async Task GuideCheckinImages_SavesMultiplePrivatePhotos_WithoutRelaxingOrder()
    {
        using var app = new App(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:UseLocal"] = "true" })));
        await app.Initialize();
        var bookingId = await MakeCheckinPhotoBooking(app);
        using var guide = await app.Client("guide1@example.test");
        using var customer = await app.Client("customer1@example.test");
        using var agency = await app.Client("agency1@example.test");
        var detail = (await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{bookingId}"))!;
        var first = detail.SnapshotDays![0].Locations[0].Id;
        var second = detail.SnapshotDays[0].Locations[1].Id;
        var prefix = $"/api/v1/guide/bookings/{bookingId}/locations";

        // The only eligible stop is the next in the itinerary.
        using (var form = PhotoForm(2))
            Assert.Equal(HttpStatusCode.Conflict,
                (await guide.PostAsync($"{prefix}/{second}/check-in-with-images", form)).StatusCode);

        // A guide cannot upload more than 5 photos or non-image data.
        using (var form = PhotoForm(6))
            Assert.Equal(HttpStatusCode.UnprocessableEntity,
                (await guide.PostAsync($"{prefix}/{first}/check-in-with-images", form)).StatusCode);
        using (var form = PhotoForm(1, "text/plain"))
            Assert.Equal(HttpStatusCode.UnprocessableEntity,
                (await guide.PostAsync($"{prefix}/{first}/check-in-with-images", form)).StatusCode);

        using (var form = PhotoForm(2))
            (await guide.PostAsync($"{prefix}/{first}/check-in-with-images", form))
                .EnsureSuccessStatusCode();

        detail = (await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{bookingId}"))!;
        var photos = detail.SnapshotDays![0].Locations[0].PhotoUrls!;
        Assert.Equal(2, photos.Count);
        Assert.All(photos, url => Assert.StartsWith("/api/v1/files/guide-checkins/guide1/", url));
        Assert.Equal(second, detail.NextLocationCheckInId);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var record = await db.BookingAttractionCheckins.SingleAsync(
                c => c.BookingTimelineAttractionId == first);
            Assert.Equal(2, GuideCheckinPhotoRules.Decode(record.PhotoUrl).Count);
        }

        var files = new List<string>();
        try
        {
            foreach (var path in photos)
            {
                Assert.Equal(HttpStatusCode.OK, (await guide.GetAsync(path)).StatusCode);
                Assert.Equal(HttpStatusCode.OK, (await agency.GetAsync(path)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync(path)).StatusCode);
                var relative = path.Replace("/api/v1/files/guide-checkins/", "")
                    .Replace('/', Path.DirectorySeparatorChar);
                var root = app.Services.GetRequiredService<IWebHostEnvironment>().ContentRootPath;
                files.Add(Path.Combine(root, "App_Data", "uploads", "guide-checkins", relative));
            }
        }
        finally
        {
            foreach (var file in files)
                if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public void GuideCheckinPhotos_RejectSizeAndRetainLegacySingleUrl()
    {
        Assert.Equal("image/jpeg", "image/jpeg");
        Assert.Throws<BookingException>(() =>
            GuideCheckinPhotoRules.ValidateFiles([(5L * 1024 * 1024 + 1, "image/png")]));
        Assert.Throws<BookingException>(() =>
            GuideCheckinPhotoRules.ValidateFiles([(4L * 1024 * 1024, "image/png"),
                (4L * 1024 * 1024, "image/png"), (4L * 1024 * 1024, "image/png"),
                (4L * 1024 * 1024, "image/png"), (4L * 1024 * 1024 + 1, "image/png")]));
        Assert.Single(GuideCheckinPhotoRules.Decode("https://example.com/legacy.jpg"));
        Assert.Equal(2, GuideCheckinPhotoRules.Decode(
            GuideCheckinPhotoRules.Encode(["https://example.com/1.jpg", "https://example.com/2.jpg"])).Count);
    }

    private static MultipartFormDataContent PhotoForm(int count, string mime = "image/png")
    {
        var form = new MultipartFormDataContent();
        form.Add(new StringContent("CheckedIn"), "Status");
        form.Add(new StringContent("Reached stop"), "Note");
        for (var i = 0; i < count; i++)
        {
            var bytes = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3 };
            var item = new ByteArrayContent(bytes);
            item.Headers.ContentType = new MediaTypeHeaderValue(mime);
            form.Add(item, "Images", $"evidence_{i}.png");
        }
        return form;
    }

    private static async Task<int> MakeCheckinPhotoBooking(App app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var today = PaymentRules.VietnamDate(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingCode = "PHOTO-" + Guid.NewGuid().ToString("N"),
            TourId = 1, CustomerId = "customer1", StartDate = today,
            ContactName = "Test", ContactPhone = "0900000000",
            ContactEmail = "customer1@example.test",
            Status = BookingStatus.InProgress, TotalAmount = 1000000m,
            BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }],
            AssignedGuides = [new BookingAssignedGuide {
                GuideId = "guide1", AgencyId = "agency1", Role = "lead_guide" }],
            Timelines = [new BookingTimeline {
                DayNumber = 1, Title = "Photo visit",
                Attractions = [
                    new BookingTimelineAttraction {
                        AgencyId = "agency1", OriginalLocationName = "Stop 1",
                        CurrentLocationName = "Stop 1", AttendanceStatus = "Pending",
                        Time = today.AddHours(8)
                    },
                    new BookingTimelineAttraction {
                        AgencyId = "agency1", OriginalLocationName = "Stop 2",
                        CurrentLocationName = "Stop 2", AttendanceStatus = "Pending",
                        Time = today.AddHours(10)
                    }
                ]
            }]
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return booking.Id;
    }
}
