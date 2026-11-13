using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;

namespace TripOps.Service.Settlements;

/// <summary>
/// Cấu hình quyết toán (mục "Settlement" trong appsettings / user-secrets).
/// AutoPayoutEnabled mặc định TẮT: bật lên thì hệ thống tự chuyển TIỀN THẬT qua chi hộ payOS.
/// </summary>
public sealed class SettlementOptions
{
    /// <summary>Phí sàn mặc định (%) khi chưa có dòng nào trong system_commission_configs.</summary>
    public decimal DefaultFeePercent { get; init; } = 10m;
    /// <summary>Số ngày chờ sau khi Agency chủ trì bấm hoàn thành rồi mới chuyển tự động (VD 10/11 → 12/11).</summary>
    public int AutoPayoutDelayDays { get; init; } = 2;
    /// <summary>Bật tác vụ chạy ngầm tự chuyển tiền. Mặc định false.</summary>
    public bool AutoPayoutEnabled { get; init; }
    /// <summary>Chu kỳ quét của tác vụ chạy ngầm (phút).</summary>
    public int WorkerIntervalMinutes { get; init; } = 30;
    /// <summary>Agency vừa đổi tài khoản nhận trong khoảng này (giờ) thì không chuyển tự động, chờ Admin.</summary>
    public int BankAccountCooldownHours { get; init; } = 24;

    public static SettlementOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("Settlement");
        return new SettlementOptions
        {
            DefaultFeePercent = section.GetValue("DefaultFeePercent", 10m),
            AutoPayoutDelayDays = Math.Max(0, section.GetValue("AutoPayoutDelayDays", 2)),
            AutoPayoutEnabled = section.GetValue("AutoPayoutEnabled", false),
            WorkerIntervalMinutes = Math.Max(1, section.GetValue("WorkerIntervalMinutes", 30)),
            BankAccountCooldownHours = Math.Max(0, section.GetValue("BankAccountCooldownHours", 24)),
        };
    }
}

/// <summary>Admin cấu hình tài khoản ngân hàng của sàn và phí sàn (%).</summary>
public sealed record PlatformBankAccountInput(
    [Required, StringLength(150, MinimumLength = 2)] string BankName,
    [Required, StringLength(50, MinimumLength = 6)] string AccountNumber,
    [Required, StringLength(150, MinimumLength = 2)] string AccountHolder,
    [StringLength(150)] string? Branch,
    [StringLength(2000)] string? Notes,
    [Range(0, 50)] decimal CommissionPercent);

/// <param name="CommissionPercent">Phí sàn đang áp dụng cho các tour hoàn thành từ bây giờ.</param>
public sealed record PlatformBankAccountDto(string? BankName, string? BankCode, string? AccountNumber, string? AccountHolder,
    string? Branch, string? Notes, decimal CommissionPercent, DateTime? UpdatedAt, bool Configured);

/// <summary>Agency nhập tài khoản ngân hàng nhận tiền quyết toán.</summary>
public sealed record PayoutAccountInput(
    [Required, StringLength(100, MinimumLength = 2)] string BankName,
    [Required, StringLength(50, MinimumLength = 6)] string AccountNumber,
    [Required, StringLength(150, MinimumLength = 2)] string AccountHolder);

/// <param name="BankBin">Mã BIN; null = ngân hàng không có trong danh sách chi tự động.</param>
public sealed record AgencyPayoutAccountDto(string? BankName, string? BankBin, string? AccountNumber, string? AccountHolder,
    DateTime? UpdatedAt, bool Configured);

/// <summary>Một khoản quyết toán = một dòng booking_agencies (một Agency trong một booking).</summary>
/// <param name="Status">Unpaid, Ready, Processing, Paid, Failed, OnHold.</param>
/// <param name="GrossAmount">Tiền khách đã trả thuộc phần của Agency này.</param>
/// <param name="NetPayout">Tiền Agency nhận = GrossAmount − PlatformFee (hoặc số Admin đã chuyển thực tế khi đã trả).</param>
/// <param name="AutoBlockers">Lý do chưa được chuyển TỰ ĐỘNG (rỗng = tác vụ chạy ngầm sẽ chuyển ở lần quét kế tiếp).</param>
/// <param name="PayoutBlockers">Lý do chưa được chuyển kể cả thủ công (VD khách chưa trả đủ, đang có yêu cầu hoàn tiền).</param>
public sealed record SettlementDto(
    int Id, int BookingId, string BookingCode, string? TourName, DateTime StartDate,
    string AgencyId, string AgencyName, bool IsHost,
    string BookingStatus, string? PaymentStatus, decimal BookingTotal, decimal CustomerPaid,
    decimal GrossAmount, decimal FeePercent, decimal PlatformFee, decimal NetPayout,
    string Status, DateTime? TourCompletedAt, DateTime? AutoPayoutAt,
    string? PayoutMethod, string? PayoutReference, int PayoutAttempts, DateTime? TransferredAt, string? BankReferenceCode,
    string? PayoutNote, string? SettledBy,
    string? BankName, string? BankBin, string? AccountNumber, string? AccountHolder,
    int OpenComplaints, bool HasOpenRefund,
    IReadOnlyList<string> PayoutBlockers, IReadOnlyList<string> AutoBlockers);

/// <param name="Amount">Bỏ trống = chuyển đúng số Agency được nhận. Nhập số nhỏ hơn (VD trừ bồi thường khiếu nại) thì bắt buộc ghi chú.</param>
/// <param name="Note">Bắt buộc khi đang có khiếu nại mở hoặc khi đổi số tiền.</param>
public sealed record SettlementPayoutRequest(
    [Range(1, 9999999999)] decimal? Amount,
    [StringLength(500)] string? Note);

/// <summary>Admin đã tự chuyển khoản bằng ngân hàng rồi ghi nhận lại.</summary>
public sealed record SettlementManualRequest(
    [Required, StringLength(100, MinimumLength = 3)] string TransactionCode,
    [Range(1, 9999999999)] decimal? Amount,
    [StringLength(500)] string? Note);

public sealed record SettlementHoldRequest([Required, StringLength(500, MinimumLength = 3)] string Reason);

/// <param name="Started">Số lệnh chi tự động vừa tạo.</param>
/// <param name="Synced">Số lệnh đang chạy vừa được cập nhật kết quả từ payOS.</param>
/// <param name="Waiting">Số khoản đã hoàn thành tour nhưng chưa đủ điều kiện chuyển tự động.</param>
public sealed record SettlementRunResult(bool Configured, int Started, int Synced, int Waiting, IReadOnlyList<string> Errors);
