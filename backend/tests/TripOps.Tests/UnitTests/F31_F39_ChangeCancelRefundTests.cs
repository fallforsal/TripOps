using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    // ============================================================ F-31 BookingQuotationService.RequestFinancialChange

    private static FinancialChangeInput Adjust(decimal amount = -500000, string reason = "Giảm giá khách đoàn", decimal total = 5000000, Guid? key = null) =>
        new(amount, reason, total, key ?? Guid.Parse("11111111-1111-1111-1111-111111111111"));

    private static Task RequestChange(App app, int id, FinancialChangeInput input, string agency = "agency1") =>
        Use<BookingQuotationService>(app, s => s.RequestFinancialChange(agency, id, input, default));

    private static Task<int> ChangeCount(App app, int id) => InDb(app, db => db.BookingFinancialChanges.CountAsync(c => c.BookingId == id));

    [Fact]
    public async Task F31_UTCID01_host_agency_requests_price_reduction()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await RequestChange(app, booking.Id, Adjust());
        var change = await InDb(app, db => db.BookingFinancialChanges.SingleAsync(c => c.BookingId == booking.Id));
        Assert.Equal(("Pending", -500000m, "agency1"), (change.Status, change.Amount, change.AgencyId));
        Assert.True(await InDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.BookingId == booking.Id && n.UserId == "agency1")));
    }

    [Fact]
    public async Task F31_UTCID02_same_request_id_sent_twice_is_saved_once()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await RequestChange(app, booking.Id, Adjust());
        await RequestChange(app, booking.Id, Adjust());
        Assert.Equal(1, await ChangeCount(app, booking.Id));
    }

    [Fact]
    public async Task F31_UTCID03_empty_request_id_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Thiếu mã đề nghị điều chỉnh."), await Rejects(() => RequestChange(app, booking.Id, Adjust(key: Guid.Empty))));
    }

    [Fact]
    public async Task F31_UTCID04_zero_amount_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Số tiền điều chỉnh phải là số nguyên khác 0."), await Rejects(() => RequestChange(app, booking.Id, Adjust(0))));
    }

    [Fact]
    public async Task F31_UTCID05_decimal_amount_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Số tiền điều chỉnh phải là số nguyên khác 0."), await Rejects(() => RequestChange(app, booking.Id, Adjust(100.5m))));
    }

    [Fact]
    public async Task F31_UTCID06_two_character_reason_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Cần nhập lý do điều chỉnh."), await Rejects(() => RequestChange(app, booking.Id, Adjust(reason: "ab"))));
    }

    [Fact]
    public async Task F31_UTCID07_outdated_total_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((409, "Giá booking đã thay đổi. Vui lòng tải lại trang."), await Rejects(() => RequestChange(app, booking.Id, Adjust(total: 4000000))));
    }

    [Fact]
    public async Task F31_UTCID08_agency_outside_booking_is_refused()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((403, "Bạn không có quyền thay đổi booking này."), await Rejects(() => RequestChange(app, booking.Id, Adjust(), "agency2")));
    }

    [Fact]
    public async Task F31_UTCID09_rejected_booking_cannot_be_adjusted()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "reject", "Hết chỗ");
        Assert.Equal((422, "Booking đã hủy, kết thúc hoặc đang thực hiện không thể thay đổi."), await Rejects(() => RequestChange(app, booking.Id, Adjust())));
    }

    [Fact]
    public async Task F31_UTCID10_reused_request_id_with_other_amount_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await RequestChange(app, booking.Id, Adjust());
        Assert.Equal((422, "Mã đề nghị đã được sử dụng."), await Rejects(() => RequestChange(app, booking.Id, Adjust(-300000))));
    }

    // ============================================================ F-32 BookingQuotationService.ReviewFinancialChange

    private static async Task<(App App, int BookingId, int ChangeId)> PendingChange(decimal amount = -500000)
    {
        var app = await UtApp();
        var booking = await Book(app);
        await RequestChange(app, booking.Id, Adjust(amount));
        var changeId = await InDb(app, db => db.BookingFinancialChanges.Where(c => c.BookingId == booking.Id).Select(c => c.Id).SingleAsync());
        return (app, booking.Id, changeId);
    }

    private static Task ReviewChange(App app, int bookingId, int changeId, string decision, string? note = null, decimal total = 5000000) =>
        Use<BookingQuotationService>(app, s => s.ReviewFinancialChange("agency1", bookingId, changeId, new FinancialChangeDecision(decision, total, note), default));

    private static Task<decimal> BookingTotal(App app, int id) => InDb(app, db => db.Bookings.Where(b => b.Id == id).Select(b => b.TotalAmount).SingleAsync());

    [Fact]
    public async Task F32_UTCID01_host_approves_reduction_before_booking_approval()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app)
        {
            await ReviewChange(app, bookingId, changeId, "approve");
            Assert.Equal(4500000m, await BookingTotal(app, bookingId));
            Assert.Equal("Approved", await InDb(app, db => db.BookingFinancialChanges.Where(c => c.Id == changeId).Select(c => c.Status).SingleAsync()));
            Assert.True(await InDb(app, db => db.BookingPriceAdjustments.AnyAsync(a => a.BookingId == bookingId)));
        }
    }

    [Fact]
    public async Task F32_UTCID02_host_rejects_with_reason()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app)
        {
            await ReviewChange(app, bookingId, changeId, "reject", "Không đồng ý mức giảm");
            Assert.Equal(5000000m, await BookingTotal(app, bookingId));
            Assert.Equal("Rejected", await InDb(app, db => db.BookingFinancialChanges.Where(c => c.Id == changeId).Select(c => c.Status).SingleAsync()));
        }
    }

    [Fact]
    public async Task F32_UTCID03_reject_with_two_character_reason_is_refused()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app) Assert.Equal((422, "Cần nhập lý do từ chối."), await Rejects(() => ReviewChange(app, bookingId, changeId, "reject", "ok")));
    }

    [Fact]
    public async Task F32_UTCID04_missing_change_is_not_found()
    {
        var (app, bookingId, _) = await PendingChange();
        using (app) Assert.Equal((404, "Không tìm thấy đề nghị."), await Rejects(() => ReviewChange(app, bookingId, 9999, "approve")));
    }

    [Fact]
    public async Task F32_UTCID05_change_reviewed_twice_is_refused()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app)
        {
            await ReviewChange(app, bookingId, changeId, "reject", "Không đồng ý");
            Assert.Equal((409, "Đề nghị đã được xử lý; hãy tải lại danh sách."), await Rejects(() => ReviewChange(app, bookingId, changeId, "approve")));
        }
    }

    [Fact]
    public async Task F32_UTCID06_unknown_decision_is_rejected()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app) Assert.Equal((422, "Quyết định không hợp lệ."), await Rejects(() => ReviewChange(app, bookingId, changeId, "maybe")));
    }

    [Fact]
    public async Task F32_UTCID07_outdated_total_is_rejected()
    {
        var (app, bookingId, changeId) = await PendingChange();
        using (app) Assert.Equal((409, "Giá booking đã thay đổi. Vui lòng tải lại trang."), await Rejects(() => ReviewChange(app, bookingId, changeId, "approve", total: 1)));
    }

    [Fact]
    public async Task F32_UTCID08_reduction_larger_than_booking_total_is_refused()
    {
        var (app, bookingId, changeId) = await PendingChange(-6000000);
        using (app)
            Assert.Equal((422, "Khoản giảm vượt phần tiền còn lại sau phí sàn của Agency hoặc tổng giá booking."),
                await Rejects(() => ReviewChange(app, bookingId, changeId, "approve")));
    }

    // ============================================================ F-36 BookingService.RequestCustomerCancellation

    private static CustomerCancellationRequest CancelRequest(string? bank = "Vietcombank", string? number = "0123456789", string? holder = "Nguyen Van A") =>
        new("CUSTOMER_REQUEST", "Gia đình có việc đột xuất", bank, number, holder);

    /// <summary>Đơn 1 người lớn (3.000.000đ), khởi hành sau 40 ngày, đã duyệt, đã ký và đã trả cọc 1.500.000đ.</summary>
    private static async Task<BookingDto> PaidDeposit(App app)
    {
        var booking = await Book(app, BookingRequest(1, 40, Adult()));
        await Decide(app, booking.Id, "approve");
        await InDb(app, async db =>
        {
            var contract = await db.BookingContracts.SingleAsync(c => c.BookingId == booking.Id);
            contract.Status = "Signed"; contract.SignMethod = "web"; contract.SignedAt = DateTime.UtcNow;
        });
        return await Use<BookingService, BookingDto>(app, s => s.Deposit("customer1", booking.Id, new BookingDepositRequest(1500000, $"DEP-{booking.Id}", null), default));
    }

    private static Task<BookingDto> CustomerCancel(App app, int id, CustomerCancellationRequest? request = null, string customer = "customer1") =>
        Use<BookingService, BookingDto>(app, s => s.RequestCustomerCancellation(customer, id, request ?? CancelRequest(), default));

    [Fact]
    public async Task F36_UTCID01_customer_requests_cancellation_with_refund_account()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        await CustomerCancel(app, booking.Id);
        var refund = await InDb(app, db => db.RefundRequests.SingleAsync(r => r.BookingId == booking.Id));
        Assert.Equal((RefundStatus.Pending, 1500000m, "0123456789"), (refund.Status, refund.OriginalPaidAmount, refund.RefundAccountNumber));
    }

    [Fact]
    public async Task F36_UTCID02_other_customer_is_refused()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        Assert.Equal((403, "Bạn không phải người tạo đơn đặt này."), await Rejects(() => CustomerCancel(app, booking.Id, customer: "customer2")));
    }

    [Fact]
    public async Task F36_UTCID03_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => CustomerCancel(app, 9999)));
    }

    [Fact]
    public async Task F36_UTCID04_unpaid_booking_must_use_immediate_cancel()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((409, "Đơn chưa có khoản thanh toán nào: hãy dùng chức năng hủy ngay."), await Rejects(() => CustomerCancel(app, booking.Id)));
    }

    [Fact]
    public async Task F36_UTCID05_missing_refund_account_is_rejected()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        Assert.Equal((422, "Vui lòng nhập tài khoản ngân hàng nhận tiền hoàn."), await Rejects(() => CustomerCancel(app, booking.Id, CancelRequest(null, null, null))));
    }

    [Fact]
    public async Task F36_UTCID06_account_number_with_letters_is_rejected()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        Assert.Equal((422, "Số tài khoản chỉ gồm 6–30 chữ số."), await Rejects(() => CustomerCancel(app, booking.Id, CancelRequest(number: "12AB"))));
    }

    [Fact]
    public async Task F36_UTCID07_partial_account_information_is_rejected()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        Assert.Equal((422, "Vui lòng nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản."),
            await Rejects(() => CustomerCancel(app, booking.Id, CancelRequest(holder: null))));
    }

    [Fact]
    public async Task F36_UTCID08_second_request_while_first_is_pending_is_refused()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        await CustomerCancel(app, booking.Id);
        Assert.Equal((409, "Đơn đã có yêu cầu hủy đang chờ Admin duyệt."), await Rejects(() => CustomerCancel(app, booking.Id)));
    }

    [Fact]
    public async Task F36_UTCID09_tour_in_progress_cannot_be_cancelled()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        Assert.Equal((422, "Không thể hủy đơn đặt đang ở trạng thái InProgress."), await Rejects(() => CustomerCancel(app, booking.Id)));
    }

    // ============================================================ F-37 BookingService.AgencyCancel

    private static Task<BookingDto> AgencyCancelBooking(App app, int id, string agency = "agency1", string reason = "  Không đủ khách  ") =>
        Use<BookingService, BookingDto>(app, s => s.AgencyCancel(agency, id, new BookingCancellationRequest(reason), default));

    [Fact]
    public async Task F37_UTCID01_unpaid_approved_booking_is_cancelled_immediately()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await AgencyCancelBooking(app, booking.Id);
        var row = await InDb(app, db => db.Bookings.SingleAsync(b => b.Id == booking.Id));
        Assert.Equal((BookingStatus.Cancelled, "Không đủ khách"), (row.Status!.Value, row.CancelReason));
    }

    [Fact]
    public async Task F37_UTCID02_paid_booking_creates_full_refund_request()
    {
        using var app = await UtApp();
        var booking = await PaidDeposit(app);
        await AgencyCancelBooking(app, booking.Id);
        var refund = await InDb(app, db => db.RefundRequests.SingleAsync(r => r.BookingId == booking.Id));
        Assert.Equal((BookingService.ReasonAgencyCancelled, 0m, RefundStatus.Pending), (refund.Reason, refund.RefundFee, refund.Status));
    }

    [Fact]
    public async Task F37_UTCID03_other_agency_is_refused()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((403, "Chỉ Agency sở hữu tour mới có quyền hủy đơn này."), await Rejects(() => AgencyCancelBooking(app, booking.Id, "agency2")));
    }

    [Fact]
    public async Task F37_UTCID04_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => AgencyCancelBooking(app, 9999)));
    }

    [Fact]
    public async Task F37_UTCID05_cancelled_booking_cannot_be_cancelled_again()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await AgencyCancelBooking(app, booking.Id);
        Assert.Equal((422, "Không thể hủy đơn đặt đang ở trạng thái Cancelled."), await Rejects(() => AgencyCancelBooking(app, booking.Id)));
    }

    [Fact]
    public async Task F37_UTCID06_completed_booking_cannot_be_cancelled()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.Completed);
        Assert.Equal((422, "Không thể hủy đơn đặt đang ở trạng thái Completed."), await Rejects(() => AgencyCancelBooking(app, booking.Id)));
    }

    [Fact]
    public async Task F37_UTCID07_pending_booking_is_cancelled_immediately()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await AgencyCancelBooking(app, booking.Id);
        Assert.Equal(BookingStatus.Cancelled, await BookingState(app, booking.Id));
    }

    // ============================================================ F-38 BookingService.ApproveRefund

    private static async Task<(int BookingId, int RefundId)> PendingCustomerRefund(App app, string bank = "Vietcombank")
    {
        var booking = await PaidDeposit(app);
        await CustomerCancel(app, booking.Id, CancelRequest(bank));
        return (booking.Id, await InDb(app, db => db.RefundRequests.Where(r => r.BookingId == booking.Id).Select(r => r.Id).SingleAsync()));
    }

    private static Task<AdminRefundDto> ApproveRefundAs(App app, int refundId, decimal amount = 1500000, string? code = "FT26110100001", string? note = null) =>
        Use<BookingService, AdminRefundDto>(app, s => s.ApproveRefund("admin1", refundId, new RefundApprovalRequest(amount, code, note), default));

    [Fact]
    public async Task F38_UTCID01_admin_approves_suggested_refund_and_booking_is_cancelled()
    {
        using var app = await UtApp();
        var (bookingId, refundId) = await PendingCustomerRefund(app);
        var refund = await ApproveRefundAs(app, refundId);
        Assert.Equal("Completed", refund.Status);
        Assert.Equal(BookingStatus.Cancelled, await BookingState(app, bookingId));
        Assert.True(await InDb(app, db => db.PaymentTransactions.AnyAsync(t => t.BookingId == bookingId && t.Status == PaymentTransactionStatus.Refunded)));
    }

    [Fact]
    public async Task F38_UTCID02_missing_refund_request_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy yêu cầu hủy."), await Rejects(() => ApproveRefundAs(app, 9999)));
    }

    [Fact]
    public async Task F38_UTCID03_refund_above_paid_amount_is_rejected()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        Assert.Equal((422, "Số tiền hoàn không được vượt số khách đã trả (1.500.000đ)."), await Rejects(() => ApproveRefundAs(app, refundId, 1600000)));
    }

    [Fact]
    public async Task F38_UTCID04_amount_different_from_policy_needs_a_note()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        Assert.Equal((422, "Số tiền hoàn khác số gợi ý theo chính sách: vui lòng ghi lý do."), await Rejects(() => ApproveRefundAs(app, refundId, 1000000)));
    }

    [Fact]
    public async Task F38_UTCID05_different_amount_with_note_is_accepted()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        var refund = await ApproveRefundAs(app, refundId, 1000000, note: "Khách đồng ý giữ lại 500.000đ");
        Assert.Equal("Completed", refund.Status);
    }

    [Fact]
    public async Task F38_UTCID06_refund_without_bank_transaction_code_is_rejected()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        Assert.Equal((422, "Vui lòng nhập mã giao dịch ngân hàng của khoản hoàn tiền."), await Rejects(() => ApproveRefundAs(app, refundId, code: " ")));
    }

    [Fact]
    public async Task F38_UTCID07_processed_refund_cannot_be_approved_again()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        await ApproveRefundAs(app, refundId);
        Assert.Equal((409, "Yêu cầu này đã được xử lý."), await Rejects(() => ApproveRefundAs(app, refundId)));
    }

    [Fact]
    public async Task F38_UTCID08_zero_refund_with_note_needs_no_transaction_code()
    {
        using var app = await UtApp();
        var (bookingId, refundId) = await PendingCustomerRefund(app);
        await ApproveRefundAs(app, refundId, 0, null, "Khách đồng ý không hoàn");
        Assert.Equal(BookingStatus.Cancelled, await BookingState(app, bookingId));
    }

    // ============================================================ F-39 BookingService.PayoutRefund

    private static Task<AdminRefundDto> Payout(App app, int refundId, decimal amount = 1500000) =>
        Use<BookingService, AdminRefundDto>(app, s => s.PayoutRefund("admin1", refundId, new RefundPayoutRequest(amount, null), default));

    private static async Task<App> PayoutUtApp(FakePayout payout)
    {
        var app = PayoutApp(payout);
        await app.Initialize();
        return app;
    }

    [Fact]
    public async Task F39_UTCID01_admin_sends_payout_through_payos()
    {
        var payout = new FakePayout();
        using var app = await PayoutUtApp(payout);
        var (_, refundId) = await PendingCustomerRefund(app);
        var refund = await Payout(app, refundId);
        Assert.Equal("Approved", refund.Status);
        var order = Assert.Single(payout.ByKey.Values);
        Assert.Equal((1500000L, "970436", "0123456789"), (order.Amount, order.ToBin, order.ToAccountNumber));
    }

    [Fact]
    public async Task F39_UTCID02_payout_channel_not_configured_is_unavailable()
    {
        using var app = await UtApp();
        var (_, refundId) = await PendingCustomerRefund(app);
        Assert.Equal((503, "Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout:ClientId/ApiKey/ChecksumKey)."), await Rejects(() => Payout(app, refundId)));
    }

    [Fact]
    public async Task F39_UTCID03_missing_refund_request_is_not_found()
    {
        using var app = await PayoutUtApp(new FakePayout());
        Assert.Equal((404, "Không tìm thấy yêu cầu hủy."), await Rejects(() => Payout(app, 9999)));
    }

    [Fact]
    public async Task F39_UTCID04_bank_outside_payout_list_is_rejected()
    {
        using var app = await PayoutUtApp(new FakePayout());
        var (_, refundId) = await PendingCustomerRefund(app, "Ngân hàng ABC");
        Assert.Equal((422, "Ngân hàng \"Ngân hàng ABC\" chưa có trong danh sách chi tự động. Vui lòng chuyển khoản tay rồi duyệt bằng mã giao dịch."),
            await Rejects(() => Payout(app, refundId)));
    }

    [Fact]
    public async Task F39_UTCID05_refund_already_being_paid_out_is_refused()
    {
        using var app = await PayoutUtApp(new FakePayout());
        var (_, refundId) = await PendingCustomerRefund(app);
        await Payout(app, refundId);
        Assert.Equal((409, "Yêu cầu đang được chi hộ qua payOS. Bấm \"Kiểm tra chi hộ\" để cập nhật kết quả."), await Rejects(() => Payout(app, refundId)));
    }

    [Fact]
    public async Task F39_UTCID06_payout_above_paid_amount_is_rejected()
    {
        using var app = await PayoutUtApp(new FakePayout());
        var (_, refundId) = await PendingCustomerRefund(app);
        Assert.Equal((422, "Số tiền hoàn không được vượt số khách đã trả (1.500.000đ)."), await Rejects(() => Payout(app, refundId, 2000000)));
    }

    [Fact]
    public async Task F39_UTCID07_payos_rejecting_the_order_returns_request_to_pending()
    {
        var payout = new FakePayout { RejectNext = "Số dư không đủ" };
        using var app = await PayoutUtApp(payout);
        var (_, refundId) = await PendingCustomerRefund(app);
        var (status, message) = await Rejects(() => Payout(app, refundId));
        Assert.Equal(502, status);
        Assert.EndsWith("Yêu cầu đã trở lại trạng thái chờ duyệt.", message);
        Assert.Equal(RefundStatus.Pending, await InDb(app, db => db.RefundRequests.Where(r => r.Id == refundId).Select(r => r.Status).SingleAsync()));
    }
}
