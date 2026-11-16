using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Guides;
using TripOps.Service.Services;
using ServiceEntity = TripOps.Data.Entities.Service;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private static async Task<int> AddService(App app, string providerId, ServiceStatus status, bool paused = false)
    {
        var service = new ServiceEntity { ProviderId = providerId, Name = "Khách sạn Biển Xanh", Category = ServiceCategory.Hotel, Province = "Đà Nẵng",
            ThumbnailUrl = "https://example.test/hotel.jpg", Price = 900000, Status = status, IsPaused = paused,
            RejectionReason = status == ServiceStatus.Rejected ? "Ảnh mờ" : null };
        await InDb(app, db => { db.Services.Add(service); return Task.CompletedTask; });
        return service.Id;
    }

    private static async Task<App> ProviderApp()
    {
        var app = await UtApp();
        await AddUser(app, "provider1", UserRole.Provider, BusinessProfileStatus.Approved);
        return app;
    }

    // ============================================================ F-10 ServiceModerationService.Approve

    private const string ServiceStateConflict = "Trạng thái bài đăng không cho phép thao tác này. Vui lòng tải lại dữ liệu.";

    [Fact]
    public async Task F10_UTCID01_pending_service_is_approved()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Pending);
        var result = await Use<ServiceModerationService, ServiceModerationResponse>(app, s => s.Approve(id, default));
        Assert.Equal(("Đã phê duyệt bài đăng dịch vụ.", "approved"), (result.Message, result.Service.Status));
    }

    [Fact]
    public async Task F10_UTCID02_rejected_service_can_be_approved_and_reason_is_cleared()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Rejected);
        await Use<ServiceModerationService, ServiceModerationResponse>(app, s => s.Approve(id, default));
        Assert.Null(await InDb(app, db => db.Services.Where(s => s.Id == id).Select(s => s.RejectionReason).SingleAsync()));
    }

    [Fact]
    public async Task F10_UTCID03_approved_service_cannot_be_approved_again()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved);
        Assert.Equal((409, ServiceStateConflict), await Rejects(() => Use<ServiceModerationService>(app, s => s.Approve(id, default))));
    }

    [Fact]
    public async Task F10_UTCID04_hidden_service_cannot_be_approved()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Hidden);
        Assert.Equal((409, ServiceStateConflict), await Rejects(() => Use<ServiceModerationService>(app, s => s.Approve(id, default))));
    }

    [Fact]
    public async Task F10_UTCID05_missing_service_is_not_found()
    {
        using var app = await ProviderApp();
        Assert.Equal((404, "Không tìm thấy bài đăng dịch vụ."), await Rejects(() => Use<ServiceModerationService>(app, s => s.Approve(9999, default))));
    }

    // ============================================================ F-11 ServiceModerationService.Reject

    [Fact]
    public async Task F11_UTCID01_pending_service_is_rejected_with_trimmed_reason()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Pending);
        var result = await Use<ServiceModerationService, ServiceModerationResponse>(app, s => s.Reject(id, new RejectServiceRequest("  Ảnh không rõ  "), default));
        Assert.Equal(("Đã từ chối bài đăng dịch vụ.", "rejected"), (result.Message, result.Service.Status));
        Assert.Equal("Ảnh không rõ", await InDb(app, db => db.Services.Where(s => s.Id == id).Select(s => s.RejectionReason).SingleAsync()));
    }

    [Fact]
    public async Task F11_UTCID02_blank_reason_is_refused()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Pending);
        Assert.Equal((400, "Vui lòng nhập lý do từ chối."),
            await Rejects(() => Use<ServiceModerationService>(app, s => s.Reject(id, new RejectServiceRequest("   "), default))));
    }

    [Fact]
    public async Task F11_UTCID03_approved_service_cannot_be_rejected()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved);
        Assert.Equal((409, ServiceStateConflict),
            await Rejects(() => Use<ServiceModerationService>(app, s => s.Reject(id, new RejectServiceRequest("Sai giá"), default))));
    }

    [Fact]
    public async Task F11_UTCID04_rejected_service_cannot_be_rejected_again()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Rejected);
        Assert.Equal((409, ServiceStateConflict),
            await Rejects(() => Use<ServiceModerationService>(app, s => s.Reject(id, new RejectServiceRequest("Sai giá"), default))));
    }

    [Fact]
    public async Task F11_UTCID05_missing_service_is_not_found()
    {
        using var app = await ProviderApp();
        Assert.Equal((404, "Không tìm thấy bài đăng dịch vụ."),
            await Rejects(() => Use<ServiceModerationService>(app, s => s.Reject(9999, new RejectServiceRequest("Sai giá"), default))));
    }

    // ============================================================ F-15 AgencyGuideService.Create

    private static CreateGuideRequest NewGuide(string name = "Nguyễn Hướng Dẫn", string phone = "0912345678", int years = 4,
        string[]? languages = null, string email = "new-guide@example.test", string password = "GuidePass123!") =>
        new(new GuideProfileRequest(name, email, phone, years, languages ?? ["Tiếng Việt", "Tiếng Anh"], ["Đà Nẵng"], ["Văn hóa"], null, null), password);

    private static async Task<(int, string)> GuideRejects(App app, CreateGuideRequest request, string agency = "agency1") =>
        await Rejects(() => Use<AgencyGuideService>(app, s => s.Create(agency, request, default)));

    [Fact]
    public async Task F15_UTCID01_agency_creates_guide_account()
    {
        using var app = await UtApp();
        var guide = await Use<AgencyGuideService, AgencyGuideDto>(app, s => s.Create("agency1", NewGuide(), default));
        var user = await InDb(app, db => db.Users.SingleAsync(u => u.Id == guide.Id));
        Assert.Equal((UserRole.TourGuide, "agency1", UserStatus.Active), (user.Role, user.AgencyId, user.Status));
        Assert.NotEqual(PasswordVerificationResult.Failed, new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash!, "GuidePass123!"));
    }

    [Fact]
    public async Task F15_UTCID02_customer_cannot_create_guide()
    {
        using var app = await UtApp();
        Assert.Equal((403, "Agency không hoạt động hoặc không có quyền quản lý HDV."), await GuideRejects(app, NewGuide(), "customer1"));
    }

    [Fact]
    public async Task F15_UTCID03_two_character_name_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Họ tên phải từ 3 đến 150 ký tự."), await GuideRejects(app, NewGuide(name: "AB")));
    }

    [Fact]
    public async Task F15_UTCID04_invalid_phone_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Số điện thoại không hợp lệ."), await GuideRejects(app, NewGuide(phone: "0123")));
    }

    [Fact]
    public async Task F15_UTCID05_51_years_of_experience_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Kinh nghiệm phải từ 0 đến 50 năm."), await GuideRejects(app, NewGuide(years: 51)));
    }

    [Fact]
    public async Task F15_UTCID06_no_language_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Chọn ít nhất một ngôn ngữ hướng dẫn."), await GuideRejects(app, NewGuide(languages: [])));
    }

    [Fact]
    public async Task F15_UTCID07_email_already_used_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((409, "Email đã được sử dụng bởi một tài khoản khác."), await GuideRejects(app, NewGuide(email: "Customer1@Example.test")));
    }

    [Fact]
    public async Task F15_UTCID08_seven_character_password_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Mật khẩu phải từ 8 đến 16 ký tự và không chỉ gồm khoảng trắng."), await GuideRejects(app, NewGuide(password: "Abc1234")));
    }

    [Fact]
    public async Task F15_UTCID09_seventeen_character_password_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Mật khẩu phải từ 8 đến 16 ký tự và không chỉ gồm khoảng trắng."), await GuideRejects(app, NewGuide(password: "Abcdefgh123456789")));
    }

    [Fact]
    public async Task F15_UTCID10_sixteen_character_password_is_accepted()
    {
        using var app = await UtApp();
        var guide = await Use<AgencyGuideService, AgencyGuideDto>(app, s => s.Create("agency1", NewGuide(password: "Abcdefgh12345678"), default));
        Assert.Equal("Nguyễn Hướng Dẫn", guide.Name);
    }

    // ============================================================ F-16 ProviderServiceService.Create

    private static SaveProviderServiceRequest NewService(string category = "hotel", string name = "Khách sạn Biển Xanh", string? unit = "room_night",
        decimal? from = null, decimal? to = null, string thumbnail = "https://example.test/hotel.jpg", int? stars = 4) => new()
    {
        Name = name, Category = category, PriceUnit = unit, Price = 900000, PriceFrom = from, PriceTo = to, Stars = stars,
        Province = "Đà Nẵng", Ward = "Phường Hải Châu", Street = "12 Bạch Đằng", ThumbnailUrl = thumbnail
    };

    private static async Task<(int, string)> ServiceRejects(App app, SaveProviderServiceRequest request, string actor = "provider1") =>
        await Rejects(() => Use<ProviderServiceService>(app, s => s.Create(actor, request, default)));

    [Fact]
    public async Task F16_UTCID01_approved_provider_creates_pending_hotel_service()
    {
        using var app = await ProviderApp();
        var dto = await Use<ProviderServiceService, AdminServiceDto>(app, s => s.Create("provider1", NewService(), default));
        Assert.Equal(("pending", 4, 0m), (dto.Status, dto.Stars, dto.Rating));
        Assert.Equal("12 Bạch Đằng, Phường Hải Châu, Đà Nẵng", dto.FullAddress);
    }

    [Fact]
    public async Task F16_UTCID02_provider_with_pending_profile_is_refused()
    {
        using var app = await UtApp();
        await AddUser(app, "provider2", UserRole.Provider, BusinessProfileStatus.Pending);
        Assert.Equal((403, "Nhà cung cấp cần có hồ sơ doanh nghiệp đã được duyệt."), await ServiceRejects(app, NewService(), "provider2"));
    }

    [Fact]
    public async Task F16_UTCID03_agency_cannot_create_provider_service()
    {
        using var app = await ProviderApp();
        Assert.Equal((403, "Nhà cung cấp cần có hồ sơ doanh nghiệp đã được duyệt."), await ServiceRejects(app, NewService(), "agency1"));
    }

    [Fact]
    public async Task F16_UTCID04_unknown_category_is_rejected()
    {
        using var app = await ProviderApp();
        Assert.Equal((400, "Danh mục dịch vụ không hợp lệ."), await ServiceRejects(app, NewService(category: "spa")));
    }

    [Fact]
    public async Task F16_UTCID05_unknown_price_unit_is_rejected()
    {
        using var app = await ProviderApp();
        Assert.Equal((400, "Đơn vị giá không hợp lệ."), await ServiceRejects(app, NewService(unit: "hour")));
    }

    [Fact]
    public async Task F16_UTCID06_blank_name_is_rejected()
    {
        using var app = await ProviderApp();
        Assert.Equal((400, "Tên dịch vụ và tỉnh/thành không được để trống."), await ServiceRejects(app, NewService(name: "  ")));
    }

    [Fact]
    public async Task F16_UTCID07_price_from_above_price_to_is_rejected()
    {
        using var app = await ProviderApp();
        Assert.Equal((400, "Giá đến phải lớn hơn hoặc bằng giá từ."), await ServiceRejects(app, NewService(from: 500000, to: 400000)));
    }

    [Fact]
    public async Task F16_UTCID08_non_http_thumbnail_is_rejected()
    {
        using var app = await ProviderApp();
        Assert.Equal((400, "Ảnh cần là URL HTTP(S) hoặc ảnh đã tải lên máy chủ của bạn."), await ServiceRejects(app, NewService(thumbnail: "ftp://example.test/a.jpg")));
    }

    [Fact]
    public async Task F16_UTCID09_equal_price_from_and_to_is_accepted()
    {
        using var app = await ProviderApp();
        var dto = await Use<ProviderServiceService, AdminServiceDto>(app, s => s.Create("provider1", NewService(from: 500000, to: 500000), default));
        Assert.Equal((500000m, 500000m), (dto.PriceFrom!.Value, dto.PriceTo!.Value));
    }

    [Fact]
    public async Task F16_UTCID10_stars_are_dropped_for_non_hotel_service()
    {
        using var app = await ProviderApp();
        var dto = await Use<ProviderServiceService, AdminServiceDto>(app, s => s.Create("provider1", NewService(category: "fnb", unit: "meal"), default));
        Assert.Equal(("fnb", (int?)null), (dto.Category, dto.Stars));
    }

    // ============================================================ F-17 ProviderServiceService.SetAvailability

    private static async Task<(int, string)> AvailabilityRejects(App app, int id, bool? paused, string actor = "provider1") =>
        await Rejects(() => Use<ProviderServiceService>(app, s => s.SetAvailability(actor, id, new SetServiceAvailabilityRequest(paused), default)));

    [Fact]
    public async Task F17_UTCID01_provider_pauses_service()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved);
        var dto = await Use<ProviderServiceService, AdminServiceDto>(app, s => s.SetAvailability("provider1", id, new SetServiceAvailabilityRequest(true), default));
        Assert.True(dto.IsPaused);
    }

    [Fact]
    public async Task F17_UTCID02_provider_resumes_paused_service()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved, paused: true);
        var dto = await Use<ProviderServiceService, AdminServiceDto>(app, s => s.SetAvailability("provider1", id, new SetServiceAvailabilityRequest(false), default));
        Assert.False(dto.IsPaused);
    }

    [Fact]
    public async Task F17_UTCID03_missing_choice_is_rejected()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved);
        Assert.Equal((400, "Vui lòng chọn trạng thái cung cấp dịch vụ."), await AvailabilityRejects(app, id, null));
    }

    [Fact]
    public async Task F17_UTCID04_service_of_another_provider_is_not_found()
    {
        using var app = await ProviderApp();
        await AddUser(app, "provider2", UserRole.Provider, BusinessProfileStatus.Approved);
        var id = await AddService(app, "provider2", ServiceStatus.Approved);
        Assert.Equal((404, "Không tìm thấy bài đăng dịch vụ của bạn."), await AvailabilityRejects(app, id, true));
    }

    [Fact]
    public async Task F17_UTCID05_hidden_service_cannot_change_availability()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Hidden);
        Assert.Equal((409, "Bài đăng đã bị Admin ẩn, không thể thay đổi trạng thái cung cấp. Vui lòng tạo bài đăng mới."), await AvailabilityRejects(app, id, true));
    }

    [Fact]
    public async Task F17_UTCID06_provider_without_approved_profile_is_refused()
    {
        using var app = await ProviderApp();
        var id = await AddService(app, "provider1", ServiceStatus.Approved);
        await InDb(app, async db => { (await db.BusinessProfiles.SingleAsync(p => p.UserId == "provider1")).Status = BusinessProfileStatus.Suspended; });
        Assert.Equal((403, "Nhà cung cấp cần có hồ sơ doanh nghiệp đã được duyệt."), await AvailabilityRejects(app, id, true));
    }

    [Fact]
    public async Task F17_UTCID07_missing_service_is_not_found()
    {
        using var app = await ProviderApp();
        Assert.Equal((404, "Không tìm thấy bài đăng dịch vụ của bạn."), await AvailabilityRejects(app, 9999, true));
    }
}
