using System.Globalization;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

// Hủy đơn và hoàn tiền (chính sách chung của nền tảng, xem CancellationPolicy):
//  - Chưa trả đồng nào: khách hoặc Agency hủy ngay, không cần Admin.
//  - Đã có tiền: tạo yêu cầu hủy (refund_requests, trạng thái Pending). Đơn CHỈ bị hủy khi Admin duyệt.
//    Trong lúc chờ duyệt, đơn bị khóa thanh toán và không tạo được yêu cầu thứ hai.
//  - Khách hủy: phí theo bảng mốc ngày, tính tại thời điểm GỬI yêu cầu.
//  - Agency hủy: hoàn 100%. Agency hủy vì khách quá hạn thanh toán: khách mất số đã trả.
//  - Admin duyệt theo một trong hai cách:
//      a) Chi tự động qua payOS (kênh chuyển tiền): yêu cầu chuyển sang Approved ("đang chuyển"), tạo lệnh chi,
//         payOS báo SUCCEEDED thì mới hủy đơn; lệnh lỗi thì yêu cầu quay lại Pending để Admin xử lý lại.
//      b) Đã chuyển khoản tay: nhập mã giao dịch ngân hàng, hủy đơn ngay.
//    Tiền ra được ghi thành giao dịch trạng thái Refunded (REFUND-… hoặc PAYOUT-…) để có lịch sử.
public sealed partial class BookingService
{
    public const string ReasonAgencyCancelled = "TOUR_CANCELLED";
    public const string ReasonPaymentOverdue = "PAYMENT_OVERDUE";
    private const string RefundMethod = "REFUND";
    private const string PayoutMethod = "PAYOS_PAYOUT";

    // ------------------------------------------------------------ báo giá

    public async Task<CancellationQuoteDto> CustomerCancellationQuote(string customerId, int id, CancellationToken ct)
    {
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        EnsureCancellable(booking);
        return CustomerQuote(booking, UtcNow);
    }

    public async Task<CancellationQuoteDto> AgencyCancellationQuote(string agencyId, int id, CancellationToken ct)
    {
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền hủy đơn này.");
        EnsureCancellable(booking);
        return AgencyQuote(booking, UtcNow);
    }

    private CancellationQuoteDto CustomerQuote(Booking booking, DateTime now)
    {
        var paid = PaidAmount(booking);
        var days = CancellationPolicy.DaysBeforeDeparture(booking.StartDate, now);
        if (paid == 0)
            return new(booking.Id, "immediate", days, false, 0, booking.TotalAmount, 0, 0, 0,
                "Bạn chưa thanh toán khoản nào nên có thể hủy ngay, không mất phí và không cần Admin duyệt.");
        var coolingOff = CancellationPolicy.InCoolingOff(FirstPaidAt(booking), days, now);
        var percent = CancellationPolicy.FeePercent(days, coolingOff);
        var fee = Money(booking.TotalAmount * percent / 100m);
        var refund = Math.Max(0, Money(paid - fee));
        var why = coolingOff
            ? "Bạn hủy trong 72 giờ kể từ khi thanh toán và còn ít nhất 15 ngày trước khởi hành nên được miễn phí hủy."
            : days <= 0
                ? "Hủy vào ngày khởi hành hoặc sau khi tour đã bắt đầu: phí hủy 100%."
                : $"Còn {days} ngày trước khởi hành: phí hủy {percent.ToString("0.##", Vietnamese)}% tổng giá trị tour.";
        return new(booking.Id, "customer", days, coolingOff, percent, booking.TotalAmount, paid, fee, refund,
            why + " Đơn chỉ bị hủy sau khi Admin duyệt; phí tính theo thời điểm bạn gửi yêu cầu.");
    }

    private CancellationQuoteDto AgencyQuote(Booking booking, DateTime now)
    {
        var paid = PaidAmount(booking);
        var days = CancellationPolicy.DaysBeforeDeparture(booking.StartDate, now);
        if (paid == 0)
            return new(booking.Id, "immediate", days, false, 0, booking.TotalAmount, 0, 0, 0,
                "Khách chưa thanh toán khoản nào nên đơn được hủy ngay.");
        if (OverdueStage(booking, now) is { } overdue)
            return new(booking.Id, "overdue", days, false, 100, booking.TotalAmount, paid, paid, 0,
                $"Khách đã quá hạn {StageName(booking, overdue)} ({VietnamText(Deadline(overdue)!.Value)}) mà chưa trả đủ: theo chính sách, " +
                "khách mất số tiền đã trả. Đơn chỉ bị hủy sau khi Admin duyệt.");
        return new(booking.Id, "agency", days, false, 0, booking.TotalAmount, paid, 0, paid,
            "Agency hủy tour: khách được hoàn 100% số đã trả. Đơn chỉ bị hủy sau khi Admin duyệt và chuyển tiền hoàn.");
    }

    // ------------------------------------------------------------ khách

    /// <summary>Khách gửi yêu cầu hủy cho đơn đã có tiền (đơn chưa có tiền dùng Cancel – hủy ngay).</summary>
    public async Task<BookingDto> RequestCustomerCancellation(string customerId, int id, CustomerCancellationRequest request, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        EnsureCancellable(booking);
        var now = UtcNow;
        var quote = CustomerQuote(booking, now);
        if (quote.Mode == "immediate")
            throw new BookingException(409, "Đơn chưa có khoản thanh toán nào: hãy dùng chức năng hủy ngay.");
        var account = Account(request.BankName, request.AccountNumber, request.AccountHolder, required: quote.RefundAmount > 0);

        booking.RefundRequests.Add(new RefundRequest
        {
            RequestedBy = customerId,
            Reason = request.Reason,
            ReasonDetail = request.ReasonDetail.Trim(),
            OriginalPaidAmount = quote.PaidAmount,
            RefundFee = quote.Fee,
            ApprovedRefundAmount = null,
            RefundBankName = account?.Bank,
            RefundAccountNumber = account?.Number,
            RefundAccountHolder = account?.Holder,
            Status = RefundStatus.Pending,
            CreatedAt = now
        });
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(customerId,id,ct);
    }

    /// <summary>Khách bổ sung/sửa tài khoản nhận hoàn khi yêu cầu còn chờ duyệt (ví dụ Agency hủy tour).</summary>
    public async Task<BookingDto> UpdateRefundAccount(string customerId, int id, RefundAccountRequest request, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        var open = OpenCancellation(booking) ?? throw new BookingException(409, "Đơn không có yêu cầu hủy nào đang chờ duyệt.");
        var account = Account(request.BankName, request.AccountNumber, request.AccountHolder, required: true)!;
        open.RefundBankName = account.Bank;
        open.RefundAccountNumber = account.Number;
        open.RefundAccountHolder = account.Holder;
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(customerId,id,ct);
    }

    // ------------------------------------------------------------ Agency

    /// <summary>
    /// Agency hủy đơn. Chưa có tiền: hủy ngay. Đã có tiền: tạo yêu cầu chờ Admin duyệt —
    /// hoàn 100% (Agency hủy) hoặc khách mất số đã trả nếu khách quá hạn thanh toán.
    /// </summary>
    public async Task<BookingDto> AgencyCancel(string agencyId, int id, BookingCancellationRequest request, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới có quyền hủy đơn này.");
        EnsureCancellable(booking);
        var now = UtcNow;
        var quote = AgencyQuote(booking, now);
        var reason = request.Reason.Trim();

        if (quote.Mode == "immediate")
        {
            CloseOpenRequests(booking);
            booking.Status = BookingStatus.Cancelled;
            booking.CancelReason = reason;
            booking.CancelledAt = now;
            booking.SpecialRequests = $"{booking.SpecialRequests} [Agency hủy: {reason}]".Trim();
        }
        else
        {
            booking.RefundRequests.Add(new RefundRequest
            {
                RequestedBy = agencyId,
                Reason = quote.Mode == "overdue" ? ReasonPaymentOverdue : ReasonAgencyCancelled,
                ReasonDetail = reason,
                OriginalPaidAmount = quote.PaidAmount,
                RefundFee = quote.Fee,
                Status = RefundStatus.Pending,
                CreatedAt = now
            });
        }
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(agencyId,id,ct);
    }

    // ------------------------------------------------------------ Admin

    public async Task<IReadOnlyList<AdminRefundDto>> ListRefunds(string? status, CancellationToken ct)
    {
        RefundStatus? filter = null;
        if (!string.IsNullOrWhiteSpace(status))
            filter = Enum.TryParse<RefundStatus>(status, true, out var parsed)
                ? parsed : throw new BookingException(400, "Trạng thái không hợp lệ.");
        return (await Repo.ListRefunds(filter, ct)).Select(AdminRefund).ToList();
    }

    public async Task<AdminRefundDto> ApproveRefund(string adminId, int refundId, RefundApprovalRequest request, CancellationToken ct)
    {
        var bookingId = await Repo.RefundBookingId(refundId, ct) ?? throw new BookingException(404, "Không tìm thấy yêu cầu hủy.");
        await using var transaction = await Repo.BeginPaymentChange(bookingId, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var refund = booking.RefundRequests.Single(r => r.Id == refundId);
        EnsureReviewable(refund);

        var now = UtcNow;
        var (amount, note) = ValidateRefundAmount(booking, refund, request.RefundAmount, request.Note);
        var code = request.TransactionCode?.Trim();
        if (amount > 0 && string.IsNullOrWhiteSpace(code))
            throw new BookingException(422, "Vui lòng nhập mã giao dịch ngân hàng của khoản hoàn tiền.");
        if (amount > 0 && string.IsNullOrWhiteSpace(refund.RefundAccountNumber))
            throw new BookingException(409, "Khách chưa cung cấp tài khoản nhận hoàn tiền.");
        if (amount > 0 && await Repo.FindTransaction(RefundCode(refund.Id), ct) is not null)
            throw new BookingException(409, "Khoản hoàn của yêu cầu này đã được ghi nhận.");

        refund.ReviewedBy = adminId;
        refund.ReviewedAt = now;
        refund.AdminNote = note;
        if (amount > 0)
        {
            booking.PaymentTransactions.Add(new PaymentTransaction
            {
                TransactionCode = RefundCode(refund.Id),
                Amount = amount,
                PaymentMethod = RefundMethod,
                Status = PaymentTransactionStatus.Refunded,
                PayerName = refund.RefundAccountHolder,
                GatewayTransactionNo = code,
                ReviewNote = $"Hoàn tiền yêu cầu hủy #{refund.Id}" + (string.IsNullOrWhiteSpace(note) ? "" : $": {Truncate(note, 400)}"),
                PaidAt = now,
                CreatedAt = now
            });
        }
        CompleteCancellation(booking, refund, amount, now);

        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return AdminRefund(refund);
    }

    /// <summary>Admin duyệt và hoàn tự động bằng chi hộ payOS. Đơn chỉ bị hủy khi payOS báo chuyển thành công.</summary>
    public async Task<AdminRefundDto> PayoutRefund(string adminId, int refundId, RefundPayoutRequest request, CancellationToken ct)
    {
        if (!Payouts.Options.IsConfigured)
            throw new BookingException(503, "Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout:ClientId/ApiKey/ChecksumKey).");
        var bookingId = await Repo.RefundBookingId(refundId, ct) ?? throw new BookingException(404, "Không tìm thấy yêu cầu hủy.");

        string code;
        long amount;
        string bin, accountNumber;
        await using (var transaction = await Repo.BeginPaymentChange(bookingId, ct))
        {
            Repo.ResetTracking();
            var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
            var refund = booking.RefundRequests.Single(r => r.Id == refundId);
            EnsureReviewable(refund);
            var now = UtcNow;
            var (money, note) = ValidateRefundAmount(booking, refund, request.RefundAmount, request.Note);
            if (money <= 0)
                throw new BookingException(422, "Số tiền hoàn bằng 0 thì không cần chi hộ: hãy duyệt thường.");
            accountNumber = refund.RefundAccountNumber
                ?? throw new BookingException(409, "Khách chưa cung cấp tài khoản nhận hoàn tiền.");
            bin = VietnamBanks.BinOf(refund.RefundBankName)
                ?? throw new BookingException(422, $"Ngân hàng \"{refund.RefundBankName}\" chưa có trong danh sách chi tự động. Vui lòng chuyển khoản tay rồi duyệt bằng mã giao dịch.");

            var attempt = booking.PaymentTransactions.Count(t => t.PaymentMethod == PayoutMethod && IsPayoutOf(t, refund.Id)) + 1;
            code = $"PAYOUT-{refund.Id}-{attempt}";
            amount = (long)money;
            booking.PaymentTransactions.Add(new PaymentTransaction
            {
                TransactionCode = code,
                Amount = money,
                PaymentMethod = PayoutMethod,
                Status = PaymentTransactionStatus.Pending,
                PayerName = refund.RefundAccountHolder,
                GatewayResponseCode = "CREATING",
                ReviewNote = $"Chi hộ payOS hoàn yêu cầu hủy #{refund.Id}",
                PaidAt = null,
                CreatedAt = now
            });
            refund.Status = RefundStatus.Approved; // đang chuyển tiền: khóa thao tác khác trên yêu cầu
            refund.ApprovedRefundAmount = money;
            refund.ReviewedBy = adminId;
            refund.ReviewedAt = now;
            refund.AdminNote = note;
            await Repo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        // Gọi payOS ngoài khóa DB. Khóa idempotency = mã giao dịch nên gửi lại không tạo lệnh chi thứ hai.
        PayOsPayoutInfo info;
        try
        {
            info = await Payouts.Create(code, amount, $"TripOps hoan tien don {bookingId}", bin, accountNumber, ct);
        }
        catch (PayOsPayoutException exception) when (exception.Definite)
        {
            await ApplyPayout(bookingId, code, null, exception.Message, ct);
            throw new BookingException(502, $"{exception.Message} Yêu cầu đã trở lại trạng thái chờ duyệt.");
        }
        catch (PayOsPayoutException exception)
        {
            throw new BookingException(502, $"{exception.Message} Chưa chắc payOS đã nhận lệnh chi: bấm \"Kiểm tra chi hộ\" sau ít phút, KHÔNG chuyển tay để tránh hoàn hai lần.");
        }
        return await ApplyPayout(bookingId, code, info, null, ct);
    }

    /// <summary>Tra cứu payOS cho lệnh chi đang chạy của yêu cầu và áp kết quả (thành công → hủy đơn; lỗi → về chờ duyệt).</summary>
    public async Task<AdminRefundDto> SyncPayout(int refundId, CancellationToken ct)
    {
        var bookingId = await Repo.RefundBookingId(refundId, ct) ?? throw new BookingException(404, "Không tìm thấy yêu cầu hủy.");
        Repo.ResetTracking();
        var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var refund = booking.RefundRequests.Single(r => r.Id == refundId);
        var running = booking.PaymentTransactions
            .Where(t => t.PaymentMethod == PayoutMethod && t.Status == PaymentTransactionStatus.Pending && IsPayoutOf(t, refundId))
            .OrderByDescending(t => t.Id).FirstOrDefault();
        if (running is null) return AdminRefund(refund);

        PayOsPayoutInfo? info;
        try
        {
            info = running.GatewayLinkId is { Length: > 0 } payoutId
                ? await Payouts.Get(payoutId, ct)
                : await Payouts.FindByReference(running.TransactionCode, ct);
        }
        catch (PayOsPayoutException exception)
        {
            throw new BookingException(502, exception.Message);
        }
        if (info is null)
        {
            // payOS không có lệnh với mã này: chắc chắn chưa chuyển tiền (đợi 2 phút phòng payOS ghi nhận chậm).
            if (UtcNow - DateTime.SpecifyKind(running.CreatedAt ?? UtcNow, DateTimeKind.Utc) < TimeSpan.FromMinutes(2))
                return AdminRefund(refund);
            return await ApplyPayout(bookingId, running.TransactionCode, null, "payOS không có lệnh chi này (lệnh chưa được tạo).", ct);
        }
        return await ApplyPayout(bookingId, running.TransactionCode, info, null, ct);
    }

    /// <summary>Số dư và thông tin kênh chuyển tiền payOS (để Admin biết có đủ tiền chi hộ không).</summary>
    public async Task<PayoutAccountDto> PayoutAccount(CancellationToken ct)
    {
        if (!Payouts.Options.IsConfigured) return new PayoutAccountDto(false, null, null, null, "Chưa cấu hình kênh chuyển tiền payOS.");
        try
        {
            var account = await Payouts.Balance(ct);
            return new PayoutAccountDto(true, account.AccountNumber, account.AccountName, account.Balance, null);
        }
        catch (PayOsPayoutException exception)
        {
            return new PayoutAccountDto(true, null, null, null, exception.Message);
        }
    }

    /// <summary>Áp kết quả lệnh chi (trong khóa đơn). info null = lệnh chắc chắn không thành công.</summary>
    private async Task<AdminRefundDto> ApplyPayout(int bookingId, string code, PayOsPayoutInfo? info, string? failure, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(bookingId, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var payment = booking.PaymentTransactions.Single(t => t.TransactionCode == code);
        var refund = booking.RefundRequests.Single(r => IsPayoutOf(payment, r.Id));
        if (payment.Status != PaymentTransactionStatus.Pending)
            return AdminRefund(refund); // đã áp trước đó (bấm lặp)

        var now = UtcNow;
        if (info is not null)
        {
            payment.GatewayLinkId = info.Id;
            payment.GatewayResponseCode = Truncate(info.State ?? info.ApprovalState, 10);
        }
        if (info is { Succeeded: true })
        {
            payment.Status = PaymentTransactionStatus.Refunded;
            payment.GatewayTransactionNo = info.BankReference ?? info.Id;
            payment.PaidAt = info.TransactionTime ?? now;
            CompleteCancellation(booking, refund, payment.Amount, now);
        }
        else if (info is null || info.Failed)
        {
            var reason = failure ?? info?.ErrorMessage ?? $"payOS báo {info?.State ?? info?.ApprovalState}.";
            payment.Status = PaymentTransactionStatus.Failed;
            payment.ReviewNote = Truncate($"Chi hộ không thành công: {reason}", 500);
            refund.Status = RefundStatus.Pending;
            refund.ApprovedRefundAmount = null;
            refund.AdminNote = Truncate($"Chi hộ payOS không thành công ({reason}). {refund.AdminNote}".Trim(), 4000);
        }
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return AdminRefund(refund);
    }

    /// <summary>Hoàn tất: ghi số hoàn, hủy đơn, đóng các đợt thu còn mở.</summary>
    private static void CompleteCancellation(Booking booking, RefundRequest refund, decimal amount, DateTime now)
    {
        refund.Status = RefundStatus.Completed;
        refund.ApprovedRefundAmount = amount;
        refund.CompletedAt = now;
        if (amount > 0) booking.PaymentStatus = PaymentStatus.Refunded;
        CloseOpenRequests(booking);
        booking.Status = BookingStatus.Cancelled;
        booking.CancelledAt = now;
        booking.CancelReason = Truncate(refund.ReasonDetail, 1000);
        booking.SpecialRequests = $"{booking.SpecialRequests} [Admin duyệt hủy #{refund.Id}, hoàn {amount.ToString("N0", Vietnamese)}đ]".Trim();
    }

    private static void EnsureReviewable(RefundRequest refund)
    {
        if (refund.Status == RefundStatus.Approved)
            throw new BookingException(409, "Yêu cầu đang được chi hộ qua payOS. Bấm \"Kiểm tra chi hộ\" để cập nhật kết quả.");
        if (refund.Status is not (RefundStatus.Pending or RefundStatus.Reviewing))
            throw new BookingException(409, "Yêu cầu này đã được xử lý.");
    }

    private (decimal Amount, string? Note) ValidateRefundAmount(Booking booking, RefundRequest refund, decimal requested, string? note)
    {
        var paid = PaidAmount(booking);
        var amount = Money(requested);
        if (amount > paid)
            throw new BookingException(422, $"Số tiền hoàn không được vượt số khách đã trả ({paid.ToString("N0", Vietnamese)}đ).");
        note = note?.Trim();
        if (amount != SuggestedRefund(refund) && string.IsNullOrWhiteSpace(note))
            throw new BookingException(422, "Số tiền hoàn khác số gợi ý theo chính sách: vui lòng ghi lý do.");
        return (amount, string.IsNullOrWhiteSpace(note) ? null : note);
    }

    private static bool IsPayoutOf(PaymentTransaction t, int refundId) =>
        t.TransactionCode.StartsWith($"PAYOUT-{refundId.ToString(CultureInfo.InvariantCulture)}-", StringComparison.Ordinal);

    /// <summary>Giao dịch tiền ra đã thành công của một yêu cầu (chuyển tay REFUND-… hoặc chi hộ PAYOUT-…).</summary>
    private static PaymentTransaction? RefundTransaction(Booking booking, int refundId) => booking.PaymentTransactions
        .FirstOrDefault(t => t.Status == PaymentTransactionStatus.Refunded && (t.TransactionCode == RefundCode(refundId) || IsPayoutOf(t, refundId)));

    public async Task<AdminRefundDto> RejectRefund(string adminId, int refundId, RefundRejectionRequest request, CancellationToken ct)
    {
        var bookingId = await Repo.RefundBookingId(refundId, ct) ?? throw new BookingException(404, "Không tìm thấy yêu cầu hủy.");
        await using var transaction = await Repo.BeginPaymentChange(bookingId, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var refund = booking.RefundRequests.Single(r => r.Id == refundId);
        if (refund.Status is not (RefundStatus.Pending or RefundStatus.Reviewing))
            throw new BookingException(409, "Yêu cầu này đã được xử lý.");
        refund.Status = RefundStatus.Rejected;
        refund.RejectionReason = request.Reason.Trim();
        refund.ReviewedBy = adminId;
        refund.ReviewedAt = UtcNow;
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return AdminRefund(refund);
    }

    // ------------------------------------------------------------ hỗ trợ

    /// <summary>Chỉ hủy được đơn chưa khởi hành, chưa hủy; không chồng yêu cầu; không hủy khi đang có link payOS còn hạn.</summary>
    private void EnsureCancellable(Booking booking)
    {
        if (booking.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed or BookingStatus.InProgress)
            throw new BookingException(422, $"Không thể hủy đơn đặt đang ở trạng thái {booking.Status}.");
        if (OpenCancellation(booking) is not null)
            throw new BookingException(409, "Đơn đã có yêu cầu hủy đang chờ Admin duyệt.");
        if (HasOpenGatewayPayment(booking, UtcNow))
            throw new BookingException(409, "Đơn đang có link thanh toán payOS còn hiệu lực. Vui lòng chờ link hết hạn hoặc bấm \"Kiểm tra thanh toán\" trước khi hủy.");
    }

    private static RefundRequest? OpenCancellation(Booking booking) =>
        booking.RefundRequests.FirstOrDefault(r => r.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved);

    /// <summary>Đợt thu đã quá hạn mà chưa trả đủ (dùng khi Agency hủy vì khách không thanh toán).</summary>
    private PaymentRequest? OverdueStage(Booking booking, DateTime now) => booking.PaymentRequests
        .Where(p => p.Stage is DepositStage or BalanceStage && p.Status is PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue)
        .FirstOrDefault(p => Deadline(p) is { } due && now > due && Outstanding(booking, p) > 0);

    private static DateTime? FirstPaidAt(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success && t.PaidAt != null)
        .Select(t => t.PaidAt).Min();

    private sealed record RefundAccount(string Bank, string Number, string Holder);

    private static RefundAccount? Account(string? bank, string? number, string? holder, bool required)
    {
        bank = bank?.Trim(); number = number?.Replace(" ", "").Trim(); holder = holder?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(bank) && string.IsNullOrEmpty(number) && string.IsNullOrEmpty(holder))
        {
            if (required) throw new BookingException(422, "Vui lòng nhập tài khoản ngân hàng nhận tiền hoàn.");
            return null;
        }
        if (string.IsNullOrEmpty(bank) || string.IsNullOrEmpty(number) || string.IsNullOrEmpty(holder))
            throw new BookingException(422, "Vui lòng nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản.");
        if (!number.All(char.IsAsciiDigit) || number.Length is < 6 or > 30)
            throw new BookingException(422, "Số tài khoản chỉ gồm 6–30 chữ số.");
        return new RefundAccount(bank, number, holder);
    }

    private static decimal SuggestedRefund(RefundRequest refund) =>
        Math.Max(0, Money(refund.OriginalPaidAmount - (refund.RefundFee ?? 0)));

    private static decimal FeePercentOf(RefundRequest refund, decimal total) => refund.Reason switch
    {
        ReasonAgencyCancelled => 0m,
        ReasonPaymentOverdue => 100m,
        _ => total > 0 ? decimal.Round((refund.RefundFee ?? 0) * 100m / total, 2) : 0m
    };

    private static string RequestedByRole(RefundRequest refund) =>
        refund.Reason is ReasonAgencyCancelled or ReasonPaymentOverdue ? "agency" : "customer";

    private static string RefundCode(int refundId) => "REFUND-" + refundId.ToString(CultureInfo.InvariantCulture);

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];

    private static CancellationRequestDto? Cancellation(Booking booking)
    {
        var refund = booking.RefundRequests.OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id).FirstOrDefault();
        return refund is null ? null : new CancellationRequestDto(
            refund.Id, refund.Reason, refund.ReasonDetail, refund.Status.ToString(), RequestedByRole(refund),
            FeePercentOf(refund, booking.TotalAmount), refund.RefundFee ?? 0, refund.OriginalPaidAmount, SuggestedRefund(refund),
            refund.ApprovedRefundAmount, !string.IsNullOrWhiteSpace(refund.RefundAccountNumber),
            RefundTransaction(booking, refund.Id)?.GatewayTransactionNo,
            refund.AdminNote, refund.RejectionReason,
            Utc(refund.CreatedAt) ?? DateTime.UnixEpoch, Utc(refund.ReviewedAt), Utc(refund.CompletedAt));
    }

    private static AdminRefundDto AdminRefund(RefundRequest refund)
    {
        var booking = refund.Booking;
        var payouts = booking.PaymentTransactions
            .Where(t => t.PaymentMethod == PayoutMethod && IsPayoutOf(t, refund.Id)).OrderByDescending(t => t.Id).ToList();
        return new AdminRefundDto(
            refund.Id, refund.BookingId, booking.BookingCode, booking.Tour?.Name, booking.StartDate,
            booking.Customer?.Name ?? booking.ContactName, booking.ContactEmail, booking.ContactPhone, booking.Tour?.Agency?.Name,
            refund.Reason, refund.ReasonDetail, refund.Status.ToString(), RequestedByRole(refund),
            booking.TotalAmount, FeePercentOf(refund, booking.TotalAmount), refund.RefundFee ?? 0, refund.OriginalPaidAmount,
            SuggestedRefund(refund), refund.ApprovedRefundAmount,
            refund.RefundBankName, refund.RefundAccountNumber, refund.RefundAccountHolder,
            RefundTransaction(booking, refund.Id)?.GatewayTransactionNo,
            refund.AdminNote, refund.RejectionReason,
            Utc(refund.CreatedAt) ?? DateTime.UnixEpoch, Utc(refund.ReviewedAt), Utc(refund.CompletedAt),
            VietnamBanks.BinOf(refund.RefundBankName),
            payouts.Where(t => t.Status == PaymentTransactionStatus.Pending).Select(t => t.GatewayResponseCode ?? "PENDING").FirstOrDefault(),
            payouts.Where(t => t.Status == PaymentTransactionStatus.Failed).Select(t => t.ReviewNote).FirstOrDefault());
    }
}
