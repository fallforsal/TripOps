using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    // ============================================================ F-23 BookingQuotationService.ChangePlan

    private static BookingPlanChange Plan(int tourId = 1, int? startInDays = 20, params ParticipantInput[] participants) =>
        new(tourId, StartDate: startInDays is { } d ? DateTime.UtcNow.Date.AddDays(d) : null,
            Participants: participants.Length > 0 ? participants : [Adult("Khách 1"), Adult("Khách 2"), Adult("Khách 3")]);

    private static async Task<(int, string)> PlanRejects(App app, int bookingId, BookingPlanChange plan, string agency = "agency1") =>
        await Rejects(() => Use<BookingQuotationService, QuotationView>(app, s => s.ChangePlan(agency, bookingId, plan, default)));

    [Fact]
    public async Task F23_UTCID01_agency_changes_date_and_guests_of_pending_booking()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Use<BookingQuotationService, QuotationView>(app, s => s.ChangePlan("agency1", booking.Id, Plan(), default));
        var row = await InDb(app, db => db.Bookings.Include(b => b.Participants).SingleAsync(b => b.Id == booking.Id));
        Assert.Equal((DateTime.UtcNow.Date.AddDays(20), 3), (row.StartDate.Date, row.Participants.Count));
    }

    [Fact]
    public async Task F23_UTCID02_booking_of_another_agency_is_not_found()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((404, "Không tìm thấy booking."), await PlanRejects(app, booking.Id, Plan(), "agency2"));
    }

    [Fact]
    public async Task F23_UTCID03_approved_booking_cannot_change_whole_plan()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "approve");
        Assert.Equal((422, "Booking đã duyệt một lần nên không đổi toàn bộ phương án/giá. Agency có thể đổi dịch vụ riêng và tạo phụ thu."),
            await PlanRejects(app, booking.Id, Plan()));
    }

    [Fact]
    public async Task F23_UTCID04_unknown_tour_plan_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Tour plan không thuộc yêu cầu của bạn hoặc chưa sẵn sàng."), await PlanRejects(app, booking.Id, Plan(999)));
    }

    [Fact]
    public async Task F23_UTCID05_21_guests_exceed_tour_plan()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        var many = Enumerable.Range(1, 21).Select(i => Adult($"Khách {i}")).ToArray();
        Assert.Equal((422, "Số khách không phù hợp Tour plan."), await PlanRejects(app, booking.Id, Plan(1, 20, many)));
    }

    [Fact]
    public async Task F23_UTCID06_blank_guest_name_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Cần nhập tên từng hành khách."), await PlanRejects(app, booking.Id, Plan(1, 20, Adult("   "))));
    }

    [Fact]
    public async Task F23_UTCID07_start_date_in_the_past_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Ngày khởi hành không hợp lệ."), await PlanRejects(app, booking.Id, Plan(1, -1)));
    }

    [Fact]
    public async Task F23_UTCID08_pricing_tier_outside_plan_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Nhóm giá không thuộc Tour plan."), await PlanRejects(app, booking.Id, Plan(1, 20, Adult("Khách 1", 99))));
    }

    [Fact]
    public async Task F23_UTCID09_guest_born_after_departure_is_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        var unborn = new ParticipantInput("Em bé", null, DateTime.UtcNow.Date.AddDays(60), "Nữ", null, null);
        Assert.Equal((422, "Ngày sinh không hợp lệ."), await PlanRejects(app, booking.Id, Plan(1, 20, unborn)));
    }

    // ============================================================ F-24 BookingQuotationService.Respond

    private static async Task<(App App, int RequestId, int BookingId)> SupplierRequest(string status = "Pending", DateTime? deadline = null)
    {
        var app = await UtApp();
        await AddUser(app, "provider1", UserRole.Provider, BusinessProfileStatus.Approved);
        var booking = await Book(app);
        var request = new BookingSupplierRequest { BookingId = booking.Id, ProviderId = "provider1", SlotKey = "hotel:1", ServiceName = "Khách sạn Biển Xanh",
            Quantity = 2, Unit = "room_night", EstimatedCost = 1000000, Status = status, ReplyDeadline = deadline,
            ServiceDateFrom = booking.StartDate, ServiceDateTo = booking.StartDate.AddDays(1) };
        await InDb(app, db => { db.BookingSupplierRequests.Add(request); return Task.CompletedTask; });
        return (app, request.Id, booking.Id);
    }

    private static Task<ProviderRequestView> Reply(App app, int id, ProviderReply reply, string provider = "provider1") =>
        Use<BookingQuotationService, ProviderRequestView>(app, s => s.Respond(provider, id, reply, default));

    [Fact]
    public async Task F24_UTCID01_provider_confirms_with_quoted_cost()
    {
        var (app, id, bookingId) = await SupplierRequest();
        using (app)
        {
            var view = await Reply(app, id, new ProviderReply("confirm", 950000, "Giữ 2 phòng"));
            Assert.Equal(("Confirmed", 950000m), (view.Status, view.QuotedCost!.Value));
            Assert.True(await InDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "agency1" && n.BookingId == bookingId)));
        }
    }

    [Fact]
    public async Task F24_UTCID02_provider_rejects_with_reason()
    {
        var (app, id, _) = await SupplierRequest();
        using (app)
        {
            var view = await Reply(app, id, new ProviderReply("reject", null, "Hết phòng"));
            Assert.Equal(("Rejected", (decimal?)null), (view.Status, view.QuotedCost));
        }
    }

    [Fact]
    public async Task F24_UTCID03_provider_sends_counter_offer()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal("CounterOffered", (await Reply(app, id, new ProviderReply("counter", 1200000, "Giá mùa cao điểm"))).Status);
    }

    [Fact]
    public async Task F24_UTCID04_provider_confirms_part_of_quantity()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal("Partial", (await Reply(app, id, new ProviderReply("partial", 500000, "Còn 1 phòng", 1))).Status);
    }

    [Fact]
    public async Task F24_UTCID05_request_of_another_provider_is_not_found()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal((404, "Không tìm thấy yêu cầu Provider."), await Rejects(() => Reply(app, id, new ProviderReply("confirm", 950000, null), "provider2")));
    }

    [Fact]
    public async Task F24_UTCID06_rejected_request_cannot_be_answered_again()
    {
        var (app, id, _) = await SupplierRequest("Rejected");
        using (app) Assert.Equal((422, "Yêu cầu đã được xử lý."), await Rejects(() => Reply(app, id, new ProviderReply("confirm", 950000, null))));
    }

    [Fact]
    public async Task F24_UTCID07_unknown_decision_is_rejected()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal((422, "Phản hồi không hợp lệ."), await Rejects(() => Reply(app, id, new ProviderReply("maybe", 950000, null))));
    }

    [Fact]
    public async Task F24_UTCID08_negative_quoted_cost_is_rejected()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal((422, "Cần nhập giá thực tế không âm."), await Rejects(() => Reply(app, id, new ProviderReply("confirm", -1, null))));
    }

    [Fact]
    public async Task F24_UTCID09_reject_without_reason_is_refused()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal((422, "Cần nhập lý do không thể cung cấp dịch vụ."), await Rejects(() => Reply(app, id, new ProviderReply("reject", null, "  "))));
    }

    [Fact]
    public async Task F24_UTCID10_partial_with_full_quantity_is_rejected()
    {
        var (app, id, _) = await SupplierRequest();
        using (app) Assert.Equal((422, "Số lượng cung cấp một phần không hợp lệ."), await Rejects(() => Reply(app, id, new ProviderReply("partial", 500000, null, 2))));
    }

    [Fact]
    public async Task F24_UTCID11_reply_after_deadline_is_rejected()
    {
        var (app, id, _) = await SupplierRequest(deadline: DateTime.UtcNow.AddHours(-1));
        using (app) Assert.Equal((422, "Đã hết hạn phản hồi."), await Rejects(() => Reply(app, id, new ProviderReply("confirm", 950000, null))));
    }

    [Fact]
    public async Task F24_UTCID12_rejected_booking_cannot_receive_replies()
    {
        var (app, id, bookingId) = await SupplierRequest();
        using (app)
        {
            await Decide(app, bookingId, "reject", "Hết chỗ");
            Assert.Equal((422, "Booking đã kết thúc, bị hủy hoặc từ chối; không thể phản hồi dịch vụ."),
                await Rejects(() => Reply(app, id, new ProviderReply("confirm", 950000, null))));
        }
    }
}
