using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Locations;

namespace TripOps.Service.Accounts;

/// <summary>Thông tin tài khoản của khách. Email chỉ để xem (đổi email cần xác minh riêng).</summary>
public sealed record CustomerProfileDto(string Name, string? OrganizationName, string Email, string? Phone,
    string? AddressLine, string? ProvinceCode, string? ProvinceName, string? WardCode, string? WardName, DateTime UpdatedAt);

/// <summary>Dữ liệu khách gửi lên. Tỉnh và phường/xã gửi bằng mã; tên do máy chủ lấy từ danh mục hành chính.</summary>
public sealed record CustomerProfileInput(
    [Required, StringLength(100)] string Name,
    [StringLength(200)] string? OrganizationName,
    [Required, StringLength(20)] string Phone,
    [StringLength(255)] string? AddressLine,
    [StringLength(10)] string? ProvinceCode,
    [StringLength(10)] string? WardCode);

public sealed partial class CustomerProfileService(TripOpsDbContext db, VietnamAdministrativeService locations)
{
    public async Task<CustomerProfileDto> Get(string userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AccountException(404, "Không tìm thấy tài khoản.");
        return Dto(user);
    }

    public async Task<CustomerProfileDto> Update(string userId, CustomerProfileInput input, CancellationToken ct)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new AccountException(404, "Không tìm thấy tài khoản.");
        // Khách có thể mang vai trò User (đăng ký) hoặc Customer (dữ liệu mẫu) — đều là khách hàng.
        if (user.Role is not (UserRole.User or UserRole.Customer))
            throw new AccountException(403, "Chỉ khách hàng dùng trang thông tin tài khoản này.");

        var name = Collapse(input.Name);
        if (name.Length < 2) throw new AccountException(422, "Vui lòng nhập họ và tên (ít nhất 2 ký tự).");
        var phone = NormalizePhone(input.Phone)
            ?? throw new AccountException(422, "Số điện thoại không hợp lệ (VD 0912345678 hoặc +84912345678).");
        var organization = Optional(input.OrganizationName);
        var addressLine = Optional(input.AddressLine);
        var provinceCode = Optional(input.ProvinceCode);
        var wardCode = Optional(input.WardCode);
        if (wardCode is not null && provinceCode is null)
            throw new AccountException(422, "Vui lòng chọn tỉnh/thành trước khi chọn phường/xã.");

        string? provinceName = null, wardName = null;
        if (provinceCode is not null)
        {
            try
            {
                var province = (await locations.Provinces(ct)).FirstOrDefault(p => p.Code == provinceCode)
                    ?? throw new AccountException(422, "Tỉnh/thành không có trong danh mục.");
                provinceName = province.FullName;
                if (wardCode is not null)
                {
                    // Phường/xã phải thuộc đúng tỉnh đã chọn.
                    var ward = (await locations.Wards(province.Code, ct)).FirstOrDefault(w => w.Code == wardCode)
                        ?? throw new AccountException(422, "Phường/xã không thuộc tỉnh/thành đã chọn.");
                    wardName = ward.Name;
                }
            }
            catch (AdministrativeLocationException e)
            {
                throw new AccountException(e.Status >= 500 ? 503 : 422,
                    e.Status >= 500 ? "Chưa tải được danh mục tỉnh/phường. Vui lòng thử lại sau." : e.Message);
            }
        }

        user.Name = name;
        user.Phone = phone;
        user.OrganizationName = organization;
        user.AddressLine = addressLine;
        user.ProvinceCode = provinceCode;
        user.ProvinceName = provinceName;
        user.WardCode = wardCode;
        user.WardName = wardName;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Dto(user);
    }

    private static CustomerProfileDto Dto(Data.Entities.User u) => new(u.Name, u.OrganizationName, u.Email, u.Phone,
        u.AddressLine, u.ProvinceCode, u.ProvinceName, u.WardCode, u.WardName, DateTime.SpecifyKind(u.UpdatedAt, DateTimeKind.Utc));

    private static string Collapse(string? value) => Spaces().Replace((value ?? string.Empty).Trim(), " ");
    private static string? Optional(string? value) => Collapse(value) is { Length: > 0 } text ? text : null;

    /// <summary>Chấp nhận 0xxxxxxxxx hoặc +84xxxxxxxxx (cho phép dấu cách, chấm, gạch); lưu dạng 0xxxxxxxxx.</summary>
    public static string? NormalizePhone(string? value)
    {
        var digits = PhoneSeparators().Replace(value ?? string.Empty, string.Empty);
        if (digits.StartsWith("+84", StringComparison.Ordinal)) digits = "0" + digits[3..];
        else if (digits.StartsWith("84", StringComparison.Ordinal) && digits.Length == 11) digits = "0" + digits[2..];
        return VietnamPhone().IsMatch(digits) ? digits : null;
    }

    [GeneratedRegex(@"\s+")] private static partial Regex Spaces();
    [GeneratedRegex(@"[\s.\-()]")] private static partial Regex PhoneSeparators();
    [GeneratedRegex(@"^0[35789]\d{8}$")] private static partial Regex VietnamPhone();
}
