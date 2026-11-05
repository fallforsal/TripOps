using System.Globalization;
using System.Security.Cryptography;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Payments;

namespace TripOps.Service.Bookings;

// Hợp đồng lữ hành (task 3):
//  - Khi Agency duyệt, hệ thống lập hợp đồng phiên bản 1 với giá cuối cùng (bảng booking_contracts).
//  - Khách tải PDF, ký tay hoặc chèn chữ ký, rồi tải bản đã ký lên (PDF/PNG/JPG ≤ 10 MB). Ký xong mới mở thanh toán đợt đầu.
//  - Agency xem bản ký: "Hợp lệ" hoặc "Yêu cầu ký lại" (có lý do). Khách không phải chờ bước này mới trả cọc.
//  - Giá đổi sau khi duyệt: tự tạo phiên bản mới, bản cũ Superseded, khách ký lại (chỉ chặn khi chưa trả đồng nào).
//  - File lưu ở App_Data/contracts/{bookingId}/ (không công khai), kèm SHA-256 để chứng minh file không bị sửa.
public sealed partial class BookingService
{
    public const string ContractAwaiting = "AwaitingSignature";
    public const string ContractSigned = "Signed";
    public const string ContractVerified = "Verified";
    public const string ContractResign = "ResignRequested";
    public const string ContractSuperseded = "Superseded";
    private const long MaxSignedFileBytes = 10 * 1024 * 1024;

    /// <summary>Hợp đồng hiệu lực (phiên bản mới nhất chưa bị thay).</summary>
    private static BookingContract? CurrentContract(Booking booking) => booking.Contracts
        .Where(c => c.Status != ContractSuperseded).OrderByDescending(c => c.Version).FirstOrDefault();

    private static bool Approved(Booking booking) =>
        booking.Status is BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress or BookingStatus.Completed;

    /// <summary>Bảo đảm có hợp đồng đúng giá hiện tại (gọi trong giao dịch). Trả về hợp đồng hiệu lực.</summary>
    private static BookingContract EnsureContract(Booking booking, DateTime now)
    {
        var current = CurrentContract(booking);
        if (current is not null && current.TotalAmount == booking.TotalAmount) return current;
        if (current is not null) current.Status = ContractSuperseded;
        var version = booking.Contracts.Select(c => c.Version).DefaultIfEmpty(0).Max() + 1;
        var contract = new BookingContract
        {
            Version = version,
            ContractNo = $"HD-{booking.BookingCode}-{version.ToString(CultureInfo.InvariantCulture)}",
            TotalAmount = booking.TotalAmount,
            Status = ContractAwaiting,
            CreatedAt = now
        };
        booking.Contracts.Add(contract);
        return contract;
    }

    /// <summary>Chặn thanh toán đầu tiên khi khách chưa ký hợp đồng đúng giá (đơn đã có tiền từ trước thì không chặn).</summary>
    /// <summary>
    /// Chặn thanh toán đầu tiên cho tới khi hợp đồng đúng giá được ký hợp lệ:
    /// ký trực tuyến (có OTP) thì mở ngay; bản tự tải lên thì phải chờ Agency xác nhận (không tự nhận biết được đã ký thật chưa).
    /// </summary>
    private static bool ContractBlocksPayment(Booking booking)
    {
        if (PaidAmount(booking) > 0) return false;
        var current = CurrentContract(booking);
        if (current is null || current.TotalAmount != booking.TotalAmount) return true;
        return !(current.Status == ContractVerified || (current.Status == ContractSigned && current.SignMethod == SignMethodWeb));
    }

    private static ContractDto? ContractOf(Booking booking)
    {
        var c = CurrentContract(booking);
        // Đơn duyệt trước khi có tính năng hợp đồng: vẫn hiện "chờ ký"; khách tải PDF thì hệ thống lập bù phiên bản 1.
        if (c is null)
            return Approved(booking) && ContractBlocksPayment(booking)
                ? new ContractDto(0, 1, $"HD-{booking.BookingCode}-1", booking.TotalAmount, ContractAwaiting,
                    null, null, null, null, null, null, true)
                : null;
        return new ContractDto(c.Id, c.Version, c.ContractNo, c.TotalAmount, c.Status,
            Utc(c.SignedAt), c.SignedFileType, c.SignMethod, c.ReviewNote, Utc(c.ReviewedAt), Utc(c.CreatedAt),
            ContractBlocksPayment(booking) && Approved(booking));
    }

    // ------------------------------------------------------------ tải hợp đồng

    /// <summary>PDF hợp đồng hiện hành (khách chủ đơn, Agency chủ tour, Admin).</summary>
    public async Task<(byte[] Content, string FileName)> ContractPdfFile(string actorId, int id, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        await EnsureContractAccess(actorId, booking, ct);
        if (!Approved(booking))
            throw new BookingException(409, "Hợp đồng được lập sau khi công ty lữ hành duyệt đơn.");
        var contract = EnsureContract(booking, UtcNow); // đơn duyệt trước khi có tính năng hợp đồng: lập bù
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return (ContractPdf.Generate(ContractDataOf(booking, contract)), $"{contract.ContractNo}.pdf");
    }

    /// <summary>Bản hợp đồng khách đã ký.</summary>
    public async Task<(byte[] Content, string ContentType, string FileName)> SignedContractFile(string actorId, int id, CancellationToken ct)
    {
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        await EnsureContractAccess(actorId, booking, ct);
        var contract = CurrentContract(booking);
        if (contract?.SignedFileName is not { } name)
            throw new BookingException(404, "Khách chưa tải bản hợp đồng đã ký.");
        var path = ContractPath(booking.Id, name);
        if (!File.Exists(path)) throw new BookingException(404, "Không tìm thấy file hợp đồng đã ký trên máy chủ.");
        var bytes = await File.ReadAllBytesAsync(path, ct);
        return (bytes, contract.SignedFileType ?? "application/octet-stream", $"{contract.ContractNo}-da-ky{Path.GetExtension(name)}");
    }

    // ------------------------------------------------------------ khách ký

    /// <summary>Khách tải bản hợp đồng đã ký (PDF, PNG hoặc JPG). Ký xong mới thanh toán được đợt đầu.</summary>
    public async Task<BookingDto> UploadSignedContract(string customerId, int id, byte[] content, CancellationToken ct)
    {
        if (content.Length == 0 || content.Length > MaxSignedFileBytes)
            throw new BookingException(400, "File hợp đồng đã ký phải là PDF, PNG hoặc JPG, tối đa 10 MB.");
        var (type, extension) = DetectSignedFile(content)
            ?? throw new BookingException(400, "Chỉ nhận file PDF, PNG hoặc JPG.");

        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.CustomerId != customerId)
            throw new BookingException(403, "Bạn không phải người tạo đơn đặt này.");
        if (booking.Status is not (BookingStatus.Confirmed or BookingStatus.Paid))
            throw new BookingException(409, "Chỉ ký hợp đồng cho đơn đã được duyệt và chưa khởi hành.");
        var now = UtcNow;
        var contract = EnsureContract(booking, now);
        EnsureWebSignable(contract); // đã xác nhận hoặc đã ký trực tuyến thì không thay bằng bản tải lên

        var name = $"v{contract.Version.ToString(CultureInfo.InvariantCulture)}-{Guid.NewGuid():N}{extension}";
        var path = ContractPath(booking.Id, name);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await File.WriteAllBytesAsync(path, content, ct);

        contract.SignedFileName = name;
        contract.SignedFileType = type;
        contract.SignedFileSha256 = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant();
        contract.SignedAt = now;
        contract.SignMethod = SignMethodUpload;
        contract.Status = ContractSigned;
        contract.ReviewedBy = null;
        contract.ReviewedAt = null;
        contract.ReviewNote = null;
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // ------------------------------------------------------------ Agency kiểm tra

    public async Task<BookingDto> ReviewContract(string agencyId, int id, ContractReviewRequest request, CancellationToken ct)
    {
        await using var transaction = await Repo.BeginPaymentChange(id, ct);
        Repo.ResetTracking();
        var booking = await Repo.Find(id, ct) ?? throw new BookingException(404, "Không tìm thấy đơn đặt tour.");
        if (booking.Tour?.AgencyId != agencyId)
            throw new BookingException(403, "Chỉ Agency sở hữu tour mới kiểm tra hợp đồng của đơn này.");
        var contract = CurrentContract(booking);
        if (contract?.Status != ContractSigned)
            throw new BookingException(409, "Chỉ kiểm tra được hợp đồng khách vừa tải bản đã ký lên.");
        var note = request.Note?.Trim();
        if (request.Decision == "resign" && string.IsNullOrWhiteSpace(note))
            throw new BookingException(422, "Vui lòng ghi lý do yêu cầu khách ký lại.");
        contract.Status = request.Decision == "verify" ? ContractVerified : ContractResign;
        contract.ReviewedBy = agencyId;
        contract.ReviewedAt = UtcNow;
        contract.ReviewNote = string.IsNullOrWhiteSpace(note) ? null : note;
        await Repo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(booking, booking.Tour?.Name, booking.Tour?.AgencyId, booking.Tour?.Agency?.Name);
    }

    // ------------------------------------------------------------ hỗ trợ

    private async Task EnsureContractAccess(string actorId, Booking booking, CancellationToken ct)
    {
        if (booking.CustomerId == actorId || booking.Tour?.AgencyId == actorId) return;
        var user = await Accounts.Current(actorId, ct);
        if (user.Role != UserRole.Admin)
            throw new BookingException(403, "Bạn không có quyền xem hợp đồng của đơn này.");
    }

    private string ContractPath(int bookingId, string name) =>
        Path.Combine(Env.ContentRootPath, "App_Data", "contracts", bookingId.ToString(CultureInfo.InvariantCulture), Path.GetFileName(name));

    /// <summary>Nhận diện file theo chữ ký đầu file (không tin đuôi file hay Content-Type trình duyệt gửi).</summary>
    private static (string Type, string Extension)? DetectSignedFile(byte[] content)
    {
        if (content.Length >= 5 && content[0] == 0x25 && content[1] == 0x50 && content[2] == 0x44 && content[3] == 0x46 && content[4] == 0x2D)
            return ("application/pdf", ".pdf");
        if (content.Length >= 8 && content[0] == 0x89 && content[1] == 0x50 && content[2] == 0x4E && content[3] == 0x47)
            return ("image/png", ".png");
        if (content.Length >= 3 && content[0] == 0xFF && content[1] == 0xD8 && content[2] == 0xFF)
            return ("image/jpeg", ".jpg");
        return null;
    }

    private ContractData ContractDataOf(Booking booking, BookingContract contract)
    {
        var agency = booking.Tour?.Agency;
        var profile = agency?.BusinessProfile;
        var schedule = Schedule(booking)
            .Select(s => (Stage: s.Stage switch { "balance" => "Đợt 2 – phần còn lại", "full" => "Thanh toán toàn bộ (tour sát ngày)", _ => "Đợt 1 – đặt cọc" },
                s.Amount,
                Deadline: s.DueAt is { } due ? VietnamText(due) : s.DueDate is { } date ? "hết ngày " + date.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture) : "theo thông báo"))
            .ToList();
        return new ContractData(
            contract.ContractNo, contract.Version,
            DateTime.SpecifyKind(contract.CreatedAt ?? UtcNow, DateTimeKind.Utc).Add(PaymentRules.VietnamOffset),
            profile?.BusinessName ?? agency?.Name ?? "Công ty lữ hành", profile?.TaxCode, profile?.BusinessAddress, agency?.Email, agency?.Phone,
            booking.ContactName, booking.ContactPhone, booking.ContactEmail,
            booking.BookingCode, booking.Tour?.Name ?? "Tour du lịch", booking.StartDate, EndDate(booking), TotalGuests(booking),
            booking.Participants.Where(p => p.Status != "INACTIVE").OrderBy(p => p.ParticipantIndex)
                .Select(p => (p.FullName, p.TierName, (decimal?)p.Price)).ToList(),
            booking.Timelines.OrderBy(t => t.DayNumber).Select(t => (t.DayNumber, t.Title)).ToList(),
            booking.Accommodations.Select(h => (h.Destination, h.CustomizedHotelName ?? h.OriginalHotelName, h.NightsCount)).ToList(),
            contract.TotalAmount, schedule);
    }
}
