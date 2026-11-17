using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Enums;

namespace TripOps.Api.Controllers;

/// <summary>
/// Read-only, platform-wide Booking metrics for the Admin dashboard.
/// Aggregate in SQL rather than loading every customer's Booking into the browser.
/// Financial settlement metrics remain sourced from /admin/settlements.
/// </summary>
[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/dashboard")]
[Tags("Admin Dashboard")]
public sealed class AdminDashboardController(TripOpsDbContext db) : ControllerBase
{
    [HttpGet("overview")]
    [EndpointSummary("Platform-wide Booking KPIs for the chosen period and a fixed 30-day trend")]
    [ProducesResponseType<AdminBookingOverviewDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Overview([FromQuery] string period = "30d", CancellationToken ct = default)
    {
        var selected = period.Trim().ToLowerInvariant();
        int? days = selected switch
        {
            "7d" => 7,
            "30d" => 30,
            "90d" => 90,
            "365d" => 365,
            "all" => null,
            _ => -1
        };

        if (days == -1)
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid period",
                Detail = "Supported periods: 7d, 30d, 90d, 365d, all."
            });

        var now = DateTime.UtcNow;
        var query = db.Bookings.AsNoTracking();
        if (days.HasValue)
        {
            var start = now.Date.AddDays(1 - days.Value);
            query = query.Where(b => b.CreatedAt >= start && b.CreatedAt <= now);
        }

        // Null CreatedAt values are included only for the all-time totals.
        var bookingCount = await query.CountAsync(ct);
        var bookingValue = await query
            .Where(b => b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected)
            .SumAsync(b => (decimal?)b.TotalAmount, ct) ?? 0m;

        // The booking trend and status chart intentionally stay at a fixed 30-day window.
        // SQL groups by UTC calendar day, keeping response size <= 30 rows.
        var chartStart = now.Date.AddDays(-29);
        var daily = await db.Bookings.AsNoTracking()
            .Where(b => b.CreatedAt >= chartStart && b.CreatedAt <= now)
            .GroupBy(b => b.CreatedAt!.Value.Date)
            .Select(g => new
            {
                Day = g.Key,
                Count = g.Count(),
                Pending = g.Count(b => b.Status == BookingStatus.Pending),
                Completed = g.Count(b => b.Status == BookingStatus.Completed),
                Cancelled = g.Count(b => b.Status == BookingStatus.Cancelled ||
                                          b.Status == BookingStatus.Rejected)
            })
            .ToListAsync(ct);

        var byDay = daily.ToDictionary(d => d.Day, d => d.Count);
        var trend = Enumerable.Range(0, 6).Select(index =>
        {
            var day = chartStart.AddDays(index * 5);
            var count = Enumerable.Range(0, 5)
                .Sum(offset => byDay.GetValueOrDefault(day.AddDays(offset)));
            return new AdminBookingTrendPoint(day.ToString("dd-MM", CultureInfo.InvariantCulture), count);
        }).ToArray();

        var chartBookingCount = daily.Sum(d => d.Count);
        var pending = daily.Sum(d => d.Pending);
        var completed = daily.Sum(d => d.Completed);
        var cancelled = daily.Sum(d => d.Cancelled);

        return Ok(new AdminBookingOverviewDto(
            selected,
            bookingCount,
            bookingValue,
            chartBookingCount,
            trend,
            new AdminBookingStatusCounts(
                pending,
                chartBookingCount - pending - completed - cancelled,
                completed,
                cancelled
            )
        ));
    }
}

public sealed record AdminBookingTrendPoint(string Label, int Count);

public sealed record AdminBookingStatusCounts(int Pending, int Processing, int Completed, int Cancelled);

public sealed record AdminBookingOverviewDto(
    string Period,
    int BookingCount,
    decimal BookingValue,
    int ChartBookingCount,
    IReadOnlyList<AdminBookingTrendPoint> Trend,
    AdminBookingStatusCounts StatusBreakdown);
