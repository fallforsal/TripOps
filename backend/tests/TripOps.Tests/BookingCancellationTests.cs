using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

// Hủy đơn và hoàn tiền: chính sách phí theo mốc ngày, Agency hủy hoàn 100%, quá hạn mất tiền, chỉ Admin duyệt mới hủy.
public sealed partial class BookingFlowTests
{
    private static CustomerCancellationRequest CancelWithBank(string reason = "CUSTOMER_REQUEST") =>
        new(reason, "Gia đình có việc đột xuất", "Vietcombank", "0123456789", "Nguyen Van A");

    private static async Task<T> Read<T>(HttpResponseMessage response)
    {
        Assert.True(response.IsSuccessStatusCode, $"{(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    [Fact]
    public void Cancellation_fee_follows_the_platform_policy_table()
    {
        Assert.Equal(0m, CancellationPolicy.FeePercent(45, false));
        Assert.Equal(0m, CancellationPolicy.FeePercent(30, false));
        Assert.Equal(25m, CancellationPolicy.FeePercent(29, false));
        Assert.Equal(25m, CancellationPolicy.FeePercent(15, false));
        Assert.Equal(50m, CancellationPolicy.FeePercent(14, false));
        Assert.Equal(50m, CancellationPolicy.FeePercent(8, false));
        Assert.Equal(75m, CancellationPolicy.FeePercent(7, false));
        Assert.Equal(75m, CancellationPolicy.FeePercent(3, false));
        Assert.Equal(90m, CancellationPolicy.FeePercent(2, false));
        Assert.Equal(90m, CancellationPolicy.FeePercent(1, false));
        Assert.Equal(100m, CancellationPolicy.FeePercent(0, false));
        Assert.Equal(100m, CancellationPolicy.FeePercent(0, true)); // ngày khởi hành: không miễn phí
        Assert.Equal(0m, CancellationPolicy.FeePercent(20, true));

        // 20/11 khởi hành, hôm nay 03/11 (giờ VN) → còn 17 ngày. 23:30 03/11 giờ VN vẫn là ngày 03/11.
        Assert.Equal(17, CancellationPolicy.DaysBeforeDeparture(new DateTime(2026, 11, 20), new DateTime(2026, 11, 3, 16, 30, 0, DateTimeKind.Utc)));
        Assert.Equal(16, CancellationPolicy.DaysBeforeDeparture(new DateTime(2026, 11, 20), new DateTime(2026, 11, 3, 17, 30, 0, DateTimeKind.Utc)));
        var paidAt = new DateTime(2026, 11, 3, 10, 0, 0, DateTimeKind.Utc);
        Assert.True(CancellationPolicy.InCoolingOff(paidAt, 17, paidAt.AddHours(72)));
        Assert.False(CancellationPolicy.InCoolingOff(paidAt, 17, paidAt.AddHours(72).AddMinutes(1)));
        Assert.False(CancellationPolicy.InCoolingOff(paidAt, 14, paidAt.AddHours(1))); // còn dưới 15 ngày
        Assert.False(CancellationPolicy.InCoolingOff(null, 20, paidAt));
    }

    [Fact]
    public async Task Unpaid_booking_is_cancelled_immediately_by_customer_or_agency_without_admin()
    {
        using var app = new App(); await app.Initialize();
        var (customer, agency, booking) = await ApprovedBooking(app);
        var quote = await customer.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/bookings/{booking.Id}/cancellation-quote");
        Assert.Equal("immediate", quote!.Mode);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests", CancelWithBank())).StatusCode);
        var cancelled = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel", new BookingCancellationRequest("Đổi kế hoạch")));
        Assert.Equal("Cancelled", cancelled.Status);
        Assert.Null(cancelled.Cancellation);

        var (_, _, second) = await ApprovedBooking(app);
        var other = await app.Client("agency2@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsJsonAsync($"/api/v1/agency/bookings/{second.Id}/cancel", new BookingCancellationRequest("x"))).StatusCode);
        Assert.Equal("immediate", (await agency.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/agency/bookings/{second.Id}/cancellation-quote"))!.Mode);
        var byAgency = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{second.Id}/cancel", new BookingCancellationRequest("Không đủ khách")));
        Assert.Equal("Cancelled", byAgency.Status);
    }

    [Fact]
    public async Task Paid_booking_is_cancelled_at_once_and_admin_refunds_the_policy_amount_to_the_profile_account()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, agencyClient, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-C1", null)));

        // Qua 72 giờ, còn 15–16 ngày → phí 25% tổng giá trị (3.000.000đ) = 750.000đ; đã trả 1.500.000đ → hoàn 750.000đ.
        clock.Fixed = clock.Fixed.Value.AddDays(4);
        var quote = (await customer.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/bookings/{booking.Id}/cancellation-quote"))!;
        Assert.Equal("customer", quote.Mode);
        Assert.False(quote.CoolingOff);
        Assert.Equal(25m, quote.FeePercent);
        Assert.Equal(750000m, quote.Fee);
        Assert.Equal(750000m, quote.RefundAmount);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests",
            new CustomerCancellationRequest("CUSTOMER_REQUEST", "Bận việc", null, null, null))).StatusCode); // thiếu tài khoản nhận tiền
        var requested = await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests", CancelWithBank()));
        Assert.Equal("Cancelled", requested.Status); // hủy ngay khi khách gửi yêu cầu, Admin chỉ hoàn tiền
        Assert.Equal("Pending", requested.Cancellation!.Status);
        Assert.Equal(750000m, requested.Cancellation.SuggestedRefund);
        Assert.True(requested.Cancellation.HasRefundAccount);
        // Đơn đã hủy: không thanh toán tiếp, không gửi yêu cầu thứ hai.
        Assert.False((await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "BAL-C1", null))).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests", CancelWithBank())).StatusCode);
        var agencyView = (await agencyClient.GetFromJsonAsync<BookingDto>($"/api/v1/agency/bookings/{booking.Id}"))!;
        Assert.Equal("Cancelled", agencyView.Status); // Agency thấy đơn đã hủy

        // Phí tính theo lúc gửi yêu cầu: Admin duyệt muộn hơn vẫn giữ số gợi ý cũ.
        clock.Fixed = clock.Fixed.Value.AddDays(3);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/admin/refunds")).StatusCode);
        var admin = await app.Client("admin1@example.test");
        var item = Assert.Single((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!);
        Assert.Equal(750000m, item.SuggestedRefund);
        Assert.Equal("0123456789", item.AccountNumber);
        Assert.Equal("NGUYEN VAN A", item.AccountHolder);
        // Admin không từ chối được: đơn đã hủy, chỉ còn hoàn tiền.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/reject", new RefundRejectionRequest("Admin không đồng ý hủy đơn"))).StatusCode);

        // Khách đổi tài khoản trong hồ sơ: khoản hoàn chưa chuyển dùng tài khoản mới, không giữ tài khoản cũ.
        await Read<BankAccountDto>(await customer.PutAsJsonAsync("/api/v1/me/bank-account", new BankAccountInput("Techcombank", "1903 5555 6666", "tran thi b")));
        item = Assert.Single((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!);
        Assert.Equal(("Techcombank", "190355556666", "TRAN THI B"), (item.BankName, item.AccountNumber, item.AccountHolder));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(750000, null, null))).StatusCode); // thiếu mã giao dịch
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(1000000, "FT1", null))).StatusCode); // khác số gợi ý mà không ghi lý do
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(2000000, "FT1", "quá số đã trả"))).StatusCode);
        var approved = await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(750000, "FT26110312345", null)));
        Assert.Equal("Completed", approved.Status);
        Assert.Equal("FT26110312345", approved.RefundTransactionCode);
        Assert.Equal("190355556666", approved.AccountNumber); // chuyển vào tài khoản hiện tại trong hồ sơ
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(750000, "FT26110312345", null))).StatusCode);

        var after = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal("Cancelled", after.Status);
        Assert.Equal("Refunded", after.PaymentStatus);
        Assert.Equal(1500000m, after.PaidAmount); // tiền đã thu giữ nguyên; tiền hoàn là giao dịch riêng
        Assert.Equal("Completed", after.Cancellation!.Status);
        Assert.Equal(750000m, after.Cancellation.ApprovedRefundAmount);
        var refundTx = Assert.Single(after.PaymentTransactions!, t => t.PaymentMethod == "REFUND");
        Assert.Equal("Refunded", refundTx.Status);
        Assert.Equal(750000m, refundTx.Amount);
    }

    [Fact]
    public async Task Cancelling_within_72_hours_of_paying_with_15_days_left_is_free()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-C2", null)));
        clock.Fixed = clock.Fixed.Value.AddHours(70);
        var quote = (await customer.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/bookings/{booking.Id}/cancellation-quote"))!;
        Assert.True(quote.CoolingOff);
        Assert.Equal(0m, quote.Fee);
        Assert.Equal(1500000m, quote.RefundAmount);
    }

    [Fact]
    public async Task Agency_cancellation_cancels_at_once_and_refunds_everything_to_the_customer_account()
    {
        using var app = PayOsApp(new FakePayOs(), new TestClock()); await app.Initialize();
        var (customer, agency, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(20) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-C3", null)));

        var quote = (await agency.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/agency/bookings/{booking.Id}/cancellation-quote"))!;
        Assert.Equal("agency", quote.Mode);
        Assert.Equal(1500000m, quote.RefundAmount);
        var requested = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/cancel", new BookingCancellationRequest("Không đủ khách khởi hành")));
        Assert.Equal("Cancelled", requested.Status); // hủy ngay
        Assert.Equal(BookingService.ReasonAgencyCancelled, requested.Cancellation!.Reason);
        Assert.Equal("agency", requested.Cancellation.RequestedByRole);
        Assert.Equal("Pending", requested.Cancellation.Status);
        Assert.False(requested.Cancellation.HasRefundAccount);

        var admin = await app.Client("admin1@example.test");
        var item = Assert.Single((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds"))!);
        Assert.Equal(1500000m, item.SuggestedRefund);
        // Chưa có tài khoản nhận tiền: chưa hoàn được; Admin cũng không từ chối được.
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve",
            new RefundApprovalRequest(1500000, "FT2", null))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/reject", new RefundRejectionRequest("Admin không đồng ý hủy đơn"))).StatusCode);
        var withAccount = await Read<BookingDto>(await customer.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests/refund-account",
            new RefundAccountRequest("MB Bank", "9876543210", "Nguyen Van A")));
        Assert.True(withAccount.Cancellation!.HasRefundAccount);

        var done = await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{item.Id}/approve", new RefundApprovalRequest(1500000, "FT3", null)));
        Assert.Equal(("Completed", "9876543210"), (done.Status, done.AccountNumber));
        var after = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(("Cancelled", "Refunded"), (after.Status, after.PaymentStatus));
    }

    [Fact]
    public async Task Customer_who_misses_the_balance_deadline_loses_what_was_paid_and_nothing_is_left_for_admin()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        using var app = PayOsApp(new FakePayOs(), clock); await app.Initialize();
        var start = DateTime.UtcNow.Date.AddDays(20);
        var (customer, agency, booking) = await ApprovedBooking(app, Sample() with { StartDate = start });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP-C4", null)));
        clock.Fixed = PaymentRules.BalanceDeadline(start).AddMinutes(1);

        var quote = (await agency.GetFromJsonAsync<CancellationQuoteDto>($"/api/v1/agency/bookings/{booking.Id}/cancellation-quote"))!;
        Assert.Equal("overdue", quote.Mode);
        Assert.Equal(0m, quote.RefundAmount);
        var requested = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/cancel", new BookingCancellationRequest("Khách không thanh toán đợt 2")));
        Assert.Equal(BookingService.ReasonPaymentOverdue, requested.Cancellation!.Reason);
        Assert.Equal(0m, requested.Cancellation.SuggestedRefund);
        Assert.Equal(("Cancelled", "Completed"), (requested.Status, requested.Cancellation.Status)); // không có gì để hoàn

        var admin = await app.Client("admin1@example.test");
        Assert.Empty((await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!);
        var after = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal("Cancelled", after.Status);
        Assert.DoesNotContain(after.PaymentTransactions!, t => t.PaymentMethod == "REFUND");

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Assert.Equal(RefundStatus.Completed, (await db.RefundRequests.SingleAsync(r => r.BookingId == booking.Id)).Status);
        Assert.All(await db.PaymentRequests.Where(r => r.BookingId == booking.Id && r.Status != PaymentRequestStatus.Paid).ToListAsync(),
            r => Assert.Equal(PaymentRequestStatus.Cancelled, r.Status));
    }
}
