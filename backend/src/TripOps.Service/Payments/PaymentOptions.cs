using Microsoft.Extensions.Configuration;

namespace TripOps.Service.Payments;

/// <summary>
/// Cấu hình lịch thanh toán 2 đợt (cọc sau khi Agency duyệt, phần còn lại sau tour).
/// 30% và 3 ngày chỉ là giá trị tạm, đổi trong appsettings "Payments" khi nhóm chốt quy định.
/// </summary>
public sealed record PaymentScheduleOptions(decimal DepositPercent, int DepositDueDays)
{
    public static PaymentScheduleOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("Payments");
        var percent = section.GetValue<decimal?>("DepositPercent") ?? 30m;
        var days = section.GetValue<int?>("DepositDueDays") ?? 3;
        if (percent <= 0 || percent > 100) throw new InvalidOperationException("Payments:DepositPercent phải trong khoảng (0, 100].");
        if (days < 0) throw new InvalidOperationException("Payments:DepositDueDays không được âm.");
        return new PaymentScheduleOptions(percent, days);
    }
}

/// <summary>
/// Cấu hình cổng VNPAY (môi trường sandbox: không trừ tiền thật).
/// TmnCode và HashSecret là bí mật: đặt bằng dotnet user-secrets, KHÔNG ghi vào appsettings/Git.
/// </summary>
public sealed class VnPayOptions
{
    public const string SandboxUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public string TmnCode { get; init; } = string.Empty;
    public string HashSecret { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = SandboxUrl;
    /// <summary>URL VNPAY chuyển trình duyệt về sau khi khách thanh toán (endpoint return của backend).</summary>
    public string ReturnUrl { get; init; } = string.Empty;
    /// <summary>Trang FE nhận kết quả (hash route), ví dụ http://localhost:5174/.</summary>
    public string FrontendBaseUrl { get; init; } = string.Empty;
    public int ExpireMinutes { get; init; } = 15;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(TmnCode) && !string.IsNullOrWhiteSpace(HashSecret)
        && !string.IsNullOrWhiteSpace(ReturnUrl);

    public static VnPayOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("VnPay");
        var expire = section.GetValue<int?>("ExpireMinutes");
        return new VnPayOptions
        {
            TmnCode = section["TmnCode"]?.Trim() ?? string.Empty,
            HashSecret = section["HashSecret"]?.Trim() ?? string.Empty,
            BaseUrl = string.IsNullOrWhiteSpace(section["BaseUrl"]) ? SandboxUrl : section["BaseUrl"]!.Trim(),
            ReturnUrl = section["ReturnUrl"]?.Trim() ?? string.Empty,
            FrontendBaseUrl = section["FrontendBaseUrl"]?.Trim() ?? string.Empty,
            ExpireMinutes = expire is > 0 ? expire.Value : 15
        };
    }
}
