using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using TripOps.Service.Bookings;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

// Đơn bị hủy: phí hủy thực giữ lại được quyết toán cho Agency, trừ phí sàn như đơn hoàn thành;
// tour co-host chia phí hủy theo tỷ lệ phân bổ của từng Agency.
public sealed partial class BookingFlowTests
{
    [Fact]
    public void Cancellation_fee_is_split_by_each_agency_allocation()
    {
        var host = new BookingAgency { Id = 1, AgencyId = "a", IsHost = true, FinalAmount = 5000000 };
        var partner = new BookingAgency { Id = 2, AgencyId = "b", IsHost = false, FinalAmount = 2500000 };
        var booking = new Booking { BookingAgencies = [host, partner] };
        Assert.Equal(1000000m, AgencySettlementService.CancellationShare(booking, host, 1500000));
        Assert.Equal(500000m, AgencySettlementService.CancellationShare(booking, partner, 1500000));
        // Làm tròn: phần lẻ tính cho Agency chủ trì, tổng luôn đúng bằng phí giữ lại.
        Assert.Equal(1000001m, AgencySettlementService.CancellationShare(booking, host, 1000001) + AgencySettlementService.CancellationShare(booking, partner, 1000001));
        // Tour một Agency: nhận toàn bộ.
        var solo = new BookingAgency { Id = 3, AgencyId = "a", IsHost = true, FinalAmount = 3000000 };
        Assert.Equal(750000m, AgencySettlementService.CancellationShare(new Booking { BookingAgencies = [solo] }, solo, 750000));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Retained_cancellation_fee_becomes_a_settlement_after_the_refund_minus_the_platform_fee(bool coHosted)
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-CS1", null)));
        if (coHosted)
            using (var scope = app.Services.CreateScope())
            {
                // Tour co-host: chủ trì được phân bổ 2.000.000đ, đối tác 1.000.000đ (tổng 3.000.000đ).
                var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
                var stored = await db.Bookings.Include(b => b.BookingAgencies).SingleAsync(b => b.Id == booking.Id);
                var lead = Assert.Single(stored.BookingAgencies);
                lead.IsHost = true; lead.FinalAmount = 2000000; lead.OriginalAmount = 2000000;
                db.BookingAgencies.Add(new BookingAgency { BookingId = booking.Id, AgencyId = "agency2", IsHost = false,
                    OriginalAmount = 1000000, FinalAmount = 1000000, NetPayout = 1000000, SettlementStatus = SettlementStatus.Unpaid });
                await db.SaveChangesAsync();
            }

        // Còn 16 ngày, quá 72 giờ → phí 25% × 3.000.000đ = 750.000đ; đã trả 1.500.000đ → hoàn khách 750.000đ.
        clock.Fixed = clock.Fixed.Value.AddDays(4);
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests", CancelWithBank()));
        var admin = await app.Client("admin1@example.test");
        // Chưa hoàn tiền cho khách thì chưa có khoản quyết toán.
        Assert.DoesNotContain((await admin.GetFromJsonAsync<List<SettlementDto>>("/api/v1/admin/settlements"))!, s => s.BookingId == booking.Id);

        var refund = Assert.Single((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!);
        await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/approve", new RefundApprovalRequest(750000, "FT-CS-1", null)));

        var rows = (await admin.GetFromJsonAsync<List<SettlementDto>>("/api/v1/admin/settlements"))!.Where(s => s.BookingId == booking.Id).ToList();
        Assert.All(rows, s =>
        {
            Assert.True(s.FromCancellation);
            Assert.Equal(750000m, s.CancellationFeeRetained);
            Assert.Equal("Ready", s.Status);
            Assert.Equal(10m, s.FeePercent);
            Assert.Empty(s.PayoutBlockers);
            Assert.NotNull(s.AutoPayoutAt);
        });
        if (coHosted)
        {
            var lead = rows.Single(s => s.IsHost);
            var partner = rows.Single(s => !s.IsHost);
            Assert.Equal((500000m, 50000m, 450000m), (lead.GrossAmount, lead.PlatformFee, lead.NetPayout));       // 2/3 phí hủy
            Assert.Equal((250000m, 25000m, 225000m), (partner.GrossAmount, partner.PlatformFee, partner.NetPayout)); // 1/3 phí hủy
            var partnerView = (await (await app.Client("agency2@example.test")).GetFromJsonAsync<List<SettlementDto>>("/api/v1/agency/settlements"))!;
            Assert.Equal(225000m, partnerView.Single(s => s.BookingId == booking.Id).NetPayout);
        }
        else
        {
            var only = Assert.Single(rows);
            Assert.Equal((750000m, 75000m, 675000m), (only.GrossAmount, only.PlatformFee, only.NetPayout));
        }
        using var check = app.Services.CreateScope();
        Assert.True(await check.ServiceProvider.GetRequiredService<TripOpsDbContext>().WorkflowNotifications
            .AnyAsync(n => n.BookingId == booking.Id && n.UserId == "agency1" && n.Message!.Contains("phí hủy")));
    }

    [Fact]
    public async Task Agency_cancelling_the_tour_leaves_no_settlement_because_the_customer_gets_everything_back()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, agency, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-CS2", null)));
        clock.Fixed = clock.Fixed.Value.AddDays(4);
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/cancel", new BookingCancellationRequest("Không đủ khách")));
        var admin = await app.Client("admin1@example.test");
        await Read<BankAccountDto>(await customer.PutAsJsonAsync("/api/v1/me/bank-account", new BankAccountInput("Vietcombank", "0123456789", "Nguyen Van A")));
        var refund = Assert.Single((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!);
        Assert.Equal(1500000m, refund.SuggestedRefund);
        await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/approve", new RefundApprovalRequest(1500000, "FT-CS-2", null)));
        Assert.DoesNotContain((await admin.GetFromJsonAsync<List<SettlementDto>>("/api/v1/admin/settlements"))!, s => s.BookingId == booking.Id);
    }
}
