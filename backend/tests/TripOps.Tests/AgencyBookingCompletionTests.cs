using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private static async Task<BookingDto> StartedBookingForCompletion(App app)
    {
        using var customer = await app.Client("customer1@example.test");
        using var agency = await app.Client("agency1@example.test");
        using var guide = await app.Client("guide1@example.test");
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            TenMillion() with { StartDate = DateTime.UtcNow.Date }));
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).EnsureSuccessStatusCode();
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/guide-assignments", new GuideAssignmentRequest("guide1", "lead_guide", null))).EnsureSuccessStatusCode();
        return await Read<BookingDto>(await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/start", null));
    }

    [Fact]
    public async Task Only_the_host_agency_can_complete_and_guide_completion_route_is_removed()
    {
        using var app = new App(); await app.Initialize();
        var booking = await StartedBookingForCompletion(app);
        foreach (var email in new[] { "customer1@example.test", "guide1@example.test", "admin1@example.test" })
        {
            using var client = await app.Client(email);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).StatusCode);
        }
        using var outsider = await app.Client("agency2@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await outsider.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).StatusCode);
        using var guide = await app.Client("guide1@example.test");
        Assert.Equal(HttpStatusCode.NotFound, (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/complete", null)).StatusCode);
        using var agency = await app.Client("agency1@example.test");
        var result = await Read<BookingDto>(await agency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null));
        Assert.Equal("Completed", result.Status);
        using var customer = await app.Client("customer1@example.test");
        Assert.Equal("Completed", (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.Status);
    }

    [Theory]
    [InlineData(BookingStatus.Pending)]
    [InlineData(BookingStatus.Confirmed)]
    [InlineData(BookingStatus.Cancelled)]
    [InlineData(BookingStatus.Rejected)]
    public async Task Completion_rejects_bookings_that_are_not_in_progress(BookingStatus status)
    {
        using var app = new App(); await app.Initialize();
        var booking = await StartedBookingForCompletion(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.SingleAsync(b => b.Id == booking.Id); stored.Status = status;
            await db.SaveChangesAsync();
        }
        using var agency = await app.Client("agency1@example.test");
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).StatusCode);
        using var verify = app.Services.CreateScope();
        var context = verify.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Assert.Equal(status, (await context.Bookings.SingleAsync(b => b.Id == booking.Id)).Status);
        Assert.All(await context.BookingAgencies.Where(a => a.BookingId == booking.Id).ToListAsync(), a => Assert.Null(a.TourCompletedAt));
    }

    [Fact]
    public async Task Repeated_completion_does_not_reset_the_settlement_deadline_or_send_duplicate_notifications()
    {
        var clock = new TestClock { Fixed = Now() };
        using var app = SettlementApp(new FakePayout(), clock); await app.Initialize();
        var booking = await StartedBookingForCompletion(app);
        using var agency = await app.Client("agency1@example.test");
        var completedAt = clock.Fixed!.Value;
        (await agency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).EnsureSuccessStatusCode();
        int notifications;
        using (var scope = app.Services.CreateScope())
            notifications = await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().WorkflowNotifications.CountAsync(n => n.BookingId == booking.Id);
        clock.Fixed = completedAt.AddHours(8);
        var repeated = await Read<BookingDto>(await agency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null));
        Assert.Equal("Completed", repeated.Status);
        using var verify = app.Services.CreateScope();
        var db = verify.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var row = await db.BookingAgencies.SingleAsync(a => a.BookingId == booking.Id);
        Assert.Equal(SettlementStatus.Ready, row.SettlementStatus);
        Assert.Equal(completedAt, row.TourCompletedAt);
        Assert.Equal(completedAt.AddDays(2), row.AutoPayoutAt);
        Assert.Equal(notifications, await db.WorkflowNotifications.CountAsync(n => n.BookingId == booking.Id));
    }
}
