using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Accounts;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    // ============================================================ F-07 CustomerProfileService.Update

    private static CustomerProfileInput ProfileInput(string name = "Hoàng Tùng Lâm", string phone = "0912345678", string? province = "79", string? ward = "26737") =>
        new(name, "Công ty ABC", phone, "12 Lê Lợi", province, ward);

    private static async Task<(int, string)> ProfileRejects(App app, string userId, CustomerProfileInput input) =>
        await Rejects(() => Use<CustomerProfileService>(app, s => s.Update(userId, input, default)));

    [Fact]
    public async Task F07_UTCID01_valid_profile_with_province_and_ward_is_saved()
    {
        using var app = ProfileApp(); await app.Initialize();
        var saved = await Use<CustomerProfileService, CustomerProfileDto>(app,
            s => s.Update("customer1", ProfileInput("  Hoàng   Tùng Lâm ", "+84 912.345.678"), default));
        Assert.Equal(("Hoàng Tùng Lâm", "0912345678", "Thành phố Hồ Chí Minh", "Phường Bến Thành"),
            (saved.Name, saved.Phone, saved.ProvinceName, saved.WardName));
    }

    [Fact]
    public async Task F07_UTCID02_profile_without_address_is_saved()
    {
        using var app = ProfileApp(); await app.Initialize();
        var saved = await Use<CustomerProfileService, CustomerProfileDto>(app, s => s.Update("customer1", ProfileInput(province: null, ward: null), default));
        Assert.Null(saved.ProvinceCode);
        Assert.Equal("Hoàng Tùng Lâm", saved.Name);
    }

    [Fact]
    public async Task F07_UTCID03_missing_user_is_not_found()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((404, "Không tìm thấy tài khoản."), await ProfileRejects(app, "missing", ProfileInput()));
    }

    [Fact]
    public async Task F07_UTCID04_agency_cannot_use_customer_profile()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((403, "Chỉ khách hàng dùng trang thông tin tài khoản này."), await ProfileRejects(app, "agency1", ProfileInput()));
    }

    [Fact]
    public async Task F07_UTCID05_one_character_name_is_rejected()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((422, "Vui lòng nhập họ và tên (ít nhất 2 ký tự)."), await ProfileRejects(app, "customer1", ProfileInput(name: "A")));
    }

    [Fact]
    public async Task F07_UTCID06_invalid_phone_is_rejected()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((422, "Số điện thoại không hợp lệ (VD 0912345678 hoặc +84912345678)."), await ProfileRejects(app, "customer1", ProfileInput(phone: "12345")));
    }

    [Fact]
    public async Task F07_UTCID07_ward_without_province_is_rejected()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((422, "Vui lòng chọn tỉnh/thành trước khi chọn phường/xã."), await ProfileRejects(app, "customer1", ProfileInput(province: null)));
    }

    [Fact]
    public async Task F07_UTCID08_unknown_province_is_rejected()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((422, "Tỉnh/thành không có trong danh mục."), await ProfileRejects(app, "customer1", ProfileInput(province: "55", ward: null)));
    }

    [Fact]
    public async Task F07_UTCID09_ward_of_another_province_is_rejected()
    {
        using var app = ProfileApp(); await app.Initialize();
        Assert.Equal((422, "Phường/xã không thuộc tỉnh/thành đã chọn."), await ProfileRejects(app, "customer1", ProfileInput(ward: "4")));
    }

    // ============================================================ F-08 AccountService.Submit

    private static ProfileRequest Business(string taxCode = " 0312345678 ") => new(" Du lịch Sao Việt ", taxCode, " 0901234567 ", " 12 Nguyễn Huệ ", "Tour miền Trung");

    private static async Task<(int, string)> SubmitRejects(App app, string userId, ProfileRequest request, byte[]? image = null) =>
        await Rejects(() => Use<AccountService>(app, s => s.Submit(userId, request, image, image is null ? null : "image/png", default)));

    [Fact]
    public async Task F08_UTCID01_new_agency_submits_profile_with_license_image()
    {
        using var app = await UtApp(LocalStorage);
        await AddUser(app, "agency9", UserRole.TravelAgency);
        var profile = await Use<AccountService, ProfileDto>(app, s => s.Submit("agency9", Business(), TinyPng, "image/png", default));
        Assert.Equal(("pending", "Du lịch Sao Việt", "0312345678"), (profile.Status, profile.BusinessName, profile.TaxCode));
        Assert.NotNull(profile.BusinessLicenseUrl);
        Assert.Equal("0901234567", await InDb(app, db => db.Users.Where(u => u.Id == "agency9").Select(u => u.Phone).SingleAsync()));
    }

    [Fact]
    public async Task F08_UTCID02_rejected_provider_resubmits_and_keeps_old_license()
    {
        using var app = await UtApp();
        await AddUser(app, "provider9", UserRole.Provider, BusinessProfileStatus.Rejected);
        var profile = await Use<AccountService, ProfileDto>(app, s => s.Submit("provider9", Business(), null, null, default));
        Assert.Equal("pending", profile.Status);
        Assert.Null(profile.RejectionReason);
        Assert.Contains("license.png", profile.BusinessLicenseUrl);
    }

    [Fact]
    public async Task F08_UTCID03_customer_cannot_submit_business_profile()
    {
        using var app = await UtApp();
        Assert.Equal((403, "Chỉ đối tác được nộp hồ sơ."), await SubmitRejects(app, "customer1", Business(), TinyPng));
    }

    [Fact]
    public async Task F08_UTCID04_approved_profile_cannot_be_resubmitted()
    {
        using var app = await UtApp();
        Assert.Equal((409, "Không thể nộp lại hồ sơ ở trạng thái hiện tại."), await SubmitRejects(app, "agency1", Business(), TinyPng));
    }

    [Fact]
    public async Task F08_UTCID05_suspended_profile_cannot_be_resubmitted()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency, BusinessProfileStatus.Suspended);
        Assert.Equal((409, "Không thể nộp lại hồ sơ ở trạng thái hiện tại."), await SubmitRejects(app, "agency9", Business()));
    }

    [Fact]
    public async Task F08_UTCID06_pending_profile_cannot_be_resubmitted()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency, BusinessProfileStatus.Pending);
        Assert.Equal((409, "Hồ sơ đang chờ duyệt."), await SubmitRejects(app, "agency9", Business()));
    }

    [Fact]
    public async Task F08_UTCID07_blank_tax_code_is_rejected()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency);
        Assert.Equal((400, "Vui lòng điền đầy đủ thông tin."), await SubmitRejects(app, "agency9", Business("   "), TinyPng));
    }

    [Fact]
    public async Task F08_UTCID08_first_submission_without_license_is_rejected()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency);
        Assert.Equal((400, "Vui lòng tải ảnh giấy phép."), await SubmitRejects(app, "agency9", Business()));
    }

    // ============================================================ F-09 AccountService.Review

    private static async Task<int> ProfileId(App app, string userId) =>
        await InDb(app, db => db.BusinessProfiles.Where(p => p.UserId == userId).Select(p => p.Id).SingleAsync());

    [Fact]
    public async Task F09_UTCID01_admin_approves_pending_profile()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency, BusinessProfileStatus.Pending);
        var id = await ProfileId(app, "agency9");
        var profile = await Use<AccountService, ProfileDto>(app, s => s.Review(id, true, null, default));
        Assert.Equal("approved", profile.Status);
        Assert.NotNull(profile.ApprovedAt);
    }

    [Fact]
    public async Task F09_UTCID02_admin_rejects_pending_profile_with_reason()
    {
        using var app = await UtApp();
        await AddUser(app, "provider9", UserRole.Provider, BusinessProfileStatus.Pending);
        var id = await ProfileId(app, "provider9");
        var profile = await Use<AccountService, ProfileDto>(app, s => s.Review(id, false, "  Thiếu giấy phép  ", default));
        Assert.Equal(("rejected", "Thiếu giấy phép"), (profile.Status, profile.RejectionReason));
    }

    [Fact]
    public async Task F09_UTCID03_reject_without_reason_is_refused()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency, BusinessProfileStatus.Pending);
        var id = await ProfileId(app, "agency9");
        Assert.Equal((400, "Vui lòng nhập lý do từ chối."), await Rejects(() => Use<AccountService>(app, s => s.Review(id, false, "   ", default))));
    }

    [Fact]
    public async Task F09_UTCID04_already_approved_profile_cannot_be_reviewed_again()
    {
        using var app = await UtApp();
        var id = await ProfileId(app, "agency1");
        Assert.Equal((409, "Hồ sơ không tồn tại hoặc đã được xử lý. Vui lòng tải lại."),
            await Rejects(() => Use<AccountService>(app, s => s.Review(id, true, null, default))));
    }

    [Fact]
    public async Task F09_UTCID05_missing_profile_cannot_be_reviewed()
    {
        using var app = await UtApp();
        Assert.Equal((409, "Hồ sơ không tồn tại hoặc đã được xử lý. Vui lòng tải lại."),
            await Rejects(() => Use<AccountService>(app, s => s.Review(9999, true, null, default))));
    }

    [Fact]
    public async Task F09_UTCID06_profile_of_a_customer_cannot_be_reviewed()
    {
        using var app = await UtApp();
        await AddUser(app, "customer9", UserRole.User, BusinessProfileStatus.Pending);
        var id = await ProfileId(app, "customer9");
        Assert.Equal((409, "Hồ sơ không tồn tại hoặc đã được xử lý. Vui lòng tải lại."),
            await Rejects(() => Use<AccountService>(app, s => s.Review(id, true, null, default))));
    }

    [Fact]
    public async Task F09_UTCID07_reason_is_ignored_when_approving()
    {
        using var app = await UtApp();
        await AddUser(app, "agency9", UserRole.TravelAgency, BusinessProfileStatus.Pending);
        var id = await ProfileId(app, "agency9");
        var profile = await Use<AccountService, ProfileDto>(app, s => s.Review(id, true, "không cần", default));
        Assert.Equal("approved", profile.Status);
        Assert.Null(profile.RejectionReason);
    }
}
