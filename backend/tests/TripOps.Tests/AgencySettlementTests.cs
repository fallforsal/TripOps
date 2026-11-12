using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;
using TripOps.Service.Settlements;

namespace TripOps.Tests;

// Quyết toán cho Agency (giả lập máy chủ chi hộ payOS và đồng hồ; không có tiền thật).
public sealed partial class BookingFlowTests
{
    private static App SettlementApp(FakePayout payout, TestClock clock) => new(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PayOsPayout:ClientId"] = "payout-client",
            ["PayOsPayout:ApiKey"] = "payout-api",
            ["PayOsPayout:ChecksumKey"] = PayoutChecksum,
            ["PayOsPayout:BaseUrl"] = "https://payout.test",
            // Test tự gọi lượt quét bằng API "run"; không để tác vụ chạy ngầm chạy song song.
            ["Settlement:AutoPayoutEnabled"] = "false",
            ["Settlement:AutoPayoutDelayDays"] = "2",
            ["Settlement:BankAccountCooldownHours"] = "0",
        }));
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<PaymentClock>(clock);
            services.AddHttpClient<PayOsPayoutGateway>().ConfigurePrimaryHttpMessageHandler(() => payout);
        });
    });

    /// <summary>Tour 10.000.000đ đã được Agency chủ trì bấm hoàn thành lúc clock.Fixed. paid = khách đã trả đủ chưa.</summary>
    private static async Task<(HttpClient Admin, HttpClient Agency, BookingDto Booking)> CompletedTour(App app, bool paid)
    {
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var guide = await app.Client("guide1@example.test");
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", TenMillion() with { StartDate = DateTime.UtcNow.Date }));
        Assert.Equal(10000000m, booking.TotalAmount);
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).EnsureSuccessStatusCode();
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/guide-assignments", new GuideAssignmentRequest("guide1", "lead_guide", null))).EnsureSuccessStatusCode();
        (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/start", null)).EnsureSuccessStatusCode();
        if (paid) await PayInFull(app, booking.Id);
        (await agency.PostAsync($"/api/v1/agency/bookings/{booking.Id}/complete", null)).EnsureSuccessStatusCode();
        await Read<AgencyPayoutAccountDto>(await agency.PutAsJsonAsync("/api/v1/agency/payout-account",
            new PayoutAccountInput("Vietcombank", "0123 456 789", "Nguyễn Văn Đức")));
        return (await app.Client("admin1@example.test"), agency, booking);
    }

    private static async Task PayInFull(App app, int bookingId)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var booking = await db.Bookings.Include(b => b.PaymentTransactions).SingleAsync(b => b.Id == bookingId);
        var paid = booking.PaymentTransactions.Where(t => t.Status == PaymentTransactionStatus.Success).Sum(t => t.Amount);
        db.PaymentTransactions.Add(new PaymentTransaction
        {
            BookingId = bookingId, TransactionCode = $"TEST-FULL-{bookingId}", PaymentMethod = "DEMO",
            Amount = booking.TotalAmount - paid, Status = PaymentTransactionStatus.Success, PaidAt = DateTime.UtcNow
        });
        booking.PaymentStatus = PaymentStatus.Paid;
        await db.SaveChangesAsync();
    }

    /// <summary>Giờ hiện tại làm tròn giây (ngày khởi hành của booking test là hôm nay theo đồng hồ thật).</summary>
    private static DateTime Now() => new(DateTime.UtcNow.Ticks / TimeSpan.TicksPerSecond * TimeSpan.TicksPerSecond, DateTimeKind.Utc);

    private static async Task<SettlementDto> Settlement(HttpClient admin, int bookingId) =>
        (await admin.GetFromJsonAsync<List<SettlementDto>>("/api/v1/admin/settlements"))!.Single(s => s.BookingId == bookingId);

    [Fact]
    public async Task Agency_is_paid_automatically_two_days_after_the_agency_completes_the_tour_minus_the_platform_fee()
    {
        var payout = new FakePayout();
        var completedAt = Now(); // VD 10/11: tới 12/11 mới chuyển tự động
        var clock = new TestClock { Fixed = completedAt };
        using var app = SettlementApp(payout, clock); await app.Initialize();
        var (admin, agency, booking) = await CompletedTour(app, paid: false);

        var ready = await Settlement(admin, booking.Id);
        Assert.Equal("Ready", ready.Status);
        Assert.Equal(completedAt, ready.TourCompletedAt);
        Assert.Equal(completedAt.AddDays(2), ready.AutoPayoutAt); // 10/11 → 12/11
        Assert.Equal(10m, ready.FeePercent);
        Assert.Equal("970436", ready.BankBin);
        Assert.Equal("0123456789", ready.AccountNumber);
        Assert.Equal("NGUYEN VAN DUC", ready.AccountHolder);
        Assert.Contains(ready.AutoBlockers, b => b.Contains("Chưa tới ngày"));
        Assert.Contains(ready.PayoutBlockers, b => b.Contains("chưa thanh toán đủ"));

        // Tới 12/11 nhưng khách chưa trả đủ: không chuyển; Admin cũng không chuyển được.
        clock.Fixed = completedAt.AddDays(2).AddMinutes(1);
        var run = await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null));
        Assert.Equal(0, run.Started);
        Assert.Equal(1, run.Waiting);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{ready.Id}/payout", new SettlementPayoutRequest(null, null))).StatusCode);
        Assert.Equal(0, payout.CreateCalls);

        // Khách trả đủ 10.000.000đ → lượt quét kế tiếp chuyển 9.000.000đ (phí sàn 10% = 1.000.000đ).
        await PayInFull(app, booking.Id);
        var due = await Settlement(admin, booking.Id);
        Assert.Empty(due.AutoBlockers);
        Assert.Equal(10000000m, due.GrossAmount);
        Assert.Equal(1000000m, due.PlatformFee);
        Assert.Equal(9000000m, due.NetPayout);
        run = await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null));
        Assert.Equal(1, run.Started);
        var order = Assert.Single(payout.ByKey.Values);
        Assert.Equal(9000000, order.Amount);
        Assert.Equal("970436", order.ToBin);
        Assert.Equal("0123456789", order.ToAccountNumber);
        Assert.Equal($"SETTLE-{ready.Id}-1", order.ReferenceId);
        var processing = await Settlement(admin, booking.Id);
        Assert.Equal("Processing", processing.Status);
        Assert.Equal("PAYOS", processing.PayoutMethod);

        // Đang chuyển: chạy lại / Admin bấm chuyển / ghi nhận tay đều không tạo khoản thứ hai.
        run = await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null));
        Assert.Equal(0, run.Started);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{ready.Id}/payout", new SettlementPayoutRequest(null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{ready.Id}/manual", new SettlementManualRequest("FT999", null, null))).StatusCode);
        Assert.Equal(1, payout.CreateCalls);
        // Đang chuyển thì Agency không được đổi tài khoản nhận.
        Assert.Equal(HttpStatusCode.Conflict, (await agency.PutAsJsonAsync("/api/v1/agency/payout-account",
            new PayoutAccountInput("Techcombank", "999999999", "Nguyen Van Duc"))).StatusCode);

        payout.Complete(order.ReferenceId, "FT26316000999");
        run = await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null));
        Assert.Equal(1, run.Synced);
        var paid = await Settlement(admin, booking.Id);
        Assert.Equal("Paid", paid.Status);
        Assert.Equal("FT26316000999", paid.BankReferenceCode);
        Assert.Equal(9000000m, paid.NetPayout);
        Assert.Null(paid.SettledBy); // hệ thống tự chuyển
        var mine = Assert.Single((await agency.GetFromJsonAsync<List<SettlementDto>>("/api/v1/agency/settlements"))!);
        Assert.Equal("Paid", mine.Status);
        Assert.Equal(1, payout.CreateCalls);
    }

    [Fact]
    public async Task Open_complaint_stops_automatic_payout_and_admin_records_a_manual_transfer_with_a_note()
    {
        var payout = new FakePayout();
        var completedAt = Now();
        var clock = new TestClock { Fixed = completedAt };
        using var app = SettlementApp(payout, clock); await app.Initialize();
        var (admin, _, booking) = await CompletedTour(app, paid: true);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            db.Complaints.Add(new Complaint { BookingId = booking.Id, ComplainantId = "customer1", TargetId = "agency1",
                Title = "Khách sạn không đúng hạng", Description = "Phòng 2 sao thay vì 4 sao", Status = ComplaintStatus.Pending });
            await db.SaveChangesAsync();
        }

        clock.Fixed = completedAt.AddDays(3);
        var run = await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null));
        Assert.Equal(0, run.Started);
        var held = await Settlement(admin, booking.Id);
        Assert.Equal("Ready", held.Status);
        Assert.Equal(1, held.OpenComplaints);
        Assert.Contains(held.AutoBlockers, b => b.Contains("khiếu nại"));
        Assert.Empty(held.PayoutBlockers);

        // Admin tạm giữ trong lúc làm việc với Agency.
        Assert.Equal("OnHold", (await Read<SettlementDto>(await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{held.Id}/hold",
            new SettlementHoldRequest("Đang xác minh khiếu nại khách sạn")))).Status);

        // Có khiếu nại mở: phải ghi chú. Thỏa thuận trừ 500.000đ bồi thường → chuyển 8.500.000đ.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{held.Id}/manual",
            new SettlementManualRequest("FT26317000111", null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{held.Id}/manual",
            new SettlementManualRequest("FT26317000111", 9500000, "Quá số được nhận"))).StatusCode);
        var paid = await Read<SettlementDto>(await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{held.Id}/manual",
            new SettlementManualRequest("FT26317000111", 8500000, "Đã thống nhất với Agency trừ 500.000đ bồi thường khách")));
        Assert.Equal("Paid", paid.Status);
        Assert.Equal("MANUAL", paid.PayoutMethod);
        Assert.Equal(8500000m, paid.NetPayout);
        Assert.Equal("admin1", paid.SettledBy);
        Assert.Equal("FT26317000111", paid.BankReferenceCode);
        Assert.Equal(0, payout.CreateCalls);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{held.Id}/manual",
            new SettlementManualRequest("FT2", null, "lặp"))).StatusCode);
    }

    [Fact]
    public async Task Rejected_payout_becomes_failed_and_admin_retries_with_a_new_reference()
    {
        var payout = new FakePayout();
        var completedAt = Now();
        var clock = new TestClock { Fixed = completedAt };
        using var app = SettlementApp(payout, clock); await app.Initialize();
        var (admin, _, booking) = await CompletedTour(app, paid: true);
        var row = await Settlement(admin, booking.Id);

        // Admin chuyển ngay (không chờ 2 ngày); payOS từ chối → Lỗi, chưa có tiền ra.
        payout.RejectNext = "Số dư không đủ";
        Assert.Equal(HttpStatusCode.BadGateway, (await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{row.Id}/payout", new SettlementPayoutRequest(null, null))).StatusCode);
        var failed = await Settlement(admin, booking.Id);
        Assert.Equal("Failed", failed.Status);
        Assert.Contains("Số dư không đủ", failed.PayoutNote);
        Assert.Contains(failed.AutoBlockers, b => b.Contains("không thành công"));

        // Tự động không thử lại khoản lỗi; Admin thử lại tạo lệnh mới SETTLE-{id}-2.
        clock.Fixed = completedAt.AddDays(3);
        Assert.Equal(0, (await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null))).Started);
        var retried = await Read<SettlementDto>(await admin.PostAsJsonAsync($"/api/v1/admin/settlements/{row.Id}/payout", new SettlementPayoutRequest(null, null)));
        Assert.Equal("Processing", retried.Status);
        Assert.Equal($"SETTLE-{row.Id}-2", retried.PayoutReference);
        payout.Complete(retried.PayoutReference!);
        var done = await Read<SettlementDto>(await admin.PostAsync($"/api/v1/admin/settlements/{row.Id}/payout/sync", null));
        Assert.Equal("Paid", done.Status);
        Assert.Equal("admin1", done.SettledBy);
    }

    [Fact]
    public async Task Only_admins_manage_settlements_and_agencies_must_pick_a_supported_bank()
    {
        using var app = new App(); await app.Initialize();
        using var agency = await app.Client("agency1@example.test");
        using var customer = await app.Client("customer1@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await agency.GetAsync("/api/v1/admin/settlements")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.GetAsync("/api/v1/agency/payout-account")).StatusCode);
        Assert.False((await agency.GetFromJsonAsync<AgencyPayoutAccountDto>("/api/v1/agency/payout-account"))!.Configured);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PutAsJsonAsync("/api/v1/agency/payout-account",
            new PayoutAccountInput("Ngân hàng lạ", "0123456789", "Nguyen Van A"))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PutAsJsonAsync("/api/v1/agency/payout-account",
            new PayoutAccountInput("MB Bank", "01234abc", "Nguyen Van A"))).StatusCode);
        var saved = await Read<AgencyPayoutAccountDto>(await agency.PutAsJsonAsync("/api/v1/agency/payout-account",
            new PayoutAccountInput("mbbank", "0123456789", "nguyen van a")));
        Assert.Equal("MB Bank", saved.BankName);
        Assert.Equal("970422", saved.BankBin);
        Assert.Equal("NGUYEN VAN A", saved.AccountHolder);
        // Không có kênh chi hộ: lượt quét không làm gì và báo rõ.
        using var admin = await app.Client("admin1@example.test");
        Assert.False((await Read<SettlementRunResult>(await admin.PostAsync("/api/v1/admin/settlements/run", null))).Configured);
    }
    [Fact]
    public async Task Admin_saves_the_platform_bank_account_and_a_new_fee_applies_to_tours_completed_afterwards()
    {
        var payout = new FakePayout();
        var clock = new TestClock { Fixed = Now() };
        using var app = SettlementApp(payout, clock); await app.Initialize();
        using var admin = await app.Client("admin1@example.test");
        var empty = await admin.GetFromJsonAsync<PlatformBankAccountDto>("/api/v1/admin/platform-bank-account");
        Assert.False(empty!.Configured);
        Assert.Equal(10m, empty.CommissionPercent);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.PutAsJsonAsync("/api/v1/admin/platform-bank-account",
            new PlatformBankAccountInput("Vietcombank", "12ab5678", "TripOps", null, null, 10))).StatusCode);
        var saved = await Read<PlatformBankAccountDto>(await admin.PutAsJsonAsync("/api/v1/admin/platform-bank-account",
            new PlatformBankAccountInput("Vietcombank", "0011 0022 33", "Công ty TripOps", "Hội sở", "Ghi rõ mã booking", 8)));
        Assert.True(saved.Configured);
        Assert.Equal("970436", saved.BankCode);
        Assert.Equal("0011002233", saved.AccountNumber);
        Assert.Equal("CONG TY TRIPOPS", saved.AccountHolder);
        Assert.Equal(8m, saved.CommissionPercent);
        // Lưu lần hai không tạo tài khoản thứ hai.
        await Read<PlatformBankAccountDto>(await admin.PutAsJsonAsync("/api/v1/admin/platform-bank-account",
            new PlatformBankAccountInput("Vietcombank", "0011002233", "CONG TY TRIPOPS", null, null, 8)));
        using (var scope = app.Services.CreateScope())
            Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().SystemBankAccounts.CountAsync());

        clock.Fixed = Now().AddMinutes(1);
        var (_, _, booking) = await CompletedTour(app, paid: true);
        var row = await Settlement(admin, booking.Id);
        Assert.Equal(8m, row.FeePercent);
        Assert.Equal(800000m, row.PlatformFee);
        Assert.Equal(9200000m, row.NetPayout);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await app.Client("agency1@example.test")).GetAsync("/api/v1/admin/platform-bank-account")).StatusCode);
    }
}
