using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Enums;
using TripOps.Service.Common;
using ServiceEntity = TripOps.Data.Entities.Service;

namespace TripOps.Service.Services;

public sealed class ServiceModerationService(TripOpsDbContext db)
{
    private IQueryable<ServiceEntity> Services => db.Services.AsNoTracking()
        .Include(s => s.Provider).ThenInclude(p => p.BusinessProfile);

    public async Task<AdminServicePage> List(AdminServiceQuery request, CancellationToken ct, string? providerId = null)
    {
        var query = Services;
        if (providerId is not null) query = query.Where(s => s.ProviderId == providerId);
        if (request.IsPaused.HasValue) query = query.Where(s => s.IsPaused == request.IsPaused.Value);
        var status = request.Status?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(status) && status != "all")
        {
            var value = status switch {
                "pending" => ServiceStatus.Pending, "approved" => ServiceStatus.Approved,
                "rejected" => ServiceStatus.Rejected, "hidden" => ServiceStatus.Hidden,
                _ => throw new ServiceModerationException(400, "Trạng thái dịch vụ không hợp lệ.")
            };
            query = query.Where(s => s.Status == value);
        }
        var category = request.Category?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(category) && category != "all")
        {
            var value = category switch {
                "hotel" => ServiceCategory.Hotel, "fnb" => ServiceCategory.Fnb,
                "transportation" => ServiceCategory.Transportation, "attraction" => ServiceCategory.Attraction,
                _ => throw new ServiceModerationException(400, "Danh mục dịch vụ không hợp lệ.")
            };
            query = query.Where(s => s.Category == value);
        }
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim().ToLowerInvariant();
            query = query.Where(s => s.Name.ToLower().Contains(term) || s.Provider.Name.ToLower().Contains(term) ||
                (s.Provider.BusinessProfile != null && s.Provider.BusinessProfile.BusinessName != null && s.Provider.BusinessProfile.BusinessName.ToLower().Contains(term)) ||
                s.Province.ToLower().Contains(term) || (s.FullAddress != null && s.FullAddress.ToLower().Contains(term)));
        }
        var total = await query.CountAsync(ct);
        var offset = (long)(request.Page - 1) * request.PageSize;
        var rows = offset >= total ? [] : await query.OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.Id)
            .Skip((int)offset).Take(request.PageSize).ToListAsync(ct);
        return new(rows.Select(Map).ToArray(), total, request.Page, request.PageSize);
    }

    public async Task<AdminServiceDto> Get(int id, CancellationToken ct)
    {
        var service = await Services.SingleOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new ServiceModerationException(404, "Không tìm thấy bài đăng dịch vụ.");
        return Map(service);
    }

    public Task<ServiceModerationResponse> Approve(int id, CancellationToken ct) =>
        Transition(id, [ServiceStatus.Pending, ServiceStatus.Rejected], ServiceStatus.Approved,
            null, null, "Đã phê duyệt bài đăng dịch vụ.", ct);

    public Task<ServiceModerationResponse> Reject(int id, RejectServiceRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RejectionReason))
            throw new ServiceModerationException(400, "Vui lòng nhập lý do từ chối.");
        return Transition(id, [ServiceStatus.Pending], ServiceStatus.Rejected, request.RejectionReason.Trim(),
            null, "Đã từ chối bài đăng dịch vụ.", ct);
    }

    public Task<ServiceModerationResponse> ToggleHide(int id, ToggleServiceVisibilityRequest request, CancellationToken ct)
    {
        switch (request.Action?.Trim().ToLowerInvariant())
        {
            case "hide":
                if (string.IsNullOrWhiteSpace(request.HiddenReason))
                    throw new ServiceModerationException(400, "Vui lòng nhập lý do tạm ẩn.");
                return Transition(id, [ServiceStatus.Approved], ServiceStatus.Hidden, null,
                    request.HiddenReason.Trim(), "Đã tạm ẩn bài đăng dịch vụ.", ct);
            case "unhide":
                return Transition(id, [ServiceStatus.Hidden], ServiceStatus.Approved, null, null,
                    "Đã mở lại bài đăng dịch vụ.", ct);
            default:
                throw new ServiceModerationException(400, "Action phải là hide hoặc unhide.");
        }
    }

    private async Task<ServiceModerationResponse> Transition(int id, ServiceStatus[] allowed, ServiceStatus target,
        string? rejectionReason, string? hiddenReason, string message, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        // The state predicate is evaluated with the update, so concurrent reviews cannot overwrite each other.
        var changed = await db.Services.Where(s => s.Id == id && s.Status.HasValue && allowed.Contains(s.Status.Value))
            .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.Status, target)
                .SetProperty(s => s.RejectionReason, rejectionReason).SetProperty(s => s.HiddenReason, hiddenReason)
                .SetProperty(s => s.UpdatedAt, now), ct);
        if (changed == 0)
        {
            if (!await db.Services.AnyAsync(s => s.Id == id, ct))
                throw new ServiceModerationException(404, "Không tìm thấy bài đăng dịch vụ.");
            throw new ServiceModerationException(409, "Trạng thái bài đăng không cho phép thao tác này. Vui lòng tải lại dữ liệu.");
        }
        return new(message, await Get(id, ct));
    }

    internal static AdminServiceDto Map(ServiceEntity service)
    {
        var provider = service.Provider;
        var businessName = provider.BusinessProfile?.BusinessName ?? provider.Name;
        return new() {
            Id = service.Id.ToString(CultureInfo.InvariantCulture), ProviderId = service.ProviderId,
            ProviderName = businessName, ProviderHotline = provider.Phone, ProviderEmail = provider.Email,
            Provider = new(provider.Id, businessName, provider.Phone, provider.Email),
            Name = service.Name, Category = service.Category.ToString().ToLowerInvariant(),
            SubCategory = service.SubCategory, Description = service.Description, PriceUnit = service.PriceUnit, Price = service.Price,
            PriceFrom = service.PriceFrom, PriceTo = service.PriceTo, PricePerPerson = service.Price,
            Capacity = service.Capacity, Stars = service.StarRating, Rating = service.Rating ?? 0m,
            Province = service.Province, Ward = service.Ward, Street = service.Street, FullAddress = service.FullAddress,
            Location = !string.IsNullOrWhiteSpace(service.FullAddress) ? service.FullAddress :
                string.Join(", ", new[] { service.Street, service.Ward, service.Province }.Where(s => !string.IsNullOrWhiteSpace(s))),
            Latitude = service.Latitude, Longitude = service.Longitude, OperatingHours = service.OperatingHours,
            Image = service.ThumbnailUrl, ThumbnailUrl = service.ThumbnailUrl,
            Images = ServiceMedia.AdditionalImages(service.Images, service.ThumbnailUrl),
            Amenities = ServiceMedia.TextItems(service.Amenities), Policies = ServiceMedia.TextItems(service.Policies),
            Status = service.Status?.ToString().ToLowerInvariant() ?? "pending",
            IsPaused = service.IsPaused,
            RejectionReason = service.RejectionReason, HiddenReason = service.HiddenReason,
            CreatedAt = service.CreatedAt, UpdatedAt = service.UpdatedAt
        };
    }

}
