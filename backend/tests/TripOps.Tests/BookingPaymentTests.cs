using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

// Thanh toán hai đợt (cọc 50%, hạn duyệt + 24 giờ), cổng payOS (giả lập, không gọi payOS thật) và chặn hủy đơn đã có tiền.
public sealed partial class BookingFlowTests
{
    // Giá trị giả chỉ dùng trong test, không phải khóa payOS thật.
    private const string TestChecksum = "unit-test-key";
    private static readonly DateTime ApprovedAtUtc = new(2026, 11, 2, 7, 30, 0, DateTimeKind.Utc); // 14:30 02/11 giờ Việt Nam

    private sealed class TestClock : PaymentClock
    {
        public DateTime? Fixed { get; set; }
        public override DateTime UtcNow => Fixed ?? DateTime.UtcNow;
    }

    /// <summary>Giả lập API payOS: kiểm tra header + chữ ký tạo link, trả dữ liệu có chữ ký như payOS.</summary>
    private sealed class FakePayOs : HttpMessageHandler
    {
        public sealed class Link
        {
            public long Amount { get; set; }
            public string Status { get; set; } = "PENDING";
            public long AmountPaid { get; set; }
            public string Description { get; set; } = "";
            public long ExpiredAt { get; set; }
        }
        public Dictionary<long, Link> Links { get; } = new();
        public int CreateCalls { get; private set; }
        public int GetCalls { get; private set; }

        public void Pay(long orderCode, long? amountPaid = null)
        {
            var link = Links[orderCode];
            link.AmountPaid = amountPaid ?? link.Amount;
            link.Status = link.AmountPaid >= link.Amount ? "PAID" : "UNDERPAID";
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Headers.GetValues("x-client-id").Single() != "test-client" || request.Headers.GetValues("x-api-key").Single() != "test-api")
                return new HttpResponseMessage(HttpStatusCode.Unauthorized);
            var path = request.RequestUri!.AbsolutePath;
            if (request.Method == HttpMethod.Post && path == "/v2/payment-requests")
            {
                CreateCalls++;
                using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
                var root = body.RootElement;
                long orderCode = root.GetProperty("orderCode").GetInt64(), amount = root.GetProperty("amount").GetInt64();
                var description = root.GetProperty("description").GetString()!;
                var expected = PayOsGateway.SignPaymentRequest(amount, root.GetProperty("cancelUrl").GetString()!, description,
                    orderCode, root.GetProperty("returnUrl").GetString()!, TestChecksum);
                if (root.GetProperty("signature").GetString() != expected)
                    return Reply(new { code = "20", desc = "Mã kiểm tra(signature) không hợp lệ", data = (object?)null });
                Links[orderCode] = new Link { Amount = amount, Description = description, ExpiredAt = root.GetProperty("expiredAt").GetInt64() };
                return Signed(new { bin = "970422", accountNumber = "0000", accountName = "TRIPOPS", amount, description, orderCode,
                    currency = "VND", paymentLinkId = $"link{orderCode}", status = "PENDING", checkoutUrl = $"https://pay.payos.vn/web/link{orderCode}", qrCode = "qr" });
            }
            if (request.Method == HttpMethod.Get && path.StartsWith("/v2/payment-requests/"))
            {
                GetCalls++;
                var orderCode = long.Parse(path["/v2/payment-requests/".Length..]);
                if (!Links.TryGetValue(orderCode, out var link)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                var transactions = link.AmountPaid > 0
                    ? new object[] { new { reference = "FT26110200001", amount = link.AmountPaid, accountNumber = "0000", description = link.Description,
                        transactionDateTime = "2026-11-02 14:40:00", virtualAccountName = (string?)null, virtualAccountNumber = (string?)null,
                        counterAccountBankId = (string?)null, counterAccountBankName = (string?)null, counterAccountName = (string?)null, counterAccountNumber = (string?)null } }
                    : Array.Empty<object>();
                return Signed(new { id = $"link{orderCode}", orderCode, amount = link.Amount, amountPaid = link.AmountPaid,
                    amountRemaining = link.Amount - link.AmountPaid, status = link.Status, createdAt = "2026-11-02T14:30:00+07:00",
                    transactions, cancellationReason = (string?)null, canceledAt = (string?)null });
            }
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }

        private static HttpResponseMessage Signed(object data)
        {
            var element = JsonSerializer.SerializeToElement(data);
            return Reply(new { code = "00", desc = "success", data = element, signature = PayOsGateway.SignData(element, TestChecksum) });
        }

        private static HttpResponseMessage Reply(object payload) => new(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
    }

    private static App PayOsApp(FakePayOs payOs, TestClock clock, bool configured = true) => new(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            // Ghi đè cả khi chưa cấu hình để user-secrets trên máy dev không ảnh hưởng test.
            ["PayOs:ClientId"] = configured ? "test-client" : "",
            ["PayOs:ApiKey"] = configured ? "test-api" : "",
            ["PayOs:ChecksumKey"] = configured ? TestChecksum : "",
            ["PayOs:BaseUrl"] = "https://payos.test",
            ["PayOs:ReturnUrl"] = "http://localhost:5174/api/v1/payments/payos/return",
            ["PayOs:FrontendBaseUrl"] = "http://localhost:5174/",
        }));
        builder.ConfigureServices(services =>
        {
            services.AddSingleton<PaymentClock>(clock);
            services.AddHttpClient<PayOsGateway>().ConfigurePrimaryHttpMessageHandler(() => payOs);
        });
    });

    private static CreateBookingRequest TenMillion() => Sample(
        new ParticipantInput("Adult 1", null, new DateTime(1990, 1, 1), "Nam", null, null),
        new ParticipantInput("Adult 2", null, new DateTime(1991, 1, 1), "Nữ", null, null),
        new ParticipantInput("Child 1", null, new DateTime(2018, 1, 1), "Nam", null, null),
        new ParticipantInput("Child 2", null, new DateTime(2019, 1, 1), "Nữ", null, null));

    private static async Task<(HttpClient Customer, HttpClient Agency, BookingDto Booking)> ApprovedBooking(App app, CreateBookingRequest? request = null)
    {
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var created = await customer.PostAsJsonAsync("/api/v1/bookings", request ?? Sample());
        created.EnsureSuccessStatusCode();
        var booking = (await created.Content.ReadFromJsonAsync<BookingDto>())!;
        var decision = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null));
        decision.EnsureSuccessStatusCode();
        return (customer, agency, (await decision.Content.ReadFromJsonAsync<BookingDto>())!);
    }

    private static long OrderCode(string transactionCode) => long.Parse(transactionCode["PAYOS-".Length..]);

    private static async Task<PaymentSyncResultDto> Sync(HttpClient customer, int bookingId)
    {
        var response = await customer.PostAsync($"/api/v1/bookings/{bookingId}/payments/payos/sync", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<PaymentSyncResultDto>())!;
    }

    // ------------------------------------------------------------- lịch cọc

    [Fact]
    public async Task Deposit_is_50_percent_due_24_hours_after_approval_and_never_extended()
    {
        var clock = new TestClock { Fixed = ApprovedAtUtc };
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var (customer, agency, booking) = await ApprovedBooking(app, TenMillion());

        Assert.Equal(10000000, booking.TotalAmount);
        var deposit = booking.PaymentSchedule![0];
        Assert.Equal("deposit", deposit.Stage);
        Assert.Equal(5000000, deposit.Amount);
        Assert.Equal(5000000, deposit.Outstanding);
        Assert.Equal(new DateTime(2026, 11, 3, 7, 30, 0, DateTimeKind.Utc), deposit.DueAt!.Value.ToUniversalTime()); // 14:30 03/11 giờ VN
        Assert.Equal("Pending", deposit.Status);
        Assert.Equal(5000000, booking.PaymentSchedule[1].Amount); // phần còn lại = 10tr − 5tr cọc

        // Duyệt lặp, tải lại trang, bấm thanh toán sau 2 giờ: không tạo khoản mới, không đổi hạn.
        clock.Fixed = ApprovedAtUtc.AddHours(2);
        var again = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null));
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        var reloaded = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(deposit.DueAt, reloaded.PaymentSchedule![0].DueAt);
        (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).EnsureSuccessStatusCode();
        Assert.Equal(deposit.DueAt, (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.PaymentSchedule![0].DueAt);

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        var request = await db.PaymentRequests.AsNoTracking().SingleAsync(r => r.BookingId == booking.Id && r.Stage == "deposit");
        Assert.Equal(ApprovedAtUtc.AddHours(24), request.DueAt);
        Assert.Equal(new DateTime(2026, 11, 3), request.DueDate!.Value.Date);
    }

    [Fact]
    public async Task Overdue_deposit_cannot_be_paid_and_booking_is_not_cancelled_automatically()
    {
        var clock = new TestClock { Fixed = ApprovedAtUtc };
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);

        clock.Fixed = ApprovedAtUtc.AddHours(24).AddMinutes(1);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "LATE", null))).StatusCode);
        Assert.Equal(0, payOs.CreateCalls);
        var current = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal("Overdue", current.PaymentSchedule![0].Status);
        Assert.Equal("Confirmed", current.Status);
    }

    [Fact]
    public async Task Deposit_requires_reference_and_exact_outstanding_amount_and_is_paid_once()
    {
        using var app = new App(); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        Assert.Equal(1500000, booking.PaymentSchedule![0].Outstanding); // 50% của 3.000.000

        Assert.Equal(HttpStatusCode.BadRequest, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(100000, "PARTIAL", null))).StatusCode);
        var paid = (await (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "FULL", null))).Content.ReadFromJsonAsync<BookingDto>())!;
        // Đủ cọc chưa phải đã thanh toán đủ booking.
        Assert.Equal("Confirmed", paid.Status);
        Assert.Equal("PartiallyPaid", paid.PaymentStatus);
        Assert.Equal(1500000, paid.PaymentSchedule![1].Outstanding);
        Assert.Equal("Pending", paid.PaymentSchedule[1].Status); // đủ cọc thì Đợt 2 mở thu
        // Mã giao dịch đã dùng cho số tiền khác bị từ chối.
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(500000, "FULL", null))).StatusCode);
        // Lần trả tiếp theo là Đợt 2 (đúng phần còn lại) → đơn đã thanh toán đủ.
        var full = (await (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "BALANCE", null))).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal("Paid", full.Status);
        Assert.Equal("Paid", full.PaymentStatus);
        Assert.All(full.PaymentSchedule!, item => Assert.Equal("Paid", item.Status));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "AGAIN", null))).StatusCode);
    }

    [Fact]
    public async Task Approval_cancels_legacy_unpaid_request_and_only_the_missing_deposit_is_collected()
    {
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, new TestClock()); await app.Initialize();
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var booking = (await (await customer.PostAsJsonAsync("/api/v1/bookings", Sample())).Content.ReadFromJsonAsync<BookingDto>())!;
        using (var scope = app.Services.CreateScope())
        {
            // Dữ liệu cũ: khoản "Đặt cọc 30%" tạo lúc đặt tour + 100.000đ DEMO đã ghi nhận.
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var legacy = new PaymentRequest { BookingId = booking.Id, Description = "Đặt cọc 30%", Amount = 900000, DueDate = DateTime.UtcNow.Date.AddDays(10) };
            db.PaymentRequests.Add(legacy);
            await db.SaveChangesAsync();
            db.PaymentTransactions.Add(new PaymentTransaction { BookingId = booking.Id, PaymentRequestId = legacy.Id, TransactionCode = "LEGACY-1",
                PaymentMethod = "DEMO", Amount = 100000, Status = PaymentTransactionStatus.Success });
            await db.SaveChangesAsync();
        }

        var approved = (await (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",
            new BookingDecisionRequest("approve", null))).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(1500000, approved.PaymentSchedule![0].Amount);
        Assert.Equal(1400000, approved.PaymentSchedule[0].Outstanding);

        var checkout = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        Assert.Equal(1400000, checkout.Amount);
        Assert.Equal(1400000, payOs.Links[OrderCode(checkout.TransactionCode)].Amount);

        using var check = app.Services.CreateScope();
        var requests = await check.ServiceProvider.GetRequiredService<TripOpsDbContext>().PaymentRequests.AsNoTracking()
            .Where(r => r.BookingId == booking.Id).ToListAsync();
        Assert.Equal(3, requests.Count); // khoản cũ được giữ lại (không xóa) + Đợt 1 + Đợt 2
        Assert.Equal(PaymentRequestStatus.Cancelled, requests.Single(r => r.Stage == null).Status);
    }

    [Fact]
    public async Task Balance_is_due_one_week_before_departure_and_cannot_be_paid_after_that()
    {
        // Khởi hành 30/11 → hạn Đợt 2 hết ngày 22/11 (00:00 23/11 giờ VN = 17:00 22/11 UTC).
        Assert.Equal(new DateTime(2026, 11, 22, 17, 0, 0, DateTimeKind.Utc), PaymentRules.BalanceDeadline(new DateTime(2026, 11, 30)));
        Assert.Equal(new DateTime(2026, 11, 22), PaymentRules.VietnamDate(PaymentRules.BalanceDeadline(new DateTime(2026, 11, 30)).AddTicks(-1)));

        var clock = new TestClock();
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var start = DateTime.UtcNow.Date.AddDays(20);
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = start });
        var balance = booking.PaymentSchedule![1];
        Assert.Equal("balance", balance.Stage);
        Assert.Equal("Scheduled", balance.Status); // chờ đủ cọc
        Assert.Equal(PaymentRules.BalanceDeadline(start), balance.DueAt!.Value.ToUniversalTime());
        Assert.Equal(start.AddDays(-8), balance.DueDate!.Value.Date);
        Assert.Null(balance.Warning);

        (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, "DEP", null))).EnsureSuccessStatusCode();
        clock.Fixed = PaymentRules.BalanceDeadline(start).AddMinutes(1);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(1500000, "LATE-BALANCE", null))).StatusCode);
        Assert.Equal(0, payOs.CreateCalls);
        var current = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal("Overdue", current.PaymentSchedule![1].Status);
        Assert.Equal("Confirmed", current.Status); // không tự hủy
    }

    [Fact]
    public async Task Tour_approved_close_to_departure_is_paid_once_in_full_within_24_hours()
    {
        var departure = new DateTime(2026, 11, 30);
        // Duyệt 14:00 25/11 giờ VN: hạn Đợt 2 (hết 22/11) đã qua → thu 100% trước 14:00 26/11.
        Assert.True(PaymentRules.FullPaymentAtApproval(departure, new DateTime(2026, 11, 25, 7, 0, 0, DateTimeKind.Utc)));
        // Duyệt 14:00 21/11: hạn cọc 14:00 22/11 vẫn trước hạn Đợt 2 → vẫn chia hai đợt.
        Assert.False(PaymentRules.FullPaymentAtApproval(departure, new DateTime(2026, 11, 21, 7, 0, 0, DateTimeKind.Utc)));
        // Duyệt 18:00 22/11: hạn cọc 18:00 23/11 sau hạn Đợt 2 → thu một lần.
        Assert.True(PaymentRules.FullPaymentAtApproval(departure, new DateTime(2026, 11, 22, 11, 0, 0, DateTimeKind.Utc)));

        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, new TestClock()); await app.Initialize();
        var (customer, agency, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(5) });
        var item = Assert.Single(booking.PaymentSchedule!);
        Assert.Equal("full", item.Stage);
        Assert.Equal(booking.TotalAmount, item.Amount);
        Assert.Equal(booking.TotalAmount, item.Outstanding);
        Assert.Equal("Pending", item.Status);
        Assert.NotNull(item.Warning);
        Assert.True(item.DueAt!.Value.ToUniversalTime() <= DateTime.UtcNow + PaymentRules.DepositWindow);

        // Duyệt lặp: không tạo thêm đợt, không đổi hạn.
        var again = (await (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",
            new BookingDecisionRequest("approve", null))).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(item.DueAt, Assert.Single(again.PaymentSchedule!).DueAt);

        // Trả thiếu (chỉ 50%) bị từ chối: phải trả đúng toàn bộ.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(booking.TotalAmount / 2, "HALF", null))).StatusCode);

        var checkout = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        Assert.Equal(booking.TotalAmount, checkout.Amount);
        var orderCode = OrderCode(checkout.TransactionCode);
        Assert.StartsWith("TT", payOs.Links[orderCode].Description);
        payOs.Pay(orderCode);
        var synced = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos/sync", null)).Content.ReadFromJsonAsync<PaymentSyncResultDto>())!;
        Assert.Equal("paid", synced.Outcome);
        Assert.Equal("Paid", synced.Booking.Status);
        Assert.Equal("Paid", Assert.Single(synced.Booking.PaymentSchedule!).Status);

        using var check = app.Services.CreateScope();
        var requests = await check.ServiceProvider.GetRequiredService<TripOpsDbContext>().PaymentRequests.AsNoTracking()
            .Where(r => r.BookingId == booking.Id).ToListAsync();
        Assert.Equal("deposit", Assert.Single(requests).Stage);
    }

    // ------------------------------------------------------------- payOS

    [Fact]
    public async Task PayOs_requires_configuration_owner_and_approval()
    {
        var payOs = new FakePayOs();
        using (var unconfigured = PayOsApp(payOs, new TestClock(), configured: false))
        {
            await unconfigured.Initialize();
            var (customer, _, booking) = await ApprovedBooking(unconfigured);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).StatusCode);
        }

        using var app = PayOsApp(payOs, new TestClock()); await app.Initialize();
        var (owner, _, approved) = await ApprovedBooking(app);
        var other = await app.Client("customer2@example.test");
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsync($"/api/v1/bookings/{approved.Id}/payments/payos", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsync($"/api/v1/bookings/{approved.Id}/payments/payos/sync", null)).StatusCode);
        var pending = (await (await owner.PostAsJsonAsync("/api/v1/bookings", Sample())).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(HttpStatusCode.Conflict, (await owner.PostAsync($"/api/v1/bookings/{pending.Id}/payments/payos", null)).StatusCode);
        Assert.Equal(0, payOs.CreateCalls);
    }

    [Fact]
    public async Task PayOs_link_is_reused_on_repeated_clicks_and_only_verified_payment_is_recorded_once()
    {
        var clock = new TestClock { Fixed = ApprovedAtUtc };
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app, TenMillion());

        var first = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        var second = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        Assert.Equal(1, payOs.CreateCalls);
        Assert.True(second.Reused);
        Assert.Equal(first.CheckoutUrl, second.CheckoutUrl);
        Assert.Equal(5000000, first.Amount);
        var link = payOs.Links[OrderCode(first.TransactionCode)];
        Assert.Equal($"COC{booking.Id}", link.Description);
        Assert.Equal(new DateTimeOffset(ApprovedAtUtc.AddMinutes(15)).ToUnixTimeSeconds(), link.ExpiredAt);

        // Chưa trả: tra cứu báo đang chờ, không có tiền, chưa cho hủy.
        var waiting = await Sync(customer, booking.Id);
        Assert.Equal("pending", waiting.Outcome);
        Assert.Equal(0, waiting.Booking.PaidAmount);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Thử hủy"))).StatusCode);

        // URL quay về có status=PAID cũng không phải bằng chứng: chỉ chuyển hướng.
        using var browser = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var returned = await browser.GetAsync($"/api/v1/payments/payos/return?code=00&status=PAID&cancel=false&orderCode={OrderCode(first.TransactionCode)}");
        Assert.Equal(HttpStatusCode.Redirect, returned.StatusCode);
        Assert.Equal($"http://localhost:5174/#/my-bookings/{booking.Id}/payos", returned.Headers.Location!.ToString());
        Assert.Equal(0, (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.PaidAmount);

        payOs.Pay(OrderCode(first.TransactionCode));
        var paid = await Sync(customer, booking.Id);
        Assert.Equal("paid", paid.Outcome);
        Assert.Equal(5000000, paid.Booking.PaidAmount);
        Assert.Equal("Paid", paid.Booking.PaymentSchedule![0].Status);
        Assert.Equal("PartiallyPaid", paid.Booking.PaymentStatus);
        Assert.Equal("Confirmed", paid.Booking.Status); // đủ cọc ≠ đã thanh toán đủ
        var transaction = Assert.Single(paid.Booking.PaymentTransactions!);
        Assert.Equal("Success", transaction.Status);
        Assert.Equal("PAYOS", transaction.PaymentMethod);
        Assert.Equal("FT26110200001", transaction.GatewayTransactionNo);

        Assert.Equal(5000000, (await Sync(customer, booking.Id)).Booking.PaidAmount); // tra cứu lặp: không cộng thêm
        // Đủ cọc: lần thanh toán tiếp theo là Đợt 2 với đúng phần còn lại.
        var balance = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        Assert.Equal(5000000, balance.Amount);
        Assert.Equal($"TT{booking.Id}", payOs.Links[OrderCode(balance.TransactionCode)].Description);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Thử hủy"))).StatusCode);
    }

    [Fact]
    public async Task PayOs_cancelled_expired_and_mismatched_results_are_kept_without_crediting_money()
    {
        var clock = new TestClock { Fixed = ApprovedAtUtc };
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);

        var first = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        payOs.Links[OrderCode(first.TransactionCode)].Status = "CANCELLED";
        Assert.Equal("cancelled", (await Sync(customer, booking.Id)).Outcome);

        var second = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        Assert.NotEqual(first.TransactionCode, second.TransactionCode);
        payOs.Links[OrderCode(second.TransactionCode)].Status = "EXPIRED";
        Assert.Equal("expired", (await Sync(customer, booking.Id)).Outcome);

        var third = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        payOs.Pay(OrderCode(third.TransactionCode), amountPaid: 1000000); // trả thiếu
        var review = await Sync(customer, booking.Id);
        Assert.Equal("review", review.Outcome);
        Assert.Equal(0, review.Booking.PaidAmount);
        Assert.Equal(new[] { "Cancelled", "Expired", "NeedsReview" }, review.Booking.PaymentTransactions!.Select(t => t.Status));
        Assert.Contains("1.000.000", review.Booking.PaymentTransactions![2].ReviewNote);
        Assert.Equal(3, payOs.CreateCalls);
    }

    [Fact]
    public async Task PayOs_webhook_checks_signature_and_shares_idempotent_handling_with_lookup()
    {
        var clock = new TestClock { Fixed = ApprovedAtUtc };
        var payOs = new FakePayOs();
        using var app = PayOsApp(payOs, clock); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        var checkout = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/payos", null)).Content.ReadFromJsonAsync<PayOsCheckoutDto>())!;
        var orderCode = OrderCode(checkout.TransactionCode);
        using var payOsServer = app.CreateClient();

        var forged = Webhook(orderCode, 1500000, signWith: "wrong-key");
        Assert.False((await PostWebhook(payOsServer, forged)).Success);
        Assert.Equal(0, (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.PaidAmount);

        Assert.Equal("ignored", (await PostWebhook(payOsServer, Webhook(123, 1500000))).Result); // dữ liệu thử khi đăng ký webhook

        var genuine = Webhook(orderCode, 1500000);
        Assert.Equal("paid", (await PostWebhook(payOsServer, genuine)).Result);
        Assert.Equal("paid", (await PostWebhook(payOsServer, genuine)).Result); // payOS gửi lặp
        payOs.Pay(orderCode);
        var synced = await Sync(customer, booking.Id); // tra cứu sau webhook
        Assert.Equal(1500000, synced.Booking.PaidAmount);
        Assert.Single(synced.Booking.PaymentTransactions!, t => t.Status == "Success");

        using var scope = app.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<TripOpsDbContext>().PaymentTransactions
            .CountAsync(t => t.BookingId == booking.Id && t.Status == PaymentTransactionStatus.Success));
    }

    [Fact]
    public async Task Legacy_vnpay_pending_is_shown_expired_not_paid_and_does_not_block_cancel()
    {
        using var app = PayOsApp(new FakePayOs(), new TestClock()); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            db.PaymentTransactions.Add(new PaymentTransaction { BookingId = booking.Id, TransactionCode = "VNP1T2611020000000001",
                PaymentMethod = "VNPAY", Amount = 900000, Status = PaymentTransactionStatus.Pending, CreatedAt = DateTime.UtcNow.AddMinutes(-2) });
            await db.SaveChangesAsync();
        }
        var current = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(0, current.PaidAmount);
        Assert.Equal("Expired", Assert.Single(current.PaymentTransactions!).Status);
        Assert.Equal("none", (await Sync(customer, booking.Id)).Outcome); // VNPAY cũ không tra cứu qua payOS
        Assert.Equal(HttpStatusCode.OK, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Đổi kế hoạch"))).StatusCode);
    }

    [Fact]
    public async Task Cancel_is_blocked_once_money_is_recorded_and_closes_open_requests_otherwise()
    {
        using var app = new App(); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        var cancelled = await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel", new BookingCancellationRequest("Đổi kế hoạch"));
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        var dto = (await cancelled.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal("Cancelled", dto.Status);
        Assert.Empty(dto.PaymentSchedule!);
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var closed = await db.PaymentRequests.AsNoTracking().Where(r => r.BookingId == booking.Id).ToListAsync();
            Assert.Equal(2, closed.Count);
            Assert.All(closed, r => Assert.Equal(PaymentRequestStatus.Cancelled, r.Status));
        }

        var (customer2, _, paidBooking) = await ApprovedBooking(app);
        (await customer2.PostAsJsonAsync($"/api/v1/bookings/{paidBooking.Id}/deposit", new BookingDepositRequest(1500000, "PAID-1", null))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await customer2.PostAsJsonAsync($"/api/v1/bookings/{paidBooking.Id}/cancel",
            new BookingCancellationRequest("Muốn hủy"))).StatusCode);
        Assert.Equal("Confirmed", (await customer2.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{paidBooking.Id}"))!.Status);
    }

    private static JsonElement Webhook(long orderCode, long amount, string signWith = TestChecksum)
    {
        var data = JsonSerializer.SerializeToElement(new
        {
            orderCode, amount, description = "COC1", accountNumber = "0000", reference = "FT26110200009",
            transactionDateTime = "2026-11-02 14:45:00", currency = "VND", paymentLinkId = $"link{orderCode}", code = "00", desc = "success",
            counterAccountBankId = "", counterAccountBankName = "", counterAccountName = (string?)null, counterAccountNumber = (string?)null,
            virtualAccountName = "", virtualAccountNumber = ""
        });
        return JsonSerializer.SerializeToElement(new { code = "00", desc = "success", success = true, data, signature = PayOsGateway.SignData(data, signWith) });
    }

    private static async Task<PayOsWebhookAckDto> PostWebhook(HttpClient client, JsonElement body)
    {
        var response = await client.PostAsJsonAsync("/api/v1/payments/payos/webhook", body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<PayOsWebhookAckDto>())!;
    }
}
