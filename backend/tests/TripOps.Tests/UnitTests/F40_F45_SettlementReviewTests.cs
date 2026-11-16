using Microsoft.EntityFrameworkCore;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Reviews;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    // ============================================================ F-40 AgencySettlementService.PayoutNow

    private static async Task<(App App, FakePayout Payout, TestClock Clock, int SettlementId)> CompletedSettlement(bool paid = true, bool configured = true)
    {
        var payout = new FakePayout();
        var clock = new TestClock { Fixed = Now() };
        var app = configured ? SettlementApp(payout, clock) : new App(WithClock(clock));
        await app.Initialize();
        var (_, _, booking) = await CompletedTour(app, paid);
        var id = await InDb(app, db => db.BookingAgencies.Where(a => a.BookingId == booking.Id).Select(a => a.Id).SingleAsync());
        return (app, payout, clock, id);
    }

    private static Task<SettlementDto> PayNow(App app, int id, decimal? amount = null, string? note = null) =>
        Use<AgencySettlementService, SettlementDto>(app, s => s.PayoutNow("admin1", id, new SettlementPayoutRequest(amount, note), default));

    [Fact]
    public async Task F40_UTCID01_admin_pays_out_net_amount_of_paid_completed_tour()
    {
        var (app, payout, _, id) = await CompletedSettlement();
        using (app)
        {
            var settlement = await PayNow(app, id);
            Assert.Equal("Processing", settlement.Status);
            Assert.Equal(9000000, Assert.Single(payout.ByKey.Values).Amount);
        }
    }

    [Fact]
    public async Task F40_UTCID02_payout_channel_not_configured_is_unavailable()
    {
        var (app, _, _, id) = await CompletedSettlement(configured: false);
        using (app) Assert.Equal((503, "Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout:ClientId/ApiKey/ChecksumKey)."), await Rejects(() => PayNow(app, id)));
    }

    [Fact]
    public async Task F40_UTCID03_customer_not_paid_in_full_blocks_payout()
    {
        var (app, _, _, id) = await CompletedSettlement(paid: false);
        using (app)
        {
            var (status, message) = await Rejects(() => PayNow(app, id));
            Assert.Equal(409, status);
            Assert.StartsWith("Khách chưa thanh toán đủ (đã trả 0đ / 10.000.000đ).", message);
        }
    }

    [Fact]
    public async Task F40_UTCID04_amount_above_net_is_rejected()
    {
        var (app, _, _, id) = await CompletedSettlement();
        using (app) Assert.Equal((422, "Số tiền chuyển không được lớn hơn số Agency được nhận (9.000.000đ)."), await Rejects(() => PayNow(app, id, 9500000)));
    }

    [Fact]
    public async Task F40_UTCID05_smaller_amount_without_note_is_rejected()
    {
        var (app, _, _, id) = await CompletedSettlement();
        using (app) Assert.Equal((422, "Chuyển ít hơn số Agency được nhận: vui lòng ghi rõ lý do."), await Rejects(() => PayNow(app, id, 8000000)));
    }

    [Fact]
    public async Task F40_UTCID06_smaller_amount_with_note_is_accepted()
    {
        var (app, payout, _, id) = await CompletedSettlement();
        using (app)
        {
            await PayNow(app, id, 8000000, "Trừ 1.000.000đ bồi thường khách");
            Assert.Equal(8000000, Assert.Single(payout.ByKey.Values).Amount);
        }
    }

    [Fact]
    public async Task F40_UTCID07_second_payout_while_processing_is_refused()
    {
        var (app, _, _, id) = await CompletedSettlement();
        using (app)
        {
            await PayNow(app, id);
            Assert.Equal((409, "Đang có lệnh chuyển tiền: bấm \"Kiểm tra\" để lấy kết quả trước khi làm thao tác khác."), await Rejects(() => PayNow(app, id)));
        }
    }

    [Fact]
    public async Task F40_UTCID08_decimal_amount_is_rejected()
    {
        var (app, _, _, id) = await CompletedSettlement();
        using (app) Assert.Equal((422, "Số tiền chuyển phải là số nguyên dương."), await Rejects(() => PayNow(app, id, 8000000.5m)));
    }

    [Fact]
    public async Task F40_UTCID09_missing_settlement_is_not_found()
    {
        var (app, _, _, _) = await CompletedSettlement();
        using (app) Assert.Equal((404, "Không tìm thấy khoản quyết toán."), await Rejects(() => PayNow(app, 9999)));
    }

    // ============================================================ F-41 AgencySettlementService.RunDue

    private static Task<SettlementRunResult> RunSettlements(App app) => Use<AgencySettlementService, SettlementRunResult>(app, s => s.RunDue(default));

    [Fact]
    public async Task F41_UTCID01_due_paid_settlement_is_paid_out_automatically()
    {
        var (app, payout, clock, _) = await CompletedSettlement();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(2).AddMinutes(1);
            var run = await RunSettlements(app);
            Assert.Equal((true, 1, 0), (run.Configured, run.Started, run.Waiting));
            Assert.Equal(9000000, Assert.Single(payout.ByKey.Values).Amount);
        }
    }

    [Fact]
    public async Task F41_UTCID02_settlement_before_due_date_is_not_started()
    {
        var (app, payout, clock, _) = await CompletedSettlement();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(1);
            var run = await RunSettlements(app);
            Assert.Equal((0, 0), (run.Started, payout.CreateCalls));
        }
    }

    [Fact]
    public async Task F41_UTCID03_unpaid_booking_waits_at_due_date()
    {
        var (app, payout, clock, _) = await CompletedSettlement(paid: false);
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(2).AddMinutes(1);
            var run = await RunSettlements(app);
            Assert.Equal((0, 1, 0), (run.Started, run.Waiting, payout.CreateCalls));
        }
    }

    [Fact]
    public async Task F41_UTCID04_payout_channel_not_configured_skips_run()
    {
        var (app, _, _, _) = await CompletedSettlement(configured: false);
        using (app)
        {
            var run = await RunSettlements(app);
            Assert.False(run.Configured);
            Assert.Equal("Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout): không chuyển tự động.", Assert.Single(run.Errors));
        }
    }

    [Fact]
    public async Task F41_UTCID05_processing_payout_confirmed_by_payos_is_marked_paid()
    {
        var (app, payout, clock, id) = await CompletedSettlement();
        using (app)
        {
            await PayNow(app, id);
            payout.Complete(payout.ByKey.Values.Single().ReferenceId);
            clock.Fixed = clock.Fixed!.Value.AddMinutes(5);
            var run = await RunSettlements(app);
            Assert.Equal(1, run.Synced);
            Assert.Equal(SettlementStatus.Paid, await InDb(app, db => db.BookingAgencies.Where(a => a.Id == id).Select(a => a.SettlementStatus).SingleAsync()));
        }
    }

    // ============================================================ F-42 FeedbackService.Create

    private static async Task<(App App, TestClock Clock, int BookingId)> CompletedTrip()
    {
        var clock = new TestClock { Fixed = Now() };
        var app = await UtApp(builder => { WithClock(clock)(builder); LocalStorage(builder); });
        var booking = await Approved(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        await CompleteTour(app, booking.Id);
        return (app, clock, booking.Id);
    }

    private static Task<MyFeedbackDto> Review(App app, int bookingId, int rating = 5, string? comment = "  Rất tuyệt  ", string customer = "customer1") =>
        Use<FeedbackService, MyFeedbackDto>(app, s => s.Create(customer, new CreateFeedbackRequest(bookingId, rating, comment), default));

    [Fact]
    public async Task F42_UTCID01_customer_rates_completed_trip()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
        {
            await Review(app, bookingId);
            var feedback = await InDb(app, db => db.Feedbacks.SingleAsync(f => f.BookingId == bookingId));
            Assert.Equal((5, "Rất tuyệt", "agency1"), (feedback.Rating, feedback.Comment, feedback.AgencyId));
            Assert.True(await InDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "agency1" && n.Message.Contains("5★"))));
        }
    }

    [Fact]
    public async Task F42_UTCID02_booking_of_another_customer_is_not_found()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((404, "Không tìm thấy booking."), await Rejects(() => Review(app, bookingId, customer: "customer2")));
    }

    [Fact]
    public async Task F42_UTCID03_trip_not_completed_cannot_be_rated()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((409, "Chỉ đánh giá được chuyến đi đã hoàn thành."), await Rejects(() => Review(app, booking.Id)));
    }

    [Fact]
    public async Task F42_UTCID04_rating_exactly_7_days_after_completion_is_accepted()
    {
        var (app, clock, bookingId) = await CompletedTrip();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(7);
            Assert.Equal(5, (await Review(app, bookingId)).Rating);
        }
    }

    [Fact]
    public async Task F42_UTCID05_rating_after_7_days_is_refused()
    {
        var (app, clock, bookingId) = await CompletedTrip();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(7).AddSeconds(1);
            Assert.Equal((409, "Đã quá hạn đánh giá (7 ngày sau khi tour kết thúc)."), await Rejects(() => Review(app, bookingId)));
        }
    }

    [Fact]
    public async Task F42_UTCID06_second_rating_is_refused()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
        {
            await Review(app, bookingId);
            Assert.Equal((409, "Booking này đã được đánh giá."), await Rejects(() => Review(app, bookingId, 4)));
        }
    }

    [Fact]
    public async Task F42_UTCID07_one_star_without_comment_is_saved()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
        {
            await Review(app, bookingId, 1, "   ");
            var feedback = await InDb(app, db => db.Feedbacks.SingleAsync(f => f.BookingId == bookingId));
            Assert.Equal((1, (string?)null), (feedback.Rating, feedback.Comment));
        }
    }

    // ============================================================ F-43 FeedbackService.Reply

    private static async Task<(App App, int FeedbackId)> RatedTrip()
    {
        var (app, _, bookingId) = await CompletedTrip();
        return (app, (await Review(app, bookingId)).Id);
    }

    private static Task<AgencyFeedbackDto> ReplyReview(App app, int id, string reply = "  Cảm ơn quý khách  ", string agency = "agency1") =>
        Use<FeedbackService, AgencyFeedbackDto>(app, s => s.Reply(agency, id, new FeedbackReplyRequest(reply), default));

    private static Task<int> ReplyNotices(App app) =>
        InDb(app, db => db.WorkflowNotifications.CountAsync(n => n.UserId == "customer1" && n.Message.StartsWith("Agency đã trả lời đánh giá")));

    [Fact]
    public async Task F43_UTCID01_agency_replies_to_review()
    {
        var (app, id) = await RatedTrip();
        using (app)
        {
            Assert.Equal("Cảm ơn quý khách", (await ReplyReview(app, id)).AgencyReply);
            Assert.Equal(1, await ReplyNotices(app));
        }
    }

    [Fact]
    public async Task F43_UTCID02_editing_reply_does_not_notify_again()
    {
        var (app, id) = await RatedTrip();
        using (app)
        {
            await ReplyReview(app, id);
            Assert.Equal("Hẹn gặp lại", (await ReplyReview(app, id, "Hẹn gặp lại")).AgencyReply);
            Assert.Equal(1, await ReplyNotices(app));
        }
    }

    [Fact]
    public async Task F43_UTCID03_other_agency_cannot_reply()
    {
        var (app, id) = await RatedTrip();
        using (app) Assert.Equal((404, "Không tìm thấy đánh giá."), await Rejects(() => ReplyReview(app, id, agency: "agency2")));
    }

    [Fact]
    public async Task F43_UTCID04_missing_review_is_not_found()
    {
        var (app, _) = await RatedTrip();
        using (app) Assert.Equal((404, "Không tìm thấy đánh giá."), await Rejects(() => ReplyReview(app, 9999)));
    }

    // ============================================================ F-44 ComplaintService.Create

    private static CreateComplaintInput TripComplaint(int? bookingId, string reason = "guide_attitude", string title = "HDV đến trễ",
        string description = "Hướng dẫn viên đến trễ 2 tiếng ngày đầu.", string type = "Trip") => new(type, bookingId, reason, title, description);

    private static Task<ComplaintDto> Complain(App app, CreateComplaintInput input, IReadOnlyList<UploadedImage>? images = null, string customer = "customer1") =>
        Use<ComplaintService, ComplaintDto>(app, s => s.Create(customer, input, images ?? [], default));

    [Fact]
    public async Task F44_UTCID01_customer_complains_about_completed_trip_with_photo()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
        {
            var complaint = await Complain(app, TripComplaint(bookingId), [new UploadedImage(TinyPng, "image/png")]);
            var row = await InDb(app, db => db.Complaints.SingleAsync(c => c.Id == complaint.Id));
            Assert.Equal((ComplaintStatus.Pending, "agency1", bookingId), (row.Status!.Value, row.TargetId, row.BookingId!.Value));
            Assert.NotNull(row.EvidenceUrls);
        }
    }

    [Fact]
    public async Task F44_UTCID02_platform_complaint_needs_no_booking()
    {
        var (app, _, _) = await CompletedTrip();
        using (app)
        {
            var complaint = await Complain(app, TripComplaint(null, "app_error", "Không thanh toán được", "Bấm thanh toán thì app báo lỗi 500.", "Platform"));
            Assert.Null(await InDb(app, db => db.Complaints.Where(c => c.Id == complaint.Id).Select(c => c.BookingId).SingleAsync()));
        }
    }

    [Fact]
    public async Task F44_UTCID03_unknown_type_is_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((422, "Loại khiếu nại không hợp lệ."), await Rejects(() => Complain(app, TripComplaint(bookingId, type: "service"))));
    }

    [Fact]
    public async Task F44_UTCID04_platform_reason_for_trip_complaint_is_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((422, "Phân loại vấn đề không hợp lệ."), await Rejects(() => Complain(app, TripComplaint(bookingId, "app_error"))));
    }

    [Fact]
    public async Task F44_UTCID05_four_character_title_is_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((422, "Tiêu đề cần 5–255 ký tự."), await Rejects(() => Complain(app, TripComplaint(bookingId, title: "Trễ!"))));
    }

    [Fact]
    public async Task F44_UTCID06_nine_character_description_is_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((422, "Mô tả cần 10–4000 ký tự."), await Rejects(() => Complain(app, TripComplaint(bookingId, description: "Đến trễ!!"))));
    }

    [Fact]
    public async Task F44_UTCID07_trip_complaint_without_booking_is_rejected()
    {
        var (app, _, _) = await CompletedTrip();
        using (app) Assert.Equal((422, "Vui lòng chọn chuyến đi cần khiếu nại."), await Rejects(() => Complain(app, TripComplaint(null))));
    }

    [Fact]
    public async Task F44_UTCID08_booking_of_another_customer_is_not_found()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app) Assert.Equal((404, "Không tìm thấy booking."), await Rejects(() => Complain(app, TripComplaint(bookingId), customer: "customer2")));
    }

    [Fact]
    public async Task F44_UTCID09_trip_not_completed_is_refused()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((409, "Chỉ khiếu nại được chuyến đi đã hoàn thành."), await Rejects(() => Complain(app, TripComplaint(booking.Id))));
    }

    [Fact]
    public async Task F44_UTCID10_complaint_after_one_day_is_refused()
    {
        var (app, clock, bookingId) = await CompletedTrip();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(1).AddSeconds(1);
            Assert.Equal((409, "Đã quá hạn khiếu nại (1 ngày sau khi tour kết thúc)."), await Rejects(() => Complain(app, TripComplaint(bookingId))));
        }
    }

    [Fact]
    public async Task F44_UTCID11_second_open_complaint_for_same_trip_is_refused()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
        {
            await Complain(app, TripComplaint(bookingId));
            Assert.Equal((409, "Chuyến đi này đang có khiếu nại chưa xử lý xong. Hãy trao đổi tiếp trong khiếu nại đó."),
                await Rejects(() => Complain(app, TripComplaint(bookingId, "service_quality", "Phòng bẩn", "Phòng khách sạn không được dọn."))));
        }
    }

    [Fact]
    public async Task F44_UTCID12_six_photos_are_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
            Assert.Equal((422, "Tối đa 5 ảnh bằng chứng."),
                await Rejects(() => Complain(app, TripComplaint(bookingId), Enumerable.Range(0, 6).Select(_ => new UploadedImage(TinyPng, "image/png")).ToList())));
    }

    [Fact]
    public async Task F44_UTCID13_text_file_as_photo_is_rejected()
    {
        var (app, _, bookingId) = await CompletedTrip();
        using (app)
            Assert.Equal((422, "Chỉ nhận ảnh JPEG, PNG hoặc WebP."),
                await Rejects(() => Complain(app, TripComplaint(bookingId), [new UploadedImage("không phải ảnh"u8.ToArray(), "image/png")])));
    }

    // ============================================================ F-45 ComplaintService.Resolve

    private static async Task<(App App, int ComplaintId)> OpenComplaint()
    {
        var (app, _, bookingId) = await CompletedTrip();
        return (app, (await Complain(app, TripComplaint(bookingId))).Id);
    }

    private static Task<ComplaintDto> Conclude(App app, int id, string? outcome, string note = "  Đã xác minh với Agency  ") =>
        Use<ComplaintService, ComplaintDto>(app, s => s.Resolve("admin1", id, new ResolveComplaintRequest(outcome, note), default));

    [Fact]
    public async Task F45_UTCID01_admin_marks_complaint_resolved()
    {
        var (app, id) = await OpenComplaint();
        using (app)
        {
            var dto = await Conclude(app, id, "Resolved");
            Assert.Equal("Resolved", dto.Status);
            var row = await InDb(app, db => db.Complaints.SingleAsync(c => c.Id == id));
            Assert.Equal((ComplaintStatus.Resolved, "Đã xác minh với Agency", "admin1"), (row.Status!.Value, row.AdminNotes, row.AdminId));
            Assert.True(await InDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "customer1" && n.Message.Contains("đã được giải quyết"))));
            Assert.True(await InDb(app, db => db.WorkflowNotifications.AnyAsync(n => n.UserId == "agency1" && n.Message.Contains("đã được Admin giải quyết"))));
        }
    }

    [Fact]
    public async Task F45_UTCID02_resolve_without_outcome_also_sends_chat_messages()
    {
        var (app, id) = await OpenComplaint();
        using (app)
        {
            await Conclude(app, id, null, "Agency đã hoàn tiền phòng");
            var messages = await InDb(app, db => db.ChatMessages.Where(m => m.SenderId == "admin1" && m.Content.Contains($"Khiếu nại #{id}"))
                .Select(m => new { m.Content, m.ContextData, Members = new[] { m.Conversation.UserOneId, m.Conversation.UserTwoId } }).ToListAsync());
            Assert.Equal(2, messages.Count);
            Assert.All(messages, m => Assert.Contains("đã được giải quyết. Agency đã hoàn tiền phòng", m.Content));
            Assert.All(messages, m => Assert.Contains("\"complaint\"", m.ContextData));
            Assert.Contains(messages, m => m.Members.Contains("customer1"));
            Assert.Contains(messages, m => m.Members.Contains("agency1"));
        }
    }

    [Fact]
    public async Task F45_UTCID03_missing_complaint_is_not_found()
    {
        var (app, _) = await OpenComplaint();
        using (app) Assert.Equal((404, "Không tìm thấy khiếu nại."), await Rejects(() => Conclude(app, 9999, "Resolved")));
    }

    [Fact]
    public async Task F45_UTCID04_concluded_complaint_cannot_be_changed()
    {
        var (app, id) = await OpenComplaint();
        using (app)
        {
            await Conclude(app, id, "Resolved");
            Assert.Equal((409, "Khiếu nại đã được giải quyết."), await Rejects(() => Conclude(app, id, "Resolved")));
        }
    }
}
