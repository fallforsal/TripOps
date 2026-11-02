using System.Net;
using System.Net.Http.Json;
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

// Lịch thanh toán đợt cọc, giao dịch cọc (DEMO + VNPAY sandbox) và chặn hủy đơn đã có tiền.
public sealed partial class BookingFlowTests
{
    // Giá trị giả chỉ dùng trong test, không phải khóa VNPAY thật.
    private const string TestTmnCode = "TESTTMN1";
    private const string TestHashKey = "unit-test-key";

    private static App VnPayApp() => new(builder =>
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["VnPay:TmnCode"] = TestTmnCode,
            ["VnPay:HashSecret"] = TestHashKey,
            ["VnPay:ReturnUrl"] = "http://localhost:5174/api/v1/payments/vnpay/return",
            ["VnPay:FrontendBaseUrl"] = "http://localhost:5174/",
        })));

    private static async Task<(HttpClient Customer, HttpClient Agency, BookingDto Booking)> ApprovedBooking(App app)
    {
        var customer = await app.Client("customer1@example.test");
        var agency = await app.Client("agency1@example.test");
        var created = await customer.PostAsJsonAsync("/api/v1/bookings", Sample());
        created.EnsureSuccessStatusCode();
        var booking = (await created.Content.ReadFromJsonAsync<BookingDto>())!;
        var decision = await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null));
        decision.EnsureSuccessStatusCode();
        return (customer, agency, (await decision.Content.ReadFromJsonAsync<BookingDto>())!);
    }

    [Fact]
    public async Task Deposit_requires_reference_and_exact_outstanding_amount_and_is_paid_once()
    {
        using var app = new App(); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        Assert.Equal(900000, booking.PaymentSchedule![0].Outstanding); // 30% của 3.000.000

        Assert.Equal(HttpStatusCode.BadRequest, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(900000, null, null))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(100000, "PARTIAL", null))).StatusCode);
        (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(900000, "FULL", null))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(900000, "AGAIN", null))).StatusCode);
        // Mã giao dịch đã dùng cho số tiền khác bị từ chối.
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(500000, "FULL", null))).StatusCode);
    }

    [Fact]
    public async Task Approval_cancels_legacy_unpaid_request_and_credits_money_already_recorded()
    {
        using var app = new App(); await app.Initialize();
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
        var deposit = approved.PaymentSchedule![0];
        Assert.Equal(900000, deposit.Amount);
        Assert.Equal(800000, deposit.Outstanding);

        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var requests = await db.PaymentRequests.AsNoTracking().Where(r => r.BookingId == booking.Id).ToListAsync();
            Assert.Equal(2, requests.Count); // khoản cũ được giữ lại, không xóa
            Assert.Equal(PaymentRequestStatus.Cancelled, requests.Single(r => r.Stage == null).Status);
            Assert.Equal(PaymentRequestStatus.Pending, requests.Single(r => r.Stage == "deposit").Status);
        }
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(900000, "TOO-MUCH", null))).StatusCode);
        var paid = (await (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit",
            new BookingDepositRequest(800000, "REST", null))).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(900000, paid.PaidAmount);
        Assert.Equal("Paid", paid.PaymentSchedule![0].Status);
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
            Assert.Equal(PaymentRequestStatus.Cancelled, (await db.PaymentRequests.AsNoTracking().SingleAsync(r => r.BookingId == booking.Id)).Status);
        }

        var (customer2, _, paidBooking) = await ApprovedBooking(app);
        (await customer2.PostAsJsonAsync($"/api/v1/bookings/{paidBooking.Id}/deposit", new BookingDepositRequest(900000, "PAID-1", null))).EnsureSuccessStatusCode();
        var blocked = await customer2.PostAsJsonAsync($"/api/v1/bookings/{paidBooking.Id}/cancel", new BookingCancellationRequest("Muốn hủy"));
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var still = (await customer2.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{paidBooking.Id}"))!;
        Assert.Equal("Confirmed", still.Status);
    }

    [Fact]
    public async Task VnPay_is_unavailable_until_sandbox_credentials_are_configured()
    {
        // Ghi đè rỗng để user-secrets trên máy dev (nếu đã đặt khóa VNPAY) không ảnh hưởng test.
        using var app = new App(builder => builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
            new Dictionary<string, string?> { ["VnPay:TmnCode"] = "", ["VnPay:HashSecret"] = "" })));
        await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/vnpay", null)).StatusCode);
    }

    [Fact]
    public async Task VnPay_checkout_url_is_signed_and_ipn_confirms_the_deposit_once()
    {
        using var app = VnPayApp(); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        var gateway = app.Services.GetRequiredService<VnPayGateway>();

        // Chưa được duyệt thì không tạo được phiên thanh toán.
        var pending = (await (await customer.PostAsJsonAsync("/api/v1/bookings", Sample())).Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{pending.Id}/payments/vnpay", null)).StatusCode);

        var start = await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/vnpay", null);
        Assert.Equal(HttpStatusCode.OK, start.StatusCode);
        var checkout = (await start.Content.ReadFromJsonAsync<VnPayCheckoutDto>())!;
        Assert.Equal(900000, checkout.Amount);
        Assert.StartsWith(VnPayOptions.SandboxUrl + "?", checkout.PaymentUrl);
        var urlQuery = ParseQuery(new Uri(checkout.PaymentUrl).Query);
        Assert.Equal("90000000", urlQuery["vnp_Amount"]);
        Assert.Equal(TestTmnCode, urlQuery["vnp_TmnCode"]);
        Assert.Equal(checkout.TransactionCode, urlQuery["vnp_TxnRef"]);
        Assert.True(gateway.Verify(urlQuery)); // chữ ký trong URL hợp lệ

        // Giao dịch chờ cổng: chưa tính tiền, chưa cho hủy đơn.
        var waiting = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(0, waiting.PaidAmount);
        Assert.Equal("Pending", Assert.Single(waiting.PaymentTransactions!).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Thử hủy"))).StatusCode);

        using var anonymous = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        Assert.Equal("97", (await Ipn(anonymous, Tamper(VnPayResult(gateway, checkout.TransactionCode, 90000000, "00")))).RspCode);
        Assert.Equal("01", (await Ipn(anonymous, VnPayResult(gateway, "UNKNOWN-REF", 90000000, "00"))).RspCode);
        Assert.Equal("04", (await Ipn(anonymous, VnPayResult(gateway, checkout.TransactionCode, 1000, "00"))).RspCode);

        var success = VnPayResult(gateway, checkout.TransactionCode, 90000000, "00");
        Assert.Equal("00", (await Ipn(anonymous, success)).RspCode);
        Assert.Equal("02", (await Ipn(anonymous, success)).RspCode); // VNPAY gọi lại: không ghi thêm tiền

        var paid = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(900000, paid.PaidAmount);
        Assert.Equal("PartiallyPaid", paid.PaymentStatus);
        Assert.Equal("Paid", paid.PaymentSchedule![0].Status);
        var transaction = Assert.Single(paid.PaymentTransactions!);
        Assert.Equal("Success", transaction.Status);
        Assert.Equal("VNPAY", transaction.PaymentMethod);
        Assert.Equal("14000000", transaction.GatewayTransactionNo);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/vnpay", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Thử hủy"))).StatusCode);
    }

    [Fact]
    public async Task VnPay_return_records_failure_then_success_and_redirects_to_the_booking_page()
    {
        using var app = VnPayApp(); await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app);
        var gateway = app.Services.GetRequiredService<VnPayGateway>();
        using var browser = app.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        // Lần 1: khách hủy trên trang VNPAY (mã 24) → giao dịch Failed, không có tiền.
        var first = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/vnpay", null)).Content.ReadFromJsonAsync<VnPayCheckoutDto>())!;
        var failed = await browser.GetAsync("/api/v1/payments/vnpay/return?" + Query(VnPayResult(gateway, first.TransactionCode, 90000000, "24")));
        Assert.Equal(HttpStatusCode.Redirect, failed.StatusCode);
        Assert.Equal($"http://localhost:5174/#/my-bookings/{booking.Id}?payment=failed", failed.Headers.Location!.ToString());

        // Lần 2: thanh toán thành công; IPN đến sau trang return vẫn không ghi trùng.
        var second = (await (await customer.PostAsync($"/api/v1/bookings/{booking.Id}/payments/vnpay", null)).Content.ReadFromJsonAsync<VnPayCheckoutDto>())!;
        Assert.NotEqual(first.TransactionCode, second.TransactionCode);
        var ok = VnPayResult(gateway, second.TransactionCode, 90000000, "00");
        var returned = await browser.GetAsync("/api/v1/payments/vnpay/return?" + Query(ok));
        Assert.Equal($"http://localhost:5174/#/my-bookings/{booking.Id}?payment=success", returned.Headers.Location!.ToString());
        Assert.Equal("02", (await Ipn(browser, ok)).RspCode);

        var invalid = await browser.GetAsync("/api/v1/payments/vnpay/return?" + Query(Tamper(ok)));
        Assert.Equal("http://localhost:5174/#/my-bookings?payment=invalid", invalid.Headers.Location!.ToString());

        var reloaded = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal(900000, reloaded.PaidAmount);
        Assert.Equal(new[] { "Failed", "Success" }, reloaded.PaymentTransactions!.Select(t => t.Status));
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Assert.Equal(2, await db.PaymentTransactions.CountAsync(t => t.BookingId == booking.Id));
    }

    // Dữ liệu VNPAY gửi về (đã ký bằng HashSecret test) cho một giao dịch.
    private static Dictionary<string, string> VnPayResult(VnPayGateway gateway, string txnRef, long amount, string responseCode)
    {
        var data = new Dictionary<string, string>
        {
            ["vnp_TmnCode"] = TestTmnCode,
            ["vnp_Amount"] = amount.ToString(),
            ["vnp_BankCode"] = "NCB",
            ["vnp_OrderInfo"] = "Thanh toan coc don test",
            ["vnp_PayDate"] = "20261102103000",
            ["vnp_ResponseCode"] = responseCode,
            ["vnp_TransactionNo"] = "14000000",
            ["vnp_TransactionStatus"] = responseCode == "00" ? "00" : "02",
            ["vnp_TxnRef"] = txnRef,
        };
        data["vnp_SecureHash"] = gateway.Sign(data);
        return data;
    }

    private static Dictionary<string, string> Tamper(Dictionary<string, string> data) =>
        new(data) { ["vnp_Amount"] = "1" };

    private static string Query(Dictionary<string, string> data) =>
        string.Join("&", data.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));

    private static async Task<VnPayIpnResponse> Ipn(HttpClient client, Dictionary<string, string> data)
    {
        var response = await client.GetAsync("/api/v1/payments/vnpay/ipn?" + Query(data));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<VnPayIpnResponse>())!;
    }

    private static Dictionary<string, string> ParseQuery(string query) => query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries)
        .Select(part => part.Split('=', 2))
        .ToDictionary(kv => WebUtility.UrlDecode(kv[0]), kv => WebUtility.UrlDecode(kv.Length > 1 ? kv[1] : ""));
}
