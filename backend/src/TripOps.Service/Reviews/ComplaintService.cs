using Microsoft.Extensions.Logging;
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

/// <summary>Theo dõi Agency hay bị khiếu nại (chỉ Admin thấy). Upheld = số khiếu nại đã giải quyết; Dismissed luôn 0 (không còn từ chối).</summary>
public sealed record AgencyComplaintStatDto(string AgencyId, string AgencyName, int Total, int Open, int Upheld, int Dismissed);

public sealed record CreateComplaintInput(string Type, int? BookingId, string ReasonCode, string Title, string Description);

/// <param name="Outcome">Chỉ còn "Resolved" (bỏ trống cũng được). Khiếu nại không có trạng thái từ chối.</param>
/// <param name="Note">Cách Admin đã giải quyết; gửi cho khách (và Agency nếu khiếu nại gắn booking).</param>
public sealed record ResolveComplaintRequest(
    [AllowedValues(null, "Resolved")] string? Outcome,
    [Required, StringLength(2000, MinimumLength = 5)] string Note);

public sealed record UploadedImage(byte[] Bytes, string Mime);

/// <summary>
/// Khiếu nại: khách gửi về CHUYẾN ĐI (gắn booking đã hoàn thành, trong 1 ngày) hoặc về NỀN TẢNG (không gắn booking, không giới hạn).
/// Chỉ có 2 trạng thái: Đang xử lý (Pending) và Đã giải quyết (Resolved); không từ chối. Admin trao đổi với khách / Agency qua chat
/// (thẻ khiếu nại gắn trong khung chat), xong thì đánh dấu đã giải quyết: hệ thống gửi tin nhắn + thông báo cho khách và Agency.
/// Agency xem được khiếu nại về booking của mình (không thấy khiếu nại về nền tảng). Khiếu nại không ảnh hưởng việc chuyển tiền quyết toán.
/// Dữ liệu cũ Rejected / InReview được hiển thị là Resolved / Pending.
/// </summary>
public sealed class ComplaintService(TripOpsDbContext db, PaymentClock clock, CloudinaryStorage storage, Chat.ChatService chat,
    ILogger<ComplaintService> logger)
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
    /// <summary>Trạng thái hiển thị: chỉ Pending hoặc Resolved.</summary>
    private static string StatusOf(Complaint c) => IsOpen(c) ? nameof(ComplaintStatus.Pending) : nameof(ComplaintStatus.Resolved);

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
            query = parsed is ComplaintStatus.Pending or ComplaintStatus.InReview
                ? query.Where(c => c.Status == null || c.Status == ComplaintStatus.Pending || c.Status == ComplaintStatus.InReview)
                : query.Where(c => c.Status == ComplaintStatus.Resolved || c.Status == ComplaintStatus.Rejected);
        }
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(c => c.Type == type);
        var rows = await query.ToListAsync(ct);
        return rows.OrderBy(c => IsOpen(c) ? 0 : 1).ThenByDescending(c => c.CreatedAt).Select(Summary).ToList();
    }

    public async Task<ComplaintDto> AdminDetail(int id, CancellationToken ct) =>
        Detail(await Query().SingleOrDefaultAsync(c => c.Id == id, ct) ?? throw new BookingException(404, "Không tìm thấy khiếu nại."));

    /// <summary>Admin đánh dấu khiếu nại đã giải quyết; gửi tin nhắn (kèm thẻ khiếu nại) và thông báo cho khách và Agency liên quan.</summary>
    public async Task<ComplaintDto> Resolve(string adminId, int id, ResolveComplaintRequest request, CancellationToken ct)
    {
        var complaint = await db.Complaints.Include(c => c.Booking).ThenInclude(b => b!.BookingAgencies)
            .Include(c => c.Booking).ThenInclude(b => b!.Tour)
            .SingleOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy khiếu nại.");
        if (!IsOpen(complaint)) throw new BookingException(409, "Khiếu nại đã được giải quyết.");
        var now = clock.UtcNow;
        var note = request.Note.Trim();
        complaint.Status = ComplaintStatus.Resolved;
        complaint.AdminId = adminId;
        complaint.AdminNotes = note;
        complaint.ResolvedAt = now;
        complaint.UpdatedAt = now;

        var kind = ReasonName(complaint);
        var message = $"Khiếu nại #{complaint.Id} ({kind}) đã được giải quyết. {note}";
        var agencies = AgenciesOf(complaint);
        db.WorkflowNotifications.Add(new WorkflowNotification
        {
            UserId = complaint.ComplainantId,
            BookingId = complaint.BookingId,
            Message = $"Khiếu nại #{complaint.Id} \"{complaint.Title}\" đã được giải quyết. Xem chi tiết trong mục Khiếu nại của tôi."
        });
        foreach (var agency in agencies)
            db.WorkflowNotifications.Add(new WorkflowNotification
            {
                UserId = agency,
                BookingId = complaint.BookingId,
                Message = $"Khiếu nại #{complaint.Id} về booking {complaint.Booking?.BookingCode} đã được Admin giải quyết. Xem trong mục Khiếu nại."
            });
        await db.SaveChangesAsync(ct);

        // Tin nhắn trong khung chat Admin–khách và Admin–Agency. Lỗi chat không làm hỏng việc đã lưu kết quả.
        foreach (var recipient in agencies.Prepend(complaint.ComplainantId).Distinct())
        {
            try
            {
                var conversation = await chat.Create(adminId, recipient, ct);
                await chat.Send(adminId, conversation, message.Length <= 2000 ? message : message[..2000],
                    ResolvedMessageKey(complaint.Id, recipient), ct, new Chat.ChatContextInput("complaint", complaint.Id));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning("Không gửi được tin nhắn giải quyết khiếu nại #{Id} cho {User}: {Message}", complaint.Id, recipient, ex.Message);
            }
        }
        return await AdminDetail(id, ct);
    }

    // ------------------------------------------------------------ Agency

    /// <summary>Khiếu nại khách gửi về booking của Agency (chủ trì hoặc đồng tổ chức). Khiếu nại về nền tảng không hiện.</summary>
    public async Task<IReadOnlyList<ComplaintSummaryDto>> AgencyList(string agencyId, CancellationToken ct) =>
        (await ForAgency(agencyId).OrderByDescending(c => c.CreatedAt).ToListAsync(ct))
        .OrderBy(c => IsOpen(c) ? 0 : 1).ThenByDescending(c => c.CreatedAt).Select(Summary).ToList();

    public async Task<ComplaintDto> AgencyDetail(string agencyId, int id, CancellationToken ct) =>
        Detail(await ForAgency(agencyId).SingleOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BookingException(404, "Không tìm thấy khiếu nại."));

    private IQueryable<Complaint> ForAgency(string agencyId) => Query().Where(c => c.Type == ComplaintTypes.Trip && c.BookingId != null &&
        (c.TargetId == agencyId || c.Booking!.Tour!.AgencyId == agencyId || c.Booking.BookingAgencies.Any(a => a.AgencyId == agencyId)));

    private static List<string> AgenciesOf(Complaint c) =>
        c.Type != ComplaintTypes.Trip || c.Booking is null ? [] :
        new[] { c.TargetId, c.Booking.Tour?.AgencyId }.Concat(c.Booking.BookingAgencies.Select(a => a.AgencyId))
            .OfType<string>().Where(a => a.Length > 0).Distinct().ToList();

    private static string ReasonName(Complaint c) => c.ReasonCode switch
    {
        "accommodation_food" => "Khách sạn / bữa ăn không đúng cam kết",
        "schedule_change" => "Thay đổi lịch trình / xe đón trễ",
        "guide_attitude" => "Thái độ hoặc chất lượng hướng dẫn viên",
        "service_quality" => "Chất lượng dịch vụ tham quan",
        "pricing_billing" => "Chi phí / yêu cầu thanh toán không hợp lệ",
        "payment_refund" => "Thanh toán / hoàn tiền bị lỗi",
        "account" => "Tài khoản",
        "app_error" => "Lỗi website / ứng dụng",
        _ => "Vấn đề khác",
    };

    /// <summary>Khóa idempotency cố định cho tin nhắn "đã giải quyết" (bấm lặp không gửi hai lần).</summary>
    private static Guid ResolvedMessageKey(int complaintId, string recipient)
    {
        var hash = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes($"complaint-resolved:{complaintId}:{recipient}"));
        return new Guid(hash);
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
                    g.Count(IsOpen), g.Count(c => !IsOpen(c)), 0);
            })
            .OrderByDescending(s => s.Upheld).ThenByDescending(s => s.Total).ToList();
    }

    // ------------------------------------------------------------ helpers

    private IQueryable<Complaint> Query() => db.Complaints.AsNoTracking()
        .Include(c => c.Booking).ThenInclude(b => b!.Tour)
        .Include(c => c.Booking).ThenInclude(b => b!.BookingAgencies)
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

    private static ComplaintSummaryDto Summary(Complaint c) => new(c.Id, c.Type, c.ReasonCode, c.Title, StatusOf(c),
        c.BookingId, c.Booking?.BookingCode, c.Booking?.Tour?.Name, c.TargetId, c.TargetId is null ? null : AgencyName(c),
        c.ComplainantId, c.Complainant?.Name ?? "", Utc(c.CreatedAt), UtcOrNull(c.UpdatedAt), UtcOrNull(c.ResolvedAt));

    private ComplaintDto Detail(Complaint c) => new(c.Id, c.Type, c.ReasonCode, c.Title, c.Description, Urls(c.EvidenceUrls),
        StatusOf(c),
        c.BookingId, c.Booking?.BookingCode, c.Booking?.Tour?.Name, c.Booking is null ? null : DateTime.SpecifyKind(c.Booking.StartDate, DateTimeKind.Utc),
        c.TargetId, c.TargetId is null ? null : AgencyName(c),
        c.ComplainantId, c.Complainant?.Name ?? "", c.Complainant?.Phone, c.Complainant?.Email,
        c.AdminNotes, Utc(c.CreatedAt), UtcOrNull(c.UpdatedAt), UtcOrNull(c.ResolvedAt));
}
