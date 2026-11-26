using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Contracts;
using TripOps.Service.Tours;

namespace TripOps.Tests;

// Unit test Report5 cho các luồng chính mới (F-46 → F-52):
// Agency quản lý mẫu hợp đồng (F-46 → F-49) và mời / phản hồi / gỡ Agency đối tác đồng tổ chức tour thiết kế (F-50 → F-52).
// Tên test: F{mã function}_UTCID{số}_{mô tả} — khớp cột UTCID trong file Report5_Unit_Test.
public sealed partial class TourFlowTests
{
    // ------------------------------------------------------------ hỗ trợ

    private static async Task<T> CUse<T>(App app, Func<ContractTemplateService, Task<T>> action)
    {
        using var scope = app.Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<ContractTemplateService>());
    }

    private static async Task CUse(App app, Func<ContractTemplateService, Task> action)
    {
        using var scope = app.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<ContractTemplateService>());
    }

    private static async Task TUse(App app, Func<TourService, Task> action)
    {
        using var scope = app.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<TourService>());
    }

    private static ContractTemplateRequest Template(string? name = null, bool activate = false, params (int Days, decimal Fee)[] tiers) =>
        new((tiers.Length == 0 ? [(30, 0m), (15, 30m), (7, 70m)] : tiers).Select(t => new CancellationTier(t.Days, t.Fee)).ToList(),
            null, null, Name: name, Activate: activate);

    private static Task<ContractTemplateDto> NewTemplate(App app, string? name = null, bool activate = false, string agency = "agency") =>
        CUse(app, s => s.Create(agency, Template(name, activate), default));

    private static async Task<(int Status, string Message)> TemplateRejects(App app, Func<ContractTemplateService, Task> action)
    {
        try { await CUse(app, action); }
        catch (TripOps.Service.Bookings.BookingException e) { return (e.Status, e.Message); }
        throw new Xunit.Sdk.XunitException("Expected a BookingException but the call succeeded.");
    }

    /// <summary>Yêu cầu thiết kế đã được Agency "agency" tiếp nhận và đã lưu phiên bản tour đầu tiên.</summary>
    private static async Task<int> DesignWithVersion(App app, bool saveTour = true)
    {
        var request = await SentRequest(app);
        await DUse(app, s => s.Act("agency", request.Id, new DesignRequestAction("review"), default));
        if (saveTour) await TUse(app, s => s.SaveForRequest("agency", request.Id, new SaveDesignTourInput(null, Complete()), default));
        return request.Id;
    }

    private static Task Invite(App app, int id, string partner = "other", string actor = "agency") =>
        TUse(app, s => s.InviteCoHost(actor, id, new InviteDesignCoHost(partner, Segment: "Ngày 2", Budget: 500000m, Notes: "Phụ trách ngày 2"), default));

    private static Task Decide(App app, int id, string action, string? reason = null, string actor = "other") =>
        TUse(app, s => s.DecideCoHost(actor, id, new DesignCoHostDecision(action, reason), default));

    private static Task<string> PartnerStatus(App app, int id, string partner = "other") =>
        TDb(app, db => db.TourVersionAgencies.Where(a => a.TourVersion.Tour.DesignRequestId == id && a.AgencyId == partner)
            .OrderByDescending(a => a.Id).Select(a => a.Status).FirstAsync());

    private static async Task<int> CurrentVersion(App app, int id) =>
        await TDb(app, db => db.Tours.Where(t => t.DesignRequestId == id).Select(t => t.Version ?? 1).SingleAsync());

    // ============================================================ F-46 ContractTemplateService.Create

    [Fact]
    public async Task F46_UTCID01_create_named_template_and_apply_it()
    {
        await using var app = await TourApp();
        var dto = await CUse(app, s => s.Create("agency", Template("  Mùa   thường ", true, (7, 70m), (30, 0m), (15, 30m)), default));
        Assert.Equal("Mùa thường", dto.Name);
        Assert.True(dto.IsActive);
        Assert.Equal([30, 15, 7], dto.Tiers.Select(t => t.MinDays));
        Assert.Equal(1, await TDb(app, db => db.AgencyContractTemplates.CountAsync(t => t.AgencyId == "agency")));
    }

    [Fact]
    public async Task F46_UTCID02_first_template_without_name_gets_default_name()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app);
        Assert.Equal("Mẫu hợp đồng", dto.Name);
        Assert.False(dto.IsActive);
    }

    [Fact]
    public async Task F46_UTCID03_later_templates_without_name_are_numbered()
    {
        await using var app = await TourApp();
        await NewTemplate(app);
        Assert.Equal("Mẫu mới", (await NewTemplate(app)).Name);
        Assert.Equal("Mẫu mới (2)", (await NewTemplate(app)).Name);
    }

    [Fact]
    public async Task F46_UTCID04_activating_new_template_deactivates_old_one()
    {
        await using var app = await TourApp();
        var old = await NewTemplate(app, "Mùa thường", activate: true);
        var tet = await NewTemplate(app, "Lễ Tết", activate: true);
        Assert.True(tet.IsActive);
        Assert.False(await TDb(app, db => db.AgencyContractTemplates.Where(t => t.Id == old.Id).Select(t => t.IsActive).SingleAsync()));
    }

    [Fact]
    public async Task F46_UTCID05_duplicate_name_is_rejected()
    {
        await using var app = await TourApp();
        await NewTemplate(app, "Mùa thường");
        Assert.Equal((409, "Đã có mẫu tên \"mùa THƯỜNG\". Hãy đặt tên khác."),
            await TemplateRejects(app, s => s.Create("agency", Template("mùa THƯỜNG"), default)));
    }

    [Fact]
    public async Task F46_UTCID06_twenty_first_template_is_rejected()
    {
        await using var app = await TourApp();
        for (var i = 1; i <= 20; i++) await NewTemplate(app, $"Mẫu {i}");
        Assert.Equal((409, "Mỗi công ty lưu tối đa 20 mẫu hợp đồng. Hãy xóa bớt mẫu không dùng."),
            await TemplateRejects(app, s => s.Create("agency", Template("Mẫu 21"), default)));
    }

    [Fact]
    public async Task F46_UTCID07_name_longer_than_120_characters_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Tên mẫu tối đa 120 ký tự."),
            await TemplateRejects(app, s => s.Create("agency", Template(new string('a', 121)), default)));
    }

    [Fact]
    public async Task F46_UTCID08_empty_cancellation_tiers_are_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Cần ít nhất một mốc phí hủy."),
            await TemplateRejects(app, s => s.Create("agency", new ContractTemplateRequest([], null, null, Name: "Rỗng"), default)));
    }

    [Fact]
    public async Task F46_UTCID09_lower_fee_closer_to_departure_is_rejected()
    {
        await using var app = await TourApp();
        Assert.Equal((422, "Hủy càng sát ngày khởi hành thì phí không được thấp hơn mốc xa hơn."),
            await TemplateRejects(app, s => s.Create("agency", Template("Sai", false, (30, 50m), (7, 20m)), default)));
    }

    // ============================================================ F-47 ContractTemplateService.Update

    [Fact]
    public async Task F47_UTCID01_update_name_and_tiers()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mùa thường");
        var updated = await CUse(app, s => s.Update("agency", dto.Id!.Value, Template("Mùa cao điểm", false, (45, 10m), (10, 80m)), default));
        Assert.Equal("Mùa cao điểm", updated.Name);
        Assert.Equal([45, 10], updated.Tiers.Select(t => t.MinDays));
    }

    [Fact]
    public async Task F47_UTCID02_empty_name_keeps_old_name()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mùa thường");
        Assert.Equal("Mùa thường", (await CUse(app, s => s.Update("agency", dto.Id!.Value, Template(), default))).Name);
    }

    [Fact]
    public async Task F47_UTCID03_update_with_activate_applies_template()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mùa thường");
        Assert.True((await CUse(app, s => s.Update("agency", dto.Id!.Value, Template(activate: true), default))).IsActive);
    }

    [Fact]
    public async Task F47_UTCID04_rename_to_existing_name_is_rejected()
    {
        await using var app = await TourApp();
        await NewTemplate(app, "Lễ Tết");
        var dto = await NewTemplate(app, "Mùa thường");
        Assert.Equal((409, "Đã có mẫu tên \"Lễ Tết\". Hãy đặt tên khác."),
            await TemplateRejects(app, s => s.Update("agency", dto.Id!.Value, Template("Lễ Tết"), default)));
    }

    [Fact]
    public async Task F47_UTCID05_template_of_another_agency_is_not_found()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mẫu của đối tác", agency: "other");
        Assert.Equal((404, "Không tìm thấy mẫu hợp đồng."),
            await TemplateRejects(app, s => s.Update("agency", dto.Id!.Value, Template(), default)));
    }

    [Fact]
    public async Task F47_UTCID06_fee_above_100_percent_is_rejected()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mùa thường");
        Assert.Equal((422, "Phí hủy phải từ 0% đến 100%."),
            await TemplateRejects(app, s => s.Update("agency", dto.Id!.Value, Template(null, false, (10, 100.5m)), default)));
    }

    // ============================================================ F-48 ContractTemplateService.Activate

    [Fact]
    public async Task F48_UTCID01_activate_switches_applied_template()
    {
        await using var app = await TourApp();
        var normal = await NewTemplate(app, "Mùa thường", activate: true);
        var tet = await NewTemplate(app, "Lễ Tết");
        Assert.True((await CUse(app, s => s.Activate("agency", tet.Id!.Value, default))).IsActive);
        Assert.False(await TDb(app, db => db.AgencyContractTemplates.Where(t => t.Id == normal.Id).Select(t => t.IsActive).SingleAsync()));
    }

    [Fact]
    public async Task F48_UTCID02_activate_template_already_applied_keeps_it_applied()
    {
        await using var app = await TourApp();
        var normal = await NewTemplate(app, "Mùa thường", activate: true);
        Assert.True((await CUse(app, s => s.Activate("agency", normal.Id!.Value, default))).IsActive);
        Assert.Equal(1, await TDb(app, db => db.AgencyContractTemplates.CountAsync(t => t.AgencyId == "agency" && t.IsActive)));
    }

    [Fact]
    public async Task F48_UTCID03_unknown_template_is_not_found()
    {
        await using var app = await TourApp();
        Assert.Equal((404, "Không tìm thấy mẫu hợp đồng."), await TemplateRejects(app, s => s.Activate("agency", 999999, default)));
    }

    // ============================================================ F-49 ContractTemplateService.Delete

    [Fact]
    public async Task F49_UTCID01_delete_template_not_applied()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Lễ Tết");
        await CUse(app, s => s.Delete("agency", dto.Id!.Value, default));
        Assert.False(await TDb(app, db => db.AgencyContractTemplates.AnyAsync(t => t.Id == dto.Id)));
    }

    [Fact]
    public async Task F49_UTCID02_applied_template_cannot_be_deleted()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mùa thường", activate: true);
        Assert.Equal((409, "Mẫu này đang được áp dụng. Hãy chọn mẫu khác (hoặc mẫu mặc định TripOps) trước khi xóa."),
            await TemplateRejects(app, s => s.Delete("agency", dto.Id!.Value, default)));
    }

    [Fact]
    public async Task F49_UTCID03_template_of_another_agency_is_not_found()
    {
        await using var app = await TourApp();
        var dto = await NewTemplate(app, "Mẫu của đối tác", agency: "other");
        Assert.Equal((404, "Không tìm thấy mẫu hợp đồng."), await TemplateRejects(app, s => s.Delete("agency", dto.Id!.Value, default)));
        Assert.True(await TDb(app, db => db.AgencyContractTemplates.AnyAsync(t => t.Id == dto.Id)));
    }

    // ============================================================ F-50 TourService.InviteCoHost

    [Fact]
    public async Task F50_UTCID01_lead_invites_partner_agency()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        Assert.Equal("pending", await PartnerStatus(app, id));
        Assert.True(await TDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "other" && n.RequestId == id && n.Message.Contains("lời mời đồng tổ chức"))));
    }

    [Fact]
    public async Task F50_UTCID02_lead_cannot_invite_itself()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        Assert.Equal((422, "Hãy chọn Agency đối tác khác."), await TRejects(() => Invite(app, id, partner: "agency")));
    }

    [Fact]
    public async Task F50_UTCID03_account_that_is_not_an_approved_agency_is_rejected()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        Assert.Equal((422, "Đối tác chưa được phê duyệt hoặc ngừng hoạt động."), await TRejects(() => Invite(app, id, partner: "customer")));
    }

    [Fact]
    public async Task F50_UTCID04_invite_before_saving_a_tour_version_is_rejected()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app, saveTour: false);
        Assert.Equal((422, "Hãy lưu phiên bản tour trước khi mời đối tác."), await TRejects(() => Invite(app, id)));
    }

    [Fact]
    public async Task F50_UTCID05_partner_with_pending_invitation_cannot_be_invited_again()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        Assert.Equal((422, "Đối tác đã tham gia hoặc đang có lời mời trong phiên bản này."), await TRejects(() => Invite(app, id)));
    }

    [Fact]
    public async Task F50_UTCID06_request_not_yet_accepted_is_rejected()
    {
        await using var app = await TourApp();
        var request = await SentRequest(app);
        Assert.Equal((422, "Yêu cầu chưa tiếp nhận hoặc đã đóng. Hãy mở lại yêu cầu nếu cần tiếp tục."), await TRejects(() => Invite(app, request.Id)));
    }

    [Fact]
    public async Task F50_UTCID07_agency_that_is_not_the_lead_cannot_invite()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        Assert.Equal((404, "Không tìm thấy yêu cầu."),
            await TRejects(() => Invite(app, id, partner: "agency", actor: "other")));
    }

    // ============================================================ F-51 TourService.DecideCoHost

    [Fact]
    public async Task F51_UTCID01_partner_accepts_invitation()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        await Decide(app, id, "accept");
        Assert.Equal("accepted", await PartnerStatus(app, id));
        Assert.True(await TDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "agency" && n.RequestId == id && n.Message.Contains("chấp nhận"))));
    }

    [Fact]
    public async Task F51_UTCID02_partner_rejects_invitation_with_reason()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        await Decide(app, id, "reject", "  Kín lịch tháng 12  ");
        Assert.Equal("rejected", await PartnerStatus(app, id));
        Assert.Equal("Kín lịch tháng 12", await TDb(app, db => db.TourDesignRequestAgencies
            .Where(a => a.TourDesignRequestId == id && a.AgencyId == "other").Select(a => a.CommunicationNotes).SingleAsync()));
    }

    [Fact]
    public async Task F51_UTCID03_reject_without_reason_is_refused()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        Assert.Equal((422, "Hãy nhập lý do từ chối."), await TRejects(() => Decide(app, id, "reject", "  ")));
    }

    [Fact]
    public async Task F51_UTCID04_invitation_already_answered_cannot_be_answered_again()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        await Decide(app, id, "accept");
        Assert.Equal((422, "Lời mời đã được phản hồi hoặc thu hồi."), await TRejects(() => Decide(app, id, "reject", "Đổi ý")));
    }

    [Fact]
    public async Task F51_UTCID05_agency_without_invitation_gets_not_found()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        Assert.Equal((404, "Không có lời mời."), await TRejects(() => Decide(app, id, "accept")));
    }

    // ============================================================ F-52 TourService.RemoveCoHost

    private async Task<(App App, int Id, int Version)> AcceptedPartner()
    {
        var app = await TourApp();
        var id = await DesignWithVersion(app);
        await Invite(app, id);
        await Decide(app, id, "accept");
        return (app, id, await CurrentVersion(app, id));
    }

    [Fact]
    public async Task F52_UTCID01_lead_removes_partner_with_reason()
    {
        var (app, id, version) = await AcceptedPartner();
        await using var _ = app;
        await TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, "  Đối tác không đáp ứng lịch  "));
        Assert.Equal("excluded", await PartnerStatus(app, id));
        Assert.True(await TDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "other" && n.Message.Contains("Đối tác không đáp ứng lịch"))));
    }

    [Fact]
    public async Task F52_UTCID02_remove_without_reason_is_refused()
    {
        var (app, id, version) = await AcceptedPartner();
        await using var _ = app;
        Assert.Equal((422, "Hãy nhập lý do gỡ đối tác (tối đa 2000 ký tự)."),
            await TRejects(() => TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, " "))));
    }

    [Fact]
    public async Task F52_UTCID03_reason_longer_than_2000_characters_is_refused()
    {
        var (app, id, version) = await AcceptedPartner();
        await using var _ = app;
        Assert.Equal((422, "Hãy nhập lý do gỡ đối tác (tối đa 2000 ký tự)."),
            await TRejects(() => TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, new string('x', 2001)))));
    }

    [Fact]
    public async Task F52_UTCID04_lead_agency_cannot_be_removed()
    {
        var (app, id, version) = await AcceptedPartner();
        await using var _ = app;
        Assert.Equal((422, "Không thể gỡ Agency chủ trì."),
            await TRejects(() => TUse(app, s => s.RemoveCoHost("agency", id, "agency", default, version, "Thử gỡ"))));
    }

    [Fact]
    public async Task F52_UTCID05_agency_not_in_version_is_not_found()
    {
        await using var app = await TourApp();
        var id = await DesignWithVersion(app);
        var version = await CurrentVersion(app, id);
        Assert.Equal((404, "Đối tác không có trong phiên bản này."),
            await TRejects(() => TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, "Không còn hợp tác"))));
    }

    [Fact]
    public async Task F52_UTCID06_partner_already_removed_cannot_be_removed_again()
    {
        var (app, id, version) = await AcceptedPartner();
        await using var _ = app;
        await TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, "Lần 1"));
        Assert.Equal((422, "Đối tác đã bị gỡ khỏi phiên bản này."),
            await TRejects(() => TUse(app, s => s.RemoveCoHost("agency", id, "other", default, version, "Lần 2"))));
    }
}
