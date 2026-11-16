using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    private static ParticipantInput Adult(string name = "Nguyễn Văn A", int? tier = null) => new(name, null, new DateTime(1990, 1, 1), "Nam", null, tier);
    private static ParticipantInput Child(string name = "Nguyễn Văn Con") => new(name, null, new DateTime(2018, 5, 5), "Nam", null, null);

    private static CreateBookingRequest BookingRequest(int tourId = 1, int startInDays = 10, params ParticipantInput[] participants) => new(
        tourId, DateTime.UtcNow.Date.AddDays(startInDays), "Customer One", "0901234567", "Customer1@Example.test", " Cần phòng yên tĩnh ",
        participants.Length > 0 ? participants : [Adult(), Child()]);

    private static Task<BookingDto> Book(App app, CreateBookingRequest? request = null, string customer = "customer1") =>
        Use<BookingService, BookingDto>(app, s => s.Create(customer, request ?? BookingRequest(), default));

    private static async Task<(int, string)> BookRejects(App app, CreateBookingRequest request, string customer = "customer1") =>
        await Rejects(() => Book(app, request, customer));

    private static Task<BookingStatus?> BookingState(App app, int id) =>
        InDb(app, db => db.Bookings.Where(b => b.Id == id).Select(b => b.Status).SingleAsync());

    // ============================================================ F-22 BookingService.Create

    [Fact]
    public async Task F22_UTCID01_customer_books_adult_and_child_priced_by_age()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((5000000m, 2, "customer1@example.test"), (booking.TotalAmount, booking.TotalGuests, booking.ContactEmail));
        var row = await InDb(app, db => db.Bookings.SingleAsync(b => b.Id == booking.Id));
        Assert.Equal((BookingStatus.Pending, PaymentStatus.Unpaid), (row.Status, row.PaymentStatus));
    }

    [Fact]
    public async Task F22_UTCID02_banned_customer_cannot_book()
    {
        using var app = await UtApp();
        await AddUser(app, "customer9", UserRole.User, status: UserStatus.Banned);
        Assert.Equal((401, "Phiên đăng nhập không còn hợp lệ."), await BookRejects(app, BookingRequest(), "customer9"));
    }

    [Fact]
    public async Task F22_UTCID03_unknown_tour_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Tour không tồn tại hoặc chưa được công bố mở bán."), await BookRejects(app, BookingRequest(999)));
    }

    [Fact]
    public async Task F22_UTCID04_booking_without_participants_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((400, "Cần có ít nhất một hành khách trong đơn đặt."), await BookRejects(app, BookingRequest() with { Participants = [] }));
    }

    [Fact]
    public async Task F22_UTCID05_21_participants_exceed_tour_maximum()
    {
        using var app = await UtApp();
        var many = Enumerable.Range(1, 21).Select(i => Adult($"Khách {i}")).ToArray();
        Assert.Equal((422, "Số lượng khách tối đa cho tour này là 20 người."), await BookRejects(app, BookingRequest(1, 10, many)));
    }

    [Fact]
    public async Task F22_UTCID06_start_date_in_the_past_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((422, "Ngày khởi hành phải từ hôm nay trở đi."), await BookRejects(app, BookingRequest(1, -1)));
    }

    [Fact]
    public async Task F22_UTCID07_birth_date_after_departure_is_rejected()
    {
        using var app = await UtApp();
        var unborn = new ParticipantInput("Em bé", null, DateTime.UtcNow.Date.AddDays(30), "Nữ", null, null);
        Assert.Equal((422, "Ngày sinh không được sau ngày khởi hành."), await BookRejects(app, BookingRequest(1, 10, unborn)));
    }

    [Fact]
    public async Task F22_UTCID08_pricing_tier_of_another_tour_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((422, "Nhóm giá không thuộc tour đang đặt."), await BookRejects(app, BookingRequest(1, 10, Adult(tier: 99))));
    }

    [Fact]
    public async Task F22_UTCID09_adult_with_child_tier_is_rejected()
    {
        using var app = await UtApp();
        Assert.Equal((422, "Nhóm giá không phù hợp với tuổi hành khách."), await BookRejects(app, BookingRequest(1, 10, Adult(tier: 1))));
    }

    [Fact]
    public async Task F22_UTCID10_exactly_20_participants_is_accepted()
    {
        using var app = await UtApp();
        var many = Enumerable.Range(1, 20).Select(i => Adult($"Khách {i}")).ToArray();
        var booking = await Book(app, BookingRequest(1, 10, many));
        Assert.Equal((20, 60000000m), (booking.TotalGuests, booking.TotalAmount));
    }

    [Fact]
    public async Task F22_UTCID11_departure_today_is_accepted()
    {
        using var app = await UtApp();
        var booking = await Book(app, BookingRequest(1, 0, Adult()));
        Assert.Equal(DateTime.UtcNow.Date, booking.StartDate.Date);
    }

    // ============================================================ F-25 BookingService.Decide

    private static Task<BookingDto> Decide(App app, int id, string decision, string? reason = null, string agency = "agency1") =>
        Use<BookingService, BookingDto>(app, s => s.Decide(agency, id, new BookingDecisionRequest(decision, reason), default));

    [Fact]
    public async Task F25_UTCID01_agency_approves_pending_booking()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "approve");
        Assert.Equal(BookingStatus.Confirmed, await BookingState(app, booking.Id));
        Assert.True(await InDb(app, db => db.PaymentRequests.AnyAsync(r => r.BookingId == booking.Id)));
        Assert.True(await InDb(app, db => db.BookingContracts.AnyAsync(c => c.BookingId == booking.Id)));
    }

    [Fact]
    public async Task F25_UTCID02_agency_rejects_pending_booking_with_reason()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "reject", "  Hết chỗ  ");
        var row = await InDb(app, db => db.Bookings.SingleAsync(b => b.Id == booking.Id));
        Assert.Equal((BookingStatus.Rejected, "Hết chỗ"), (row.Status, row.CancelReason));
    }

    [Fact]
    public async Task F25_UTCID03_other_agency_cannot_decide()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        Assert.Equal((403, "Chỉ Agency sở hữu tour mới có quyền duyệt đơn này."), await Rejects(() => Decide(app, booking.Id, "approve", agency: "agency2")));
    }

    [Fact]
    public async Task F25_UTCID04_missing_booking_is_not_found()
    {
        using var app = await UtApp();
        Assert.Equal((404, "Không tìm thấy đơn đặt tour."), await Rejects(() => Decide(app, 9999, "approve")));
    }

    [Fact]
    public async Task F25_UTCID05_rejected_booking_cannot_be_approved()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "reject", "Hết chỗ");
        Assert.Equal((422, "Không thể duyệt đơn đặt đang ở trạng thái Rejected."), await Rejects(() => Decide(app, booking.Id, "approve")));
    }

    [Fact]
    public async Task F25_UTCID06_approving_twice_returns_the_confirmed_booking()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "approve");
        await Decide(app, booking.Id, "approve");
        Assert.Equal(BookingStatus.Confirmed, await BookingState(app, booking.Id));
        Assert.Equal(1, await InDb(app, db => db.BookingContracts.CountAsync(c => c.BookingId == booking.Id)));
    }

    [Fact]
    public async Task F25_UTCID07_confirmed_booking_cannot_be_rejected()
    {
        using var app = await UtApp();
        var booking = await Book(app);
        await Decide(app, booking.Id, "approve");
        Assert.Equal((422, "Không thể duyệt đơn đặt đang ở trạng thái Confirmed."), await Rejects(() => Decide(app, booking.Id, "reject", "Đổi ý")));
    }
}
