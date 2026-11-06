using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Accounts;
public sealed class AccountService(TripOpsDbContext db, CloudinaryStorage storage)
{
    private readonly PasswordHasher<User> hasher = new();
    public static string RoleName(UserRole role) => role switch {
        UserRole.Admin => "admin", UserRole.TravelAgency => "agency", UserRole.Provider => "provider",
        UserRole.TourGuide => "guide", _ => "user" };
    private ProfileDto Profile(BusinessProfile p) => new(p.Id, p.UserId ?? "", p.BusinessName, p.TaxCode,
        p.BusinessAddress, storage.DeliveryUrl(p.BusinessLicenseUrl), p.Description,
        p.Status?.ToString().ToLowerInvariant() ?? "pending", p.RejectionReason, p.ApprovedAt,
        p.CreatedAt ?? DateTime.UnixEpoch, p.UpdatedAt ?? p.CreatedAt ?? DateTime.UnixEpoch, p.LogoUrl is null ? null : storage.DeliveryUrl(p.LogoUrl));
    public AccountDto Dto(User u) => new(u.Id, u.Name, u.Email, u.Phone, RoleName(u.Role),
        u.BusinessProfile is null ? null : Profile(u.BusinessProfile));
    public async Task<User> Register(RegisterRequest request, CancellationToken ct)
    {
        if (!request.AcceptedTerms) throw new AccountException(400, "Vui lòng đồng ý điều khoản.");
        var role = request.Role switch { "user" => UserRole.Customer, "agency" => UserRole.TravelAgency,
            "provider" => UserRole.Provider, _ => throw new AccountException(400, "Vai trò không được phép tự đăng ký.") };
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email.ToLower() == email, ct))
            throw new AccountException(409, "Email đã được sử dụng.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new AccountException(400, "Vui lòng nhập họ tên.");
        var user = new User { Id = Guid.NewGuid().ToString(), Name = request.Name.Trim(), Email = email,
            Role = role, Status = UserStatus.Active, IsVerified = false };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 })
        { throw new AccountException(409, "Email đã được sử dụng."); }
        return user;
    }
    public async Task<User> Login(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.Include(u => u.BusinessProfile).SingleOrDefaultAsync(u => u.Email.ToLower() == email, ct);
        if (user?.PasswordHash is null || hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            throw new AccountException(401, "Email hoặc mật khẩu không đúng.");
        if (user.Status != UserStatus.Active) throw new AccountException(403, "Tài khoản đã bị khóa.");
        return user;
    }
    public async Task<User> Current(string id, CancellationToken ct) =>
        await db.Users.Include(u => u.BusinessProfile).SingleOrDefaultAsync(u => u.Id == id && u.Status == UserStatus.Active, ct)
        ?? throw new AccountException(401, "Phiên đăng nhập không còn hợp lệ.");
    public async Task ChangeGuidePassword(string agencyId, string guideId, ChangeGuidePasswordRequest request, CancellationToken ct)
    {
        var agency = await Current(agencyId, ct);
        if (agency.Role != UserRole.TravelAgency)
            throw new AccountException(403, "Chỉ Agency được đổi mật khẩu cho HDV.");
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length is < 8 or > 16)
            throw new AccountException(400, "Mật khẩu mới phải từ 8 đến 16 ký tự và không chỉ gồm khoảng trắng.");
        if (request.NewPassword != request.ConfirmPassword)
            throw new AccountException(400, "Xác nhận mật khẩu không khớp.");
        var guide = await db.Users.SingleOrDefaultAsync(u => u.Id == guideId &&
            u.Role == UserRole.TourGuide && u.AgencyId == agencyId, ct)
            ?? throw new AccountException(404, "Không tìm thấy tài khoản HDV thuộc Agency của bạn. Hồ sơ mẫu chưa có trong database không thể đổi mật khẩu.");
        guide.PasswordHash = hasher.HashPassword(guide, request.NewPassword);
        guide.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
    public async Task<ProfileDto> Submit(string id, ProfileRequest request, byte[]? image, string? mime, CancellationToken ct)
    {
        var user = await Current(id, ct);
        if (user.Role is not (UserRole.TravelAgency or UserRole.Provider)) throw new AccountException(403, "Chỉ đối tác được nộp hồ sơ.");
        if (user.BusinessProfile?.Status is BusinessProfileStatus.Approved or BusinessProfileStatus.Suspended)
            throw new AccountException(409, "Không thể nộp lại hồ sơ ở trạng thái hiện tại.");
        if (user.BusinessProfile?.Status == BusinessProfileStatus.Pending)
            throw new AccountException(409, "Hồ sơ đang chờ duyệt.");
        if (new[] { request.BusinessName, request.TaxCode, request.Phone, request.BusinessAddress }.Any(string.IsNullOrWhiteSpace))
            throw new AccountException(400, "Vui lòng điền đầy đủ thông tin.");
        var url = user.BusinessProfile?.BusinessLicenseUrl;
        if (image is not null) url = await storage.Upload(id, image, mime!, ct);
        if (url is null) throw new AccountException(400, "Vui lòng tải ảnh giấy phép.");
        var profile = user.BusinessProfile ?? new BusinessProfile { UserId = user.Id };
        if (user.BusinessProfile is null) db.BusinessProfiles.Add(profile);
        profile.BusinessName = request.BusinessName.Trim(); profile.TaxCode = request.TaxCode.Trim();
        profile.BusinessAddress = request.BusinessAddress.Trim(); profile.Description = request.Description?.Trim();
        profile.BusinessLicenseUrl = url; profile.Status = BusinessProfileStatus.Pending;
        profile.RejectionReason = null; profile.ApprovedAt = null; user.Phone = request.Phone.Trim();
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 })
        { throw new AccountException(409, "Hồ sơ đã được nộp. Vui lòng tải lại trạng thái."); }
        return Profile(profile);
    }
    public async Task<object> Partners(string? status, string? role, string? search, int page, int pageSize, CancellationToken ct, string? userId = null)
    {
        var query = db.BusinessProfiles.AsNoTracking().Where(p =>
            (p.User.Role == UserRole.TravelAgency || p.User.Role == UserRole.Provider));
        if (!string.IsNullOrWhiteSpace(userId)) query = query.Where(p => p.UserId == userId);
        //if (!string.IsNullOrWhiteSpace(status)) {
        //    if (!Enum.TryParse<BusinessProfileStatus>(status, true, out var state) || !Enum.IsDefined(state)) throw new AccountException(400, "Trạng thái không hợp lệ.");
        //    query = query.Where(p => p.Status == state);
        //}
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<BusinessProfileStatus>(status, true, out var state) || !Enum.IsDefined(state))
                throw new AccountException(400, "Trạng thái không hợp lệ.");
            query = state == BusinessProfileStatus.Approved
                ? query.Where(p => p.Status == BusinessProfileStatus.Approved || p.Status == BusinessProfileStatus.Suspended)
                : query.Where(p => p.Status == state);
        }
        if (role is "agency" or "provider") { var r = role == "agency" ? UserRole.TravelAgency : UserRole.Provider; query = query.Where(p => p.User.Role == r); }
        if (!string.IsNullOrWhiteSpace(search)) { var q = search.Trim(); query = query.Where(p => p.BusinessName!.Contains(q) || p.TaxCode!.Contains(q) || p.User.Name.Contains(q) || p.User.Email.Contains(q) || p.User.Phone!.Contains(q)); }
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync(ct);
        var rows = await query.Include(p => p.User).OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return new { items = rows.Select(p => new PartnerDto(Profile(p), p.User.Name, p.User.Email, p.User.Phone, RoleName(p.User.Role))), total, page, pageSize };
    }
    public async Task<ProfileDto> Review(int id, bool approve, string? reason, CancellationToken ct)
    {
        if (!approve && string.IsNullOrWhiteSpace(reason)) throw new AccountException(400, "Vui lòng nhập lý do từ chối.");
        var now = DateTime.UtcNow;
        var count = await db.BusinessProfiles.Where(p => p.Id == id && p.Status == BusinessProfileStatus.Pending &&
            (p.User.Role == UserRole.TravelAgency || p.User.Role == UserRole.Provider))
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, approve ? BusinessProfileStatus.Approved : BusinessProfileStatus.Rejected)
                .SetProperty(p => p.RejectionReason, approve ? null : reason!.Trim())
                .SetProperty(p => p.ApprovedAt, approve ? (DateTime?)now : null).SetProperty(p => p.UpdatedAt, now), ct);
        if (count == 0) throw new AccountException(409, "Hồ sơ không tồn tại hoặc đã được xử lý. Vui lòng tải lại.");
        return Profile(await db.BusinessProfiles.AsNoTracking().SingleAsync(p => p.Id == id, ct));
    }

    public async Task<ProfileDto> SetSuspended(int id, bool suspend, CancellationToken ct)
    {
        var from = suspend ? BusinessProfileStatus.Approved : BusinessProfileStatus.Suspended;
        var to = suspend ? BusinessProfileStatus.Suspended : BusinessProfileStatus.Approved;
        var now = DateTime.UtcNow;
        var count = await db.BusinessProfiles
            .Where(p => p.Id == id && p.Status == from &&
                (p.User.Role == UserRole.TravelAgency || p.User.Role == UserRole.Provider))
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, to).SetProperty(p => p.UpdatedAt, now), ct);
        if (count == 0)
            throw new AccountException(409, suspend
                ? "Chỉ có thể đình chỉ hồ sơ đang hoạt động. Vui lòng tải lại."
                : "Chỉ có thể kích hoạt lại hồ sơ đang bị đình chỉ. Vui lòng tải lại.");
        return Profile(await db.BusinessProfiles.AsNoTracking().SingleAsync(p => p.Id == id, ct));
    }
    //profile cho agency
    public sealed record UpdateBusinessRequest(string Name, string Phone, string BusinessName, string TaxCode,
    string BusinessAddress, string? Description, bool ConfirmReview, bool RemoveLogo);

    public async Task<AccountDto> UpdateBusiness(string id, UpdateBusinessRequest request,
        byte[]? logo, string? logoMime, byte[]? license, string? licenseMime, CancellationToken ct)
    {
        var user = await Current(id, ct);
        if (user.Role is not (UserRole.TravelAgency or UserRole.Provider))
            throw new AccountException(403, "Chỉ đối tác được sửa hồ sơ doanh nghiệp.");
        var profile = user.BusinessProfile ?? throw new AccountException(409, "Bạn chưa nộp hồ sơ doanh nghiệp.");
        if (profile.Status == BusinessProfileStatus.Suspended)
            throw new AccountException(403, "Doanh nghiệp đang bị đình chỉ, không thể sửa hồ sơ.");
        if (new[] { request.Name, request.Phone, request.BusinessName, request.TaxCode, request.BusinessAddress }
            .Any(string.IsNullOrWhiteSpace))
            throw new AccountException(400, "Vui lòng điền đầy đủ thông tin.");

        var businessName = request.BusinessName.Trim();
        var taxCode = request.TaxCode.Trim();
        var address = request.BusinessAddress.Trim();
        var legalChanged = businessName != profile.BusinessName || taxCode != profile.TaxCode
            || address != profile.BusinessAddress || license is not null;

        if (legalChanged && profile.Status == BusinessProfileStatus.Pending)
            throw new AccountException(409, "Hồ sơ đang chờ duyệt, chưa thể sửa thông tin pháp lý.");
        if (legalChanged && profile.Status == BusinessProfileStatus.Approved && !request.ConfirmReview)
            throw new AccountException(409, "Đổi thông tin pháp lý sẽ gửi hồ sơ duyệt lại. Vui lòng xác nhận.");

        if (logo is not null) profile.LogoUrl = await storage.Upload(id, logo, logoMime!, ct);
        else if (request.RemoveLogo) profile.LogoUrl = null;
        if (license is not null) profile.BusinessLicenseUrl = await storage.Upload(id, license, licenseMime!, ct);

        var now = DateTime.UtcNow;
        user.Name = request.Name.Trim(); user.Phone = request.Phone.Trim(); user.UpdatedAt = now;
        profile.Description = request.Description?.Trim(); profile.UpdatedAt = now;
        if (legalChanged)
        {
            profile.BusinessName = businessName; profile.TaxCode = taxCode; profile.BusinessAddress = address;
            profile.Status = BusinessProfileStatus.Pending; profile.RejectionReason = null; profile.ApprovedAt = null;
        }
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.SqlClient.SqlException { Number: 2601 or 2627 })
        { throw new AccountException(409, "Thông tin bị trùng (có thể là mã số thuế). Vui lòng kiểm tra lại."); }
        return Dto(user);
    }
}
