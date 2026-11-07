using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;
using ServiceEntity = TripOps.Data.Entities.Service;

namespace TripOps.Service.Services;

public sealed class ProviderServiceService(TripOpsDbContext db, AccountService accounts, ServiceModerationService moderation)
{
    public async Task<User> Provider(string actor, CancellationToken ct)
    {
        var user = await accounts.Current(actor, ct);
        if (user.Role != UserRole.Provider || user.BusinessProfile?.Status != BusinessProfileStatus.Approved)
            throw new ServiceModerationException(403, "Nhà cung cấp cần có hồ sơ doanh nghiệp đã được duyệt.");
        return user;
    }

    public async Task<AdminServicePage> List(string actor, AdminServiceQuery query, CancellationToken ct)
    {
        await Provider(actor, ct);
        return await moderation.List(query, ct, actor);
    }

    private async Task<ServiceEntity> Owned(string actor, int id, CancellationToken ct) =>
        await db.Services.AsNoTracking().Include(s => s.Provider).ThenInclude(p => p.BusinessProfile)
            .SingleOrDefaultAsync(s => s.Id == id && s.ProviderId == actor, ct)
        ?? throw new ServiceModerationException(404, "Không tìm thấy bài đăng dịch vụ của bạn.");

    public async Task<AdminServiceDto> Get(string actor, int id, CancellationToken ct)
    {
        await Provider(actor, ct);
        return ServiceModerationService.Map(await Owned(actor, id, ct));
    }

    public async Task<AdminServiceDto> Create(string actor, SaveProviderServiceRequest request, CancellationToken ct)
    {
        var provider = await Provider(actor, ct);
        var service = Build(actor, request);
        service.Provider = provider;
        service.Status = ServiceStatus.Pending;
        service.Rating = 0;
        db.Services.Add(service);
        await db.SaveChangesAsync(ct);
        return ServiceModerationService.Map(service);
    }

    public async Task<AdminServiceDto> Update(string actor, int id, SaveProviderServiceRequest request, CancellationToken ct)
    {
        await Provider(actor, ct);
        var original = await Owned(actor, id, ct);
        if (original.Status == ServiceStatus.Hidden)
            throw new ServiceModerationException(409, "Bài đăng đã bị Admin ẩn, không thể chỉnh sửa. Vui lòng tạo bài đăng mới để gửi duyệt.");
        var next = Build(actor, request);
        var now = DateTime.UtcNow;
        var changed = await db.Services.Where(s => s.Id == id && s.ProviderId == actor &&
                s.Status == original.Status && s.UpdatedAt == original.UpdatedAt)
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.Name, next.Name).SetProperty(s => s.Category, next.Category)
                .SetProperty(s => s.SubCategory, next.SubCategory).SetProperty(s => s.Description, next.Description)
                .SetProperty(s => s.PriceUnit, next.PriceUnit).SetProperty(s => s.Price, next.Price).SetProperty(s => s.PriceFrom, next.PriceFrom).SetProperty(s => s.PriceTo, next.PriceTo)
                .SetProperty(s => s.Capacity, next.Capacity).SetProperty(s => s.StarRating, next.StarRating)
                .SetProperty(s => s.Province, next.Province).SetProperty(s => s.Ward, next.Ward).SetProperty(s => s.Street, next.Street)
                .SetProperty(s => s.FullAddress, next.FullAddress).SetProperty(s => s.OperatingHours, next.OperatingHours)
                .SetProperty(s => s.Latitude, next.Latitude).SetProperty(s => s.Longitude, next.Longitude)
                .SetProperty(s => s.ThumbnailUrl, next.ThumbnailUrl).SetProperty(s => s.Images, next.Images)
                .SetProperty(s => s.Amenities, next.Amenities).SetProperty(s => s.Policies, next.Policies)
                .SetProperty(s => s.Status, ServiceStatus.Pending)
                .SetProperty(s => s.RejectionReason, (string?)null)
                .SetProperty(s => s.HiddenReason, (string?)null).SetProperty(s => s.UpdatedAt, now), ct);
        if (changed == 0) throw new ServiceModerationException(409, "Bài đăng vừa thay đổi. Vui lòng tải lại trước khi sửa.");
        return ServiceModerationService.Map(await Owned(actor, id, ct));
    }

    public async Task<AdminServiceDto> SetAvailability(string actor, int id, SetServiceAvailabilityRequest request, CancellationToken ct)
    {
        await Provider(actor, ct);
        if (request.IsPaused is null) throw new ServiceModerationException(400, "Vui lòng chọn trạng thái cung cấp dịch vụ.");
        var original = await Owned(actor, id, ct);
        if (original.Status == ServiceStatus.Hidden)
            throw new ServiceModerationException(409, "Bài đăng đã bị Admin ẩn, không thể thay đổi trạng thái cung cấp. Vui lòng tạo bài đăng mới.");
        var now = DateTime.UtcNow;
        // Availability belongs to the Provider; the moderation status and reasons are untouched.
        var changed = await db.Services.Where(s => s.Id == id && s.ProviderId == actor && s.Status != ServiceStatus.Hidden)
            .ExecuteUpdateAsync(set => set.SetProperty(s => s.IsPaused, request.IsPaused.Value)
                .SetProperty(s => s.UpdatedAt, now), ct);
        if (changed == 0) throw new ServiceModerationException(409, "Bài đăng vừa thay đổi hoặc bị Admin ẩn. Vui lòng tải lại dữ liệu.");
        return ServiceModerationService.Map(await Owned(actor, id, ct));
    }

    public async Task Delete(string actor, int id, CancellationToken ct)
    {
        await Provider(actor, ct);
        await Owned(actor, id, ct);
        if (await db.TourAccommodations.AnyAsync(s => s.ServiceId == id, ct) || await db.TourMeals.AnyAsync(s => s.ServiceId == id, ct) ||
            await db.BookingAccommodations.AnyAsync(s => s.ServiceId == id, ct) || await db.BookingTimelineMeals.AnyAsync(s => s.ServiceId == id, ct))
            throw new ServiceModerationException(409, "Dịch vụ đang được sử dụng trong tour hoặc booking, không thể xóa.");
        try
        {
            var deleted = await db.Services.Where(s => s.Id == id && s.ProviderId == actor).ExecuteDeleteAsync(ct);
            if (deleted == 0) throw new ServiceModerationException(404, "Không tìm thấy bài đăng dịch vụ của bạn.");
        }
        catch (SqlException ex) when (ex.Number == 547)
        {
            throw new ServiceModerationException(409, "Dịch vụ đang được sử dụng, không thể xóa.");
        }
    }

    private static ServiceEntity Build(string actor, SaveProviderServiceRequest request)
    {
        if (request.PriceUnit is not (null or "person" or "meal" or "room_night" or "night" or "day" or "trip" or "item"))
            throw new ServiceModerationException(400, "Đơn vị giá không hợp lệ.");
        var category = request.Category.Trim().ToLowerInvariant() switch {
            "hotel" => ServiceCategory.Hotel, "fnb" => ServiceCategory.Fnb,
            "transportation" => ServiceCategory.Transportation, "attraction" => ServiceCategory.Attraction,
            _ => throw new ServiceModerationException(400, "Danh mục dịch vụ không hợp lệ.")
        };
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Province))
            throw new ServiceModerationException(400, "Tên dịch vụ và tỉnh/thành không được để trống.");
        if (request.PriceFrom.HasValue && request.PriceTo.HasValue && request.PriceFrom > request.PriceTo)
            throw new ServiceModerationException(400, "Giá đến phải lớn hơn hoặc bằng giá từ.");
        static string[] Clean(string[]? items, int maxCount, int maxLength)
        {
            if (items?.Length > maxCount || items?.Any(s => s is null || s.Length > maxLength) == true)
                throw new ServiceModerationException(400, "Danh sách ảnh, tiện nghi hoặc chính sách không hợp lệ.");
            return (items ?? []).Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct().ToArray();
        }
        static string Image(string? value, string owner)
        {
            var url = value?.Trim() ?? "";
            if (Uri.TryCreate(url, UriKind.Absolute, out var uri) && (uri.Scheme == "https" || uri.Scheme == "http")) return url;
            if (System.Text.RegularExpressions.Regex.IsMatch(url,
                @"^/api/v1/files/services/" + System.Text.RegularExpressions.Regex.Escape(owner) + @"/[a-f0-9]{32}\.(png|jpg)$")) return url;
            throw new ServiceModerationException(400, "Ảnh cần là URL HTTP(S) hoặc ảnh đã tải lên máy chủ của bạn.");
        }
        var thumbnail = Image(request.ThumbnailUrl, actor);
        var images = Clean(request.Images, 20, 2048).Select(s => Image(s, actor)).Where(s => s != thumbnail).ToArray();
        var address = string.IsNullOrWhiteSpace(request.FullAddress)
            ? string.Join(", ", new[] { request.Street, request.Ward, request.Province }.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s!.Trim()))
            : request.FullAddress.Trim();
        if (address.Length > 500) throw new ServiceModerationException(400, "Địa chỉ đầy đủ tối đa 500 ký tự.");
        return new() {
            ProviderId = actor, Name = request.Name.Trim(), Category = category, SubCategory = request.SubCategory?.Trim(),
            Description = request.Description?.Trim(), PriceUnit = request.PriceUnit, Price = request.Price, PriceFrom = request.PriceFrom, PriceTo = request.PriceTo,
            Capacity = request.Capacity, StarRating = category == ServiceCategory.Hotel ? request.Stars : null,
            Province = request.Province.Trim(), Ward = request.Ward?.Trim(), Street = request.Street?.Trim(), FullAddress = address,
            OperatingHours = request.OperatingHours?.Trim(), Latitude = request.Latitude, Longitude = request.Longitude,
            ThumbnailUrl = thumbnail, Images = JsonSerializer.Serialize(images),
            Amenities = JsonSerializer.Serialize(Clean(request.Amenities, 100, 500)), Policies = JsonSerializer.Serialize(Clean(request.Policies, 100, 5000))
        };
    }
}
