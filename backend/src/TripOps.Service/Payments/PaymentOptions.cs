using Microsoft.Extensions.Configuration;

namespace TripOps.Service.Payments;

/// <summary>
/// Quy tắc thanh toán hai đợt đã chốt (không phải cấu hình, không cho Customer/Agency chọn khác):
/// Đợt 1 – đặt cọc 50% tổng giá trị booking, hạn = thời điểm Agency duyệt + 24 giờ.
/// Đợt 2 – phần còn lại, phải thanh toán xong trước ngày khởi hành 1 tuần
/// (khởi hành 30/11 → hạn chót hết ngày 22/11, tức trước 00:00 ngày 23/11 giờ Việt Nam).
/// </summary>
public static class PaymentRules
{
    public const decimal DepositPercent = 50m;
    public static readonly TimeSpan DepositWindow = TimeSpan.FromHours(24);
    public static readonly TimeSpan BalanceLeadTime = TimeSpan.FromDays(7);

    /// <summary>Hạn Đợt 2 (UTC): 00:00 ngày khởi hành (giờ VN) lùi 7 ngày = hết ngày (khởi hành − 8).</summary>
    public static DateTime BalanceDeadline(DateTime startDate) => VietnamMidnightUtc(startDate) - BalanceLeadTime;

    /// <summary>
    /// Tour sát ngày: khi Agency duyệt mà hạn Đợt 2 không còn sau hạn cọc (duyệt + 24 giờ), không chia hai đợt nữa
    /// mà thu một lần 100% với hạn duyệt + 24 giờ. Ví dụ khởi hành 30/11, duyệt 14:00 25/11 → thu toàn bộ trước 14:00 26/11.
    /// </summary>
    public static bool FullPaymentAtApproval(DateTime startDate, DateTime approvedAtUtc) =>
        BalanceDeadline(startDate) <= approvedAtUtc + DepositWindow;

    /// <summary>Việt Nam dùng GMT+7 cố định (không có giờ mùa hè).</summary>
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Ngày theo giờ Việt Nam của một thời điểm UTC (dùng cho cột due_date kiểu date).</summary>
    public static DateTime VietnamDate(DateTime utc) => DateTime.SpecifyKind(utc, DateTimeKind.Utc).Add(VietnamOffset).Date;

    /// <summary>Thời điểm 00:00 (giờ Việt Nam) của một ngày, quy về UTC.</summary>
    public static DateTime VietnamMidnightUtc(DateTime date) => DateTime.SpecifyKind(date.Date - VietnamOffset, DateTimeKind.Utc);
}

/// <summary>Đồng hồ dùng cho hạn thanh toán (UTC). Test kế thừa để cố định/tua thời gian mà không ảnh hưởng phiên đăng nhập.</summary>
public class PaymentClock
{
    public virtual DateTime UtcNow => DateTime.UtcNow;
}

/// <summary>
/// Cấu hình cổng payOS. ClientId, ApiKey, ChecksumKey là bí mật: đặt bằng dotnet user-secrets hoặc biến môi trường,
/// KHÔNG ghi vào appsettings/Git. payOS không có môi trường sandbox: mọi giao dịch qua payOS là tiền thật.
/// </summary>
public sealed class PayOsOptions
{
    public const string DefaultBaseUrl = "https://api-merchant.payos.vn";

    public string ClientId { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public string ChecksumKey { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = DefaultBaseUrl;
    /// <summary>returnUrl/cancelUrl gửi cho payOS: endpoint chỉ chuyển hướng của backend (qua proxy Vite trên localhost).</summary>
    public string ReturnUrl { get; init; } = string.Empty;
    /// <summary>Gốc frontend để chuyển khách về trang đơn, ví dụ http://localhost:5174/.</summary>
    public string FrontendBaseUrl { get; init; } = string.Empty;
    /// <summary>Thời hạn tối đa của một link thanh toán (phút); không vượt quá hạn của đợt thu.</summary>
    public int LinkMinutes { get; init; } = 15;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(ChecksumKey) && !string.IsNullOrWhiteSpace(ReturnUrl);

    public static PayOsOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("PayOs");
        var minutes = section.GetValue<int?>("LinkMinutes");
        return new PayOsOptions
        {
            ClientId = section["ClientId"]?.Trim() ?? string.Empty,
            ApiKey = section["ApiKey"]?.Trim() ?? string.Empty,
            ChecksumKey = section["ChecksumKey"]?.Trim() ?? string.Empty,
            BaseUrl = string.IsNullOrWhiteSpace(section["BaseUrl"]) ? DefaultBaseUrl : section["BaseUrl"]!.Trim().TrimEnd('/'),
            ReturnUrl = section["ReturnUrl"]?.Trim() ?? string.Empty,
            FrontendBaseUrl = section["FrontendBaseUrl"]?.Trim() ?? string.Empty,
            LinkMinutes = minutes is > 0 ? minutes.Value : 15
        };
    }
}
