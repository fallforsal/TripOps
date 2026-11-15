using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private static Action<IWebHostBuilder> WithClock(TestClock clock) => builder => builder.ConfigureServices(s => s.AddSingleton<PaymentClock>(clock));

    private static async Task<BookingDto> Approved(App app, CreateBookingRequest? request = null)
    {
        var booking = await Book(app, request);
        return await Decide(app, booking.Id, "approve");
    }

    /// <summary>Đơn đã duyệt và hợp đồng đã ký trực tuyến (ghi thẳng trạng thái để không phụ thuộc bước tạo PDF).</summary>
    private static async Task<BookingDto> SignedBooking(App app)
    {
        var booking = await Approved(app);
        await InDb(app, async db =>
        {
            var contract = await db.BookingContracts.SingleAsync(c => c.BookingId == booking.Id);
            contract.Status = "Signed"; contract.SignMethod = "web"; contract.SignedAt = DateTime.UtcNow;
        });
        return booking;
    }

    private static async Task SetBookingStatus(App app, int id, BookingStatus status) =>
        await InDb(app, async db => { (await db.Bookings.SingleAsync(b => b.Id == id)).Status = status; });

    // ============================================================ F-26 BookingService.StartSignSession

    private static Task<SignSessionStartDto> StartSign(App app, int id, string customer = "customer1") =>
        Use<BookingService, SignSessionStartDto>(app, s => s.StartSignSession(customer, id, default));

    [Fact]
    public async Task F26_UTCID01_customer_starts_sign_session_for_approved_booking()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        var session = await StartSign(app, booking.Id);
        Assert.False(string.IsNullOrWhiteSpace(session.Token));
        Assert.False(string.IsNullOrWhiteSpace(session.ContractNo));
        Assert.InRange(session.ExpiresAt, DateTime.UtcNow.AddMinutes(14), DateTime.UtcNow.AddMinutes(16));
    }

    [Fact]
    public async Task F26_UTCID02_other_customer_cannot_start_session()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((403, "Bạn không phải người tạo đơn đặt này."), await Rejects(() => StartSign(app, booking.Id, "customer2")));
    }

    [Fact]
    public async Task F26_UTCID03_pending_booking_cannot_be_signed()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((409, "Chỉ ký hợp đồng cho đơn đã được duyệt và chưa khởi hành."), await Rejects(() => StartSign(app, booking.Id)));
    }

    [Fact]
    public async Task F26_UTCID04_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => StartSign(app, 9999)));
    }

    [Fact]
    public async Task F26_UTCID05_new_session_replaces_the_previous_one()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        var first = await StartSign(app, booking.Id);
        await StartSign(app, booking.Id);
        Assert.Equal((410, "Mã ký đã hết hạn hoặc đã được thay bằng mã mới. Vui lòng tạo mã QR mới trong trang đơn."),
            await Rejects(() => SendOtp(app, first.Token)));
    }

    [Fact]
    public async Task F26_UTCID06_contract_already_signed_online_cannot_be_signed_again()
    {
        using var app = await UtApp();
        var booking = await SignedBooking(app);
        Assert.Equal((409, "Bạn đã ký trực tuyến hợp đồng này."), await Rejects(() => StartSign(app, booking.Id)));
    }

    // ============================================================ F-27 BookingService.SendSignOtp

    private static Task<SignSessionDto> SendOtp(App app, string token) =>
        Use<BookingService, SignSessionDto>(app, s => s.SendSignOtp(token, default));

    private static async Task<(App App, TestClock Clock, string Token, int BookingId)> SignSession()
    {
        var clock = new TestClock { Fixed = DateTime.UtcNow };
        var app = await UtApp(WithClock(clock));
        var booking = await Approved(app);
        var session = await StartSign(app, booking.Id);
        return (app, clock, session.Token, booking.Id);
    }

    [Fact]
    public async Task F27_UTCID01_otp_is_created_for_open_session()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var dto = await SendOtp(app, token);
            Assert.Matches(@"^\d{6}$", dto.DevelopmentOtp!);
            Assert.NotNull(dto.OtpSentAt);
        }
    }

    [Fact]
    public async Task F27_UTCID02_unknown_token_is_rejected()
    {
        var (app, _, _, _) = await SignSession();
        using (app) Assert.Equal((404, "Mã ký không hợp lệ."), await Rejects(() => SendOtp(app, "khong-ton-tai")));
    }

    [Fact]
    public async Task F27_UTCID03_resend_within_60_seconds_is_refused()
    {
        var (app, clock, token, _) = await SignSession();
        using (app)
        {
            await SendOtp(app, token);
            clock.Fixed = clock.Fixed!.Value.AddSeconds(59);
            Assert.Equal((429, "Vui lòng chờ 60 giây rồi gửi lại mã OTP."), await Rejects(() => SendOtp(app, token)));
        }
    }

    [Fact]
    public async Task F27_UTCID04_resend_after_60_seconds_creates_a_new_otp()
    {
        var (app, clock, token, _) = await SignSession();
        using (app)
        {
            var first = await SendOtp(app, token);
            clock.Fixed = clock.Fixed!.Value.AddSeconds(61);
            var second = await SendOtp(app, token);
            Assert.True(second.OtpSentAt > first.OtpSentAt);
        }
    }

    [Fact]
    public async Task F27_UTCID05_sixth_send_is_refused()
    {
        var (app, clock, token, _) = await SignSession();
        using (app)
        {
            for (var i = 0; i < 5; i++) { await SendOtp(app, token); clock.Fixed = clock.Fixed!.Value.AddSeconds(61); }
            Assert.Equal((429, "Đã gửi OTP quá số lần cho phép. Vui lòng tạo mã QR mới."), await Rejects(() => SendOtp(app, token)));
        }
    }

    [Fact]
    public async Task F27_UTCID06_session_older_than_15_minutes_is_expired()
    {
        var (app, clock, token, _) = await SignSession();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddMinutes(15);
            Assert.Equal((410, "Mã ký đã hết hạn hoặc đã được thay bằng mã mới. Vui lòng tạo mã QR mới trong trang đơn."),
                await Rejects(() => SendOtp(app, token)));
        }
    }

    [Fact]
    public async Task F27_UTCID07_cancelled_booking_cannot_receive_otp()
    {
        var (app, _, token, bookingId) = await SignSession();
        using (app)
        {
            await SetBookingStatus(app, bookingId, BookingStatus.Cancelled);
            Assert.Equal((409, "Đơn không còn ở trạng thái ký hợp đồng."), await Rejects(() => SendOtp(app, token)));
        }
    }

    // ============================================================ F-28 BookingService.CompleteWebSign

    private static Task<SignSessionDto> Sign(App app, string token, string otp, string signature = SignaturePng, bool agreed = true) =>
        Use<BookingService, SignSessionDto>(app, s => s.CompleteWebSign(token, new WebSignRequest(signature, otp, agreed), "127.0.0.1", "xunit", default));

    private static string WrongOtp(string otp) => otp == "000000" ? "111111" : "000000";

    [Fact]
    public async Task F28_UTCID01_customer_signs_with_correct_otp()
    {
        var (app, _, token, bookingId) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            await Sign(app, token, otp);
            var contract = await InDb(app, db => db.BookingContracts.SingleAsync(c => c.BookingId == bookingId));
            Assert.Equal(("Signed", "web"), (contract.Status, contract.SignMethod));
            Assert.NotNull(contract.SignedFileSha256);
        }
    }

    [Fact]
    public async Task F28_UTCID02_not_agreeing_to_contract_is_refused()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            Assert.Equal((422, "Vui lòng xác nhận đã đọc và đồng ý nội dung hợp đồng."), await Rejects(() => Sign(app, token, otp, agreed: false)));
        }
    }

    [Fact]
    public async Task F28_UTCID03_signature_that_is_not_base64_is_refused()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            Assert.Equal((400, "Chữ ký không hợp lệ."), await Rejects(() => Sign(app, token, otp, "data:image/png;base64,@@@")));
        }
    }

    [Fact]
    public async Task F28_UTCID04_signature_that_is_not_a_png_is_refused()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            var jpeg = "data:image/jpeg;base64," + Convert.ToBase64String(Enumerable.Repeat((byte)0xFF, 200).ToArray());
            Assert.Equal((400, "Chữ ký phải là ảnh PNG vẽ trên trang ký (tối đa 512 KB)."), await Rejects(() => Sign(app, token, otp, jpeg)));
        }
    }

    [Fact]
    public async Task F28_UTCID05_signing_before_requesting_otp_is_refused()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
            Assert.Equal((422, "Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng bấm gửi lại mã."), await Rejects(() => Sign(app, token, "123456")));
    }

    [Fact]
    public async Task F28_UTCID06_wrong_otp_shows_remaining_attempts()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            Assert.Equal((422, "Mã OTP không đúng (còn 4 lần thử)."), await Rejects(() => Sign(app, token, WrongOtp(otp))));
        }
    }

    [Fact]
    public async Task F28_UTCID07_fifth_wrong_otp_locks_the_session()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            for (var i = 0; i < 4; i++) await Rejects(() => Sign(app, token, WrongOtp(otp)));
            Assert.Equal((422, "Nhập sai OTP quá 5 lần. Phiên ký đã bị khóa, vui lòng tạo mã QR mới."), await Rejects(() => Sign(app, token, WrongOtp(otp))));
        }
    }

    [Fact]
    public async Task F28_UTCID08_otp_older_than_5_minutes_is_expired()
    {
        var (app, clock, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            clock.Fixed = clock.Fixed!.Value.AddMinutes(5).AddSeconds(1);
            Assert.Equal((422, "Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng bấm gửi lại mã."), await Rejects(() => Sign(app, token, otp)));
        }
    }

    [Fact]
    public async Task F28_UTCID09_unknown_token_is_rejected()
    {
        var (app, _, _, _) = await SignSession();
        using (app) Assert.Equal((404, "Mã ký không hợp lệ."), await Rejects(() => Sign(app, "khong-ton-tai", "123456")));
    }

    [Fact]
    public async Task F28_UTCID10_completed_session_cannot_be_used_again()
    {
        var (app, _, token, _) = await SignSession();
        using (app)
        {
            var otp = (await SendOtp(app, token)).DevelopmentOtp!;
            await Sign(app, token, otp);
            Assert.Equal((409, "Phiên ký này đã hoàn tất."), await Rejects(() => Sign(app, token, otp)));
        }
    }

    // ============================================================ F-29 BookingService.StartPayOsDeposit

    private static async Task<(App App, FakePayOs PayOs)> PaymentApp(bool configured = true)
    {
        var payOs = new FakePayOs();
        var app = PayOsApp(payOs, new TestClock(), configured);
        await app.Initialize();
        return (app, payOs);
    }

    private static Task<PayOsCheckoutDto> StartPay(App app, int id, string customer = "customer1") =>
        Use<BookingService, PayOsCheckoutDto>(app, s => s.StartPayOsDeposit(customer, id, default));

    [Fact]
    public async Task F29_UTCID01_customer_gets_payos_link_for_deposit()
    {
        var (app, payOs) = await PaymentApp();
        using (app)
        {
            var booking = await SignedBooking(app);
            var checkout = await StartPay(app, booking.Id);
            Assert.StartsWith("https://pay.payos.vn/", checkout.CheckoutUrl);
            Assert.False(checkout.Reused);
            Assert.InRange(checkout.Amount, 1, booking.TotalAmount);
            Assert.Equal(1, payOs.CreateCalls);
        }
    }

    [Fact]
    public async Task F29_UTCID02_open_link_is_reused()
    {
        var (app, payOs) = await PaymentApp();
        using (app)
        {
            var booking = await SignedBooking(app);
            var first = await StartPay(app, booking.Id);
            var second = await StartPay(app, booking.Id);
            Assert.True(second.Reused);
            Assert.Equal((first.CheckoutUrl, 1), (second.CheckoutUrl, payOs.CreateCalls));
        }
    }

    [Fact]
    public async Task F29_UTCID03_payos_not_configured_is_unavailable()
    {
        var (app, _) = await PaymentApp(configured: false);
        using (app)
        {
            var booking = await SignedBooking(app);
            Assert.Equal((503, "Cổng payOS chưa được cấu hình (thiếu PayOs:ClientId/ApiKey/ChecksumKey hoặc ReturnUrl)."),
                await Rejects(() => StartPay(app, booking.Id)));
        }
    }

    [Fact]
    public async Task F29_UTCID04_other_customer_cannot_pay()
    {
        var (app, _) = await PaymentApp();
        using (app)
        {
            var booking = await SignedBooking(app);
            Assert.Equal((403, "Bạn không phải người tạo đơn đặt này."), await Rejects(() => StartPay(app, booking.Id, "customer2")));
        }
    }

    [Fact]
    public async Task F29_UTCID05_pending_booking_cannot_be_paid()
    {
        var (app, _) = await PaymentApp();
        using (app)
        {
            var booking = await Book(app);
            Assert.Equal((409, "Đơn đang chờ công ty lữ hành duyệt. Bạn chỉ thanh toán sau khi đơn được duyệt."), await Rejects(() => StartPay(app, booking.Id)));
        }
    }

    [Fact]
    public async Task F29_UTCID06_unsigned_contract_blocks_payment()
    {
        var (app, _) = await PaymentApp();
        using (app)
        {
            var booking = await Approved(app);
            Assert.Equal((409, "Vui lòng tải hợp đồng, ký và tải bản đã ký lên trước khi thanh toán."), await Rejects(() => StartPay(app, booking.Id)));
        }
    }

    [Fact]
    public async Task F29_UTCID07_missing_booking_is_not_found()
    {
        var (app, _) = await PaymentApp();
        using (app) Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => StartPay(app, 9999)));
    }

    // ============================================================ F-30 BookingService.ApplyPayOsWebhook

    private static Task<string> Webhook(App app, long orderCode, long amount, string code = "00") =>
        Use<BookingService, string>(app, s => s.ApplyPayOsWebhook(new PayOsWebhookData(orderCode, amount, code, "FT26110100001", $"link{orderCode}"), default));

    private static async Task<(App App, int BookingId, long OrderCode, long Amount)> PaymentStarted()
    {
        var (app, _) = await PaymentApp();
        var booking = await SignedBooking(app);
        var checkout = await StartPay(app, booking.Id);
        return (app, booking.Id, OrderCode(checkout.TransactionCode), (long)checkout.Amount);
    }

    private static Task<decimal> PaidSoFar(App app, int bookingId) =>
        InDb(app, db => db.PaymentTransactions.Where(t => t.BookingId == bookingId && t.Status == PaymentTransactionStatus.Success).SumAsync(t => t.Amount));

    [Fact]
    public async Task F30_UTCID01_paid_webhook_with_exact_amount_records_payment()
    {
        var (app, bookingId, order, amount) = await PaymentStarted();
        using (app)
        {
            Assert.Equal("paid", await Webhook(app, order, amount));
            Assert.Equal(amount, await PaidSoFar(app, bookingId));
        }
    }

    [Fact]
    public async Task F30_UTCID02_unknown_order_is_ignored()
    {
        var (app, _, _, amount) = await PaymentStarted();
        using (app) Assert.Equal("ignored", await Webhook(app, 123, amount));
    }

    [Fact]
    public async Task F30_UTCID03_underpaid_amount_needs_review()
    {
        var (app, bookingId, order, amount) = await PaymentStarted();
        using (app)
        {
            Assert.Equal("review", await Webhook(app, order, amount - 1000));
            Assert.Equal(0, await PaidSoFar(app, bookingId));
        }
    }

    [Fact]
    public async Task F30_UTCID04_overpaid_amount_needs_review()
    {
        var (app, _, order, amount) = await PaymentStarted();
        using (app) Assert.Equal("review", await Webhook(app, order, amount + 1000));
    }

    [Fact]
    public async Task F30_UTCID05_failed_code_marks_transaction_failed()
    {
        var (app, _, order, amount) = await PaymentStarted();
        using (app) Assert.Equal("failed", await Webhook(app, order, amount, "01"));
    }

    [Fact]
    public async Task F30_UTCID06_repeated_paid_webhook_is_counted_once()
    {
        var (app, bookingId, order, amount) = await PaymentStarted();
        using (app)
        {
            await Webhook(app, order, amount);
            Assert.Equal("paid", await Webhook(app, order, amount));
            Assert.Equal(amount, await PaidSoFar(app, bookingId));
        }
    }

    // ============================================================ F-33 BookingService.AssignGuide

    private static Task<BookingDto> Assign(App app, int id, string guide = "guide1", string agency = "agency1", string? role = null) =>
        Use<BookingService, BookingDto>(app, s => s.AssignGuide(agency, id, new GuideAssignmentRequest(guide, role, null), default));

    [Fact]
    public async Task F33_UTCID01_agency_assigns_own_guide_to_confirmed_booking()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await Assign(app, booking.Id);
        var row = await InDb(app, db => db.Bookings.Include(b => b.AssignedGuides).Include(b => b.Participants).SingleAsync(b => b.Id == booking.Id));
        Assert.Equal(("guide1", "Lead"), (row.AssignedGuides.Single().GuideId, row.AssignedGuides.Single().Role));
        Assert.All(row.Participants, p => Assert.Equal("guide1", p.AssignedGuideId));
    }

    [Fact]
    public async Task F33_UTCID02_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => Assign(app, 9999)));
    }

    [Fact]
    public async Task F33_UTCID03_agency_outside_booking_is_refused()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((403, "Agency không thuộc booking này."), await Rejects(() => Assign(app, booking.Id, agency: "agency2")));
    }

    [Fact]
    public async Task F33_UTCID04_guide_of_another_agency_is_not_found()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((404, "Hướng dẫn viên không tồn tại hoặc đã bị vô hiệu hóa."), await Rejects(() => Assign(app, booking.Id, "guide2")));
    }

    [Fact]
    public async Task F33_UTCID05_inactive_guide_is_not_found()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await InDb(app, async db => { (await db.Users.SingleAsync(u => u.Id == "guide1")).Status = UserStatus.Inactive; });
        Assert.Equal((404, "Hướng dẫn viên không tồn tại hoặc đã bị vô hiệu hóa."), await Rejects(() => Assign(app, booking.Id)));
    }

    [Fact]
    public async Task F33_UTCID06_pending_booking_cannot_get_a_guide()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((422, "Chỉ phân công hướng dẫn viên cho đơn đã được Agency xác nhận."), await Rejects(() => Assign(app, booking.Id)));
    }

    [Fact]
    public async Task F33_UTCID07_guide_busy_on_overlapping_trip_is_refused()
    {
        using var app = await UtApp();
        var first = await Approved(app);
        await Assign(app, first.Id);
        var second = await Approved(app);
        Assert.Equal((409, "HDV đã được phân công cho chuyến khác trùng thời gian."), await Rejects(() => Assign(app, second.Id)));
    }

    [Fact]
    public async Task F33_UTCID08_assigning_same_guide_again_updates_role()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await Assign(app, booking.Id);
        await Assign(app, booking.Id, role: "Support");
        var guides = await InDb(app, db => db.BookingAssignedGuides.Where(g => g.BookingId == booking.Id).ToListAsync());
        Assert.Equal("Support", Assert.Single(guides).Role);
    }

    // ============================================================ F-34 BookingService.RecordAttendance

    private static async Task<(App App, TestClock Clock, int BookingId, int ParticipantId)> TripWithGuide()
    {
        var clock = new TestClock();
        var app = await UtApp(WithClock(clock));
        var booking = await Approved(app);
        await Assign(app, booking.Id);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        clock.Fixed = booking.StartDate.Date.AddHours(2); // 9:00 sáng ngày khởi hành (giờ Việt Nam)
        var participant = await InDb(app, db => db.BookingParticipants.Where(p => p.BookingId == booking.Id).OrderBy(p => p.Id).Select(p => p.Id).FirstAsync());
        return (app, clock, booking.Id, participant);
    }

    private static Task<ParticipantDto> Attend(App app, int bookingId, int participantId, string status = "CheckedIn", string guide = "guide1") =>
        Use<BookingService, ParticipantDto>(app, s => s.RecordAttendance(guide, bookingId, new AttendanceCheckinRequest(participantId, status), default));

    private static Task<(AttendanceStatus? Status, string? By)> Attendance(App app, int participantId) =>
        InDb(app, db => db.BookingParticipants.Where(p => p.Id == participantId).Select(p => ValueTuple.Create(p.AttendanceStatus, p.CheckedBy)).SingleAsync());

    [Fact]
    public async Task F34_UTCID01_assigned_guide_checks_in_participant_on_departure_day()
    {
        var (app, _, bookingId, participantId) = await TripWithGuide();
        using (app)
        {
            await Attend(app, bookingId, participantId);
            Assert.Equal((AttendanceStatus.CheckedIn, "guide1"), await Attendance(app, participantId));
        }
    }

    [Fact]
    public async Task F34_UTCID02_guide_marks_participant_absent()
    {
        var (app, _, bookingId, participantId) = await TripWithGuide();
        using (app)
        {
            await Attend(app, bookingId, participantId, "Absent");
            Assert.Equal(AttendanceStatus.Absent, (await Attendance(app, participantId)).Status);
        }
    }

    [Fact]
    public async Task F34_UTCID03_guide_not_assigned_is_refused()
    {
        var (app, _, bookingId, participantId) = await TripWithGuide();
        using (app)
            Assert.Equal((403, "Chỉ Hướng dẫn viên được phân công cho chuyến này mới có quyền điểm danh."),
                await Rejects(() => Attend(app, bookingId, participantId, guide: "guide2")));
    }

    [Fact]
    public async Task F34_UTCID04_unknown_participant_is_not_found()
    {
        var (app, _, bookingId, _) = await TripWithGuide();
        using (app) Assert.Equal((404, "Không tìm thấy hành khách trong danh sách đoàn."), await Rejects(() => Attend(app, bookingId, 99999)));
    }

    [Fact]
    public async Task F34_UTCID05_day_before_departure_is_refused()
    {
        var (app, clock, bookingId, participantId) = await TripWithGuide();
        using (app)
        {
            clock.Fixed = clock.Fixed!.Value.AddDays(-1);
            Assert.Equal((409, "Chỉ được điểm danh vào ngày khởi hành hoặc ngày bắt đầu chặng được phân công."),
                await Rejects(() => Attend(app, bookingId, participantId)));
        }
    }

    [Fact]
    public async Task F34_UTCID06_unknown_attendance_status_is_rejected()
    {
        var (app, _, bookingId, participantId) = await TripWithGuide();
        using (app) Assert.Equal((400, "Trạng thái điểm danh không hợp lệ."), await Rejects(() => Attend(app, bookingId, participantId, "Late")));
    }

    [Fact]
    public async Task F34_UTCID07_inactive_participant_cannot_be_checked_in()
    {
        var (app, _, bookingId, participantId) = await TripWithGuide();
        using (app)
        {
            await InDb(app, async db => { (await db.BookingParticipants.SingleAsync(p => p.Id == participantId)).Status = "INACTIVE"; });
            Assert.Equal((403, "HDV chỉ điểm danh hành khách đang tham gia chặng của công ty mình."), await Rejects(() => Attend(app, bookingId, participantId)));
        }
    }

    [Fact]
    public async Task F34_UTCID08_missing_booking_is_not_found()
    {
        var (app, _, _, participantId) = await TripWithGuide();
        using (app) Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => Attend(app, 9999, participantId)));
    }

    // ============================================================ F-35 BookingService.Complete

    private static async Task<BookingDto> CompleteTour(App app, int id, string agency = "agency1")
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        return await services.GetRequiredService<BookingService>().Complete(agency, id, services.GetRequiredService<AgencySettlementService>(), default);
    }

    [Fact]
    public async Task F35_UTCID01_host_agency_completes_tour_in_progress()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        await CompleteTour(app, booking.Id);
        Assert.Equal(BookingStatus.Completed, await BookingState(app, booking.Id));
        Assert.NotNull(await InDb(app, db => db.BookingAgencies.Where(a => a.BookingId == booking.Id).Select(a => a.TourCompletedAt).SingleAsync()));
    }

    [Fact]
    public async Task F35_UTCID02_completing_twice_keeps_completed()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        await CompleteTour(app, booking.Id);
        await CompleteTour(app, booking.Id);
        Assert.Equal(BookingStatus.Completed, await BookingState(app, booking.Id));
    }

    [Fact]
    public async Task F35_UTCID03_confirmed_booking_cannot_be_completed()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        Assert.Equal((409, "Chỉ có thể hoàn thành booking đang diễn ra."), await Rejects(() => CompleteTour(app, booking.Id)));
    }

    [Fact]
    public async Task F35_UTCID04_other_agency_cannot_complete()
    {
        using var app = await UtApp();
        var booking = await Approved(app);
        await SetBookingStatus(app, booking.Id, BookingStatus.InProgress);
        Assert.Equal((403, "Chỉ Agency chủ trì được hoàn thành booking."), await Rejects(() => CompleteTour(app, booking.Id, "agency2")));
    }

    [Fact]
    public async Task F35_UTCID05_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => CompleteTour(app, 9999)));
    }
}
