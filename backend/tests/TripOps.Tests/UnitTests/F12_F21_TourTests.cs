using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;

namespace TripOps.Tests;

// Unit test Report5: tour của Agency (F-12 → F-14), khách xem tour (F-18, F-19), yêu cầu thiết kế tour (F-20, F-21).
public sealed partial class TourFlowTests
{
    private static async Task<App> TourApp() { var app = new App(); await app.Initialize(); return app; }

    private static async Task<T> TUse<T>(App app, Func<TourService, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<TourService>());
    }

    private static async Task<T> DUse<T>(App app, Func<DesignRequestService, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<DesignRequestService>());
    }

    private static async Task<T> TDb<T>(App app, Func<TripOpsDbContext, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<TripOpsDbContext>());
    }

    private static async Task<(int Status, string Message)> TRejects(Func<Task> action)
    {
        try { await action(); }
        catch (TourException e) { return (e.Status, e.Message); }
        throw new Xunit.Sdk.XunitException("Expected a TourException but the call succeeded.");
    }

    private const string TourConflict = "The tour state or version has changed. Reload the tour.";
    private const string NeedAgency = "An approved Agency account is required.";

    private static Task<TourDto> NewTour(App app, TourConfiguration? config = null, string agency = "agency") =>
        TUse(app, s => s.Create(agency, config ?? Complete(), default));

    private static Task<TourDto> Act(App app, TourDto tour, string action, string? reason = null, string agency = "agency") =>
        TUse(app, s => s.Command(agency, tour.Id, action, new TourCommand(tour.Revision, reason), default));

    private static async Task<TourDto> Published(App app, TourConfiguration? config = null, string agency = "agency") =>
        await Act(app, await NewTour(app, config, agency), "publish", agency: agency);

    // ============================================================ F-12 TourService.Create

    private static async Task<(int, string)> CreateRejects(App app, TourConfiguration config, string actor = "agency") =>
        await TRejects(() => TUse(app, s => s.Create(actor, config, default)));

    [Fact]
    public async Task F12_UTCID01_approved_agency_creates_hidden_draft()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal(("draft", "hidden", "agency", "Da Lat tour"), (tour.Status, tour.Visibility, tour.AgencyId, tour.Configuration.Name));
        Assert.Equal("DL2N1D", tour.Code); // mã tự tạo theo điểm đến "Da Lat" + 2 ngày 1 đêm
    }

    [Fact]
    public async Task F12_UTCID02_customer_cannot_create_tour()
    {
        await using var app = await TourApp();
        Assert.Equal((403, NeedAgency), await CreateRejects(app, Complete(), "customer"));
    }

    [Fact]
    public async Task F12_UTCID03_agency_with_pending_profile_cannot_create_tour()
    {
        await using var app = await TourApp();
        Assert.Equal((403, NeedAgency), await CreateRejects(app, Complete(), "pending"));
    }

    [Fact]
    public async Task F12_UTCID04_min_guests_above_max_guests_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Invalid guest range."), await CreateRejects(app, Complete() with { MinGuests = 31 }));
    }

    [Fact]
    public async Task F12_UTCID05_more_nights_than_days_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Nights cannot exceed duration days."), await CreateRejects(app, Complete() with { DurationNights = 3 }));
    }

    [Fact]
    public async Task F12_UTCID06_http_image_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Images must be uploaded files or HTTPS URLs."), await CreateRejects(app, Complete() with { Images = ["http://example.test/a.jpg"] }));
    }

    [Fact]
    public async Task F12_UTCID07_unknown_province_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Mã tỉnh/thành không hợp lệ: 'XYZ'."), await CreateRejects(app, Complete() with { ProvinceCodes = ["XYZ"] }));
    }

    [Fact]
    public async Task F12_UTCID08_overlapping_age_ranges_are_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Pricing age ranges overlap."),
            await CreateRejects(app, Complete() with { PricingTiers = [new("Child", 0, 12, 750000), new("Adult", 12, null, 1500000, 1)] }));
    }

    [Fact]
    public async Task F12_UTCID09_itinerary_day_after_tour_end_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Invalid or duplicate itinerary day."), await CreateRejects(app, Complete() with { Timelines = [new(1, "Arrival"), new(3, "Extra")] }));
    }

    [Fact]
    public async Task F12_UTCID10_min_guests_equal_to_max_guests_is_accepted()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app, Complete() with { MinGuests = 30, MaxGuests = 30 });
        Assert.Equal((30, 30), (tour.Configuration.MinGuests, tour.Configuration.MaxGuests));
    }

    [Fact]
    public async Task F12_UTCID11_tour_code_already_used_is_rejected()
    {
        await using var app = await TourApp();
        await NewTour(app, Complete() with { Code = "DALAT01" });
        Assert.Equal((409, "Mã tour đã được sử dụng."), await CreateRejects(app, Complete("Second") with { Code = "dalat01" }));
    }

    // ============================================================ F-13 TourService.Update

    private static async Task<(int, string)> UpdateRejects(App app, TourDto tour, TourConfiguration config, string actor = "agency", int? revision = null) =>
        await TRejects(() => TUse(app, s => s.Update(actor, tour.Id, new UpdateTourRequest(revision ?? tour.Revision, config, "Sửa tour"), default)));

    [Fact]
    public async Task F13_UTCID01_owner_updates_tour_with_current_revision()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        var updated = await TUse(app, s => s.Update("agency", tour.Id, new UpdateTourRequest(tour.Revision, Complete("Đà Lạt mộng mơ"), "Đổi tên"), default));
        Assert.Equal("Đà Lạt mộng mơ", updated.Configuration.Name);
        Assert.Equal(tour.Revision + 1, updated.Revision);
    }

    [Fact]
    public async Task F13_UTCID02_old_revision_is_rejected()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((409, TourConflict), await UpdateRejects(app, tour, Complete("Mới"), revision: tour.Revision + 5));
    }

    [Fact]
    public async Task F13_UTCID03_tour_of_another_agency_is_not_found()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((404, "Tour not found."), await UpdateRejects(app, tour, Complete("Mới"), "other"));
    }

    [Fact]
    public async Task F13_UTCID04_deleted_tour_cannot_be_updated()
    {
        await using var app = await TourApp();
        var deleted = await Act(app, await NewTour(app), "delete");
        Assert.Equal((404, "Tour not found."), await UpdateRejects(app, deleted, Complete("Mới")));
    }

    [Fact]
    public async Task F13_UTCID05_invalid_configuration_is_rejected()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((422, "Nights cannot exceed duration days."), await UpdateRejects(app, tour, Complete() with { DurationNights = 3 }));
    }

    [Fact]
    public async Task F13_UTCID06_code_of_another_tour_is_rejected()
    {
        await using var app = await TourApp();
        await NewTour(app, Complete() with { Code = "DALAT01" });
        var tour = await NewTour(app, Complete("Second"));
        Assert.Equal((409, "Mã tour đã được sử dụng."), await UpdateRejects(app, tour, Complete("Second") with { Code = "DALAT01" }));
    }

    [Fact]
    public async Task F13_UTCID07_customer_cannot_update_tour()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((403, NeedAgency), await UpdateRejects(app, tour, Complete("Mới"), "customer"));
    }

    // ============================================================ F-14 TourService.Command

    private static async Task<(int, string)> CommandRejects(App app, TourDto tour, string action, string? reason = null, int? revision = null) =>
        await TRejects(() => TUse(app, s => s.Command("agency", tour.Id, action, new TourCommand(revision ?? tour.Revision, reason), default)));

    [Fact]
    public async Task F14_UTCID01_complete_keeps_tour_hidden()
    {
        await using var app = await TourApp();
        var tour = await Act(app, await NewTour(app), "complete");
        Assert.Equal(("completed", "hidden"), (tour.Status, tour.Visibility));
    }

    [Fact]
    public async Task F14_UTCID02_publish_makes_tour_public()
    {
        await using var app = await TourApp();
        var tour = await Published(app);
        Assert.Equal(("completed", "public"), (tour.Status, tour.Visibility));
    }

    [Fact]
    public async Task F14_UTCID03_hide_public_tour_with_reason()
    {
        await using var app = await TourApp();
        var tour = await Act(app, await Published(app), "hide", "Tạm ngưng mùa mưa");
        Assert.Equal(("completed", "hidden"), (tour.Status, tour.Visibility));
    }

    [Fact]
    public async Task F14_UTCID04_hide_without_reason_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Hiding requires a reason."), await CommandRejects(app, await Published(app), "hide", "  "));
    }

    [Fact]
    public async Task F14_UTCID05_delete_draft_tour()
    {
        await using var app = await TourApp();
        var tour = await Act(app, await NewTour(app), "delete");
        Assert.Equal("deleted", tour.Status);
    }

    [Fact]
    public async Task F14_UTCID06_public_tour_cannot_be_deleted()
    {
        await using var app = await TourApp();
        Assert.Equal((409, TourConflict), await CommandRejects(app, await Published(app), "delete"));
    }

    [Fact]
    public async Task F14_UTCID07_public_tour_cannot_be_published_again()
    {
        await using var app = await TourApp();
        Assert.Equal((409, TourConflict), await CommandRejects(app, await Published(app), "publish"));
    }

    [Fact]
    public async Task F14_UTCID08_unknown_action_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((400, "Unknown tour action."), await CommandRejects(app, await NewTour(app), "archive"));
    }

    [Fact]
    public async Task F14_UTCID09_old_revision_is_rejected()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((409, TourConflict), await CommandRejects(app, tour, "publish", revision: tour.Revision + 5));
    }

    [Fact]
    public async Task F14_UTCID10_publish_without_cancellation_policy_is_rejected()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app, Complete() with { CancellationPolicy = null });
        Assert.Equal((422, "Cancellation policy is required for publication."), await CommandRejects(app, tour, "publish"));
    }

    // ============================================================ F-18 TourService.List

    private static async Task<App> CatalogueApp()
    {
        var app = await TourApp();
        await Published(app, Complete("Đà Lạt 2N1Đ"));
        await Published(app, Complete("Phú Quốc 2N1Đ") with { Destination = "Phu Quoc", BasePrice = 4000000 });
        await NewTour(app, Complete("Bản nháp Huế"));
        return app;
    }

    private static Task<TourPage<TourListItem>> Browse(App app, string? actor = null, string? status = null, string? search = null,
        decimal? maxPrice = null, int? headcount = null, int pageSize = 20) =>
        TUse(app, s => s.List(actor, false, status, search, null, maxPrice, headcount, 1, pageSize, default));

    [Fact]
    public async Task F18_UTCID01_guest_sees_only_public_tours()
    {
        await using var app = await CatalogueApp();
        var page = await Browse(app);
        Assert.Equal(2, page.Total);
        Assert.All(page.Items, t => Assert.Equal("public", t.Visibility));
    }

    [Fact]
    public async Task F18_UTCID02_guest_searches_by_name()
    {
        await using var app = await CatalogueApp();
        var page = await Browse(app, search: "Phú Quốc");
        Assert.Equal("Phú Quốc 2N1Đ", Assert.Single(page.Items).Name);
    }

    [Fact]
    public async Task F18_UTCID03_agency_sees_own_drafts_too()
    {
        await using var app = await CatalogueApp();
        Assert.Equal(3, (await Browse(app, "agency")).Total);
    }

    [Fact]
    public async Task F18_UTCID04_unknown_status_is_rejected()
    {
        await using var app = await CatalogueApp();
        Assert.Equal((400, "Invalid status."), await TRejects(() => Browse(app, "agency", status: "archived")));
    }

    [Fact]
    public async Task F18_UTCID05_negative_max_price_is_rejected()
    {
        await using var app = await CatalogueApp();
        Assert.Equal((400, "Invalid price or headcount filter."), await TRejects(() => Browse(app, maxPrice: -1)));
    }

    [Fact]
    public async Task F18_UTCID06_zero_headcount_is_rejected()
    {
        await using var app = await CatalogueApp();
        Assert.Equal((400, "Invalid price or headcount filter."), await TRejects(() => Browse(app, headcount: 0)));
    }

    [Fact]
    public async Task F18_UTCID07_customer_cannot_use_agency_listing()
    {
        await using var app = await CatalogueApp();
        Assert.Equal((403, NeedAgency), await TRejects(() => Browse(app, "customer")));
    }

    [Fact]
    public async Task F18_UTCID08_page_size_above_100_is_capped()
    {
        await using var app = await CatalogueApp();
        Assert.Equal(100, (await Browse(app, pageSize: 500)).PageSize);
    }

    // ============================================================ F-19 TourService.PublicGet

    [Fact]
    public async Task F19_UTCID01_public_tour_detail_is_returned()
    {
        await using var app = await TourApp();
        var tour = await Published(app);
        var detail = await TUse(app, s => s.PublicGet(tour.Id, default));
        Assert.Equal(("Da Lat tour", "agency"), (detail.Configuration.Name, detail.AgencyId));
    }

    [Fact]
    public async Task F19_UTCID02_draft_tour_is_not_found()
    {
        await using var app = await TourApp();
        var tour = await NewTour(app);
        Assert.Equal((404, "Tour not found."), await TRejects(() => TUse(app, s => s.PublicGet(tour.Id, default))));
    }

    [Fact]
    public async Task F19_UTCID03_hidden_tour_is_not_found()
    {
        await using var app = await TourApp();
        var tour = await Act(app, await Published(app), "hide", "Tạm ngưng");
        Assert.Equal((404, "Tour not found."), await TRejects(() => TUse(app, s => s.PublicGet(tour.Id, default))));
    }

    [Fact]
    public async Task F19_UTCID04_missing_tour_is_not_found()
    {
        await using var app = await TourApp();
        Assert.Equal((404, "Tour not found."), await TRejects(() => TUse(app, s => s.PublicGet(9999, default))));
    }

    // ============================================================ F-20 DesignRequestService.Create

    private static CreateDesignRequestInput DesignInput(string agency = "agency", int fromToday = 10, int days = 2, string destination = "Đà Lạt",
        int? source = null, JsonElement? changes = null) =>
        new(agency, "Nguyễn Văn Khách", "customer@example.test", "0901234567", destination,
            DateTime.UtcNow.Date.AddDays(fromToday), DateTime.UtcNow.Date.AddDays(fromToday + days), 4, 2000000, "4 sao", null, null, source, changes);

    private static async Task<(int, string)> DesignRejects(App app, CreateDesignRequestInput input, string actor = "customer") =>
        await TRejects(() => DUse(app, s => s.Create(actor, input, default)));

    [Fact]
    public async Task F20_UTCID01_customer_sends_design_request_to_agency()
    {
        await using var app = await TourApp();
        var request = await DUse(app, s => s.Create("customer", DesignInput(), default));
        Assert.Equal(("agency", "Đà Lạt", 4), (request.AgencyId, request.Destination, request.NumberOfPeople));
        Assert.Equal(CustomRequestStatus.Pending, await TDb(app, db => db.TourDesignRequests.Where(r => r.Id == request.Id).Select(r => r.Status).SingleAsync()));
        Assert.True(await TDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "agency" && n.RequestId == request.Id)));
    }

    [Fact]
    public async Task F20_UTCID02_agency_cannot_send_design_request()
    {
        await using var app = await TourApp();
        Assert.Equal((403, "Cần tài khoản khách hàng."), await DesignRejects(app, DesignInput(), "agency"));
    }

    [Fact]
    public async Task F20_UTCID03_departure_in_the_past_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Ngày đi/về không hợp lệ."), await DesignRejects(app, DesignInput(fromToday: -1)));
    }

    [Fact]
    public async Task F20_UTCID04_return_before_departure_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Ngày đi/về không hợp lệ."), await DesignRejects(app, DesignInput(days: -1)));
    }

    [Fact]
    public async Task F20_UTCID05_same_day_trip_starting_today_is_accepted()
    {
        await using var app = await TourApp();
        var request = await DUse(app, s => s.Create("customer", DesignInput(fromToday: 0, days: 0), default));
        Assert.Equal(request.DepartureDate.Date, request.ReturnDate!.Value.Date);
    }

    [Fact]
    public async Task F20_UTCID06_blank_destination_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Vui lòng nhập điểm đến và người liên hệ."), await DesignRejects(app, DesignInput(destination: "  ")));
    }

    [Fact]
    public async Task F20_UTCID07_agency_not_approved_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Agency đã chọn không khả dụng."), await DesignRejects(app, DesignInput("pending")));
    }

    [Fact]
    public async Task F20_UTCID08_sample_tour_of_another_agency_is_rejected()
    {
        await using var app = await TourApp();
        var sample = await Published(app, Complete("Tour mẫu"), "other");
        Assert.Equal((422, "Hãy gửi tới Agency sở hữu Tour mẫu."), await DesignRejects(app, DesignInput(source: sample.Id)));
    }

    [Fact]
    public async Task F20_UTCID09_custom_changes_without_sample_tour_are_rejected()
    {
        await using var app = await TourApp();
        var changes = JsonSerializer.SerializeToElement(new { note = "thêm 1 đêm" });
        Assert.Equal((422, "Đề xuất tùy chỉnh không hợp lệ."), await DesignRejects(app, DesignInput(changes: changes)));
    }

    [Fact]
    public async Task F20_UTCID10_request_based_on_own_sample_tour_keeps_snapshot()
    {
        await using var app = await TourApp();
        var sample = await Published(app, Complete("Tour mẫu"));
        var request = await DUse(app, s => s.Create("customer", DesignInput(source: sample.Id), default));
        var row = await TDb(app, db => db.TourDesignRequests.SingleAsync(r => r.Id == request.Id));
        Assert.Equal(sample.Id, row.SourceTourId);
        Assert.Contains("Two day trip", row.SourceSnapshotJson);
    }

    // ============================================================ F-21 DesignRequestService.Act

    private static Task<DesignRequestDto> SentRequest(App app) => DUse(app, s => s.Create("customer", DesignInput(), default));

    private static async Task<(int, string)> ActRejects(App app, int id, string action, string? reason = null, string actor = "agency") =>
        await TRejects(() => DUse(app, s => s.Act(actor, id, new DesignRequestAction(action, reason), default)));

    [Fact]
    public async Task F21_UTCID01_agency_accepts_request_for_design()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        await DUse(app, s => s.Act("agency", request.Id, new DesignRequestAction("review"), default));
        Assert.Equal(CustomRequestStatus.InProgress, await TDb(app, db => db.TourDesignRequests.Where(r => r.Id == request.Id).Select(r => r.Status).SingleAsync()));
        Assert.Equal("accepted", await TDb(app, db => db.TourDesignRequestAgencies.Where(a => a.TourDesignRequestId == request.Id && a.AgencyId == "agency").Select(a => a.Status).SingleAsync()));
    }

    [Fact]
    public async Task F21_UTCID02_agency_rejects_request_with_reason()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        var result = await DUse(app, s => s.Act("agency", request.Id, new DesignRequestAction("reject", "  Hết lịch tháng này  "), default));
        Assert.Equal("Hết lịch tháng này", result.RejectionReason);
        Assert.True(await TDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "customer" && n.Message.Contains("Hết lịch tháng này"))));
    }

    [Fact]
    public async Task F21_UTCID03_reject_without_reason_is_refused()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        Assert.Equal((422, "Vui lòng nhập lý do từ chối."), await ActRejects(app, request.Id, "reject", " "));
    }

    [Fact]
    public async Task F21_UTCID04_request_of_another_agency_is_not_found()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        Assert.Equal((404, "Yêu cầu không tồn tại."), await ActRejects(app, request.Id, "review", actor: "other"));
    }

    [Fact]
    public async Task F21_UTCID05_rejected_request_cannot_change_again()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        await DUse(app, s => s.Act("agency", request.Id, new DesignRequestAction("reject", "Hết lịch"), default));
        Assert.Equal((422, "Yêu cầu không thể thay đổi trạng thái."), await ActRejects(app, request.Id, "review"));
    }

    [Fact]
    public async Task F21_UTCID06_unknown_action_is_rejected()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        Assert.Equal((422, "Thao tác không hợp lệ."), await ActRejects(app, request.Id, "accept"));
    }

    [Fact]
    public async Task F21_UTCID07_request_with_designed_tour_cannot_be_rejected()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            db.Tours.Add(new Tour { AgencyId = "agency", Name = "Thiết kế riêng", DesignRequestId = request.Id, IsRequest = true,
                Status = TourStatus.Draft, Visibility = TourVisibility.Hidden });
            await db.SaveChangesAsync();
        }
        Assert.Equal((422, "Yêu cầu đã có tour thiết kế."), await ActRejects(app, request.Id, "reject", "Hết lịch"));
    }

    [Fact]
    public async Task F21_UTCID08_customer_cannot_act_on_request()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        Assert.Equal((403, NeedAgency), await ActRejects(app, request.Id, "review", actor: "customer"));
    }
}
