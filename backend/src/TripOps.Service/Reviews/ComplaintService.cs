using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Service.Reviews;

/// <summary>Booking hoàn thành của khách, kèm hạn khiếu nại. CanComplain=false nghĩa là đã quá hạn 1 ngày.</summary>
public sealed record ComplaintBookingOptionDto(int BookingId, string BookingCode, string? TourName, string? AgencyName,
    DateTime StartDate, DateTime CompletedAt, DateTime Deadline, bool CanComplain);

public sealed record ComplaintSummaryDto(int Id, string Type, string ReasonCode, string Title, string Status,
    int? BookingId, string? BookingCode, string? TourName, string? AgencyId, string? AgencyName,
    string CustomerId, string CustomerName, DateTime CreatedAt, DateTime? UpdatedAt, DateTime? ResolvedAt);

public sealed record ComplaintDto(int Id, string Type, string ReasonCode, string Title, string Description,
    IReadOnlyList<string> Evidence, string Status,
    int? BookingId, string? BookingCode, string? TourName, DateTime? StartDate, string? AgencyId, string? AgencyName,
    string CustomerId, string CustomerName, string? CustomerPhone, string? CustomerEmail,
    string? AdminNotes, DateTime CreatedAt, DateTime? UpdatedAt, DateTime? ResolvedAt);

/// <summary>Theo dõi Agency hay bị khiếu nại (chỉ Admin thấy). Upheld = khiếu nại Admin kết luận đúng (Resolved).</summary>
public sealed record AgencyComplaintStatDto(string AgencyId, string AgencyName, int Total, int Open, int Upheld, int Dismissed);

public sealed record CreateComplaintInput(string Type, int? BookingId, string ReasonCode, string Title, string Description);

public sealed record ResolveComplaintRequest(
    [Required, AllowedValues("Resolved", "Rejected")] string Outcome,
    [Required, StringLength(2000, MinimumLength = 5)] string Note);

public sealed record UploadedImage(byte[] Bytes, string Mime);

/// <summary>
/// Khiếu nại: khách gửi về CHUYẾN ĐI (gắn booking đã hoàn thành, trong 1 ngày) hoặc về NỀN TẢNG (không gắn booking, không giới hạn).
/// Admin xem khiếu nại, ghi phản hồi rồi chấp nhận (Resolved) hoặc không chấp nhận (Rejected). Không có nhắn tin qua lại trong khiếu nại:
/// cần hỏi thêm thì Admin gọi điện hoặc dùng chat. Agency không thấy khiếu nại trên hệ thống.
/// Khiếu nại chuyến đi đang chờ xử lý chặn việc tự chuyển tiền cho Agency.
/// </summary>
public sealed class ComplaintService(TripOpsDbContext db, PaymentClock clock, CloudinaryStorage storage)
{
    public const int MaxImages = 5;
    public const long MaxImageBytes = 5 * 1024 * 1024;

    public static readonly IReadOnlySet<string> TripReasons = new HashSet<string>
        { "accommodation_food", "schedule_change", "guide_attitude", "service_quality", "pricing_billing", "other" };
    public static readonly IReadOnlySet<string> PlatformReasons = new HashSet<string>
        { "payment_refund", "account", "app_error", "other" };

    private static DateTime Utc(DateTime? value) => DateTime.SpecifyKind(value ?? DateTime.UnixEpoch, DateTimeKind.Utc);
    private static DateTime? UtcOrNull(DateTime? value) => value is null ? null : DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
    private static bool IsOpen(Complaint c) => c.Status is null or ComplaintStatus.Pending or ComplaintStatus.InReview;

    // ------------------------------------------------------------ Khách

    public async Task<IReadOnlyList<ComplaintBookingOptionDto>> BookingOptions(string customerId, CancellationToken ct)
    {
        var now = clock.UtcNow;
        var bookings = await db.Bookings.AsNoTracking()
            .Include(b => b.Tour).Include(b => b.BookingAgencies).ThenInclude(a => a.Agency).ThenInclude(u => u.BusinessProfile)
            .Where(b => b.CustomerId == customerId && b.Status == BookingStatus.Completed)
            .AsSplitQuery().ToListAsync(ct);
        return bookings
            .Select(b => (Booking: b, Done: ReviewRules.CompletedAt(b)))
            .Where(x => x.Done is not null)
            .OrderByDescending(x => x.Done)
            .Select(x =>
            {
                var deadline = x.Done!.Value + ReviewRules.ComplaintWindow;
                return new ComplaintBookingOptionDto(x.Booking.Id, x.Booking.BookingCode, x.Booking.Tour?.Name, FeedbackService.AgencyName(x.Booking),
                    x.Booking.StartDate, x.Done.Value, deadline, now <= deadline);
            }).ToList();
    }

    public async Task<IReadOnlyList<ComplaintSummaryDto>> Mine(string customerId, CancellationToken ct) =>
        (await Query().Where(c => c.ComplainantId == customerId).OrderByDescending(c => c.CreatedAt).ToListAsync(ct))
        .Select(Summary).ToList();

    public async Task<ComplaintDto> MineDetail(string customerId, int id, CancellationToken ct) =>
        Detail(await Query().SingleOrDefaultAsync(c => c.Id == id && c.ComplainantId == customerId, ct)
            ?? throw new BookingException(404, "Không tìm thấy khiếu nại."));

    public async Task<ComplaintDto> Create(string customerId, CreateComplaintInput input, IReadOnlyList<UploadedImage> images, CancellationToken ct)
    {
        ValidateImages(images);
        var type = input.Type switch
        {
            ComplaintTypes.Trip or "trip" => ComplaintTypes.Trip,
            ComplaintTypes.Platform or "platform" => ComplaintTypes.Platform,
            _ => throw new BookingException(422, "Loại khiếu nại không hợp lệ.")
        };
        var reasons = type == ComplaintTypes.Trip ? TripReasons : PlatformReasons;
        if (!reasons.Contains(input.ReasonCode)) throw new BookingException(422, "Phân loại vấn đề không hợp lệ.");
        var title = (input.Title ?? "").Trim();
        var description = (input.Description ?? "").Trim();
        if (title.Length is < 5 or > 255) throw new BookingException(422, "Tiêu đề cần 5–255 ký tự.");
        if (description.Length is < 10 or > 4000) throw new BookingException(422, "Mô tả cần 10–4000 ký tự.");

        int? bookingId = null;
        string? agencyId = null;
        string? bookingCode = null;
        if (type == ComplaintTypes.Trip)
        {
            if (input.BookingId is not { } id) throw new BookingException(422, "Vui lòng chọn chuyến đi cần khiếu nại.");
            var booking = await db.Bookings.Include(b => b.BookingAgencies).Include(b => b.Tour)
                .SingleOrDefaultAsync(b => b.Id == id && b.CustomerId == customerId, ct)
                ?? throw new BookingException(404, "Không tìm thấy booking.");
            var completedAt = ReviewRules.CompletedAt(booking)
                ?? throw new BookingException(409, "Chỉ khiếu nại được chuyến đi đã hoàn thành.");
            if (clock.UtcNow > completedAt + ReviewRules.ComplaintWindow)
                throw new BookingException(409, "Đã quá hạn khiếu nại (1 ngày sau khi tour kết thúc).");
            if (await db.Complaints.AnyAsync(c => c.BookingId == id &&
                    (c.Status == null || c.Status == ComplaintStatus.Pending || c.Status == ComplaintStatus.InReview), ct))
                throw new BookingException(409, "Chuyến đi này đang có khiếu nại chưa xử lý xong. Hãy trao đổi tiếp trong khiếu nại đó.");
            bookingId = booking.Id;
            bookingCode = booking.BookingCode;
            agencyId = ReviewRules.HostAgencyId(booking);
        }

        var urls = await Upload(customerId, images, ct);
        var now = clock.UtcNow;
        var complaint = new Complaint
        {
            Type = type,
            ReasonCode = input.ReasonCode,
            BookingId = bookingId,
            ComplainantId = customerId,
            TargetId = agencyId,
            Title = title,
            Description = description,
            EvidenceUrls = urls.Count == 0 ? null : JsonSerializer.Serialize(urls),
            Status = ComplaintStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Complaints.Add(complaint);
        db.WorkflowNotifications.Add(new WorkflowNotification
        {
            UserId = customerId,
            BookingId = bookingId,
            Message = bookingCode is null
                ? "TripOps đã nhận khiếu nại của bạn về nền tảng. Admin sẽ xem xét và phản hồi trong mục Khiếu nại của tôi."
                : $"TripOps đã nhận khiếu nại của bạn về booking {bookingCode}. Admin sẽ xem xét và phản hồi trong mục Khiếu nại của tôi."
        });
        await db.SaveChangesAsync(ct);
        return await MineDetail(customerId, complaint.Id, ct);
    }

    // ------------------------------------------------------------ Admin

    public async Task<IReadOnlyList<ComplaintSummaryDto>> AdminList(string? status, string? type, CancellationToken ct)
    {
        var query = Query();
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ComplaintStatus>(status, true, out var parsed)) throw new BookingException(400, "Trạng thái lọc không hợp lệ.");
            query = query.Where(c => c.Status == parsed);
        }
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(c => c.Type == type);
        var rows = await query.ToListAsync(ct);
        return rows.OrderBy(c => IsOpen(c) ? 0 : 1).ThenByDescending(c => c.CreatedAt).Select(Summary).ToList();
    }

    public async Task<ComplaintDto> AdminDetail(int id, CancellationToken ct) =>
        Detail(await Query().SingleOrDefaultAsync(c => c.Id == id, ct) ?? throw new BookingException(404, "Không tìm thấy khiếu nại."));

    public async Task<ComplaintDto> Resolve(string adminId, int id, ResolveComplaintRequest request, CancellationToken ct)
    {
        var complaint = await db.Complaints.SingleOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy khiếu nại.");
        if (!IsOpen(complaint)) throw new BookingException(409, "Khiếu nại đã được kết luận.");
        var now = clock.UtcNow;
        complaint.Status = request.Outcome == "Resolved" ? ComplaintStatus.Resolved : ComplaintStatus.Rejected;
        complaint.AdminId = adminId;
        complaint.AdminNotes = request.Note.Trim();
        complaint.ResolvedAt = now;
        complaint.UpdatedAt = now;
        db.WorkflowNotifications.Add(new WorkflowNotification
        {
            UserId = complaint.ComplainantId,
            BookingId = complaint.BookingId,
            Message = complaint.Status == ComplaintStatus.Resolved
                ? $"Khiếu nại \"{complaint.Title}\" đã được chấp nhận. Xem phản hồi của Admin trong mục Khiếu nại của tôi."
                : $"Khiếu nại \"{complaint.Title}\" không được chấp nhận. Xem phản hồi của Admin trong mục Khiếu nại của tôi."
        });
        await db.SaveChangesAsync(ct);
        return await AdminDetail(id, ct);
    }

    public async Task<IReadOnlyList<AgencyComplaintStatDto>> AgencyStats(CancellationToken ct)
    {
        var rows = await db.Complaints.AsNoTracking()
            .Include(c => c.Target).ThenInclude(u => u!.BusinessProfile)
            .Where(c => c.Type == ComplaintTypes.Trip && c.TargetId != null)
            .ToListAsync(ct);
        return rows.GroupBy(c => c.TargetId!)
            .Select(g =>
            {
                var target = g.First().Target;
                return new AgencyComplaintStatDto(g.Key, target?.BusinessProfile?.BusinessName ?? target?.Name ?? g.Key, g.Count(),
                    g.Count(IsOpen), g.Count(c => c.Status == ComplaintStatus.Resolved), g.Count(c => c.Status == ComplaintStatus.Rejected));
            })
            .OrderByDescending(s => s.Upheld).ThenByDescending(s => s.Total).ToList();
    }

    // ------------------------------------------------------------ helpers

    private IQueryable<Complaint> Query() => db.Complaints.AsNoTracking()
        .Include(c => c.Booking).ThenInclude(b => b!.Tour)
        .Include(c => c.Target).ThenInclude(u => u!.BusinessProfile)
        .Include(c => c.Complainant)
        .AsSplitQuery();

    private static void ValidateImages(IReadOnlyList<UploadedImage> images)
    {
        if (images.Count > MaxImages) throw new BookingException(422, $"Tối đa {MaxImages} ảnh bằng chứng.");
        if (images.Any(i => i.Bytes.Length is <= 0 or > (int)MaxImageBytes)) throw new BookingException(413, "Mỗi ảnh tối đa 5 MB.");
        if (images.Any(i => !GuideCheckinPhotoRules.IsValidImage(i.Bytes, i.Mime)))
            throw new BookingException(422, "Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
    }

    // Ảnh bằng chứng lưu riêng tư theo thư mục của khách.
    private async Task<List<string>> Upload(string ownerId, IReadOnlyList<UploadedImage> images, CancellationToken ct)
    {
        var urls = new List<string>(images.Count);
        foreach (var image in images) urls.Add(await storage.UploadComplaintImage(ownerId, image.Bytes, image.Mime, ct));
        return urls;
    }

    private IReadOnlyList<string> Urls(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return (JsonSerializer.Deserialize<List<string>>(json) ?? []).Select(u => storage.DeliveryUrl(u) ?? u).ToList(); }
        catch (JsonException) { return []; }
    }

    private static string AgencyName(Complaint c) => c.Target?.BusinessProfile?.BusinessName ?? c.Target?.Name ?? "";

    private static ComplaintSummaryDto Summary(Complaint c) => new(c.Id, c.Type, c.ReasonCode, c.Title, (c.Status ?? ComplaintStatus.Pending).ToString(),
        c.BookingId, c.Booking?.BookingCode, c.Booking?.Tour?.Name, c.TargetId, c.TargetId is null ? null : AgencyName(c),
        c.ComplainantId, c.Complainant?.Name ?? "", Utc(c.CreatedAt), UtcOrNull(c.UpdatedAt), UtcOrNull(c.ResolvedAt));

    private ComplaintDto Detail(Complaint c) => new(c.Id, c.Type, c.ReasonCode, c.Title, c.Description, Urls(c.EvidenceUrls),
        (c.Status ?? ComplaintStatus.Pending).ToString(),
        c.BookingId, c.Booking?.BookingCode, c.Booking?.Tour?.Name, c.Booking is null ? null : DateTime.SpecifyKind(c.Booking.StartDate, DateTimeKind.Utc),
        c.TargetId, c.TargetId is null ? null : AgencyName(c),
        c.ComplainantId, c.Complainant?.Name ?? "", c.Complainant?.Phone, c.Complainant?.Email,
        c.AdminNotes, Utc(c.CreatedAt), UtcOrNull(c.UpdatedAt), UtcOrNull(c.ResolvedAt));
}
