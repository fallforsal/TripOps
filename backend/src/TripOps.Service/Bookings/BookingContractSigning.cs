using static TripOps.Service.Bookings.BookingBilling;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Hosting;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

// Ký hợp đồng trực tuyến (task 5):
//  1. Khách (đã đăng nhập) bấm "Ký trực tuyến" → máy chủ tạo phiên ký: mã ngẫu nhiên 256 bit, chỉ lưu SHA-256,
//     dùng một lần, hết hạn 15 phút; phiên cũ của cùng hợp đồng bị hủy. Mã nằm trong QR (ký bằng điện thoại) hoặc dùng luôn trên máy tính.
//  2. Trang ký (không cần đăng nhập, chỉ cần mã phiên): xem hợp đồng PDF đúng phiên bản, vẽ chữ ký, gửi OTP về email tài khoản khách.
//  3. Xác nhận ký: đúng OTP (sai 5 lần thì khóa phiên), đúng phiên bản hiện hành → máy chủ ghép chữ ký vào PDF,
//     lưu bản cố định + SHA-256, ghi thời điểm, IP, trình duyệt. Hợp đồng chuyển "Signed" (ký web) và mở thanh toán ngay.
public sealed partial class BookingService
{
    public const string SignMethodWeb = "web";
    public const string SignMethodUpload = "upload";
    private static readonly TimeSpan SignSessionLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan OtpResendAfter = TimeSpan.FromSeconds(60);
    private const int MaxOtpSends = 5;
    private const int MaxOtpAttempts = 5;
    private const int MaxSignatureBytes = 512 * 1024;

    /// <summary>Khách bắt đầu ký trực tuyến: trả mã phiên (chỉ trả một lần, dùng cho QR hoặc ký ngay trên máy tính).</summary>
    public async Task<SignSessionStartDto> StartSignSession(string customerId, int id, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        if (booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid))
            throw new BookingException(409, "Chỉ ký hợp đồng cho đơn đã được duyệt và chưa khởi hành.");
        var now = UtcNow;
        var contract = EnsureContract(booking, now);
        EnsureWebSignable(contract);
        await Repo.SaveChangesAsync(ct); // hợp đồng mới (nếu có) cần Id trước khi gắn phiên ký

        foreach (var old in await Repo.OpenSignSessions(contract.Id, now, ct))
            old.ExpiresAt = now; // mỗi lúc chỉ một mã QR còn hiệu lực
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        var session = new ContractSignSession
        {
            ContractId = contract.Id,
            TokenHash = Sha256(token),
            ExpiresAt = now + SignSessionLifetime,
            CreatedAt = now
        };
        Repo.AddSignSession(session);
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new SignSessionStartDto(token, Utc(session.ExpiresAt)!.Value, contract.ContractNo, contract.Version);
    }

    /// <summary>Thông tin phiên ký cho trang ký (không cần đăng nhập, chỉ cần mã phiên).</summary>
    public async Task<SignSessionDto> SignSessionInfo(string token, CancellationToken ct)
    {
        var (booking, contract, session) = await LoadSignSession(token, ct);
        return SessionDto(booking, contract, session, null);
    }

    /// <summary>PDF để đọc trên trang ký: bản chưa ký khi phiên còn mở; bản đã ký sau khi hoàn tất (trong 24 giờ).</summary>
    public async Task<(byte[] Content, string FileName)> SignSessionDocument(string token, CancellationToken ct)
    {
        var (booking, contract, session) = await LoadSignSession(token, ct);
        var now = UtcNow;
        if (session.CompletedAt is { } done)
        {
            if (now - DateTime.SpecifyKind(done, DateTimeKind.Utc) > TimeSpan.FromHours(24) || contract.SignedFileName is not { } name)
                throw new BookingException(410, "Liên kết xem bản đã ký đã hết hạn. Vui lòng xem trong trang đơn đặt tour.");
            return (await File.ReadAllBytesAsync(ContractPath(booking.Id, name), ct), $"{contract.ContractNo}-da-ky.pdf");
        }
        EnsureSessionOpen(contract, session, now);
        return (ContractPdf.Generate(ContractDataOf(booking, contract)), $"{contract.ContractNo}.pdf");
    }

    /// <summary>Gửi OTP về email tài khoản khách. Development chưa cấu hình SMTP: trả OTP trên màn hình để demo.</summary>
    public async Task<SignSessionDto> SendSignOtp(string token, CancellationToken ct)
    {
        var bookingId = await Repo.BookingIdForSignToken(Sha256(token), ct) ?? throw new BookingException(404, "Mã ký không hợp lệ.");
        await using var transaction = await Repo.BeginPaymentChange(bookingId, ct);
        var (booking, contract, session) = await LoadSignSession(token, ct);
        var now = UtcNow;
        EnsureSessionOpen(contract, session, now);
        if (session.OtpSentAt is { } sent && now - DateTime.SpecifyKind(sent, DateTimeKind.Utc) < OtpResendAfter)
            throw new BookingException(429, "Vui lòng chờ 60 giây rồi gửi lại mã OTP.");
        if (session.OtpSendCount >= MaxOtpSends)
            throw new BookingException(429, "Đã gửi OTP quá số lần cho phép. Vui lòng tạo mã QR mới.");
        var email = booking.Customer?.Email;
        if (string.IsNullOrWhiteSpace(email))
            throw new BookingException(409, "Tài khoản chưa có email để nhận mã OTP.");

        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        string? developmentOtp = null;
        if (Email.IsConfigured)
        {
            try
            {
                await Email.Send(email, $"Mã OTP ký hợp đồng {contract.ContractNo}",
                    $"<p>Xin chào {System.Net.WebUtility.HtmlEncode(booking.Customer?.Name ?? booking.ContactName)},</p>" +
                    $"<p>Mã OTP để ký hợp đồng <b>{contract.ContractNo}</b> trên TripOps là: <b style=\"font-size:20px\">{otp}</b></p>" +
                    "<p>Mã có hiệu lực 5 phút. Không chia sẻ mã này cho bất kỳ ai. Nếu bạn không thực hiện ký hợp đồng, hãy bỏ qua email này.</p>", ct);
            }
            catch (Exception exception) when (exception is System.Net.Mail.SmtpException or InvalidOperationException)
            {
                throw new BookingException(502, "Không gửi được email OTP. Vui lòng thử lại sau.");
            }
        }
        else if (Env.IsDevelopment())
            developmentOtp = otp; // chỉ môi trường phát triển, chưa cấu hình SMTP
        else
            throw new BookingException(503, "Hệ thống chưa cấu hình gửi email (Smtp).");

        session.OtpHash = Sha256($"{session.Id}:{otp}");
        session.OtpExpiresAt = now + OtpLifetime;
        session.OtpSentAt = now;
        session.OtpSendCount++;
        session.OtpAttempts = 0;
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return SessionDto(booking, contract, session, developmentOtp);
    }

    /// <summary>Xác nhận ký: kiểm tra OTP, ghép chữ ký vào PDF đúng phiên bản và lưu cố định.</summary>
    public async Task<SignSessionDto> CompleteWebSign(string token, WebSignRequest request, string? ip, string? userAgent, CancellationToken ct)
    {
        if (!request.Agreed)
            throw new BookingException(422, "Vui lòng xác nhận đã đọc và đồng ý nội dung hợp đồng.");
        var png = DecodeSignature(request.SignaturePng);
        var bookingId = await Repo.BookingIdForSignToken(Sha256(token), ct) ?? throw new BookingException(404, "Mã ký không hợp lệ.");
        await using var transaction = await Repo.BeginPaymentChange(bookingId, ct);
        var (booking, contract, session) = await LoadSignSession(token, ct);
        var now = UtcNow;
        EnsureSessionOpen(contract, session, now);
        if (session.OtpHash is null || session.OtpExpiresAt is not { } otpExpires || now > DateTime.SpecifyKind(otpExpires, DateTimeKind.Utc))
            throw new BookingException(422, "Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng bấm gửi lại mã.");
        var otp = new string((request.Otp ?? "").Where(char.IsAsciiDigit).ToArray());
        if (!CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Sha256($"{session.Id}:{otp}")), Encoding.ASCII.GetBytes(session.OtpHash)))
        {
            session.OtpAttempts++;
            if (session.OtpAttempts >= MaxOtpAttempts) session.ExpiresAt = now; // khóa phiên
            await Repo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            throw new BookingException(422, session.OtpAttempts >= MaxOtpAttempts
                ? "Nhập sai OTP quá 5 lần. Phiên ký đã bị khóa, vui lòng tạo mã QR mới."
                : $"Mã OTP không đúng (còn {MaxOtpAttempts - session.OtpAttempts} lần thử).");
        }

        var signedAtVietnam = DateTime.SpecifyKind(now, DateTimeKind.Utc).Add(PaymentRules.VietnamOffset);
        var sessionRef = $"{contract.ContractNo}-S{session.Id.ToString(CultureInfo.InvariantCulture)}";
        var pdf = ContractPdf.Generate(ContractDataOf(booking, contract),
            new ContractSignature(png, signedAtVietnam, MaskEmail(booking.Customer?.Email), sessionRef));
        var name = $"v{contract.Version.ToString(CultureInfo.InvariantCulture)}-web-{Guid.NewGuid():N}.pdf";
        var path = ContractPath(booking.Id, name);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, pdf, ct);

        contract.SignedFileName = name;
        contract.SignedFileType = "application/pdf";
        contract.SignedFileSha256 = Convert.ToHexString(SHA256.HashData(pdf)).ToLowerInvariant();
        contract.SignedAt = now;
        contract.SignMethod = SignMethodWeb;
        contract.Status = ContractSigned;
        contract.ReviewedBy = null;
        contract.ReviewedAt = null;
        contract.ReviewNote = null;
        session.CompletedAt = now;
        session.OtpHash = null;
        session.SignerIp = ip is null ? null : Truncate(ip, 45);
        session.SignerUserAgent = userAgent is null ? null : Truncate(userAgent, 300);
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return SessionDto(booking, contract, session, null);
    }

    // ------------------------------------------------------------ hỗ trợ

    private async Task<(Booking Booking, BookingContract Contract, ContractSignSession Session)> LoadSignSession(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 100)
            throw new BookingException(404, "Mã ký không hợp lệ.");
        Repo.ResetTracking();
        var session = await Repo.FindSignSession(Sha256(token), ct) ?? throw new BookingException(404, "Mã ký không hợp lệ.");
        var bookingId = await Repo.BookingIdForSignToken(session.TokenHash, ct) ?? throw new BookingException(404, "Mã ký không hợp lệ.");
        var booking = await Repo.Find(bookingId, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        var contract = booking.Contracts.Single(c => c.Id == session.ContractId);
        return (booking, contract, session);
    }

    private static void EnsureWebSignable(BookingContract contract)
    {
        if (contract.Status == ContractVerified)
            throw new BookingException(409, "Hợp đồng đã được công ty lữ hành xác nhận, không cần ký lại.");
        if (contract.Status == ContractSigned && contract.SignMethod == SignMethodWeb)
            throw new BookingException(409, "Bạn đã ký trực tuyến hợp đồng này.");
    }

    private void EnsureSessionOpen(BookingContract contract, ContractSignSession session, DateTime now)
    {
        if (session.CompletedAt is not null)
            throw new BookingException(409, "Phiên ký này đã hoàn tất.");
        if (now >= DateTime.SpecifyKind(session.ExpiresAt, DateTimeKind.Utc))
            throw new BookingException(410, "Mã ký đã hết hạn hoặc đã được thay bằng mã mới. Vui lòng tạo mã QR mới trong trang đơn.");
        if (CurrentContract(contract.Booking) is not { } current || current.Id != contract.Id || current.TotalAmount != BaseTourAmount(contract.Booking))
            throw new BookingException(409, "Hợp đồng đã có phiên bản mới. Vui lòng tạo mã QR mới để ký đúng phiên bản.");
        if (contract.Booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid))
            throw new BookingException(409, "Đơn không còn ở trạng thái ký hợp đồng.");
        EnsureWebSignable(contract);
    }

    private SignSessionDto SessionDto(Booking booking, BookingContract contract, ContractSignSession session, string? developmentOtp)
    {
        var now = UtcNow;
        var status = session.CompletedAt is not null ? "completed"
            : now >= DateTime.SpecifyKind(session.ExpiresAt, DateTimeKind.Utc) || CurrentContract(booking)?.Id != contract.Id ? "expired"
            : "open";
        return new SignSessionDto(status, contract.ContractNo, contract.Version, booking.Tour?.Name ?? "Tour du lịch",
            booking.StartDate, booking.ContactName, MaskEmail(booking.Customer?.Email), contract.TotalAmount,
            Utc(session.ExpiresAt)!.Value, Utc(session.OtpSentAt), Utc(session.OtpExpiresAt), Utc(session.CompletedAt), developmentOtp);
    }

    /// <summary>Ảnh chữ ký PNG (data URL hoặc base64), tối đa 512 KB.</summary>
    private static byte[] DecodeSignature(string? value)
    {
        var data = value ?? "";
        var comma = data.IndexOf(',');
        if (data.StartsWith("data:", StringComparison.Ordinal) && comma > 0) data = data[(comma + 1)..];
        byte[] bytes;
        try { bytes = Convert.FromBase64String(data); }
        catch (FormatException) { throw new BookingException(400, "Chữ ký không hợp lệ."); }
        if (bytes.Length is < 100 or > MaxSignatureBytes || bytes[0] != 0x89 || bytes[1] != 0x50 || bytes[2] != 0x4E || bytes[3] != 0x47)
            throw new BookingException(400, "Chữ ký phải là ảnh PNG vẽ trên trang ký (tối đa 512 KB).");
        return bytes;
    }

    private static string MaskEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return "email tài khoản";
        var at = email.IndexOf('@');
        return at < 1 ? "email tài khoản" : $"{email[0]}***{email[(at - 1)..]}";
    }

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
