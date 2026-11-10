using static TripOps.Service.Bookings.BookingBilling;
using System.Globalization;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

// Thanh toán hai đợt:
//  - Đợt 1 – đặt cọc: tạo khi Agency duyệt, 50% tổng giá trị, hạn = lúc duyệt + 24 giờ (PaymentRules).
//  - Đợt 2 – phần còn lại: mở sau khi đủ cọc, hạn chót = hết ngày (khởi hành − 8), tức trước khởi hành 1 tuần
//    (= tổng nghĩa vụ − tiền đã ghi nhận − phần cọc còn thiếu, không mặc định 50%).
//  - Tour sát ngày (lúc duyệt, hạn Đợt 2 không còn sau hạn cọc): một khoản thu 100%, hạn = duyệt + 24 giờ.
//    Lưu như đợt "deposit" có số tiền = tổng giá trị; lịch thanh toán trả stage "full".
// Cổng thanh toán: payOS (không có sandbox — tiền thật). "DEMO" chỉ còn để thử nhanh trong Development.
// Giao dịch VNPAY cũ được giữ làm lịch sử, không tạo mới.
public sealed partial class BookingService
{
    private const string DepositStage = "deposit";
    private const string BalanceStage = "balance";
    private const string PayOsMethod = "PAYOS";
    private const string LegacyVnPayMethod = "VNPAY";
    private const string PayOsCodePrefix = "PAYOS-";
    private static readonly CultureInfo Vietnamese = new("vi-VN");

    // ---------------------------------------------------------------- payOS

    /// <summary>
    /// Tạo (hoặc dùng lại) link payOS cho đợt đang phải trả: Đợt 1 (cọc) nếu chưa đủ cọc, sau đó Đợt 2 (phần còn lại).
    /// Số tiền do backend tính, không nhận từ frontend. Bấm lặp khi link cũ còn hạn và đúng số tiền: trả lại link cũ.
    /// </summary>
    public async Task<PayOsCheckoutDto> StartPayOsDeposit(string customerId, int id, CancellationToken ct, int? paymentRequestId = null)
    {
        if (!PayOs.Options.IsConfigured)
            throw new BookingException(503, "Cổng payOS chưa được cấu hình (thiếu PayOs:ClientId/ApiKey/ChecksumKey hoặc ReturnUrl).");

        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        var now = UtcNow;
        var stage = PayableStage(booking, customerId, now, paymentRequestId);
        await quotationsForPayment.ValidatePayment(booking.Id, ct);
        var amount = Outstanding(booking, stage);

        var reusable = booking.PaymentTransactions
            .Where(t => t.PaymentMethod == PayOsMethod && t.Status == PaymentTransactionStatus.Pending
                && t.CheckoutUrl != null && t.ExpiresAt is { } expires && expires > now.AddMinutes(1)
                && t.Amount == amount && LinkedTo(t, stage))
            .OrderByDescending(t => t.CreatedAt).FirstOrDefault();
        if (reusable is not null)
        {
            await transaction.CommitAsync(ct);
            return new PayOsCheckoutDto(reusable.CheckoutUrl!, reusable.TransactionCode, reusable.Amount, Utc(reusable.ExpiresAt)!.Value, true);
        }

        // Link không sống lâu hơn hạn của đợt: hết hạn thì không thể trả qua link cũ.
        var dueAt = Deadline(stage) ?? now.AddMinutes(PayOs.Options.LinkMinutes);
        var linkExpires = new[] { now.AddMinutes(PayOs.Options.LinkMinutes), dueAt }.Min();
        if (linkExpires <= now.AddMinutes(1))
            throw new BookingException(409, "Đợt thanh toán sắp hết hạn, không đủ thời gian tạo phiên thanh toán mới.");

        var orderCode = NewOrderCode(now);
        var payment = new PaymentTransaction
        {
            TransactionCode = PayOsCodePrefix + orderCode.ToString(CultureInfo.InvariantCulture),
            Amount = amount,
            PaymentMethod = PayOsMethod,
            Status = PaymentTransactionStatus.Pending,
            PayerName = booking.ContactName,
            CreatedAt = now,
            ExpiresAt = linkExpires,
            PaymentRequest = stage
        };
        booking.PaymentTransactions.Add(payment);
        await Repo.SaveChangesAsync(ct);

        PayOsCreatedLink link;
        try
        {
            // Nội dung ngắn (≤ 9 ký tự) theo giới hạn của payOS cho tài khoản không liên kết.
            link = await PayOs.CreateLink(orderCode, (long)amount, $"{(IsSurcharge(stage) ? "PT" : stage.Stage == BalanceStage || IsFullPayment(booking, stage) ? "TT" : "COC")}{booking.Id}",
                new DateTimeOffset(DateTime.SpecifyKind(linkExpires, DateTimeKind.Utc)), ct);
        }
        catch (PayOsException exception)
        {
            payment.Status = PaymentTransactionStatus.Failed;
            payment.GatewayResponseCode = "CREATE_ERR";
            await Repo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            throw new BookingException(502, exception.Message);
        }

        payment.CheckoutUrl = link.CheckoutUrl;
        payment.GatewayLinkId = link.PaymentLinkId;
        payment.GatewayResponseCode = "PENDING";
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new PayOsCheckoutDto(link.CheckoutUrl, payment.TransactionCode, amount, DateTime.SpecifyKind(linkExpires, DateTimeKind.Utc), false);
    }

    /// <summary>
    /// Khách quay về từ payOS (hoặc bấm "Kiểm tra thanh toán"): backend tra cứu trực tiếp payOS các link còn chờ
    /// của đơn rồi áp kết quả. Không dùng tham số trên URL quay về làm bằng chứng.
    /// </summary>
    public async Task<PaymentSyncResultDto> SyncPayOs(string customerId, int id, CancellationToken ct)
    {
        var owner = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (owner.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        var codes = owner.PaymentTransactions
            .Where(t => t.PaymentMethod == PayOsMethod && t.Status == PaymentTransactionStatus.Pending)
            .OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id)
            .Take(3).Select(t => t.TransactionCode).ToList();
        Repo.ResetTracking();

        string? outcome = null;
        string? error = null;
        foreach (var code in codes)
        {
            if (!TryOrderCode(code, out var orderCode)) continue;
            try
            {
                var info = await PayOs.GetLink(orderCode, ct);
                if (info.OrderCode != 0 && info.OrderCode != orderCode)
                {
                    error = "payOS trả về mã đơn không khớp.";
                    continue;
                }
                var applied = await ApplyGatewayResult(code, info.Status, info.AmountPaid, info.Reference, "lookup", ct);
                outcome = MoreImportant(outcome, applied);
            }
            catch (PayOsException exception) { error = exception.Message; }
        }

        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var latest = booking.PaymentTransactions.Where(t => t.PaymentMethod == PayOsMethod)
            .OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Id).FirstOrDefault();
        outcome ??= latest is null ? "none" : OutcomeOf(latest);
        var message = error is not null && outcome is "pending" or "none"
            ? error
            : outcome switch
            {
                "paid" => "payOS đã xác nhận đã nhận tiền.",
                "pending" => "payOS chưa ghi nhận thanh toán. Nếu bạn vừa chuyển khoản, vui lòng chờ ít phút rồi kiểm tra lại.",
                "cancelled" => "Giao dịch đã bị hủy trên payOS. Bạn có thể thanh toán lại khi khoản thu còn hạn.",
                "expired" => "Link thanh toán đã hết hạn mà chưa nhận tiền.",
                "review" => "payOS báo có tiền nhưng số tiền không khớp. Giao dịch đã được lưu để đối soát.",
                "failed" => "Giao dịch không thành công.",
                _ => "Chưa có giao dịch payOS nào cho đơn này."
            };
        return new PaymentSyncResultDto(outcome, message, ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name));
    }

    /// <summary>Webhook payOS (đã kiểm tra chữ ký ở gateway). Dùng chung xử lý với tra cứu nên không cộng tiền hai lần.</summary>
    public async Task<string> ApplyPayOsWebhook(PayOsWebhookData data, CancellationToken ct)
    {
        var code = PayOsCodePrefix + data.OrderCode.ToString(CultureInfo.InvariantCulture);
        if (await Repo.FindTransaction(code, ct) is null) return "ignored"; // ví dụ: dữ liệu thử khi đăng ký webhook
        // Webhook chỉ gửi khi có giao dịch tiền vào; code "00" = thành công.
        var status = data.Code == "00" ? "PAID" : "FAILED";
        return await ApplyGatewayResult(code, status, data.Amount, data.Reference, "webhook", ct);
    }

    /// <summary>Tìm đơn của một mã đơn payOS (chỉ để chuyển hướng trình duyệt về đúng trang, không đổi dữ liệu).</summary>
    public async Task<int?> BookingIdForPayOsOrder(long orderCode, CancellationToken ct) =>
        (await Repo.FindTransaction(PayOsCodePrefix + orderCode.ToString(CultureInfo.InvariantCulture), ct))?.BookingId;

    /// <summary>
    /// Áp kết quả cổng cho một giao dịch, trong giao dịch DB đã khóa đơn. Idempotent:
    /// giao dịch đã Success/NeedsReview không bị đổi; gọi lặp (webhook + tra cứu) không cộng tiền thêm.
    /// </summary>
    private async Task<string> ApplyGatewayResult(string transactionCode, string gatewayStatus, long amountPaid,
        string? reference, string source, CancellationToken ct)
    {
        var known = await Repo.FindTransaction(transactionCode, ct);
        if (known is null) return "none";

        await using var transaction = await Repo.BeginPaymentChange(known.BookingId, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(known.BookingId, ct);
        var payment = booking?.PaymentTransactions.SingleOrDefault(t => t.TransactionCode == transactionCode);
        if (booking is null || payment is null) return "none";
        if (payment.Status is PaymentTransactionStatus.Success or PaymentTransactionStatus.NeedsReview or PaymentTransactionStatus.Refunded)
            return OutcomeOf(payment);

        var now = UtcNow;
        var expected = (long)decimal.Round(payment.Amount, 0, MidpointRounding.AwayFromZero);
        payment.GatewayResponseCode = gatewayStatus.Length > 10 ? gatewayStatus[..10] : gatewayStatus;
        switch (gatewayStatus)
        {
            case "PAID" when amountPaid == expected:
            {
                var notes = new List<string>();
                if (payment.Status != PaymentTransactionStatus.Pending)
                    notes.Add($"Tiền về sau khi giao dịch đã ghi {payment.Status} ({source}).");
                var request = payment.PaymentRequest;
                if (request is not null && Outstanding(booking, request) == 0)
                    notes.Add("Trả dư: đợt thu đã đủ trước khi giao dịch này về.");
                if (request is not null && Deadline(request) is { } due && now > due)
                    notes.Add("Tiền về sau hạn của đợt thu.");
                payment.Status = PaymentTransactionStatus.Success;
                payment.PaidAt = now;
                payment.GatewayTransactionNo = reference;
                payment.ReviewNote = notes.Count == 0 ? null : string.Join(" ", notes);
                try { await quotationsForPayment.ValidatePayment(booking.Id, ct); }
                catch (BookingException)
                {
                    payment.Status = PaymentTransactionStatus.NeedsReview;
                    payment.ReviewNote = "Tiền nhận khi phương án tour của booking không còn hiệu lực; cần đối soát.";
                    break;
                }
                ApplyPayment(booking, request, now);
                Repo.NotifyPayment(booking);
                break;
            }
            case "PAID":
            case "UNDERPAID":
                // Có tiền nhưng không khớp: không cộng vào đơn, lưu để Admin đối soát (không tự hoàn).
                payment.Status = PaymentTransactionStatus.NeedsReview;
                payment.GatewayTransactionNo = reference;
                payment.ReviewNote = $"payOS báo {gatewayStatus}, đã nhận {amountPaid.ToString("N0", Vietnamese)}đ / yêu cầu {expected.ToString("N0", Vietnamese)}đ ({source}).";
                break;
            case "CANCELLED" when payment.Status == PaymentTransactionStatus.Pending:
                payment.Status = PaymentTransactionStatus.Cancelled;
                break;
            case "EXPIRED" when payment.Status == PaymentTransactionStatus.Pending:
                payment.Status = PaymentTransactionStatus.Expired;
                break;
            case "FAILED" when payment.Status == PaymentTransactionStatus.Pending:
                payment.Status = PaymentTransactionStatus.Failed;
                break;
            default:
                // PENDING / PROCESSING: chưa có kết quả, giữ nguyên.
                break;
        }

        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return OutcomeOf(payment);
    }

    private static string OutcomeOf(PaymentTransaction payment) => payment.Status switch
    {
        PaymentTransactionStatus.Success => "paid",
        PaymentTransactionStatus.Cancelled => "cancelled",
        PaymentTransactionStatus.Expired => "expired",
        PaymentTransactionStatus.NeedsReview => "review",
        PaymentTransactionStatus.Failed => "failed",
        _ => "pending"
    };

    private static string MoreImportant(string? current, string next)
    {
        static int Rank(string? o) => o switch { "paid" => 6, "review" => 5, "pending" => 4, "cancelled" => 3, "expired" => 2, "failed" => 1, _ => 0 };
        return Rank(next) > Rank(current) ? next : current!;
    }

    /// <summary>Mã đơn payOS: số nguyên dương, duy nhất (unique transaction_code bảo đảm), nhỏ hơn 2^53.</summary>
    private static long NewOrderCode(DateTime now) =>
        long.Parse(now.ToString("yyMMddHHmmss", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture) * 1000
        + Random.Shared.Next(0, 1000);

    private static bool TryOrderCode(string transactionCode, out long orderCode)
    {
        orderCode = 0;
        return transactionCode.StartsWith(PayOsCodePrefix, StringComparison.Ordinal)
            && long.TryParse(transactionCode.AsSpan(PayOsCodePrefix.Length), NumberStyles.None, CultureInfo.InvariantCulture, out orderCode);
    }

    // ---------------------------------------------------- DEMO (Development)

    /// <summary>
    /// Thanh toán mô phỏng (chỉ Development, không qua ngân hàng) cho đợt đang phải trả. Cùng quy tắc với payOS:
    /// đơn đã duyệt, đợt còn hạn, đúng số tiền còn thiếu, mã giao dịch không dùng lại.
    /// </summary>
    public async Task<BookingDto> Deposit(string customerId, int id, BookingDepositRequest request, CancellationToken ct)
    {
        var reference = request.TransactionReference?.Trim();
        if (string.IsNullOrWhiteSpace(reference))
            throw new BookingException(400, "Thiếu mã giao dịch. Vui lòng tải lại trang và thử lại.");

        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");

        // Bấm lại / mạng chập chờn: cùng mã giao dịch thì trả kết quả cũ, không ghi thêm tiền.
        var previous = await Repo.FindTransaction(reference, ct);
        if (previous is not null)
        {
            if (previous.BookingId != id || previous.Amount != Money(request.Amount)
                || (request.PaymentRequestId.HasValue && previous.PaymentRequestId != request.PaymentRequestId))
                throw new BookingException(409, "Mã giao dịch đã được sử dụng.");
            await transaction.CommitAsync(ct);
            return await Get(customerId,id,ct);
        }

        var now = UtcNow;
        var stage = PayableStage(booking, customerId, now, request.PaymentRequestId);
        await quotationsForPayment.ValidatePayment(booking.Id, ct);
        var outstanding = Outstanding(booking, stage);
        if (Money(request.Amount) != outstanding)
            throw new BookingException(422, $"Số tiền của {StageName(booking, stage)} phải đúng {outstanding.ToString("N0", Vietnamese)}đ.");

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
            PaymentRequest = stage
        });
        ApplyPayment(booking, stage, now);
        Repo.NotifyPayment(booking);

        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return await Get(customerId,id,ct);
    }

    // --------------------------------------------------------- Lịch thanh toán

    /// <summary>
    /// Đợt đang phải trả: Đợt 1 (cọc) khi chưa đủ cọc; đủ cọc thì Đợt 2 (phần còn lại).
    /// Chặn khi đơn chưa duyệt, đợt đã quá hạn hoặc đã thanh toán đủ.
    /// </summary>
    private PaymentRequest PayableStage(Booking booking, string actorId, DateTime now, int? paymentRequestId)
    {
        if (booking.Status == BookingStatus.Pending)
            throw new BookingException(409, "Đơn đang chờ công ty lữ hành duyệt. Bạn chỉ thanh toán sau khi đơn được duyệt.");
        if (OpenCancellation(booking) is not null)
            throw new BookingException(409, "Đơn đang có yêu cầu hủy chờ Admin duyệt nên tạm khóa thanh toán.");
        if (ContractBlocksPayment(booking))
            throw new BookingException(409, "Vui lòng tải hợp đồng, ký và tải bản đã ký lên trước khi thanh toán.");
        if (booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid))
            throw new BookingException(422, booking.Status == BookingStatus.Paid
                ? "Đơn đã được thanh toán đủ."
                : "Đơn ở trạng thái này không thể thanh toán.");
        PaymentRequest? stage;
        if (paymentRequestId.HasValue)
        {
            stage = booking.PaymentRequests.SingleOrDefault(p => p.Id == paymentRequestId.Value)
                ?? throw new BookingException(404, "Khoản thu không thuộc booking này.");
            if (stage.Status == PaymentRequestStatus.Cancelled ||
                (stage.Stage != DepositStage && stage.Stage != BalanceStage && !IsSurcharge(stage)))
                throw new BookingException(409, "Khoản thu không còn cho phép thanh toán.");
            if (stage.Stage == BalanceStage)
            {
                var deposit = ActiveRequest(booking, DepositStage);
                if (deposit is null || Outstanding(booking, deposit) > 0)
                    throw new BookingException(409, "Vui lòng thanh toán đủ tiền cọc trước khi thanh toán đợt 2.");
            }
        }
        else
        {
            // Giữ tương thích lời gọi cũ: cọc, phần còn lại, rồi phụ thu. Lời gọi mới chọn khoản thu cụ thể.
            var deposit = ActiveRequest(booking, DepositStage)
                ?? throw new BookingException(409, "Đơn chưa có đợt cọc. Vui lòng liên hệ công ty lữ hành để được xử lý.");
            stage = Outstanding(booking, deposit) > 0 ? deposit : null;
            if (stage == null && !IsFullPayment(booking, deposit)) {
                var balance = EnsureBalanceRequest(booking, actorId, now);
                if (Outstanding(booking, balance) > 0) stage = balance;
            }
            stage ??= booking.PaymentRequests.Where(p => IsSurcharge(p) && p.Status != PaymentRequestStatus.Cancelled && Outstanding(booking, p) > 0)
                .OrderBy(p => p.CreatedAt).ThenBy(p => p.Id).FirstOrDefault();
        }
        if (stage == null) throw new BookingException(409, "Đơn đã được thanh toán đủ.");
        if (stage.Status == PaymentRequestStatus.Paid || Outstanding(booking, stage) == 0)
            throw new BookingException(409, "Đơn đã được thanh toán đủ.");
        if (Deadline(stage) is { } due && now > due)
            throw new BookingException(409, $"{Capitalize(StageName(booking, stage))} đã quá hạn thanh toán ({VietnamText(due)}). Không thể tạo thanh toán mới cho khoản thu đã hết hạn.");
        return stage;
    }

    private static string StageName(Booking booking, PaymentRequest request) =>
        IsSurcharge(request) ? "khoản phụ thu" : request.Stage == BalanceStage ? "đợt 2 (phần còn lại)" : IsFullPayment(booking, request) ? "khoản thanh toán toàn bộ" : "đợt cọc";

    private static string Capitalize(string text) => text.Length == 0 ? text : char.ToUpper(text[0], Vietnamese) + text[1..];

    /// <summary>Khoản thu một lần 100% của tour sát ngày (lưu ở stage "deposit" với số tiền = tổng giá trị).</summary>
    private static bool IsFullPayment(Booking booking, PaymentRequest request) =>
        request.Stage == DepositStage && BaseTourAmount(booking) > 0 && request.Amount >= Money(BaseTourAmount(booking));

    /// <summary>
    /// Bảo đảm có Đợt 2 – phần còn lại (gọi trong giao dịch đã khóa đơn). Hạn = hết ngày (khởi hành − 8) giờ Việt Nam.
    /// Đã có thì trả lại nguyên trạng, không đổi hạn.
    /// </summary>
    private static PaymentRequest EnsureBalanceRequest(Booking booking, string actorId, DateTime now)
    {
        var active = ActiveRequest(booking, BalanceStage);
        if (active is not null) return active;
        var deposit = ActiveRequest(booking, DepositStage);
        var dueAt = PaymentRules.BalanceDeadline(booking.StartDate);
        if (booking.DesignRequestId.HasValue && dueAt < now) dueAt = PaymentRules.VietnamMidnightUtc(booking.StartDate.Date);
        var request = new PaymentRequest
        {
            Stage = BalanceStage,
            Description = "Thanh toán phần còn lại",
            Amount = Math.Max(0, Money(BaseTourAmount(booking) - (deposit?.Amount ?? 0))),
            DueAt = dueAt,
            DueDate = PaymentRules.VietnamDate(dueAt.AddTicks(-1)),
            Status = PaymentRequestStatus.Pending,
            CreatedBy = actorId,
            CreatedAt = now
        };
        booking.PaymentRequests.Add(request);
        return request;
    }

    /// <summary>
    /// Tạo Đợt 1 – đặt cọc khi Agency duyệt (gọi trong giao dịch đã khóa đơn). Tour sát ngày: khoản này là 100% tổng giá trị. Đã có đợt cọc hiệu lực thì trả lại nguyên trạng:
    /// không đổi số tiền, không gia hạn. Khoản "Đặt cọc 30%" kiểu cũ (stage NULL) chưa trả chuyển sang Cancelled — không xóa;
    /// tiền đã ghi nhận trước đó được trừ vào đợt cọc (chỉ thu phần còn thiếu).
    /// </summary>
    private PaymentRequest EnsureDepositRequest(Booking booking, string actorId, DateTime approvedAt)
    {
        var active = ActiveRequest(booking, DepositStage);
        if (active is not null) return active;

        var dueAt = approvedAt + PaymentRules.DepositWindow;
        var full = !booking.DesignRequestId.HasValue && PaymentRules.FullPaymentAtApproval(booking.StartDate, approvedAt);
        foreach (var legacy in booking.PaymentRequests.Where(p => p.Stage == null
                     && p.Status is null or PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue))
            legacy.Status = PaymentRequestStatus.Cancelled;

        var request = new PaymentRequest
        {
            Stage = DepositStage,
            Description = full ? "Thanh toán toàn bộ (tour sát ngày)" : $"Đặt cọc {PaymentRules.DepositPercent.ToString("0.##", Vietnamese)}%",
            Amount = full ? Money(BaseTourAmount(booking)) : PlannedDeposit(booking),
            DueAt = dueAt,
            DueDate = PaymentRules.VietnamDate(dueAt),
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

    /// <summary>
    /// Hạn của một đợt thu (UTC). Khoản mới có due_at chính xác. Khoản cũ chỉ có due_date: hết ngày đó theo giờ Việt Nam.
    /// </summary>
    private static DateTime? Deadline(PaymentRequest request) =>
        request.DueAt is { } at ? DateTime.SpecifyKind(at, DateTimeKind.Utc)
        : request.DueDate is { } date ? PaymentRules.VietnamMidnightUtc(date.AddDays(1)) : null;

    private static string VietnamText(DateTime utc) =>
        DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(PaymentRules.VietnamOffset).ToString("HH:mm dd/MM/yyyy", CultureInfo.InvariantCulture);

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
        // Đủ cọc chưa phải đã thanh toán đủ booking: chỉ chuyển Paid khi đã thu đủ tổng giá trị.
        if (booking.PaymentStatus == PaymentStatus.Paid && booking.Status == BookingStatus.Confirmed)
            booking.Status = BookingStatus.Paid;
    }

    /// <summary>Hủy các khoản đang chờ thu (dùng khi đơn bị hủy/từ chối).</summary>
    private static void CloseOpenRequests(Booking booking)
    {
        foreach (var open in booking.PaymentRequests.Where(p => p.Status is null or PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue))
            open.Status = PaymentRequestStatus.Cancelled;
    }

    /// <summary>Có link payOS còn hạn mà chưa có kết quả hay không (khách có thể đang chuyển khoản).</summary>
    private static bool HasOpenGatewayPayment(Booking booking, DateTime now) => booking.PaymentTransactions.Any(t =>
        t.PaymentMethod == PayOsMethod && t.Status == PaymentTransactionStatus.Pending
        && (t.ExpiresAt ?? DateTime.MinValue) > now);

    private static PaymentRequest? ActiveRequest(Booking booking, string stage) => booking.PaymentRequests
        .FirstOrDefault(p => p.Stage == stage
            && p.Status is PaymentRequestStatus.Pending or PaymentRequestStatus.Overdue or PaymentRequestStatus.Paid);

    private static decimal PlannedDeposit(Booking booking) => Money(BaseTourAmount(booking) * PaymentRules.DepositPercent / 100m);

    private static bool LinkedTo(PaymentTransaction t, PaymentRequest request) => ReferenceEquals(t.PaymentRequest, request)
        || (request.Id != 0 && t.PaymentRequestId == request.Id);

    /// <summary>
    /// Số tiền còn phải trả của một đợt thu (chỉ tính giao dịch Success).
    /// Đợt 2 = tổng nghĩa vụ − toàn bộ tiền đã ghi nhận − phần cọc còn thiếu (không cố định 50%).
    /// </summary>
    private static decimal Outstanding(Booking booking, PaymentRequest request)
    {
        if (request.Stage == BalanceStage)
        {
            var deposit = ActiveRequest(booking, DepositStage);
            var depositMissing = deposit is null ? Math.Max(0, PlannedDeposit(booking) - PaidAmount(booking)) : Outstanding(booking, deposit);
            return Math.Max(0, Money(BaseTourAmount(booking) - BasePaidAmount(booking) - depositMissing));
        }
        var stageById = booking.PaymentRequests.Where(p => p.Id != 0).ToDictionary(p => p.Id, p => p.Stage);
        bool Legacy(PaymentTransaction t) => t.PaymentRequest is { } linked
            ? linked.Stage == null
            : t.PaymentRequestId is not int requestId || (stageById.TryGetValue(requestId, out var stage) && stage == null);
        var credited = booking.PaymentTransactions
            .Where(t => t.Status == PaymentTransactionStatus.Success)
            // Đợt cọc nhận cả tiền cũ chưa gắn đợt hoặc gắn khoản "Đặt cọc 30%" kiểu cũ.
            .Where(t => LinkedTo(t, request) || (request.Stage == DepositStage && Legacy(t)))
            .Sum(t => t.Amount);
        return Math.Max(0, Money(request.Amount - credited));
    }

    /// <summary>Tiền cọc hiển thị trên đơn: đợt cọc đang hiệu lực, nếu chưa có thì mức 50% dự kiến.</summary>
    private static decimal DisplayDeposit(Booking booking) => ActiveRequest(booking, DepositStage)?.Amount ?? PlannedDeposit(booking);

    /// <summary>
    /// Lịch thanh toán của đơn. Chờ duyệt: chưa có lịch. Đã duyệt: Đợt 1 cọc + Đợt 2 phần còn lại (sau tour).
    /// Số tiền và hạn do backend tính; frontend chỉ hiển thị.
    /// </summary>
    private IReadOnlyList<PaymentScheduleItemDto> Schedule(Booking booking)
    {
        if (booking.Status is BookingStatus.Pending or BookingStatus.Rejected) return [];
        var deposit = ActiveRequest(booking, DepositStage);
        if (deposit is null && booking.Status == BookingStatus.Cancelled) return [];
        var now = UtcNow;
        var departure = PaymentRules.VietnamMidnightUtc(booking.StartDate);
        var items = new List<PaymentScheduleItemDto>();
        decimal depositOutstanding;
        DateTime? depositDeadline = null;

        if (deposit is not null)
        {
            depositOutstanding = Outstanding(booking, deposit);
            depositDeadline = Deadline(deposit);
            var status = deposit.Status == PaymentRequestStatus.Paid || depositOutstanding == 0 ? "Paid"
                : depositDeadline is { } due && now > due ? "Overdue" : "Pending";
            var full = IsFullPayment(booking, deposit);
            items.Add(new(deposit.Id, full ? "full" : DepositStage, deposit.Description, deposit.Amount, status == "Paid" ? 0 : depositOutstanding,
                deposit.DueDate, Utc(depositDeadline), status, Utc(deposit.PaidAt),
                depositDeadline is { } d && d > departure ? "Hạn thanh toán rơi sau thời điểm khởi hành."
                : full ? "Tour sát ngày khởi hành: thanh toán toàn bộ một lần, không chia hai đợt." : null));
            // Tour sát ngày: không có Đợt 2.
            if (full) { AppendSurcharges(booking, items, now); return items; }
        }
        else
        {
            // Đơn được duyệt trước khi áp dụng lịch thanh toán: chưa phát hành đợt cọc (chờ quyết định xử lý).
            var amount = PlannedDeposit(booking);
            depositOutstanding = Math.Max(0, Money(amount - LegacyCredit(booking)));
            items.Add(new(null, DepositStage, $"Đặt cọc {PaymentRules.DepositPercent.ToString("0.##", Vietnamese)}%",
                amount, depositOutstanding, null, null, depositOutstanding == 0 ? "Paid" : "NotIssued", null, null));
        }

        // Đợt 2 – phần còn lại: hạn = hết ngày (khởi hành − 8); số tiền = tổng nghĩa vụ − đã ghi nhận − cọc còn thiếu.
        var balance = ActiveRequest(booking, BalanceStage);
        var balanceDeadline = balance is not null ? Deadline(balance) : PaymentRules.BalanceDeadline(booking.StartDate);
        var balanceOutstanding = balance is not null ? Outstanding(booking, balance)
            : Math.Max(0, Money(BaseTourAmount(booking) - BasePaidAmount(booking) - depositOutstanding));
        var balanceAmount = Math.Max(0, Money(BaseTourAmount(booking) - (deposit?.Amount ?? PlannedDeposit(booking))));
        var balanceStatus = balanceOutstanding == 0 && depositOutstanding == 0 ? "Paid"
            : balanceDeadline is { } balanceDue && now > balanceDue ? "Overdue"
            : depositOutstanding > 0 ? "Scheduled" : "Pending";
        var balanceWarning = balanceDeadline is { } bd && depositDeadline is { } dd && bd <= dd
            ? "Hạn đợt 2 không sau hạn cọc: đơn được duyệt quá sát ngày khởi hành."
            : null;
        items.Add(new PaymentScheduleItemDto(balance?.Id, BalanceStage, balance?.Description ?? "Thanh toán phần còn lại",
            balanceAmount, balanceOutstanding, balance?.DueDate ?? (balanceDeadline is { } x ? PaymentRules.VietnamDate(x.AddTicks(-1)) : null),
            Utc(balanceDeadline), balanceStatus, Utc(balance?.PaidAt), balanceWarning));
        AppendSurcharges(booking, items, now);
        return items;
    }

    private static decimal BasePaidAmount(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success && !booking.PaymentRequests.Any(p => IsSurcharge(p) && LinkedTo(t, p))).Sum(t => t.Amount);

    private static void AppendSurcharges(Booking booking, List<PaymentScheduleItemDto> items, DateTime now)
    {
        foreach (var fee in booking.PaymentRequests.Where(p => IsSurcharge(p) && p.Status != PaymentRequestStatus.Cancelled).OrderBy(p => p.CreatedAt).ThenBy(p => p.Id)) {
            var outstanding = Outstanding(booking, fee); var due = Deadline(fee);
            var status = outstanding == 0 ? "Paid" : due.HasValue && now > due ? "Overdue" : "Pending";
            items.Add(new(fee.Id, "surcharge", fee.Description, fee.Amount, outstanding, fee.DueDate, Utc(due), status, Utc(fee.PaidAt), null,fee.BeneficiaryAgencyId,booking.BookingAgencies.FirstOrDefault(a=>a.AgencyId==fee.BeneficiaryAgencyId)?.Agency?.BusinessProfile?.BusinessName??booking.BookingAgencies.FirstOrDefault(a=>a.AgencyId==fee.BeneficiaryAgencyId)?.Agency?.Name));
        }
    }

    private static decimal LegacyCredit(Booking booking) => booking.PaymentTransactions
        .Where(t => t.Status == PaymentTransactionStatus.Success)
        .Where(t => t.PaymentRequestId is null || booking.PaymentRequests.Any(p => p.Id == t.PaymentRequestId && p.Stage == null))
        .Sum(t => t.Amount);

    private IReadOnlyList<PaymentTransactionDto> Transactions(Booking booking)
    {
        var now = UtcNow;
        return booking.PaymentTransactions
            .OrderBy(t => t.CreatedAt ?? t.PaidAt).ThenBy(t => t.Id)
            .Select(t => new PaymentTransactionDto(t.Id, t.PaymentRequestId, t.TransactionCode, t.PaymentMethod, t.Amount,
                DisplayStatus(t, now),
                t.Status == PaymentTransactionStatus.Success ? Utc(t.PaidAt) : null, Utc(t.CreatedAt), t.GatewayTransactionNo,
                Utc(t.ExpiresAt), t.ReviewNote))
            .ToList();
    }

    /// <summary>
    /// Trạng thái hiển thị. VNPAY Pending cũ không còn xác nhận được → "Expired" (không coi là đã trả).
    /// payOS Pending đã quá hạn link → "Expired" cho tới khi tra cứu payOS cập nhật kết quả thật.
    /// </summary>
    private static string DisplayStatus(PaymentTransaction t, DateTime now) =>
        t.Status == PaymentTransactionStatus.Pending && (t.PaymentMethod == LegacyVnPayMethod
            || (t.PaymentMethod == PayOsMethod && (t.ExpiresAt ?? DateTime.MinValue) <= now))
            ? "Expired"
            : t.Status.GetValueOrDefault(PaymentTransactionStatus.Success).ToString();

    private static DateTime? Utc(DateTime? value) => value is { } v ? DateTime.SpecifyKind(v, DateTimeKind.Utc) : null;
}
