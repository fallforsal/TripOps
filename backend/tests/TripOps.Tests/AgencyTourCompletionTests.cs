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
    public async Task TourCompletion_OnlyHostAgencyMayCompleteAndTriggerSettlement()
    {
        using var app = new App();
        await app.Initialize();
        int bookingId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = new Booking
            {
                BookingCode = "COMPLETE-AGENCY-" + Guid.NewGuid().ToString("N"),
                TourId = 1, CustomerId = "customer1",
                StartDate = PaymentRules.VietnamDate(DateTime.UtcNow).AddDays(-1),
                ContactName = "Test", ContactPhone = "0900000000",
                ContactEmail = "customer1@example.test",
                Status = BookingStatus.InProgress,
                TotalAmount = 1000000m,
                BookingAgencies = [
                    new BookingAgency { AgencyId = "agency1", IsHost = true },
                    new BookingAgency { AgencyId = "agency2", IsHost = false }
                ],
                AssignedGuides = [
                    new BookingAssignedGuide { GuideId = "guide1", AgencyId = "agency1", Role = "lead_guide" }
                ],
                Timelines = [
                    new BookingTimeline { DayNumber = 1, Title = "Day one" },
                    new BookingTimeline { DayNumber = 2, Title = "Day two" }
                ]
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
        }

        var guidePath = $"/api/v1/guide/bookings/{bookingId}/complete";
        var agencyPath = $"/api/v1/agency/bookings/{bookingId}/complete";
        using var guide = await app.Client("guide1@example.test");
        using var partner = await app.Client("agency2@example.test");
        using var customer = await app.Client("customer1@example.test");
        using var host = await app.Client("agency1@example.test");

        // No route grants the guide completion or settlement initiation.
        var guideResult = await guide.PostAsync(guidePath, null);
        Assert.NotEqual(HttpStatusCode.OK, guideResult.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await guide.PostAsync(agencyPath, null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsync(agencyPath, null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await partner.PostAsync(agencyPath, null)).StatusCode);

        var completed = await host.PostAsync(agencyPath, null);
        Assert.Equal(HttpStatusCode.OK, completed.StatusCode);
        var result = await completed.Content.ReadFromJsonAsync<BookingDto>();
        Assert.Equal("Completed", result!.Status);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = await db.Bookings.SingleAsync(b => b.Id == bookingId);
            Assert.Equal(BookingStatus.Completed, booking.Status);
            var shares = await db.BookingAgencies.Where(a => a.BookingId == bookingId).ToListAsync();
            Assert.All(shares, s => Assert.NotNull(s.TourCompletedAt));
        }
        Assert.Equal(HttpStatusCode.Conflict, (await host.PostAsync(agencyPath, null)).StatusCode);
    }

    [Fact]
    public async Task TourCompletion_AgencyCannotCompleteBeforeInProgress()
    {
        using var app = new App();
        await app.Initialize();
        int bookingId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var booking = new Booking
            {
                BookingCode = "COMPLETE-NOT-STARTED-" + Guid.NewGuid().ToString("N"),
                TourId = 1, CustomerId = "customer1",
                StartDate = PaymentRules.VietnamDate(DateTime.UtcNow),
                ContactName = "Test", ContactPhone = "0900000000",
                ContactEmail = "customer1@example.test",
                Status = BookingStatus.Confirmed, TotalAmount = 1000000m,
                BookingAgencies = [new BookingAgency { AgencyId = "agency1", IsHost = true }]
            };
            db.Bookings.Add(booking);
            await db.SaveChangesAsync();
            bookingId = booking.Id;
        }

        using var host = await app.Client("agency1@example.test");
        Assert.Equal(HttpStatusCode.Conflict,
            (await host.PostAsync($"/api/v1/agency/bookings/{bookingId}/complete", null)).StatusCode);
    }
}
