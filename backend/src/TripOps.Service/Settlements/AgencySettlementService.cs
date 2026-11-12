using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Settlements;

// Quyết toán: trả tiền cho Agency sau khi tour hoàn thành.
//  - Agency chủ trì bấm "hoàn thành" → mỗi dòng booking_agencies chuyển Ready, chốt phí sàn (mặc định 10%)
//    và hẹn ngày chuyển tự động = lúc hoàn thành + AutoPayoutDelayDays (mặc định 2 ngày: 10/11 → 12/11).
//  - Tự động (SettlementWorker): tới hẹn, khách đã trả đủ, KHÔNG có khiếu nại mở, không có yêu cầu hoàn tiền mở,
//    Agency đã nhập tài khoản (không vừa đổi trong 24 giờ) → tạo lệnh chi hộ payOS (TIỀN THẬT).
//    Có khiếu nại mở → bỏ qua, Admin tự giải quyết với Agency rồi chuyển tay hoặc bấm chuyển.
//  - Thủ công (Admin): chi qua payOS ngay, ghi nhận đã chuyển khoản tay, tạm giữ / bỏ tạm giữ, kiểm tra lệnh.
//  - Chống chi hai lần: mọi thao tác khóa dòng booking trong transaction; đang Processing thì không tạo lệnh khác;
//    mã lệnh SETTLE-{id}-{lần} là khóa idempotency gửi payOS nên gửi lại không tạo lệnh thứ hai.
// Ví dụ: tour 10.000.000đ, khách trả đủ, phí sàn 10% = 1.000.000đ → Agency nhận 9.000.000đ.
public sealed class AgencySettlementService(TripOpsDbContext db, PayOsPayoutGateway payouts, PaymentClock clock,
    SettlementOptions options, ILogger<AgencySettlementService> logger)
{
    public const string MethodPayOs = "PAYOS";
    public const string MethodManual = "MANUAL";
    private static readonly CultureInfo Vietnamese = new("vi-VN");
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private DateTime UtcNow => clock.UtcNow;
    public SettlementOptions Options => options;

    // ------------------------------------------------------------ Agency chủ trì hoàn thành tour

    /// <summary>
    /// Gọi khi Agency chủ trì bấm hoàn thành (người gọi tự SaveChanges). Chốt phí sàn và hẹn ngày chuyển tự động.
    /// </summary>
    public async Task MarkTourCompleted(Booking booking, CancellationToken ct)
    {
        var now = UtcNow;
        var percent = await FeePercentAt(now, ct);
        var rows = await db.BookingAgencies.Where(a => a.BookingId == booking.Id).ToListAsync(ct);
        foreach (var row in rows.Where(r => r.SettlementStatus is null or SettlementStatus.Unpaid))
        {
            row.SettlementStatus = SettlementStatus.Ready;
            row.TourCompletedAt = now;
            row.FeePercent = percent;
            var autoAt = now.AddDays(options.AutoPayoutDelayDays);
            row.AutoPayoutAt = autoAt;
            row.UpdatedAt = now;
            db.WorkflowNotifications.Add(new WorkflowNotification
            {
                UserId = row.AgencyId,
                BookingId = booking.Id,
                Message = $"Tour của booking {booking.BookingCode} đã hoàn thành. Tiền quyết toán (trừ phí sàn {percent.ToString("0.##", Vietnamese)}%) " +
                          $"sẽ được chuyển từ {VietnamText(autoAt)} nếu khách đã trả đủ và không có khiếu nại."
            });
        }
    }

    /// <summary>Tỷ lệ phí sàn đang áp dụng: dòng system_commission_configs mới nhất còn hiệu lực, nếu không có thì cấu hình mặc định.</summary>
    public async Task<decimal> FeePercentAt(DateTime at, CancellationToken ct)
    {
        var configs = await db.SystemCommissionConfigs.AsNoTracking().Where(c => c.IsActive != false).ToListAsync(ct);
        var current = configs.Where(c => c.AppliedFrom == null || c.AppliedFrom <= at)
            .OrderByDescending(c => c.AppliedFrom ?? DateTime.MinValue).ThenByDescending(c => c.Id).FirstOrDefault();
        var percent = current?.Percentage ?? options.DefaultFeePercent;
        return Math.Clamp(percent, 0m, 100m);
    }

    // ------------------------------------------------------------ Admin: tài khoản ngân hàng sàn + phí sàn

    public async Task<PlatformBankAccountDto> GetPlatformAccount(CancellationToken ct)
    {
        var account = await CurrentPlatformAccount(ct, tracked: false);
        return Platform(account, await FeePercentAt(UtcNow, ct));
    }

    /// <summary>
    /// Lưu tài khoản ngân hàng của sàn. Đổi phí sàn thì thêm một dòng system_commission_configs có hiệu lực từ bây giờ
    /// (giữ lịch sử; tour đã hoàn thành trước đó vẫn giữ tỷ lệ đã chốt).
    /// </summary>
    public async Task<PlatformBankAccountDto> SavePlatformAccount(string adminId, PlatformBankAccountInput input, CancellationToken ct)
    {
        var number = new string(input.AccountNumber.Where(c => !char.IsWhiteSpace(c)).ToArray());
        if (number.Length is < 6 or > 30 || !number.All(char.IsAsciiDigit))
            throw new BookingException(422, "Số tài khoản chỉ gồm chữ số (6–30 số).");
        var percent = decimal.Round(input.CommissionPercent, 2);
        if (percent is < 0 or > 50)
            throw new BookingException(422, "Phí sàn phải từ 0 đến 50%.");
        var now = UtcNow;
        var bankName = input.BankName.Trim();
        var account = await CurrentPlatformAccount(ct, tracked: true);
        if (account is null)
        {
            account = new SystemBankAccount { IsDefault = true, Status = "ACTIVE", CreatedAt = now };
            db.SystemBankAccounts.Add(account);
        }
        account.BankName = Truncate(bankName, 150);
        account.BankCode = Truncate(VietnamBanks.BinOf(bankName) ?? bankName, 30);
        account.AccountNumber = number;
        account.AccountHolderName = Truncate(HolderName(input.AccountHolder), 150);
        account.Branch = Clean(input.Branch) is { } branch ? Truncate(branch, 150) : null;
        account.Notes = Clean(input.Notes);
        account.UpdatedBy = adminId;
        account.UpdatedAt = now;

        if (percent != await FeePercentAt(now, ct))
            db.SystemCommissionConfigs.Add(new SystemCommissionConfig
            {
                Percentage = percent, IsActive = true, AppliedFrom = now, CreatedBy = adminId, CreatedAt = now,
                Note = "Admin cập nhật phí sàn ở trang STK Sàn."
            });
        await db.SaveChangesAsync(ct);
        return Platform(account, percent);
    }

    private async Task<SystemBankAccount?> CurrentPlatformAccount(CancellationToken ct, bool tracked)
    {
        var query = db.SystemBankAccounts.Where(a => a.IsDefault != false && (a.Status == null || a.Status == "ACTIVE"));
        if (!tracked) query = query.AsNoTracking();
        return (await query.ToListAsync(ct)).OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt ?? DateTime.MinValue)
            .ThenByDescending(a => a.Id).FirstOrDefault();
    }

    private static PlatformBankAccountDto Platform(SystemBankAccount? a, decimal percent) => new(
        a?.BankName, a?.BankCode, a?.AccountNumber, a?.AccountHolderName, a?.Branch, a?.Notes, percent,
        Utc(a?.UpdatedAt), a is not null && !string.IsNullOrWhiteSpace(a.AccountNumber));

    // ------------------------------------------------------------ Agency: tài khoản nhận tiền

    public async Task<AgencyPayoutAccountDto> GetAccount(string agencyId, CancellationToken ct)
    {
        var profile = await db.BusinessProfiles.AsNoTracking().SingleOrDefaultAsync(p => p.UserId == agencyId, ct);
        return Account(profile);
    }

    public async Task<AgencyPayoutAccountDto> SetAccount(string agencyId, PayoutAccountInput input, CancellationToken ct)
    {
        var profile = await db.BusinessProfiles.SingleOrDefaultAsync(p => p.UserId == agencyId, ct)
            ?? throw new BookingException(404, "Chưa có hồ sơ doanh nghiệp. Vui lòng hoàn tất hồ sơ trước khi nhập tài khoản nhận tiền.");
        var bankName = input.BankName.Trim();
        var bin = VietnamBanks.BinOf(bankName)
            ?? throw new BookingException(422, $"Ngân hàng \"{bankName}\" chưa có trong danh sách chuyển tiền tự động. Vui lòng chọn ngân hàng trong danh sách.");
        var bank = VietnamBanks.All.First(b => b.Bin == bin).Name;
        var number = new string(input.AccountNumber.Where(c => !char.IsWhiteSpace(c)).ToArray());
        if (number.Length is < 6 or > 30 || !number.All(char.IsAsciiDigit))
            throw new BookingException(422, "Số tài khoản chỉ gồm chữ số (6–30 số).");
        var holder = HolderName(input.AccountHolder);
        if (holder.Length < 2)
            throw new BookingException(422, "Vui lòng nhập tên chủ tài khoản.");
        if (await db.BookingAgencies.AnyAsync(a => a.AgencyId == agencyId && a.SettlementStatus == SettlementStatus.Processing, ct))
            throw new BookingException(409, "Đang có lệnh chuyển tiền cho bạn. Vui lòng đổi tài khoản sau khi lệnh này hoàn tất.");

        if (profile.BankName != bank || profile.BankAccountNumber != number || profile.BankAccountHolder != holder)
        {
            profile.BankName = bank;
            profile.BankAccountNumber = number;
            profile.BankAccountHolder = holder;
            profile.BankAccountUpdatedAt = UtcNow;
            profile.UpdatedAt = UtcNow;
            await db.SaveChangesAsync(ct);
        }
        return Account(profile);
    }

    /// <summary>Các khoản quyết toán của chính Agency (để Agency theo dõi tiền về).</summary>
    public async Task<IReadOnlyList<SettlementDto>> AgencySettlements(string agencyId, CancellationToken ct)
    {
        var rows = await Build(await Rows().Where(a => a.AgencyId == agencyId &&
            (a.SettlementStatus != SettlementStatus.Unpaid || a.Booking.Status == BookingStatus.Completed)).ToListAsync(ct), ct);
        static string Mask(string message) => message.StartsWith("Khách chưa thanh toán đủ", StringComparison.Ordinal)
            ? "Booking chưa hoàn tất thanh toán để quyết toán chặng." : message;
        return rows.Select(s => s.IsHost ? s : s with {
            BookingTotal = s.GrossAmount,
            CustomerPaid = s.PayoutBlockers.Any(p => p.StartsWith("Khách chưa thanh toán đủ", StringComparison.Ordinal)) ? 0 : s.GrossAmount,
            PayoutBlockers = s.PayoutBlockers.Select(Mask).ToArray(),
            AutoBlockers = s.AutoBlockers.Select(Mask).ToArray()
        }).ToArray();
    }

    // ------------------------------------------------------------ Admin: danh sách

    /// <param name="status">Lọc theo trạng thái (Ready, Processing, Paid, Failed, OnHold). Bỏ trống = mọi khoản của tour đã hoàn thành.</param>
    public async Task<IReadOnlyList<SettlementDto>> List(string? status, CancellationToken ct)
    {
        var query = Rows().Where(a => a.SettlementStatus != SettlementStatus.Unpaid || a.Booking.Status == BookingStatus.Completed);
        var rows = await query.ToListAsync(ct);
        var result = await Build(rows, ct);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<SettlementStatus>(status, true, out var wanted))
                throw new BookingException(400, "Trạng thái lọc không hợp lệ.");
            result = result.Where(s => s.Status == wanted.ToString()).ToList();
        }
        return result
            .OrderBy(s => s.Status switch { "Failed" => 0, "Processing" => 1, "Ready" => 2, "OnHold" => 3, _ => 4 })
            .ThenByDescending(s => s.TourCompletedAt ?? DateTime.MinValue).ThenByDescending(s => s.Id)
            .ToList();
    }

    public async Task<SettlementDto> Get(int id, CancellationToken ct)
    {
        var row = await Rows().SingleOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy khoản quyết toán.");
        return (await Build([row], ct))[0];
    }

    // ------------------------------------------------------------ Admin: thao tác

    /// <summary>Admin chuyển ngay qua chi hộ payOS (không cần chờ tới ngày tự động).</summary>
    public async Task<SettlementDto> PayoutNow(string adminId, int id, SettlementPayoutRequest request, CancellationToken ct) =>
        await StartPayout(adminId, id, request.Amount, request.Note, automatic: false, ct)
        ?? throw new BookingException(409, "Khoản này chưa thể chuyển.");

    /// <summary>Admin đã tự chuyển khoản bằng ngân hàng: ghi nhận mã giao dịch, đánh dấu đã trả.</summary>
    public async Task<SettlementDto> RecordManual(string adminId, int id, SettlementManualRequest request, CancellationToken ct)
    {
        var bookingId = await BookingOf(id, ct);
        await using (var transaction = await Lock(bookingId, ct))
        {
            var (row, eval) = await LoadForChange(id, ct);
            EnsureAdminActionable(row);
            if (eval.PayoutBlockers.Count > 0)
                throw new BookingException(409, string.Join(" ", eval.PayoutBlockers));
            var note = Clean(request.Note);
            var amount = ValidateAmount(request.Amount, eval, note);
            var code = request.TransactionCode.Trim();
            var now = UtcNow;
            Snapshot(row, eval);
            row.PlatformFee = eval.Fee;
            row.NetPayout = amount;
            row.FeePercent ??= eval.FeePercent;
            row.TourCompletedAt ??= now;
            row.PayoutMethod = MethodManual;
            row.BankReferenceCode = Truncate(code, 100);
            row.PayoutTransferredAt = now;
            row.SettlementStatus = SettlementStatus.Paid;
            row.SettledBy = adminId;
            row.PayoutNote = note is null ? null : Truncate(note, 500);
            row.UpdatedAt = now;
            NotifyPaid(row, amount);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        return await Get(id, ct);
    }

    /// <summary>Tạm giữ: tác vụ tự động bỏ qua khoản này cho tới khi Admin bỏ tạm giữ hoặc tự chuyển.</summary>
    public async Task<SettlementDto> Hold(string adminId, int id, SettlementHoldRequest request, CancellationToken ct)
    {
        var bookingId = await BookingOf(id, ct);
        await using (var transaction = await Lock(bookingId, ct))
        {
            var (row, _) = await LoadForChange(id, ct);
            var status = EffectiveStatus(row);
            if (status is not (SettlementStatus.Ready or SettlementStatus.Failed))
                throw new BookingException(409, status == SettlementStatus.OnHold ? "Khoản này đang được tạm giữ." : "Chỉ tạm giữ được khoản đang chờ chuyển.");
            row.TourCompletedAt ??= UtcNow;
            row.SettlementStatus = SettlementStatus.OnHold;
            row.PayoutNote = Truncate($"Tạm giữ: {request.Reason.Trim()}", 500);
            row.SettledBy = adminId;
            row.UpdatedAt = UtcNow;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        return await Get(id, ct);
    }

    /// <summary>Bỏ tạm giữ: quay lại chờ chuyển (tự động tiếp tục nếu đã tới hẹn và đủ điều kiện).</summary>
    public async Task<SettlementDto> Release(string adminId, int id, CancellationToken ct)
    {
        var bookingId = await BookingOf(id, ct);
        await using (var transaction = await Lock(bookingId, ct))
        {
            var (row, _) = await LoadForChange(id, ct);
            if (row.SettlementStatus != SettlementStatus.OnHold)
                throw new BookingException(409, "Khoản này không ở trạng thái tạm giữ.");
            row.SettlementStatus = SettlementStatus.Ready;
            row.PayoutNote = null;
            row.SettledBy = adminId;
            row.UpdatedAt = UtcNow;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        return await Get(id, ct);
    }

    /// <summary>Hỏi payOS kết quả lệnh đang chạy và áp vào (thành công → Paid; lỗi chắc chắn → Failed).</summary>
    public async Task<SettlementDto> Sync(int id, CancellationToken ct)
    {
        var row = await db.BookingAgencies.AsNoTracking().SingleOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy khoản quyết toán.");
        if (row.SettlementStatus != SettlementStatus.Processing || row.PayoutMethod != MethodPayOs || row.PayoutReference is null)
            return await Get(id, ct);
        if (!payouts.Options.IsConfigured)
            throw new BookingException(503, "Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout).");

        PayOsPayoutInfo? info;
        try
        {
            info = row.PayoutGatewayId is { Length: > 0 } gatewayId
                ? await payouts.Get(gatewayId, ct)
                : await payouts.FindByReference(row.PayoutReference, ct);
        }
        catch (PayOsPayoutException exception)
        {
            throw new BookingException(502, exception.Message);
        }
        if (info is null)
        {
            // payOS không có lệnh mã này: chắc chắn chưa chuyển (chờ 2 phút phòng payOS ghi nhận chậm).
            if (UtcNow - DateTime.SpecifyKind(row.UpdatedAt ?? UtcNow, DateTimeKind.Utc) < TimeSpan.FromMinutes(2))
                return await Get(id, ct);
            await Apply(row.BookingId, id, row.PayoutReference, null, "payOS không có lệnh chi này (lệnh chưa được tạo).", ct);
        }
        else await Apply(row.BookingId, id, row.PayoutReference, info, null, ct);
        return await Get(id, ct);
    }

    // ------------------------------------------------------------ tự động

    /// <summary>
    /// Một lượt quét: cập nhật lệnh đang chạy, rồi tạo lệnh chi cho mọi khoản đã tới hẹn và đủ điều kiện.
    /// Tác vụ chạy ngầm gọi định kỳ; Admin cũng bấm "Chạy ngay" được. Máy tắt đúng ngày hẹn thì lượt sau chuyển bù.
    /// </summary>
    public async Task<SettlementRunResult> RunDue(CancellationToken ct)
    {
        if (!payouts.Options.IsConfigured)
            return new SettlementRunResult(false, 0, 0, 0, ["Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout): không chuyển tự động."]);
        var errors = new List<string>();
        var synced = 0;
        var processing = await db.BookingAgencies.AsNoTracking()
            .Where(a => a.SettlementStatus == SettlementStatus.Processing && a.PayoutMethod == MethodPayOs)
            .Select(a => a.Id).ToListAsync(ct);
        foreach (var id in processing)
        {
            try
            {
                var after = await Sync(id, ct);
                if (after.Status != nameof(SettlementStatus.Processing)) synced++;
            }
            catch (BookingException exception) { errors.Add($"#{id}: {exception.Message}"); }
        }

        var now = UtcNow;
        var due = await db.BookingAgencies.AsNoTracking()
            .Where(a => a.SettlementStatus == SettlementStatus.Ready && a.AutoPayoutAt != null && a.AutoPayoutAt <= now)
            .OrderBy(a => a.AutoPayoutAt).Select(a => a.Id).ToListAsync(ct);
        var started = 0;
        var waiting = 0;
        foreach (var id in due)
        {
            try
            {
                if (await StartPayout(null, id, null, null, automatic: true, ct) is null) waiting++;
                else started++;
            }
            catch (BookingException exception)
            {
                errors.Add($"#{id}: {exception.Message}");
                logger.LogWarning("Automatic settlement payout {Id} failed: {Message}", id, exception.Message);
            }
        }
        return new SettlementRunResult(true, started, synced, waiting, errors);
    }

    // ------------------------------------------------------------ chi hộ payOS

    /// <summary>Tạo lệnh chi. automatic = true: chỉ chạy khi qua hết điều kiện tự động, không đủ thì trả null (không lỗi).</summary>
    private async Task<SettlementDto?> StartPayout(string? adminId, int id, decimal? requestedAmount, string? requestNote,
        bool automatic, CancellationToken ct)
    {
        if (!payouts.Options.IsConfigured)
            throw new BookingException(503, "Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout:ClientId/ApiKey/ChecksumKey).");
        var bookingId = await BookingOf(id, ct);
        string reference, bin, accountNumber, bookingCode;
        long amount;
        await using (var transaction = await Lock(bookingId, ct))
        {
            var (row, eval) = await LoadForChange(id, ct);
            if (automatic)
            {
                if (row.SettlementStatus != SettlementStatus.Ready || eval.AutoBlockers.Count > 0) return null;
            }
            else
            {
                EnsureAdminActionable(row);
                if (eval.PayoutBlockers.Count > 0)
                    throw new BookingException(409, string.Join(" ", eval.PayoutBlockers));
            }
            if (eval.AccountNumber is null)
                throw new BookingException(409, "Agency chưa nhập tài khoản ngân hàng nhận tiền.");
            bin = eval.BankBin ?? throw new BookingException(422,
                $"Ngân hàng \"{eval.BankName}\" chưa có trong danh sách chi tự động. Vui lòng chuyển khoản tay rồi ghi nhận.");
            accountNumber = eval.AccountNumber;
            var note = automatic ? null : Clean(requestNote);
            var money = automatic ? eval.Net : ValidateAmount(requestedAmount, eval, note);
            var now = UtcNow;

            row.PayoutAttempts += 1;
            reference = $"SETTLE-{row.Id}-{row.PayoutAttempts}";
            amount = (long)money;
            bookingCode = row.Booking.BookingCode;
            Snapshot(row, eval);
            row.PlatformFee = eval.Fee;
            row.NetPayout = money;
            row.FeePercent ??= eval.FeePercent;
            row.TourCompletedAt ??= now;
            row.PayoutMethod = MethodPayOs;
            row.PayoutReference = reference;
            row.PayoutGatewayId = null;
            row.SettlementStatus = SettlementStatus.Processing;
            row.SettledBy = adminId;
            row.PayoutNote = note is null ? (automatic ? "Hệ thống tự chuyển sau khi tour hoàn thành." : null) : Truncate(note, 500);
            row.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }

        // Gọi payOS ngoài transaction. Khóa idempotency = mã lệnh nên gửi lại không tạo lệnh chi thứ hai.
        PayOsPayoutInfo info;
        try
        {
            info = await payouts.Create(reference, amount, Description(bookingCode, bookingId), bin, accountNumber, ct, "settlement");
        }
        catch (PayOsPayoutException exception) when (exception.Definite)
        {
            await Apply(bookingId, id, reference, null, exception.Message, ct);
            throw new BookingException(502, $"{exception.Message} Chưa có tiền ra; khoản này chuyển sang \"Lỗi\" để Admin xử lý.");
        }
        catch (PayOsPayoutException exception)
        {
            logger.LogWarning("Settlement payout {Reference} has an unknown result: {Message}", reference, exception.Message);
            throw new BookingException(502, $"{exception.Message} Chưa chắc payOS đã nhận lệnh: bấm \"Kiểm tra\" sau ít phút, KHÔNG chuyển tay để tránh trả hai lần.");
        }
        await Apply(bookingId, id, reference, info, null, ct);
        return await Get(id, ct);
    }

    /// <summary>Áp kết quả lệnh chi trong khóa. info null = chắc chắn không thành công.</summary>
    private async Task Apply(int bookingId, int id, string reference, PayOsPayoutInfo? info, string? failure, CancellationToken ct)
    {
        await using var transaction = await Lock(bookingId, ct);
        db.ChangeTracker.Clear();
        var row = await db.BookingAgencies.Include(a => a.Booking).SingleAsync(a => a.Id == id, ct);
        if (row.SettlementStatus != SettlementStatus.Processing || row.PayoutReference != reference)
        {
            await transaction.CommitAsync(ct);
            return; // đã áp trước đó (bấm lặp / tác vụ chạy ngầm đã cập nhật)
        }
        var now = UtcNow;
        if (info is not null)
        {
            row.PayoutGatewayId = Truncate(info.Id, 100);
        }
        if (info is { Succeeded: true })
        {
            row.SettlementStatus = SettlementStatus.Paid;
            row.PayoutTransferredAt = info.TransactionTime ?? now;
            row.BankReferenceCode = Truncate(info.BankReference ?? info.Id, 100);
            NotifyPaid(row, row.NetPayout ?? 0);
        }
        else if (info is null || info.Failed)
        {
            var reason = failure ?? info?.ErrorMessage ?? $"payOS báo {info?.State ?? info?.ApprovalState}.";
            row.SettlementStatus = SettlementStatus.Failed;
            row.PayoutNote = Truncate($"Chi hộ không thành công: {reason}", 500);
        }
        row.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    // ------------------------------------------------------------ tính toán

    private sealed record Evaluation(decimal CustomerPaid, decimal Gross, decimal FeePercent, decimal Fee, decimal Net,
        string? BankName, string? BankBin, string? AccountNumber, string? AccountHolder,
        int OpenComplaints, bool OpenRefund, List<string> PayoutBlockers, List<string> AutoBlockers);

    private Evaluation Evaluate(BookingAgency row, int openComplaints)
    {
        var booking = row.Booking;
        var now = UtcNow;
        // Giảm giá đã hoàn được lưu ở refund_requests, không sửa giao dịch thu gốc.
        var paid = Math.Max(0, BookingBilling.NetPaidAmount(booking));
        // FinalAmount đã bao gồm phụ thu/giảm giá được duyệt cho đúng Agency.
        // Không dồn phần tiền dư (hoặc tiền chưa hoàn) sang Agency chủ trì.
        var alliance = booking.BookingAgencies.Count > 1;
        var gross = Math.Min(alliance ? Math.Max(0, row.FinalAmount) : booking.TotalAmount, paid);

        var percent = row.FeePercent ?? options.DefaultFeePercent;
        var fee = Money(gross * percent / 100m);
        var net = Math.Max(0, gross - fee);

        var profile = row.Agency?.BusinessProfile;
        // Đã chuyển / đang chuyển: hiển thị tài khoản đã chụp lúc chuyển, không phải hồ sơ hiện tại.
        var useSnapshot = (row.SettlementStatus is SettlementStatus.Processing or SettlementStatus.Paid) && row.PayoutAccountNumber is not null;
        var bankName = useSnapshot ? row.PayoutBankName : profile?.BankName;
        var account = useSnapshot ? row.PayoutAccountNumber : profile?.BankAccountNumber;
        var holder = useSnapshot ? row.PayoutAccountHolder : profile?.BankAccountHolder;
        var bin = VietnamBanks.BinOf(bankName);
        var openRefund = booking.RefundRequests.Any(r => r.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved);

        var payoutBlockers = new List<string>();
        if (booking.Status != BookingStatus.Completed) payoutBlockers.Add("Tour chưa được Agency chủ trì bấm hoàn thành.");
        if (paid < booking.TotalAmount)
            payoutBlockers.Add($"Khách chưa thanh toán đủ (đã trả {Vnd(paid)} / {Vnd(booking.TotalAmount)}).");
        if (openRefund) payoutBlockers.Add("Booking đang có yêu cầu hủy/hoàn tiền chưa xử lý xong.");
        if (alliance && booking.BookingAgencies.Sum(a => a.FinalAmount) != booking.TotalAmount)
            payoutBlockers.Add("Tổng phân bổ cho các Agency chưa khớp tổng giá booking. Cần đối soát trước khi quyết toán.");
        if (net <= 0) payoutBlockers.Add("Số tiền Agency nhận bằng 0.");

        var autoBlockers = new List<string>(payoutBlockers);
        var status = EffectiveStatus(row);
        switch (status)
        {
            case SettlementStatus.Paid: autoBlockers.Add("Đã chuyển tiền."); break;
            case SettlementStatus.Processing: autoBlockers.Add("Đang có lệnh chuyển tiền, chờ payOS báo kết quả."); break;
            case SettlementStatus.Failed: autoBlockers.Add("Lần chuyển trước không thành công: Admin xử lý."); break;
            case SettlementStatus.OnHold: autoBlockers.Add("Admin đang tạm giữ khoản này."); break;
        }
        if (openComplaints > 0) autoBlockers.Add($"Có {openComplaints} khiếu nại đang mở: Admin cần giải quyết với Agency rồi chuyển tay.");
        if (status is SettlementStatus.Ready or SettlementStatus.Unpaid)
        {
            if (row.AutoPayoutAt is null)
                autoBlockers.Add("Tour hoàn thành trước khi có quyết toán tự động: Admin chuyển thủ công.");
            else if (row.AutoPayoutAt is { } autoAt && autoAt > now)
                autoBlockers.Add($"Chưa tới ngày chuyển tự động ({VietnamText(autoAt)}).");
            if (account is null) autoBlockers.Add("Agency chưa nhập tài khoản ngân hàng nhận tiền.");
            else if (bin is null) autoBlockers.Add($"Ngân hàng \"{bankName}\" không hỗ trợ chuyển tự động.");
            if (profile?.BankAccountUpdatedAt is { } changed && options.BankAccountCooldownHours > 0 &&
                now - DateTime.SpecifyKind(changed, DateTimeKind.Utc) < TimeSpan.FromHours(options.BankAccountCooldownHours))
                autoBlockers.Add($"Agency vừa đổi tài khoản nhận trong {options.BankAccountCooldownHours} giờ qua: chờ hết thời gian hoặc Admin chuyển.");
            if (!payouts.Options.IsConfigured) autoBlockers.Add("Chưa cấu hình kênh chuyển tiền payOS.");
        }
        return new Evaluation(paid, gross, percent, fee, net, bankName, bin, account, holder, openComplaints, openRefund,
            payoutBlockers, autoBlockers.Distinct().ToList());
    }

    /// <summary>Dòng cũ (tour hoàn thành trước khi có tính năng) vẫn Unpaid: coi như Ready, chỉ chuyển thủ công.</summary>
    private static SettlementStatus EffectiveStatus(BookingAgency row) =>
        (row.SettlementStatus is null or SettlementStatus.Unpaid) && row.Booking.Status == BookingStatus.Completed
            ? SettlementStatus.Ready
            : row.SettlementStatus ?? SettlementStatus.Unpaid;

    private static void EnsureAdminActionable(BookingAgency row)
    {
        switch (EffectiveStatus(row))
        {
            case SettlementStatus.Paid: throw new BookingException(409, "Khoản này đã được chuyển.");
            case SettlementStatus.Processing:
                throw new BookingException(409, "Đang có lệnh chuyển tiền: bấm \"Kiểm tra\" để lấy kết quả trước khi làm thao tác khác.");
            case SettlementStatus.Unpaid: throw new BookingException(409, "Tour chưa hoàn thành.");
        }
    }

    private static decimal ValidateAmount(decimal? requested, Evaluation eval, string? note)
    {
        if (eval.OpenComplaints > 0 && note is null)
            throw new BookingException(422, "Booking đang có khiếu nại mở: vui lòng ghi chú cách đã giải quyết với Agency trước khi chuyển tiền.");
        var amount = requested ?? eval.Net;
        if (amount != Money(amount) || amount <= 0)
            throw new BookingException(422, "Số tiền chuyển phải là số nguyên dương.");
        if (amount > eval.Net)
            throw new BookingException(422, $"Số tiền chuyển không được lớn hơn số Agency được nhận ({Vnd(eval.Net)}).");
        if (amount != eval.Net && note is null)
            throw new BookingException(422, "Chuyển ít hơn số Agency được nhận: vui lòng ghi rõ lý do.");
        return amount;
    }

    private async Task<IReadOnlyList<SettlementDto>> Build(List<BookingAgency> rows, CancellationToken ct)
    {
        var bookingIds = rows.Select(r => r.BookingId).Distinct().ToList();
        var complaints = (await db.Complaints.AsNoTracking()
                .Where(c => bookingIds.Contains(c.BookingId) && (c.Status == null || c.Status == ComplaintStatus.Pending || c.Status == ComplaintStatus.InReview))
                .Select(c => c.BookingId).ToListAsync(ct))
            .GroupBy(b => b).ToDictionary(g => g.Key, g => g.Count());
        return rows.Select(row =>
        {
            var eval = Evaluate(row, complaints.GetValueOrDefault(row.BookingId));
            var status = EffectiveStatus(row);
            var paid = status is SettlementStatus.Paid or SettlementStatus.Processing;
            return new SettlementDto(row.Id, row.BookingId, row.Booking.BookingCode, row.Booking.Tour?.Name, row.Booking.StartDate,
                row.AgencyId, row.Agency?.BusinessProfile?.BusinessName ?? row.Agency?.Name ?? row.AgencyId, row.IsHost == true,
                (row.Booking.Status ?? BookingStatus.Pending).ToString(), row.Booking.PaymentStatus?.ToString(),
                row.Booking.TotalAmount, eval.CustomerPaid, eval.Gross, eval.FeePercent,
                paid ? row.PlatformFee ?? eval.Fee : eval.Fee, paid ? row.NetPayout ?? eval.Net : eval.Net,
                status.ToString(), Utc(row.TourCompletedAt), Utc(row.AutoPayoutAt),
                row.PayoutMethod, row.PayoutReference, row.PayoutAttempts, Utc(row.PayoutTransferredAt), row.BankReferenceCode,
                row.PayoutNote, row.SettledBy,
                eval.BankName, eval.BankBin, eval.AccountNumber, eval.AccountHolder,
                eval.OpenComplaints, eval.OpenRefund,
                status == SettlementStatus.Paid ? Array.Empty<string>() : eval.PayoutBlockers.ToArray(), eval.AutoBlockers);
        }).ToList();
    }

    // ------------------------------------------------------------ tiện ích

    // Booking → BookingAgencies quay lại chính dòng đang đọc (vòng): AsNoTracking() không cho phép vòng Include,
    // nên dùng AsNoTrackingWithIdentityResolution (vẫn không theo dõi thay đổi).
    private IQueryable<BookingAgency> Rows() => db.BookingAgencies.AsNoTrackingWithIdentityResolution()
        .Include(a => a.Agency).ThenInclude(u => u.BusinessProfile)
        .Include(a => a.Booking).ThenInclude(b => b.Tour)
        .Include(a => a.Booking).ThenInclude(b => b.PaymentTransactions)
        .Include(a => a.Booking).ThenInclude(b => b.RefundRequests)
        .Include(a => a.Booking).ThenInclude(b => b.BookingAgencies)
        .AsSplitQuery();

    private async Task<int> BookingOf(int id, CancellationToken ct) =>
        await db.BookingAgencies.AsNoTracking().Where(a => a.Id == id).Select(a => (int?)a.BookingId).SingleOrDefaultAsync(ct)
        ?? throw new BookingException(404, "Không tìm thấy khoản quyết toán.");

    /// <summary>Khóa dòng booking (giống khóa thanh toán/hoàn tiền) để quyết toán không chạy song song với hoàn tiền hay lần chuyển khác.</summary>
    private async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> Lock(int bookingId, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Bookings.IgnoreQueryFilters().Where(b => b.Id == bookingId)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.UpdatedAt, b => b.UpdatedAt), ct);
        return transaction;
    }

    /// <summary>Đọc lại dữ liệu mới nhất trong khóa (bản được theo dõi để sửa) và tính điều kiện.</summary>
    private async Task<(BookingAgency Row, Evaluation Eval)> LoadForChange(int id, CancellationToken ct)
    {
        db.ChangeTracker.Clear();
        var row = await db.BookingAgencies
            .Include(a => a.Agency).ThenInclude(u => u.BusinessProfile)
            .Include(a => a.Booking).ThenInclude(b => b.PaymentTransactions)
            .Include(a => a.Booking).ThenInclude(b => b.RefundRequests)
            .Include(a => a.Booking).ThenInclude(b => b.BookingAgencies)
            .AsSplitQuery()
            .SingleOrDefaultAsync(a => a.Id == id, ct) ?? throw new BookingException(404, "Không tìm thấy khoản quyết toán.");
        var complaints = await db.Complaints.AsNoTracking().CountAsync(c => c.BookingId == row.BookingId &&
            (c.Status == null || c.Status == ComplaintStatus.Pending || c.Status == ComplaintStatus.InReview), ct);
        return (row, Evaluate(row, complaints));
    }

    private static void Snapshot(BookingAgency row, Evaluation eval)
    {
        row.PayoutBankName = eval.BankName is null ? null : Truncate(eval.BankName, 100);
        row.PayoutAccountNumber = eval.AccountNumber is null ? null : Truncate(eval.AccountNumber, 50);
        row.PayoutAccountHolder = eval.AccountHolder is null ? null : Truncate(eval.AccountHolder, 150);
    }

    private void NotifyPaid(BookingAgency row, decimal amount) => db.WorkflowNotifications.Add(new WorkflowNotification
    {
        UserId = row.AgencyId,
        BookingId = row.BookingId,
        Message = $"TripOps đã chuyển {Vnd(amount)} tiền quyết toán booking {row.Booking.BookingCode}" +
                  (row.PayoutAccountNumber is { } account ? $" vào tài khoản {Mask(account)}." : ".")
    });

    private static AgencyPayoutAccountDto Account(BusinessProfile? profile) => new(
        profile?.BankName, VietnamBanks.BinOf(profile?.BankName), profile?.BankAccountNumber, profile?.BankAccountHolder,
        Utc(profile?.BankAccountUpdatedAt), !string.IsNullOrWhiteSpace(profile?.BankAccountNumber));

    /// <summary>Nội dung chuyển khoản payOS: không dấu, ngắn (ngân hàng cắt nội dung dài).</summary>
    private static string Description(string bookingCode, int bookingId)
    {
        var code = new string((bookingCode ?? "").Where(char.IsAsciiLetterOrDigit).ToArray());
        return code.Length is > 0 and <= 12 ? $"TripOps quyet toan {code}" : $"TripOps quyet toan {bookingId}";
    }

    /// <summary>Tên chủ tài khoản theo cách ngân hàng hiển thị: in hoa, bỏ dấu.</summary>
    private static string HolderName(string value)
    {
        var text = value.Trim().Normalize(System.Text.NormalizationForm.FormD);
        var chars = text.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .Select(c => c is 'đ' or 'Đ' ? 'D' : c).ToArray();
        return string.Join(' ', new string(chars).ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string Mask(string account) => account.Length <= 4 ? account : new string('*', account.Length - 4) + account[^4..];
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static decimal Money(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);
    private static string Vnd(decimal value) => $"{value.ToString("N0", Vietnamese)}đ";
    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
    private static DateTime? Utc(DateTime? value) => value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
    private static string VietnamText(DateTime utc) =>
        (DateTime.SpecifyKind(utc, DateTimeKind.Utc) + VietnamOffset).ToString("HH:mm dd/MM/yyyy", Vietnamese);
}
