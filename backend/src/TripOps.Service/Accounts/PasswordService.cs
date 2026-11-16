using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Notifications;
using TripOps.Service.Payments;

namespace TripOps.Service.Accounts;

public sealed record ForgotPasswordRequest([Required, EmailAddress, StringLength(191)] string Email);

/// <summary>
/// Phản hồi luôn giống nhau dù email có tài khoản hay không (không cho dò email).
/// DevelopmentCode chỉ có khi chạy Development mà chưa cấu hình SMTP, để demo/test.
/// </summary>
public sealed record ForgotPasswordResponse(string Message, int ResendAfterSeconds, int ExpiresInMinutes, string? DevelopmentCode = null);

public sealed record VerifyResetCodeRequest(
    [Required, EmailAddress, StringLength(191)] string Email,
    [Required, RegularExpression(@"^\d{6}$")] string Code);

public sealed record ResetPasswordRequest(
    [Required, EmailAddress, StringLength(191)] string Email,
    [Required, RegularExpression(@"^\d{6}$")] string Code,
    [Required, StringLength(128, MinimumLength = 8)] string NewPassword,
    [Required] string ConfirmPassword);

public sealed record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, StringLength(128, MinimumLength = 8)] string NewPassword,
    [Required] string ConfirmPassword);

/// <summary>
/// Email tài khoản và mật khẩu: chào mừng khi đăng ký, quên mật khẩu bằng OTP 6 số qua email, đổi mật khẩu trong hồ sơ.
/// Đổi hoặc đặt lại mật khẩu sẽ cập nhật users.password_changed_at → mọi phiên đăng nhập cũ bị đăng xuất.
/// </summary>
public sealed class PasswordService(TripOpsDbContext db, EmailSender email, PaymentClock clock, IHostEnvironment environment,
    ILogger<PasswordService> logger)
{
    public static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ResendAfter = TimeSpan.FromSeconds(60);
    public const int MaxSendsPerHour = 5;
    public const int MaxFailedAttempts = 5;
    private const string GenericSent = "Nếu email này có tài khoản TripOps, mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư (cả mục Spam).";
    private const string InvalidCode = "Mã xác nhận không đúng hoặc đã hết hạn.";

    private readonly PasswordHasher<User> hasher = new();
    private DateTime UtcNow => clock.UtcNow;

    /// <summary>Giá trị claim lưu vào cookie lúc đăng nhập; khác giá trị hiện tại của tài khoản thì phiên bị từ chối.</summary>
    public static string SessionStamp(User user) =>
        user.PasswordChangedAt is { } at ? at.Ticks.ToString(CultureInfo.InvariantCulture) : "0";

    // ------------------------------------------------------------ email chào mừng

    /// <summary>Gửi email chào mừng; lỗi gửi chỉ ghi log, không làm hỏng việc đăng ký.</summary>
    public async Task SendWelcome(User user, CancellationToken ct)
    {
        var name = WebUtility.HtmlEncode(user.Name);
        var body = user.Role switch
        {
            UserRole.TravelAgency or UserRole.Provider =>
                $"<p>Xin chào {name},</p><p>Cảm ơn bạn đã đăng ký tài khoản <b>{(user.Role == UserRole.TravelAgency ? "Công ty lữ hành (Agency)" : "Nhà cung cấp dịch vụ")}</b> trên TripOps.</p>" +
                "<p>Bước tiếp theo: đăng nhập và hoàn thiện <b>hồ sơ doanh nghiệp</b> (tên công ty, mã số thuế, giấy phép kinh doanh). " +
                "Admin TripOps sẽ duyệt hồ sơ, sau đó bạn có thể bắt đầu sử dụng đầy đủ các chức năng.</p>",
            _ =>
                $"<p>Xin chào {name},</p><p>Chào mừng bạn đến với <b>TripOps</b>! Tài khoản của bạn đã được tạo thành công.</p>" +
                "<p>Giờ bạn có thể khám phá các tour, đặt chuyến đi hoặc gửi yêu cầu thiết kế tour riêng theo ý mình.</p>",
        };
        await TrySend(user.Email, "Chào mừng bạn đến với TripOps", Layout("Chào mừng đến với TripOps", body), ct);
    }

    // ------------------------------------------------------------ quên mật khẩu

    public async Task<ForgotPasswordResponse> Forgot(ForgotPasswordRequest request, CancellationToken ct)
    {
        var generic = new ForgotPasswordResponse(GenericSent, (int)ResendAfter.TotalSeconds, (int)CodeLifetime.TotalMinutes);
        var user = await FindActive(request.Email, ct);
        if (user is null) return generic;

        var now = UtcNow;
        var recent = await db.PasswordResetCodes.Where(c => c.UserId == user.Id && c.CreatedAt > now.AddHours(-1)).ToListAsync(ct);
        // Gửi lại quá sớm hoặc quá 5 lần/giờ: không gửi thêm nhưng vẫn trả lời như thường để không lộ email nào có tài khoản.
        if (recent.Any(c => now - Utc(c.CreatedAt) < ResendAfter) || recent.Count >= MaxSendsPerHour)
            return generic;

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        // Mã mới thay mã cũ: mọi mã chưa dùng trước đó hết hiệu lực.
        foreach (var old in await db.PasswordResetCodes.Where(c => c.UserId == user.Id && c.UsedAt == null).ToListAsync(ct))
            old.UsedAt = now;
        var row = new PasswordResetCode { UserId = user.Id, CodeHash = Hash(user.Id, code), ExpiresAt = now + CodeLifetime, CreatedAt = now };
        db.PasswordResetCodes.Add(row);
        await db.SaveChangesAsync(ct);

        if (!email.IsConfigured)
        {
            if (environment.IsDevelopment())
            {
                logger.LogWarning("SMTP chưa cấu hình: mã đặt lại mật khẩu cho {Email} là {Code} (chỉ Development).", user.Email, code);
                return generic with { DevelopmentCode = code };
            }
            throw new AccountException(503, "Hệ thống chưa cấu hình gửi email. Vui lòng liên hệ TripOps.");
        }
        var body = $"<p>Xin chào {WebUtility.HtmlEncode(user.Name)},</p>" +
                   "<p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu tài khoản TripOps. Mã xác nhận của bạn là:</p>" +
                   $"<p style=\"font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0\">{code}</p>" +
                   $"<p>Mã có hiệu lực <b>{(int)CodeLifetime.TotalMinutes} phút</b> và chỉ dùng được một lần. Không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên TripOps.</p>" +
                   "<p>Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn vẫn giữ nguyên.</p>";
        if (!await TrySend(user.Email, $"Mã đặt lại mật khẩu TripOps: {code}", Layout("Đặt lại mật khẩu", body), ct))
            throw new AccountException(502, "Không gửi được email. Vui lòng thử lại sau.");
        return generic;
    }

    /// <summary>Bước 2: kiểm tra mã (chưa dùng mã). Sai thì tăng số lần sai.</summary>
    public async Task Verify(VerifyResetCodeRequest request, CancellationToken ct)
    {
        await CheckCode(request.Email, request.Code, ct);
    }

    /// <summary>Bước 3: kiểm tra lại mã, đặt mật khẩu mới, dùng mã, đăng xuất mọi thiết bị.</summary>
    public async Task Reset(ResetPasswordRequest request, CancellationToken ct)
    {
        ValidateNew(request.NewPassword, request.ConfirmPassword);
        var (user, row) = await CheckCode(request.Email, request.Code, ct);
        var now = UtcNow;
        row.UsedAt = now;
        SetPassword(user, request.NewPassword, now);
        await db.SaveChangesAsync(ct);
        await SendChangedNotice(user, ct);
    }

    // ------------------------------------------------------------ đổi mật khẩu trong hồ sơ

    public async Task<User> Change(string userId, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId && u.Status == UserStatus.Active, ct)
            ?? throw new AccountException(401, "Phiên đăng nhập không còn hợp lệ.");
        if (user.PasswordHash is null || hasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
            throw new AccountException(400, "Mật khẩu hiện tại không đúng.");
        ValidateNew(request.NewPassword, request.ConfirmPassword);
        if (request.NewPassword == request.CurrentPassword)
            throw new AccountException(400, "Mật khẩu mới phải khác mật khẩu hiện tại.");
        SetPassword(user, request.NewPassword, UtcNow);
        // Mã quên mật khẩu đang chờ (nếu có) không còn dùng được.
        foreach (var old in await db.PasswordResetCodes.Where(c => c.UserId == user.Id && c.UsedAt == null).ToListAsync(ct))
            old.UsedAt = UtcNow;
        await db.SaveChangesAsync(ct);
        await SendChangedNotice(user, ct);
        return user;
    }

    // ------------------------------------------------------------ helpers

    private async Task<(User User, PasswordResetCode Row)> CheckCode(string emailAddress, string code, CancellationToken ct)
    {
        var user = await FindActive(emailAddress, ct) ?? throw new AccountException(400, InvalidCode);
        var now = UtcNow;
        var row = await db.PasswordResetCodes.Where(c => c.UserId == user.Id && c.UsedAt == null)
            .OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id).FirstOrDefaultAsync(ct);
        if (row is null || Utc(row.ExpiresAt) < now) throw new AccountException(400, InvalidCode);
        if (row.FailedAttempts >= MaxFailedAttempts)
            throw new AccountException(429, "Bạn đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.");
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(row.CodeHash), Encoding.ASCII.GetBytes(Hash(user.Id, code))))
        {
            row.FailedAttempts++;
            await db.SaveChangesAsync(ct);
            var left = MaxFailedAttempts - row.FailedAttempts;
            throw left > 0
                ? new AccountException(400, $"{InvalidCode} Bạn còn {left} lần thử.")
                : new AccountException(429, "Bạn đã nhập sai quá 5 lần. Vui lòng gửi lại mã mới.");
        }
        return (user, row);
    }

    private Task<User?> FindActive(string emailAddress, CancellationToken ct)
    {
        var normalized = emailAddress.Trim().ToLowerInvariant();
        return db.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == normalized && u.Status == UserStatus.Active, ct);
    }

    private static void ValidateNew(string password, string confirm)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length is < 8 or > 128)
            throw new AccountException(400, "Mật khẩu mới phải từ 8 đến 128 ký tự.");
        if (password != confirm) throw new AccountException(400, "Xác nhận mật khẩu không khớp.");
    }

    private void SetPassword(User user, string password, DateTime now)
    {
        user.PasswordHash = hasher.HashPassword(user, password);
        // Làm tròn tới giây để giá trị lưu DB (datetime2) và claim trong cookie luôn khớp.
        user.PasswordChangedAt = new DateTime(now.Ticks / TimeSpan.TicksPerSecond * TimeSpan.TicksPerSecond, DateTimeKind.Utc);
        user.UpdatedAt = now;
    }

    private Task SendChangedNotice(User user, CancellationToken ct) => TrySend(user.Email, "Mật khẩu TripOps của bạn vừa được thay đổi",
        Layout("Mật khẩu đã được thay đổi",
            $"<p>Xin chào {WebUtility.HtmlEncode(user.Name)},</p>" +
            $"<p>Mật khẩu tài khoản TripOps của bạn vừa được thay đổi lúc <b>{UtcNow.AddHours(7):HH:mm dd/MM/yyyy}</b> (giờ Việt Nam). " +
            "Các thiết bị khác đã được đăng xuất.</p>" +
            "<p>Nếu không phải bạn thực hiện, hãy dùng chức năng <b>Quên mật khẩu</b> ngay để lấy lại tài khoản và liên hệ TripOps.</p>"), ct);

    private async Task<bool> TrySend(string to, string subject, string html, CancellationToken ct)
    {
        if (!email.IsConfigured) return false;
        // Không để SMTP chậm/treo làm treo request.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        try { await email.Send(to, subject, html, timeout.Token); return true; }
        catch (Exception exception) when (exception is System.Net.Mail.SmtpException or InvalidOperationException or OperationCanceledException or FormatException)
        {
            logger.LogWarning(exception, "Không gửi được email \"{Subject}\".", subject);
            return false;
        }
    }

    private static string Layout(string heading, string body) =>
        "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;line-height:1.55\">" +
        "<div style=\"background:#075985;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:700\">TripOps</div>" +
        $"<div style=\"border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px\"><h2 style=\"margin:0 0 12px;font-size:18px\">{heading}</h2>{body}" +
        "<p style=\"color:#64748b;font-size:12px;margin-top:24px\">Email được gửi tự động từ TripOps, vui lòng không trả lời.</p></div></div>";

    private static string Hash(string userId, string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{userId}:{code}")));

    private static DateTime Utc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
