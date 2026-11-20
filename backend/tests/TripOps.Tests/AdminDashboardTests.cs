using System.Net;
using TripOps.Api.Controllers;
using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private const string AdminOverview = "/api/v1/admin/dashboard/overview";

    [Fact]
    public async Task Admin_dashboard_requires_admin_and_validates_period()
    {
        await using var app = new App();
        await app.Initialize();
        using var anonymous = app.CreateClient();
        using var customer = await app.Login("customer");
        using var admin = await app.Login("admin");

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(AdminOverview)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync(AdminOverview)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync(AdminOverview + "?period=invalid")).StatusCode);

        var empty = await Read<AdminBookingOverviewDto>(await admin.GetAsync(AdminOverview));
        Assert.Equal("30d", empty.Period);
        Assert.Equal(0, empty.BookingCount);
        Assert.Equal(0m, empty.BookingValue);
        Assert.Equal(0, empty.ChartBookingCount);
        Assert.Equal(6, empty.Trend.Count);
    }

    [Fact]
    public async Task Admin_dashboard_aggregates_all_bookings_in_sql_and_preserves_fixed_chart_window()
    {
        await using var app = new App();
        await app.Initialize();
        var now = DateTime.UtcNow;

        await app.Inspect(async db =>
        {
            var rows = new[]
            {
                (code: "DASH-01", daysAgo: 1, amount: 100m, status: BookingStatus.Pending),
                (code: "DASH-02", daysAgo: 2, amount: 200m, status: BookingStatus.Completed),
                (code: "DASH-03", daysAgo: 3, amount: 300m, status: BookingStatus.Cancelled),
                (code: "DASH-04", daysAgo: 60, amount: 400m, status: BookingStatus.Completed),
                (code: "DASH-05", daysAgo: 400, amount: 500m, status: BookingStatus.Deposited),
            };
            foreach (var row in rows)
                db.Bookings.Add(new Booking
                {
                    BookingCode = row.code,
                    CustomerId = "customer",
                    StartDate = now.AddDays(45),
                    CreatedAt = now.AddDays(-row.daysAgo),
                    TotalAmount = row.amount,
                    Status = row.status,
                    ContactName = "Dashboard Customer",
                    ContactEmail = "customer@example.test"
                });
            await db.SaveChangesAsync();
        });

        using var admin = await app.Login("admin");
        var seven = await Read<AdminBookingOverviewDto>(await admin.GetAsync(AdminOverview + "?period=7d"));
        Assert.Equal(3, seven.BookingCount);
        Assert.Equal(300m, seven.BookingValue);
        Assert.Equal(3, seven.ChartBookingCount);
        Assert.Equal(3, seven.Trend.Sum(x => x.Count));
        Assert.Equal(1, seven.StatusBreakdown.Pending);
        Assert.Equal(1, seven.StatusBreakdown.Completed);
        Assert.Equal(1, seven.StatusBreakdown.Cancelled);
        Assert.Equal(0, seven.StatusBreakdown.Processing);

        var ninety = await Read<AdminBookingOverviewDto>(await admin.GetAsync(AdminOverview + "?period=90d"));
        Assert.Equal(4, ninety.BookingCount);
        Assert.Equal(700m, ninety.BookingValue);
        Assert.Equal(3, ninety.ChartBookingCount); // charts remain 30 days

        var year = await Read<AdminBookingOverviewDto>(await admin.GetAsync(AdminOverview + "?period=365d"));
        Assert.Equal(4, year.BookingCount);

        var all = await Read<AdminBookingOverviewDto>(await admin.GetAsync(AdminOverview + "?period=all"));
        Assert.Equal(5, all.BookingCount);
        Assert.Equal(1200m, all.BookingValue);
        Assert.Equal(3, all.ChartBookingCount);
    }
}
