using System.Data;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Service.Guides;

public sealed class AgencyGuideService(TripOpsDbContext db, CloudinaryStorage images)
{
    private static readonly PasswordHasher<User> Hasher = new();
    private static string[] Tags(string[]? values, bool required = false)
    {
        if (values is { Length: > 30 } || values?.Any(v => v is null || v.Trim().Length is 0 or > 100) == true)
            throw new AccountException(400, "Mỗi danh sách tối đa 30 mục, mỗi mục từ 1 đến 100 ký tự.");
        var tags = (values ?? []).Select(v => v.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (required && tags.Length == 0) throw new AccountException(400, "Chọn ít nhất một ngôn ngữ hướng dẫn.");
        return tags;
    }
    private static string[] Parse(string? json) => json is null ? [] : JsonSerializer.Deserialize<string[]>(json) ?? [];
    private async Task<User> Agency(string id, CancellationToken ct) => await db.Users.Include(u => u.BusinessProfile)
        .SingleOrDefaultAsync(u => u.Id == id && u.Role == UserRole.TravelAgency && u.Status == UserStatus.Active, ct)
        ?? throw new AccountException(403, "Agency không hoạt động hoặc không có quyền quản lý HDV.");
    private async Task<User> Owned(string agencyId, string id, CancellationToken ct) => await db.Users.Include(u => u.GuideProfile)
        .SingleOrDefaultAsync(u => u.Id == id && u.Role == UserRole.TourGuide && u.AgencyId == agencyId, ct)
        ?? throw new AccountException(404, "Không tìm thấy HDV thuộc Agency của bạn.");
    private async Task Validate(GuideProfileRequest p, string? id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(p.Name) || p.Name.Trim().Length < 3 || p.Name.Trim().Length > 150)
            throw new AccountException(400, "Họ tên phải từ 3 đến 150 ký tự.");
        if (!Regex.IsMatch(p.Phone.Trim(), @"^(0|\+84)(3|5|7|8|9)\d{8}$"))
            throw new AccountException(400, "Số điện thoại không hợp lệ.");
        if (p.ExperienceYears is < 0 or > 50) throw new AccountException(400, "Kinh nghiệm phải từ 0 đến 50 năm.");
        Tags(p.Languages, true); Tags(p.Routes); Tags(p.Specialties);
        var email = p.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Id != id && u.Email.ToLower() == email, ct))
            throw new AccountException(409, "Email đã được sử dụng bởi một tài khoản khác.");
    }
    private async Task Apply(User user, GuideProfileRequest p, CancellationToken ct)
    {
        // Only a selected file or the unchanged existing URL may be submitted.
        var avatar = string.IsNullOrEmpty(p.Avatar) ? null : p.Avatar;
        if (avatar is not null && avatar != user.Avatar)
        {
            var match = Regex.Match(avatar, @"^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$");
            if (!match.Success || avatar.Length > 2_800_000) throw new AccountException(400, "Ảnh chân dung phải là PNG, JPG hoặc WEBP, tối đa 2 MB.");
            byte[] bytes;
            try { bytes = Convert.FromBase64String(match.Groups[2].Value); }
            catch (FormatException) { throw new AccountException(400, "Ảnh chân dung không hợp lệ."); }
            avatar = await images.UploadGuideImage(user.Id, bytes, match.Groups[1].Value, ct);
            if (avatar.Length > 500) throw new AccountException(502, "Đường dẫn ảnh vượt giới hạn lưu trữ.");
        }
        user.Name = p.Name.Trim(); user.Email = p.Email.Trim().ToLowerInvariant(); user.Phone = p.Phone.Trim(); user.Avatar = avatar;
        var profile = user.GuideProfile ?? new GuideProfile { UserId = user.Id };
        if (user.GuideProfile is null) user.GuideProfile = profile;
        profile.ExperienceYears = (short)p.ExperienceYears;
        profile.Languages = JsonSerializer.Serialize(Tags(p.Languages, true));
        profile.Routes = JsonSerializer.Serialize(Tags(p.Routes));
        profile.Specialties = JsonSerializer.Serialize(Tags(p.Specialties)); profile.Bio = p.Bio?.Trim();
    }
    private static bool Duplicate(DbUpdateException e) => e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 }
        || e.InnerException?.Message.Contains("UNIQUE constraint", StringComparison.OrdinalIgnoreCase) == true;
    private async Task Save(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (Duplicate(e)) { throw new AccountException(409, "Email đã được sử dụng. Vui lòng tải lại và thử email khác."); }
    }
    public async Task<AgencyGuideDto> Create(string agencyId, CreateGuideRequest request, CancellationToken ct)
    {
        await Agency(agencyId, ct);
        await Validate(request.Profile, null, ct);
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length is < 8 or > 16)
            throw new AccountException(400, "Mật khẩu phải từ 8 đến 16 ký tự và không chỉ gồm khoảng trắng.");
        var user = new User { Id = Guid.NewGuid().ToString(), Role = UserRole.TourGuide, AgencyId = agencyId, Status = UserStatus.Active };
        await Apply(user, request.Profile, ct);
        user.PasswordHash = Hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        // One SaveChanges transaction creates the account and its profile together.
        await Save(ct);
        return (await Detail(agencyId, user.Id, ct)).Guide;
    }
    public async Task<AgencyGuideDto> Update(string agencyId, string id, GuideProfileRequest request, CancellationToken ct)
    {
        await Agency(agencyId, ct);
        var guide = await Owned(agencyId, id, ct);
        await Validate(request, id, ct);
        await Apply(guide, request, ct);
        await Save(ct);
        return (await Detail(agencyId, id, ct)).Guide;
    }
    public async Task<GuidePage> List(string agencyId, string? search, string? mobileAccountStatus, string? workStatus, int page, int pageSize, CancellationToken ct)
    {
        var agency = await Agency(agencyId, ct);
        if (mobileAccountStatus is not (null or "all" or "active" or "suspended") || workStatus is not (null or "all" or "available" or "on_tour" or "unavailable"))
            throw new AccountException(400, "Bộ lọc trạng thái HDV không hợp lệ.");
        if (search?.Length > 200) throw new AccountException(400, "Từ khóa tìm kiếm tối đa 200 ký tự.");
        var guides = await db.Users.AsNoTracking().Include(u => u.GuideProfile)
            .Where(u => u.AgencyId == agencyId && u.Role == UserRole.TourGuide).OrderBy(u => u.Name).ThenBy(u => u.Id).ToListAsync(ct);
        var assignments = await LoadAssignments(agencyId, guides.Select(g => g.Id).ToArray(), ct);
        var all = guides.Select(g => Dto(g, agency, assignments.GetValueOrDefault(g.Id) ?? [])).ToList();
        var summary = new GuideSummary(all.Count, all.Count(g => g.WorkStatus == "available"), all.Count(g => g.WorkStatus == "on_tour"), all.Count(g => g.MobileAccountStatus == "suspended"));
        IEnumerable<AgencyGuideDto> filtered = all;
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim(); filtered = filtered.Where(g => g.Name.Contains(term, StringComparison.OrdinalIgnoreCase) || g.Email.Contains(term, StringComparison.OrdinalIgnoreCase) || (g.Phone?.Contains(term) ?? false)); }
        if (mobileAccountStatus is not (null or "all")) filtered = filtered.Where(g => g.MobileAccountStatus == mobileAccountStatus);
        if (workStatus is not (null or "all")) filtered = filtered.Where(g => g.WorkStatus == workStatus);
        var rows = filtered.ToList(); page = Math.Max(1, page); pageSize = Math.Clamp(pageSize, 1, 100);
        return new(rows.Skip((page - 1) * pageSize).Take(pageSize).ToList(), rows.Count, page, pageSize, summary);
    }
    public async Task<GuideDetailDto> Detail(string agencyId, string id, CancellationToken ct)
    {
        var agency = await Agency(agencyId, ct);
        var user = await Owned(agencyId, id, ct);
        var map = await LoadAssignments(agencyId, [id], ct);
        var dto = Dto(user, agency, map.GetValueOrDefault(id) ?? []);
        var reasons = user.Status == UserStatus.Active ? Array.Empty<string>() : ["Tài khoản HDV đang bị khóa."];
        return new(dto, dto.Assignments, new(reasons.Length == 0, reasons, reasons.FirstOrDefault()));
    }
    public async Task<GuideAssignmentsPage> Assignments(string agencyId, string id, string? status, CancellationToken ct)
    {
        if (status is not (null or "all" or "in_progress" or "upcoming" or "completed" or "cancelled")) throw new AccountException(400, "Trạng thái lịch phân công không hợp lệ.");
        var detail = await Detail(agencyId, id, ct);
        return new(id, detail.Assignments.Where(a => status is null or "all" || a.Status == status).ToList());
    }
    public async Task<GuideAccountStatusResponse> ChangeStatus(string agencyId, string id, GuideAccountStatusRequest request, CancellationToken ct)
    {
        await Agency(agencyId, ct);
        if (request.Action is not ("suspend" or "reactivate")) throw new AccountException(400, "Thao tác phải là suspend hoặc reactivate.");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Serialize workforce changes against assignment and deletion of this guide.
        await db.Users.Where(u => u.Id == id && u.AgencyId == agencyId && u.Role == UserRole.TourGuide)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.UpdatedAt, u => u.UpdatedAt), ct);
        var guide = await Owned(agencyId, id, ct);
        if (guide.Status == UserStatus.Banned) throw new AccountException(409, "Tài khoản bị Admin cấm; Agency không thể mở khóa hoặc thay đổi trạng thái.");
        var assignments = (await LoadAssignments(agencyId, [id], ct)).GetValueOrDefault(id) ?? [];
        var affected = assignments.Count(a => a.Status is "upcoming" or "in_progress");
        if (request.Action == "suspend" && affected > 0 && !request.ConfirmWithUpcomingTours)
            throw new AccountException(409, "HDV còn lịch đang dẫn hoặc sắp khởi hành. Cần xác nhận trước khi khóa tài khoản.");
        var profile = guide.GuideProfile ?? new GuideProfile { UserId = id };
        guide.GuideProfile = profile;
        guide.Status = request.Action == "suspend" ? UserStatus.Inactive : UserStatus.Active;
        profile.SuspendedAt = request.Action == "suspend" ? DateTime.UtcNow : null;
        profile.SuspendedReason = request.Action == "suspend" ? request.Reason?.Trim() : null;
        await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct);
        return new((await Detail(agencyId, id, ct)).Guide, affected);
    }
    public async Task Delete(string agencyId, string id, CancellationToken ct)
    {
        await Agency(agencyId, ct);
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Users.Where(u => u.Id == id && u.AgencyId == agencyId && u.Role == UserRole.TourGuide)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.UpdatedAt, u => u.UpdatedAt), ct);
        var guide = await Owned(agencyId, id, ct);
        if (await db.BookingAssignedGuides.AnyAsync(g => g.GuideId == id, ct)
            || await db.BookingIncidents.AnyAsync(g => g.ReportedBy == id, ct)
            || await db.BookingParticipants.AnyAsync(p => p.AssignedGuideId == id || p.CheckedBy == id, ct)
            || await db.BookingAttractionCheckins.AnyAsync(g => g.GuideId == id, ct)
            || await db.BookingTimelineAttractions.AnyAsync(g => g.GuideId == id, ct))
            throw new AccountException(409, "HDV đã có lịch sử hoạt động. Hãy tạm khóa tài khoản thay vì xóa.");
        db.Users.Remove(guide);
        try { await db.SaveChangesAsync(ct); await transaction.CommitAsync(ct); }
        catch (DbUpdateException) { throw new AccountException(409, "HDV đang được dữ liệu khác tham chiếu. Hãy tạm khóa thay vì xóa."); }
    }
    private static AgencyGuideDto Dto(User user, User agency, IReadOnlyList<GuideAssignmentDto> assignments)
    {
        var p = user.GuideProfile;
        var work = assignments.Any(a => a.Status == "in_progress") ? "on_tour" : user.Status == UserStatus.Active ? "available" : "unavailable";
        return new(user.Id, user.Name, user.Email, user.Phone, user.Avatar, "guide", agency.Id,
            agency.BusinessProfile?.BusinessName ?? agency.Name, p?.ExperienceYears ?? 0, Parse(p?.Languages), Parse(p?.Routes), Parse(p?.Specialties), p?.Bio,
            user.Status == UserStatus.Active ? "active" : "suspended", work, p?.SuspendedAt, p?.SuspendedReason,
            user.Status != UserStatus.Banned, assignments.Count == 0, user.CreatedAt, user.UpdatedAt, assignments);
    }
    private async Task<Dictionary<string, IReadOnlyList<GuideAssignmentDto>>> LoadAssignments(string agencyId, string[] ids, CancellationToken ct)
    {
        if (ids.Length == 0) return [];
        var rows = await db.BookingAssignedGuides.AsNoTracking().IgnoreQueryFilters()
            .Where(a => a.AgencyId == agencyId && ids.Contains(a.GuideId))
            .Include(a => a.Booking).ThenInclude(b => b.Tour)
            .Include(a => a.Booking).ThenInclude(b => b.Timelines)
            .Include(a => a.Booking).ThenInclude(b => b.Participants).AsSplitQuery().ToListAsync(ct);
        return rows.GroupBy(a => a.GuideId).ToDictionary(g => g.Key, g => (IReadOnlyList<GuideAssignmentDto>)g.Select(a => {
            var b = a.Booking;
            var end = b.StartDate.AddDays(Math.Max(1, b.Timelines.Select(t => t.DayNumber).DefaultIfEmpty(b.Tour?.DurationDays ?? 1).Max()) - 1);
            var today = DateTime.UtcNow.AddHours(7).Date;
            var status = b.Status is BookingStatus.Cancelled or BookingStatus.Rejected ? "cancelled" : b.Status == BookingStatus.Completed ? "completed"
                : b.Status == BookingStatus.InProgress ? "in_progress" : b.StartDate.Date > today ? "upcoming" : end.Date < today ? "completed" : "in_progress";
            var role = (a.Role ?? "").ToLowerInvariant() switch { "support" or "support_guide" => "support_guide", "stage" or "stage_guide" => "stage_guide", "logistics" => "logistics", _ => "lead_guide" };
            return new GuideAssignmentDto(a.Id.ToString(), b.Id.ToString(), b.BookingCode, b.TourId?.ToString() ?? "", b.Tour?.Code ?? "", b.Tour?.Name ?? "Tour đã lưu trữ",
                b.Tour?.Destination ?? "", b.StartDate.ToString("yyyy-MM-dd"), end.ToString("yyyy-MM-dd"),
                b.Participants.Count(p => p.IsPrimary && p.Status != "INACTIVE"), b.ContactName, b.ContactPhone, role, status, a.Notes);
        }).OrderByDescending(a => a.StartDate).ToList());
    }
}
