using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Tests;

// Hoàn tiền tự động bằng chi hộ payOS (giả lập máy chủ payOS, không gọi payOS thật, không có tiền thật).
public sealed partial class BookingFlowTests
{
    private const string PayoutChecksum = "unit-test-key";

    /// <summary>Giả lập API chi hộ payOS: kiểm tra header/chữ ký, khóa idempotency, trả dữ liệu có chữ ký ở header.</summary>
    private sealed class FakePayout : HttpMessageHandler
    {
        public sealed class Order
        {
            public string Id { get; set; } = "";
            public string ReferenceId { get; set; } = "";
            public long Amount { get; set; }
            public string ToBin { get; set; } = "";
            public string ToAccountNumber { get; set; } = "";
            public string State { get; set; } = "PROCESSING";
            public string? Reference { get; set; }
            public string? Error { get; set; }
        }
        public Dictionary<string, Order> ByKey { get; } = new();
        public int CreateCalls { get; private set; }
        /// <summary>Đặt để lần tạo lệnh kế tiếp bị payOS từ chối (HTTP 400).</summary>
        public string? RejectNext { get; set; }

        public void Complete(string referenceId, string bankReference = "FT26307000123") =>
            Update(referenceId, o => { o.State = "SUCCEEDED"; o.Reference = bankReference; });
        public void Fail(string referenceId, string error) => Update(referenceId, o => { o.State = "FAILED"; o.Error = error; });
        private void Update(string referenceId, Action<Order> change) => change(ByKey.Values.Single(o => o.ReferenceId == referenceId));

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            if (request.Headers.GetValues("x-client-id").Single() != "payout-client" || request.Headers.GetValues("x-api-key").Single() != "payout-api")
                return new HttpResponseMessage(HttpStatusCode.Unauthorized);
            var path = request.RequestUri!.AbsolutePath;
            if (request.Method == HttpMethod.Post && path == "/v1/payouts/")
            {
                CreateCalls++;
                using var body = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(ct));
                if (request.Headers.GetValues("x-signature").Single() != PayOsPayoutGateway.Sign(body.RootElement, PayoutChecksum))
                    return Error(HttpStatusCode.Unauthorized, "Chữ ký không hợp lệ");
                if (RejectNext is { } reason) { RejectNext = null; return Error(HttpStatusCode.BadRequest, reason); }
                var key = request.Headers.GetValues("x-idempotency-key").Single();
                if (!ByKey.TryGetValue(key, out var order))
                {
                    var root = body.RootElement;
                    ByKey[key] = order = new Order
                    {
                        Id = $"batch_{ByKey.Count + 1}", ReferenceId = root.GetProperty("referenceId").GetString()!,
                        Amount = root.GetProperty("amount").GetInt64(), ToBin = root.GetProperty("toBin").GetString()!,
                        ToAccountNumber = root.GetProperty("toAccountNumber").GetString()!
                    };
                }
                return Signed(Payout(order));
            }
            if (request.Method == HttpMethod.Get && path.StartsWith("/v1/payouts/") && path.Length > "/v1/payouts/".Length)
            {
                var order = ByKey.Values.SingleOrDefault(o => o.Id == path["/v1/payouts/".Length..]);
                return order is null ? Error(HttpStatusCode.NotFound, "Không tìm thấy") : Signed(Payout(order));
            }
            if (request.Method == HttpMethod.Get && path == "/v1/payouts")
            {
                var reference = System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query)["referenceId"];
                var found = ByKey.Values.Where(o => o.ReferenceId == reference).Select(Payout).ToArray();
                return Signed(new { payouts = found, pagination = new { total = found.Length, limit = 5, offset = 0, count = found.Length, hasMore = false } });
            }
            if (request.Method == HttpMethod.Get && path == "/v1/payouts-account/balance")
                return Signed(new { accountNumber = "0000123", accountName = "TRIPOPS", currency = "VND", balance = "5000000" });
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }

        private static object Payout(Order o) => new
        {
            id = o.Id, referenceId = o.ReferenceId, category = new[] { "refund" },
            approvalState = o.State == "SUCCEEDED" ? "COMPLETED" : o.State == "FAILED" ? "FAILED" : "PROCESSING",
            createdAt = "2026-11-03T10:00:00+07:00",
            transactions = new[] { new { id = o.Id + "_tx", referenceId = o.ReferenceId, amount = o.Amount, description = "TripOps hoan tien",
                toBin = o.ToBin, toAccountNumber = o.ToAccountNumber, toAccountName = "NGUYEN VAN A", reference = o.Reference,
                transactionDatetime = o.Reference is null ? null : "2026-11-03T10:05:00+07:00", errorMessage = o.Error, errorCode = (string?)null, state = o.State } }
        };

        private static HttpResponseMessage Signed(object data)
        {
            var element = JsonSerializer.SerializeToElement(data);
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new { code = "00", desc = "success", data = element }), Encoding.UTF8, "application/json")
            };
            response.Headers.Add("x-signature", PayOsPayoutGateway.Sign(element, PayoutChecksum));
            return response;
        }

        private static HttpResponseMessage Error(HttpStatusCode status, string desc) => new(status)
        {
            Content = new StringContent(JsonSerializer.Serialize(new { code = "01", desc }), Encoding.UTF8, "application/json")
        };
    }

    private static App PayoutApp(FakePayout payout) => new(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["PayOsPayout:ClientId"] = "payout-client",
            ["PayOsPayout:ApiKey"] = "payout-api",
            ["PayOsPayout:ChecksumKey"] = PayoutChecksum,
            ["PayOsPayout:BaseUrl"] = "https://payout.test",
        }));
        builder.ConfigureServices(services =>
            services.AddHttpClient<PayOsPayoutGateway>().ConfigurePrimaryHttpMessageHandler(() => payout));
    });

    /// <summary>Đơn đã trả cọc 1.500.000đ, khách gửi yêu cầu hủy trong 72 giờ (hoàn đủ) với tài khoản Vietcombank.</summary>
    private static async Task<(HttpClient Customer, HttpClient Admin, BookingDto Booking, AdminRefundDto Refund)> PendingRefund(App app, string bank = "Vietcombank")
    {
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(40) });
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/deposit", new BookingDepositRequest(1500000, $"DEP-P{booking.Id}", null)));
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancellation-requests",
            new CustomerCancellationRequest("CUSTOMER_REQUEST", "Đổi kế hoạch", bank, "0123456789", "Nguyen Van A")));
        var admin = await app.Client("admin1@example.test");
        var refund = (await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds?status=Pending"))!.Single(r => r.BookingId == booking.Id);
        return (customer, admin, booking, refund);
    }

    [Fact]
    public void Payout_signature_matches_the_official_payOS_SDK()
    {
        // Giá trị tính bằng @payos/node 2.0.5: crypto.createSignature("unit-test-key", body).
        var body = JsonSerializer.SerializeToElement(new
        {
            referenceId = "PAYOUT-12-1", amount = 750000, description = "TripOps hoan tien (don 34)!",
            toBin = "970436", toAccountNumber = "0123456789", category = new[] { "refund" }
        });
        Assert.Equal("414520245256ad96e43a0bb847c669a09527b2ba33ce94aff7ce8a426c6f2c87", PayOsPayoutGateway.Sign(body, "unit-test-key"));
        using var data = JsonDocument.Parse("""
            {"id":"batch_abc","referenceId":"PAYOUT-12-1","transactions":[{"id":"tx1","referenceId":"PAYOUT-12-1","amount":750000,
            "description":"Hoàn tiền \"đơn\" 34","toBin":"970436","toAccountNumber":"0123456789","toAccountName":"NGUYEN VAN A",
            "reference":"FT2611","transactionDatetime":"2026-11-03T10:00:00+07:00","errorMessage":null,"errorCode":null,"state":"SUCCEEDED"}],
            "category":["refund"],"approvalState":"COMPLETED","createdAt":"2026-11-03T10:00:00+07:00"}
            """);
        Assert.Equal("45199a167ad6301a4cf8e20cbe086d9c5bff14f74528ec7dc999ea271b77f6fb", PayOsPayoutGateway.Sign(data.RootElement, "unit-test-key"));
        Assert.Equal("Ho%C3%A0n%20ti%E1%BB%81n%20(x)!*'~", PayOsPayoutGateway.EncodeUriComponent("Hoàn tiền (x)!*'~"));

        Assert.Equal("970436", VietnamBanks.BinOf("Vietcombank"));
        Assert.Equal("970422", VietnamBanks.BinOf("MB Bank"));
        Assert.Equal("970437", VietnamBanks.BinOf("HD Bank"));
        Assert.Equal("970400", VietnamBanks.BinOf("Saigonbank"));
        Assert.Null(VietnamBanks.BinOf("Ngân hàng lạ"));
    }

    [Fact]
    public async Task Refund_is_paid_out_through_payOS_and_the_booking_is_cancelled_only_when_payOS_confirms()
    {
        var payout = new FakePayout();
        using var app = PayoutApp(payout); await app.Initialize();
        var (customer, admin, booking, refund) = await PendingRefund(app);
        Assert.Equal("970436", refund.BankBin);
        var account = (await admin.GetFromJsonAsync<PayoutAccountDto>("/api/v1/admin/refunds/payout-account"))!;
        Assert.True(account.Configured);
        Assert.Equal(5000000m, account.Balance);

        var started = await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/payout", new RefundPayoutRequest(1500000, null)));
        Assert.Equal("Approved", started.Status); // đang chuyển
        Assert.Equal("PROCESSING", started.PayoutState);
        var order = Assert.Single(payout.ByKey.Values);
        Assert.Equal(1500000, order.Amount);
        Assert.Equal("970436", order.ToBin);
        Assert.Equal("0123456789", order.ToAccountNumber);

        // Đang chuyển: đơn chưa hủy, không duyệt/chi lần hai, khách không trả tiền tiếp.
        Assert.Equal("Confirmed", (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/payout", new RefundPayoutRequest(1500000, null))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/approve", new RefundApprovalRequest(1500000, "FT1", null))).StatusCode);
        Assert.Equal(1, payout.CreateCalls);
        Assert.Equal("Approved", (await Read<AdminRefundDto>(await admin.PostAsync($"/api/v1/admin/refunds/{refund.Id}/payout/sync", null))).Status);

        payout.Complete(order.ReferenceId, "FT26307000123");
        var done = await Read<AdminRefundDto>(await admin.PostAsync($"/api/v1/admin/refunds/{refund.Id}/payout/sync", null));
        Assert.Equal("Completed", done.Status);
        Assert.Equal("FT26307000123", done.RefundTransactionCode);
        var after = (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!;
        Assert.Equal("Cancelled", after.Status);
        Assert.Equal("FT26307000123", after.Cancellation!.RefundTransactionCode);
        var tx = Assert.Single(after.PaymentTransactions!, t => t.PaymentMethod == "PAYOS_PAYOUT");
        Assert.Equal("Refunded", tx.Status);
        // Bấm kiểm tra lặp không ghi thêm gì.
        Assert.Equal("Completed", (await Read<AdminRefundDto>(await admin.PostAsync($"/api/v1/admin/refunds/{refund.Id}/payout/sync", null))).Status);
    }

    [Fact]
    public async Task Failed_or_rejected_payout_returns_the_request_to_pending_without_cancelling()
    {
        var payout = new FakePayout();
        using var app = PayoutApp(payout); await app.Initialize();
        var (customer, admin, booking, refund) = await PendingRefund(app);

        payout.RejectNext = "Số dư không đủ";
        Assert.Equal(HttpStatusCode.BadGateway, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/payout", new RefundPayoutRequest(1500000, null))).StatusCode);
        var afterReject = (await admin.GetFromJsonAsync<List<AdminRefundDto>>("/api/v1/admin/refunds"))!.Single(r => r.Id == refund.Id);
        Assert.Equal("Pending", afterReject.Status);
        Assert.Contains("Số dư không đủ", afterReject.LastPayoutError);

        // Lần hai: payOS nhận lệnh nhưng ngân hàng báo lỗi → về chờ duyệt, đơn không bị hủy.
        var started = await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/payout", new RefundPayoutRequest(1500000, null)));
        Assert.Equal("Approved", started.Status);
        payout.Fail(payout.ByKey.Values.Single().ReferenceId, "Tài khoản nhận không tồn tại");
        var failed = await Read<AdminRefundDto>(await admin.PostAsync($"/api/v1/admin/refunds/{refund.Id}/payout/sync", null));
        Assert.Equal("Pending", failed.Status);
        Assert.Contains("Tài khoản nhận không tồn tại", failed.AdminNote);
        Assert.Equal("Confirmed", (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.Status);

        // Vẫn duyệt chuyển tay được sau khi chi hộ lỗi.
        await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/approve", new RefundApprovalRequest(1500000, "FT-TAY-1", null)));
        Assert.Equal("Cancelled", (await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}"))!.Status);
    }

    [Fact]
    public async Task Payout_requires_configuration_and_a_supported_bank()
    {
        using (var unconfigured = new App())
        {
            await unconfigured.Initialize();
            var (_, admin, _, refund) = await PendingRefund(unconfigured);
            Assert.False((await admin.GetFromJsonAsync<PayoutAccountDto>("/api/v1/admin/refunds/payout-account"))!.Configured);
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{refund.Id}/payout", new RefundPayoutRequest(1500000, null))).StatusCode);
        }

        var payout = new FakePayout();
        using var app = PayoutApp(payout); await app.Initialize();
        var (_, adminClient, _, unknownBank) = await PendingRefund(app, "Ngân hàng lạ");
        Assert.Null(unknownBank.BankBin);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await adminClient.PostAsJsonAsync($"/api/v1/admin/refunds/{unknownBank.Id}/payout", new RefundPayoutRequest(1500000, null))).StatusCode);
        Assert.Equal(0, payout.CreateCalls);
    }
}
