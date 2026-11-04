using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TripOps.Service.Notifications;

/// <summary>
/// Cấu hình SMTP gửi email (OTP ký hợp đồng...). Mật khẩu đặt bằng user-secrets (Smtp:Password), không ghi vào Git.
/// Ví dụ Gmail: Host smtp.gmail.com, Port 587, EnableSsl true, mật khẩu ứng dụng (App Password).
/// </summary>
public sealed class SmtpOptions
{
    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public bool EnableSsl { get; init; } = true;
    public string UserName { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromAddress { get; init; } = string.Empty;
    public string FromName { get; init; } = "TripOps";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);

    public static SmtpOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("Smtp");
        return new SmtpOptions
        {
            Host = section["Host"]?.Trim() ?? string.Empty,
            Port = section.GetValue<int?>("Port") ?? 587,
            EnableSsl = section.GetValue<bool?>("EnableSsl") ?? true,
            UserName = section["UserName"]?.Trim() ?? string.Empty,
            Password = section["Password"] ?? string.Empty,
            FromAddress = section["FromAddress"]?.Trim() ?? string.Empty,
            FromName = string.IsNullOrWhiteSpace(section["FromName"]) ? "TripOps" : section["FromName"]!.Trim()
        };
    }
}

/// <summary>Gửi email qua SMTP. Lớp ảo để test thay bằng bản giả.</summary>
public class EmailSender(SmtpOptions options, ILogger<EmailSender> logger)
{
    public virtual bool IsConfigured => options.IsConfigured;

    public virtual async Task Send(string to, string subject, string htmlBody, CancellationToken ct)
    {
        if (!options.IsConfigured) throw new InvalidOperationException("Chưa cấu hình SMTP.");
        using var message = new MailMessage
        {
            From = new MailAddress(options.FromAddress, options.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true
        };
        message.To.Add(to);
        using var client = new SmtpClient(options.Host, options.Port) { EnableSsl = options.EnableSsl };
        if (!string.IsNullOrEmpty(options.UserName))
            client.Credentials = new NetworkCredential(options.UserName, options.Password);
        try
        {
            await client.SendMailAsync(message, ct);
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException)
        {
            logger.LogWarning(exception, "Sending email failed");
            throw;
        }
    }
}
