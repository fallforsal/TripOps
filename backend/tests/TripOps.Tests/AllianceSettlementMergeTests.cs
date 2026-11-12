using Microsoft.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Net;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Partner_guide_attends_own_stage_but_only_host_agency_can_complete_alliance_on_last_day()
    {
        using var app = SettlementApp(new FakePayout(), new TestClock { Fixed = Now() });
        await app.Initialize();
        var (_, _, booking) = await CompletedTour(app, paid: false);
        var today = TripOps.Service.Payments.PaymentRules.VietnamDate(DateTime.UtcNow);
        int partnerParticipant;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.Include(b => b.BookingAgencies).SingleAsync(b => b.Id == booking.Id);
            stored.Status = BookingStatus.InProgress;
            stored.StartDate = today.AddDays(-1);
            var host = Assert.Single(stored.BookingAgencies);
            host.FinalAmount = 6000000; host.SettlementStatus = SettlementStatus.Unpaid;
            db.BookingAgencies.Add(new BookingAgency { BookingId = booking.Id, AgencyId = "agency2", IsHost = false,
                FinalAmount = 4000000, SettlementStatus = SettlementStatus.Unpaid });
            var guide = await db.Users.SingleAsync(u => u.Id == "guide2"); guide.AgencyId = "agency2";
            db.BookingAssignedGuides.Add(new BookingAssignedGuide { BookingId = booking.Id, GuideId = "guide2", AgencyId = "agency2" });
            var secondDay = await db.BookingTimelines.SingleAsync(t => t.BookingId == booking.Id && t.DayNumber == 2);
            db.BookingTimelineAttractions.Add(new BookingTimelineAttraction { BookingTimelineId = secondDay.Id,
                AgencyId = "agency2", OriginalLocationName = "Partner visit" });
            var passenger = new BookingParticipant { BookingId = booking.Id, AgencyId = "agency2", ParticipantIndex = 100,
                FullName = "Partner passenger", Price = 4000000, IsPrimary = false };
            db.BookingParticipants.Add(passenger); await db.SaveChangesAsync(); partnerParticipant = passenger.Id;
        }
        using var partnerGuide = await app.Client("guide2@example.test");
        var detail = await partnerGuide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{booking.Id}");
        Assert.True(detail!.CanRecordAttendance); Assert.Equal(today, detail.AttendanceDate);
        Assert.All(detail.Participants, p => Assert.Equal("agency2", p.AgencyId));
        (await partnerGuide.PostAsJsonAsync($"/api/v1/guide/bookings/{booking.Id}/attendance",
            new AttendanceCheckinRequest(partnerParticipant, "CheckedIn"))).EnsureSuccessStatusCode();
        using var partnerAgency = await app.Client("agency2@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await partnerAgency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).StatusCode);
        using var hostAgency = await app.Client("agency1@example.test");
        Assert.Equal(HttpStatusCode.Conflict, (await hostAgency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).StatusCode);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var row = await db.Bookings.SingleAsync(b => b.Id == booking.Id); row.StartDate = today.AddDays(-2);
            await db.SaveChangesAsync();
        }
        (await hostAgency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).EnsureSuccessStatusCode();
        using var final = app.Services.CreateScope();
        Assert.All(await final.ServiceProvider.GetRequiredService<TripOpsDbContext>().BookingAgencies
            .Where(a => a.BookingId == booking.Id).ToListAsync(), a => Assert.Equal(SettlementStatus.Ready, a.SettlementStatus));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Settlement_uses_net_cash_after_price_reduction_and_the_approved_agency_allocation(bool mismatchedAllocation)
    {
        var gateway = new FakePayout();
        using var app = SettlementApp(gateway, new TestClock { Fixed = Now() });
        await app.Initialize();
        var (admin, _, booking) = await CompletedTour(app, paid: true);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.Include(b => b.BookingAgencies).SingleAsync(b => b.Id == booking.Id);
            stored.TotalAmount = 8000000;
            var host = Assert.Single(stored.BookingAgencies);
            host.IsHost = true;
            host.FinalAmount = mismatchedAllocation ? 5000000 : 4000000;
            db.BookingAgencies.Add(new BookingAgency { BookingId = booking.Id, AgencyId = "agency2", IsHost = false,
                OriginalAmount = 4000000, FinalAmount = 4000000, FeePercent = 10, SettlementStatus = SettlementStatus.Ready });
            db.RefundRequests.Add(new RefundRequest { BookingId = booking.Id, RequestedBy = stored.CustomerId!,
                Reason = BookingBilling.PriceReductionReason, ReasonDetail = "Approved reduction for host stage",
                OriginalPaidAmount = 2000000, ApprovedRefundAmount = 2000000, Status = RefundStatus.Completed });
            await db.SaveChangesAsync();
        }
        var rows = (await admin.GetFromJsonAsync<List<SettlementDto>>("/api/v1/admin/settlements"))!
            .Where(r => r.BookingId == booking.Id).ToArray();
        Assert.Equal(2, rows.Length);
        Assert.All(rows, r => Assert.Equal(8000000, r.CustomerPaid));
        if (mismatchedAllocation)
            Assert.All(rows, r => Assert.Contains(r.PayoutBlockers, b => b.Contains("phân bổ")));
        else
        {
            Assert.All(rows, r => { Assert.Equal(4000000, r.GrossAmount); Assert.Equal(3600000, r.NetPayout); Assert.Empty(r.PayoutBlockers); });
            Assert.Equal(8000000, rows.Sum(r => r.PlatformFee + r.NetPayout));
        }
        Assert.Equal(0, gateway.CreateCalls);
        using var partner = await app.Client("agency2@example.test");
        var own = Assert.Single((await partner.GetFromJsonAsync<List<SettlementDto>>("/api/v1/agency/settlements"))!);
        Assert.Equal("agency2", own.AgencyId);
        Assert.Equal(4000000, own.BookingTotal);
        Assert.Equal(4000000, own.CustomerPaid);
    }
}
