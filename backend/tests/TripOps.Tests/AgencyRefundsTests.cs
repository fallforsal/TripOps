using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Refunds;

namespace TripOps.Tests;

// UC-068 (View Refund History) / UC-069 (View Refund Details) — Agency chủ trì xem (chỉ đọc) các yêu cầu
// hủy/hoàn tiền của khách trong booking mình chủ trì. Không hiện số tài khoản ngân hàng khách.
public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Host_agency_sees_the_refund_but_the_non_host_partner_in_the_same_alliance_booking_cannot()
    {
        using var app = SettlementApp(new FakePayout(), new TestClock { Fixed = Now() });
        await app.Initialize();
        var (_, agency, booking) = await CompletedTour(app, paid: true);

        int refundId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.Include(b => b.BookingAgencies).SingleAsync(b => b.Id == booking.Id);
            // Mô phỏng booking liên minh: agency2 tham gia nhưng không chủ trì.
            db.BookingAgencies.Add(new BookingAgency { BookingId = booking.Id, AgencyId = "agency2", IsHost = false,
                FinalAmount = 0, SettlementStatus = SettlementStatus.Unpaid });
            var refund = new RefundRequest
            {
                BookingId = booking.Id, RequestedBy = stored.CustomerId!, Reason = "OTHER",
                ReasonDetail = "Khách bận việc gia đình, không đi được nữa.",
                OriginalPaidAmount = 2000000, RefundFee = 200000, Status = RefundStatus.Pending,
            };
            db.RefundRequests.Add(refund);
            await db.SaveChangesAsync();
            refundId = refund.Id;
        }

        // Agency chủ trì (agency1) xem được danh sách và chi tiết.
        var list = await agency.GetFromJsonAsync<List<AgencyRefundDto>>("/api/v1/agency/refunds");
        var row = Assert.Single(list!);
        Assert.Equal(refundId, row.Id);
        Assert.Equal(booking.Id, row.BookingId);
        Assert.Equal("Customer One", row.CustomerName);
        Assert.Equal("Pending", row.Status);
        Assert.Equal("customer", row.RequestedByRole);
        Assert.Equal(2000000m, row.PaidAmount);
        Assert.Equal(200000m, row.Fee);
        Assert.Equal(1800000m, row.SuggestedRefund);
        Assert.Null(row.RefundBankMasked); // Khách chưa nhập tài khoản nhận hoàn.
        Assert.NotNull(row.AgencyNetPayout); // Booking đã hoàn thành tour nên đã có khoản quyết toán.

        var detail = await Read<AgencyRefundDto>(await agency.GetAsync($"/api/v1/agency/refunds/{refundId}"));
        Assert.Equal(row.Id, detail.Id);
        Assert.Equal(row.ReasonDetail, detail.ReasonDetail);

        // Agency đối tác (không chủ trì) không thấy khoản này.
        using var partner = await app.Client("agency2@example.test");
        var partnerList = await partner.GetFromJsonAsync<List<AgencyRefundDto>>("/api/v1/agency/refunds");
        Assert.Empty(partnerList!);
        Assert.Equal(HttpStatusCode.NotFound, (await partner.GetAsync($"/api/v1/agency/refunds/{refundId}")).StatusCode);
    }

    [Fact]
    public async Task Refund_list_masks_the_customer_bank_account_and_can_be_filtered_by_status_and_search_text()
    {
        using var app = SettlementApp(new FakePayout(), new TestClock { Fixed = Now() });
        await app.Initialize();
        var (_, agency, booking) = await CompletedTour(app, paid: true);

        int pendingId, completedId;
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.SingleAsync(b => b.Id == booking.Id);
            var pending = new RefundRequest
            {
                BookingId = booking.Id, RequestedBy = stored.CustomerId!, Reason = "OTHER", ReasonDetail = "Đổi kế hoạch.",
                OriginalPaidAmount = 1000000, RefundFee = 0, Status = RefundStatus.Pending,
                RefundBankName = "Vietcombank", RefundAccountNumber = "0123456789", RefundAccountHolder = "NGUYEN VAN A",
            };
            var completed = new RefundRequest
            {
                BookingId = booking.Id, RequestedBy = stored.CustomerId!, Reason = "OTHER", ReasonDetail = "Yêu cầu cũ đã xong.",
                OriginalPaidAmount = 500000, RefundFee = 0, Status = RefundStatus.Completed,
                ApprovedRefundAmount = 500000, CompletedAt = DateTime.UtcNow,
            };
            db.RefundRequests.Add(pending); db.RefundRequests.Add(completed);
            await db.SaveChangesAsync();
            pendingId = pending.Id; completedId = completed.Id;
        }

        // Không lọc: thấy cả 2, số tài khoản đầy đủ không xuất hiện ở đâu trong phản hồi.
        var all = await agency.GetStringAsync("/api/v1/agency/refunds");
        Assert.DoesNotContain("0123456789", all);
        Assert.Contains("Vietcombank ****6789", all);

        var pendingOnly = await agency.GetFromJsonAsync<List<AgencyRefundDto>>("/api/v1/agency/refunds?status=Pending");
        Assert.Equal(pendingId, Assert.Single(pendingOnly!).Id);
        Assert.Equal("Vietcombank ****6789", pendingOnly!.Single().RefundBankMasked);

        var completedOnly = await agency.GetFromJsonAsync<List<AgencyRefundDto>>("/api/v1/agency/refunds?status=Completed");
        Assert.Equal(completedId, Assert.Single(completedOnly!).Id);

        var bySearch = await agency.GetFromJsonAsync<List<AgencyRefundDto>>($"/api/v1/agency/refunds?search={Uri.EscapeDataString(booking.BookingCode)}");
        Assert.Equal(2, bySearch!.Count);

        var noMatch = await agency.GetFromJsonAsync<List<AgencyRefundDto>>("/api/v1/agency/refunds?search=khong-ton-tai-xyz");
        Assert.Empty(noMatch!);
    }
}
