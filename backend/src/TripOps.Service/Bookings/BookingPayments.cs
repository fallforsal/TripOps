using System.Globalization;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

// Lịch thanh toán đợt cọc + giao dịch cọc.
// Quy tắc: thu 2 đợt — cọc sau khi Agency duyệt đơn, phần còn lại sau khi tour kết thúc.
// Cổng thật: VNPAY môi trường SANDBOX (không trừ tiền thật). Thanh toán "DEMO" chỉ còn để thử nhanh trong Development.
public sealed partial class BookingService
{
    private const string DepositStage = "deposit";
    private const string BalanceStage = "balance";
    private const string VnPayMethod = "VNPAY";
    private static readonly CultureInfo Vietnamese = new("vi-VN");

    // ---------------------------------------------------------------- VNPAY

    /// <summary>
    /// Tạo một lần thanh toán cọc qua VNPAY: ghi giao dịch Pending (đúng số tiền còn phải trả của đợt cọc)
    /// rồi trả URL đã ký để FE chuyển trình duyệt sang VNPAY. Tiền chỉ được ghi nhận khi VNPAY báo kết quả (IPN/return).
    /// </summary>
    public async Task<VnPayCheckoutDto> StartVnPayDeposit(string customerId, int id, string? ipAddress, CancellationToken ct)
    {
        if (!VnPay.Options.IsConfigured)
            throw new BookingException(503, "Cổng VNPAY sandbox chưa được cấu hình (thiếu VnPay:TmnCode/HashSecret/ReturnUrl).");

        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        var now = DateTime.UtcNow;
        var deposit = PayableDeposit(booking, customerId, now);
        var amount = Outstanding(booking, deposit);

        var code = $"VNP{booking.Id}T{now:yyMMddHHmmssfff}{Random.Shared.Next(10, 99)}";
        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            TransactionCode = code,
            Amount = amount,
            PaymentMethod = VnPayMethod,
            Status = PaymentTransactionStatus.Pending,
            PayerName = booking.ContactName,
            CreatedAt = now,
            PaymentRequest = deposit
        });
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var url = VnPay.CreatePaymentUrl(code, amount, $"Thanh toan coc don {booking.BookingCode}", ipAddress, now);
        return new VnPayCheckoutDto(url, code, amount, DateTime.SpecifyKind(now.AddMinutes(VnPay.Options.ExpireMinutes), DateTimeKind.Utc));
    }

    /// <summary>
    /// Xử lý dữ liệu VNPAY gửi về (IPN server-to-server hoặc trình duyệt quay về return URL).
    /// Idempotent: chỉ giao dịch đang Pending mới được cập nhật, gọi lại nhiều lần không ghi thêm tiền.
    /// Mã phản hồi theo đặc tả VNPAY: 00 thành công, 01 không thấy đơn, 02 đã xác nhận, 04 sai số tiền, 97 sai chữ ký, 99 lỗi khác.
    /// </summary>
    public async Task<VnPayConfirmation> ConfirmVnPay(IReadOnlyCollection<KeyValuePair<string, string>> query, CancellationToken ct)
    {
        if (!VnPay.Verify(query)) return new("97", "Invalid signature", null, null);
        string? Value(string key) => query.FirstOrDefault(p => p.Key == key).Value;

        var reference = Value("vnp_TxnRef");
        if (string.IsNullOrWhiteSpace(reference)) return new("01", "Order not found", null, null);
        var known = await Repo.FindTransaction(reference, ct);
        if (known is null || known.PaymentMethod != VnPayMethod) return new("01", "Order not found", null, null);

        await using var transaction = await Repo.BeginPaymentChange(known.BookingId, ct);
        var booking = await Repo.Find(known.BookingId, ct);
        var payment = booking?.PaymentTransactions.SingleOrDefault(t => t.TransactionCode == reference);
        if (booking is null || payment is null) return new("01", "Order not found", null, null);

        if (!long.TryParse(Value("vnp_Amount"), NumberStyles.None, CultureInfo.InvariantCulture, out var amount)
            || amount != (long)decimal.Round(payment.Amount * 100m, 0, MidpointRounding.AwayFromZero))
            return new("04", "Invalid amount", booking.Id, null);

        if (payment.Status != PaymentTransactionStatus.Pending)
            return new("02", "Order already confirmed", booking.Id, Outcome(payment));

        var now = DateTime.UtcNow;
        var success = Value("vnp_ResponseCode") == "00" && Value("vnp_TransactionStatus") == "00";
        payment.GatewayTransactionNo = Value("vnp_TransactionNo");
        payment.GatewayResponseCode = Value("vnp_ResponseCode");
        if (success)
        {
            // Tiền đã thực sự bị trừ ở VNPAY nên luôn ghi nhận, kể cả khi đợt cọc đã đủ từ lần khác (Admin xử lý hoàn phần dư).
            payment.Status = PaymentTransactionStatus.Success;
            payment.PaidAt = now;
            ApplyPayment(booking, payment.PaymentRequest, now);
        }
        else
        {
            payment.Status = PaymentTransactionStatus.Failed;
        }

        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new("00", "Confirm Success", booking.Id, Outcome(payment));
    }

    private static string Outcome(PaymentTransaction payment) =>
        payment.Status == PaymentTransactionStatus.Success ? "success" : "failed";

    // ---------------------------------------------------- DEMO (Development)

    /// <summary>
    /// Thanh toán cọc mô phỏng (chỉ Development, không qua ngân hàng). Cùng quy tắc với VNPAY:
    /// đơn phải được duyệt, đúng số tiền còn phải trả của đợt cọc, mã giao dịch không dùng lại.
    /// </summary>
    public async Task<BookingDto> Deposit(string customerId, int id, BookingDepositRequest request, CancellationToken ct)
    {
        var reference = request.TransactionReference?.Trim();
        if (string.IsNullOrWhiteSpace(reference))
            throw new BookingException(400, "Thiếu mã giao dịch. Vui lòng tải lại trang và thử lại.");

        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        // Bấm lại / mạng chập chờn: cùng mã giao dịch thì trả kết quả cũ, không ghi thêm tiền.
        var previous = await Repo.FindTransaction(reference, ct);
        if (previous is not null)
        {
            if (previous.BookingId != id || previous.Amount != Money(request.Amount))
                throw new BookingException(409, "Mã giao dịch đã được sử dụng.");
            await transaction.CommitAsync(ct);
            return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
        }

        var now = DateTime.UtcNow;
        var deposit = PayableDeposit(booking, customerId, now);
        var outstanding = Outstanding(booking, deposit);
        if (Money(request.Amount) != outstanding)
            throw new BookingException(422, $"Số tiền cọc phải đúng {outstanding.ToString("N0", Vietnamese)}đ.");

        booking.PaymentTransactions.Add(new PaymentTransaction
        {
            TransactionCode = reference,
            Amount = outstanding,
            PaymentMethod = "DEMO",
            Status = PaymentTransactionStatus.Success,
            ProofImageUrl = request.PaymentProofUrl,
            PayerName = booking.ContactName,
            PaidAt = now,
            CreatedAt = now,
            PaymentRequest = deposit
        });
        ApplyPayment(booking, deposit, now);

        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // --------------------------------------------------------- Lịch thanh toán

    /// <summary>Kiểm tra đơn có đang được phép trả cọc không và trả về đợt cọc (tạo nếu đơn duyệt trước khi có lịch).</summary>
    private PaymentRequest PayableDeposit(Booking booking, string actorId, DateTime now)
    {
        if (booking.Status == BookingStatus.Pending)
            throw new BookingException(409, "Đơn đang chờ công ty lữ hành duyệt. Bạn chỉ thanh toán cọc sau khi đơn được duyệt.");
        if (booking.Status != BookingStatus.Confirmed)
            throw new BookingException(422, "Đơn ở trạng thái này không thể thanh toán cọc.");
        var deposit = EnsureDepositRequest(booking, actorId, now);
        if (deposit.Status == PaymentRequestStatus.Paid || Outstanding(booking, deposit) == 0)
            throw new BookingException(409, "Đợt cọc của đơn này đã được thanh toán.");
        return deposit;
    }

    /// <summary>
    /// Bảo đảm đơn có đúng một đợt cọc đang hiệu lực. Gọi trong giao dịch đã khóa đơn.
    /// Khoản "Đặt cọc 30%" cũ (tạo lúc đặt tour) chưa trả được chuyển sang Cancelled — không xóa;
    /// tiền DEMO đã ghi nhận trước đó được tính vào đợt cọc mới.
    /// </summary>
    private PaymentRequest EnsureDepositRequest(Booking booking, string actorId, DateTime approvedAt)
    {
        var active = ActiveRequest(booking, DepositStage);
        if (active is not null) return active;

        var dueDate = approvedAt.Date.AddDays(PaymentTerms.DepositDueDays);
        if (dueDate > booking.StartDate.Date && booking.StartDate.Date >= approvedAt.Date)
            dueDate = booking.StartDate.Date;

        foreach (var legacy in booking.PaymentRequests.Where(p => p.Stage == null
                     && p.Status is null or PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue))
            legacy.Status = PaymentRequestStatus.Cancelled;

        var request = new PaymentRequest
        {
            Stage = DepositStage,
            Description = $"Đặt cọc {PaymentTerms.DepositPercent.ToString("0.##", Vietnamese)}%",
            Amount = PlannedDeposit(booking),
            DueDate = dueDate,
            Status = PaymentRequestStatus.Pending,
            CreatedBy = actorId,
            CreatedAt = approvedAt
        };
        booking.PaymentRequests.Add(request);
        if (Outstanding(booking, request) == 0)
        {
            request.Status = PaymentRequestStatus.Paid;
            request.PaidAt = approvedAt;
        }
        return request;
    }

    /// <summary>Cập nhật đợt thu và trạng thái thanh toán của đơn sau khi có tiền vào.</summary>
    private static void ApplyPayment(Booking booking, PaymentRequest? request, DateTime now)
    {
        if (request is not null && request.Status != PaymentRequestStatus.Paid && Outstanding(booking, request) == 0)
        {
            request.Status = PaymentRequestStatus.Paid;
            request.PaidAt = now;
        }
        var paid = PaidAmount(booking);
        booking.PaymentStatus = paid >= booking.TotalAmount ? PaymentStatus.Paid
            : paid > 0 ? PaymentStatus.PartiallyPaid : PaymentStatus.Unpaid;
        if (booking.PaymentStatus == PaymentStatus.Paid && booking.Status == BookingStatus.Confirmed)
            booking.Status = BookingStatus.Paid;
    }

    /// <summary>Hủy các khoản đang chờ thu (dùng khi đơn bị hủy/từ chối).</summary>
    private static void CloseOpenRequests(Booking booking)
    {
        foreach (var open in booking.PaymentRequests.Where(p => p.Status is null or PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue))
            open.Status = PaymentRequestStatus.Cancelled;
    }

    /// <summary>Có lần thanh toán VNPAY còn trong thời hạn mà chưa có kết quả hay không.</summary>
    private bool HasOpenGatewayPayment(Booking booking, DateTime now) => booking.PaymentTransactions.Any(t =>
        t.PaymentMethod == VnPayMethod && t.Status == PaymentTransactionStatus.Pending
        && (t.CreatedAt ?? DateTime.MinValue) > now.AddMinutes(-(VnPay.Options.ExpireMinutes + 5)));

    private static PaymentRequest? ActiveRequest(Booking booking, string stage) => booking.PaymentRequests
        .FirstOrDefault(p => p.Stage == stage
            && p.Status is PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue or PaymentRequestStatus.Paid);

    private decimal PlannedDeposit(Booking booking) => Money(booking.TotalAmount * PaymentTerms.DepositPercent / 100m);

    /// <summary>Số tiền còn phải trả của một đợt thu (chỉ tính giao dịch Success).</summary>
    private static decimal Outstanding(Booking booking, PaymentRequest request)
    {
        // Dò theo cả navigation (giao dịch mới chưa lưu) lẫn khóa ngoại.
        var stageById = booking.PaymentRequests.Where(p => p.Id != 0).ToDictionary(p => p.Id, p => p.Stage);
        bool LinkedTo(PaymentTransaction t) => ReferenceEquals(t.PaymentRequest, request)
            || (request.Id != 0 && t.PaymentRequestId == request.Id);
        bool Legacy(PaymentTransaction t) => t.PaymentRequest is { } linked
            ? linked.Stage == null
            : t.PaymentRequestId is not int requestId || (stageById.TryGetValue(requestId, out var stage) && stage == null);
        var credited = booking.PaymentTransactions
            .Where(t => t.Status == PaymentTransactionStatus.Success)
            // Đợt cọc nhận cả tiền cũ chưa gắn đợt hoặc gắn khoản "Đặt cọc 30%" cũ.
            .Where(t => LinkedTo(t) || (request.Stage == DepositStage && Legacy(t)))
            .Sum(t => t.Amount);
        return Math.Max(0, Money(request.Amount - credited));
    }

    /// <summary>Tiền cọc hiển thị trên đơn: đợt cọc đang hiệu lực, nếu chưa có thì số dự kiến theo cấu hình.</summary>
    private decimal DisplayDeposit(Booking booking) => ActiveRequest(booking, DepositStage)?.Amount ?? PlannedDeposit(booking);

    /// <summary>
    /// Lịch thanh toán của đơn. Đơn chờ duyệt: chưa có lịch. Đơn đã duyệt: Đợt 1 cọc + Đợt 2 phần còn lại (sau tour).
    /// </summary>
    private IReadOnlyList<PaymentScheduleItemDto> Schedule(Booking booking)
    {
        if (booking.Status is BookingStatus.Pending or BookingStatus.Rejected) return [];
        var deposit = ActiveRequest(booking, DepositStage);
        if (deposit is null && booking.Status == BookingStatus.Cancelled) return [];
        var today = DateTime.UtcNow.Date;
        var items = new List<PaymentScheduleItemDto>();

        if (deposit is not null)
        {
            var outstanding = Outstanding(booking, deposit);
            var status = deposit.Status == PaymentRequestStatus.Paid || outstanding == 0 ? "Paid"
                : deposit.DueDate is { } due && due.Date < today ? "Overdue" : "Pending";
            items.Add(new(deposit.Id, DepositStage, deposit.Description, deposit.Amount, status == "Paid" ? 0 : outstanding,
                deposit.DueDate, status, Utc(deposit.PaidAt)));
        }
        else
        {
            // Đơn được duyệt trước khi có lịch: đợt cọc được tạo khi khách bấm thanh toán.
            var amount = PlannedDeposit(booking);
            items.Add(new(null, DepositStage, $"Đặt cọc {PaymentTerms.DepositPercent.ToString("0.##", Vietnamese)}%",
                amount, Math.Max(0, Money(amount - LegacyCredit(booking))), null, "Pending", null));
        }

        var depositAmount = items[0].Amount;
        var balance = ActiveRequest(booking, BalanceStage);
        items.Add(balance is not null
            ? new PaymentScheduleItemDto(balance.Id, BalanceStage, balance.Description, balance.Amount, Outstanding(booking, balance),
                balance.DueDate, balance.Status == PaymentRequestStatus.Paid ? "Paid" : "Pending", Utc(balance.PaidAt))
            : new PaymentScheduleItemDto(null, BalanceStage, "Thanh toán phần còn lại sau khi tour kết thúc",
                Math.Max(0, booking.TotalAmount - depositAmount), Math.Max(0, booking.TotalAmount - depositAmount),
                null, "Scheduled", null));
        return items;
    }

    private static decimal LegacyCredit(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success)
        .Where(t => t.PaymentRequestId is null || booking.PaymentRequests.Any(p => p.Id == t.PaymentRequestId && p.Stage == null))
        .Sum(t => t.Amount);

    private IReadOnlyList<PaymentTransactionDto> Transactions(Booking booking)
    {
        var expiredBefore = DateTime.UtcNow.AddMinutes(-(VnPay.Options.ExpireMinutes + 5));
        return booking.PaymentTransactions
            .OrderBy(t => t.CreatedAt ?? t.PaidAt).ThenBy(t => t.Id)
            .Select(t => new PaymentTransactionDto(t.Id, t.PaymentRequestId, t.TransactionCode, t.PaymentMethod, t.Amount,
                t.Status == PaymentTransactionStatus.Pending && t.PaymentMethod == VnPayMethod && (t.CreatedAt ?? DateTime.MinValue) < expiredBefore
                    ? "Expired" : t.Status.GetValueOrDefault(PaymentTransactionStatus.Success).ToString(),
                t.Status == PaymentTransactionStatus.Success ? Utc(t.PaidAt) : null, Utc(t.CreatedAt), t.GatewayTransactionNo))
            .ToList();
    }

    private static DateTime? Utc(DateTime? value) => value is { } v ? DateTime.SpecifyKind(v, DateTimeKind.Utc) : null;
}

/// <summary>Kết quả xử lý dữ liệu VNPAY: RspCode/Message trả cho VNPAY, Outcome ("success"/"failed") cho trang return.</summary>
public sealed record VnPayConfirmation(string RspCode, string Message, int? BookingId, string? Outcome);
