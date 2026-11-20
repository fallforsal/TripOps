using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Ai;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

// Chatbot cho khách hàng đã đăng nhập: model nhận dữ liệu đơn của CHÍNH khách đó, không cache câu trả lời.
public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Customer_assistant_answers_with_only_the_signed_in_customers_bookings()
    {
        var handler = new CustomerAiRecorder();
        using var app = new App(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenAI:ApiKey"] = "test-key", ["OpenAI:BaseUrl"] = "https://api.deepseek.test", ["OpenAI:Model"] = "deepseek-flash",
            }));
            builder.ConfigureServices(services => services.AddHttpClient<OpenAiChatClient>().ConfigurePrimaryHttpMessageHandler(() => handler));
        });
        await app.Initialize();
        var (customer, _, booking) = await ApprovedBooking(app, Sample() with { StartDate = DateTime.UtcNow.Date.AddDays(40) });
        var other = await app.Client("customer2@example.test");
        var otherBooking = (await (await other.PostAsJsonAsync("/api/v1/bookings", Sample())).Content.ReadFromJsonAsync<BookingDto>())!;

        var request = new AiChatRequest([new AiChatMessage("user", "Đơn của tôi còn phải trả bao nhiêu?")]);
        var answer = await Read<AiChatResponse>(await customer.PostAsJsonAsync("/api/v1/ai/customer-chat", request));
        Assert.True(answer.AiConfigured);

        var messages = JsonNode.Parse(handler.Bodies.Single())!["messages"]!.AsArray();
        var note = messages[1]!["content"]!.GetValue<string>();
        Assert.Equal("system", messages[1]!["role"]!.GetValue<string>());
        Assert.Contains("ĐƠN CỦA KHÁCH", note);
        Assert.Contains(booking.BookingCode, note);
        Assert.DoesNotContain(otherBooking.BookingCode, note);
        Assert.Contains("khách đã ký, chờ công ty xác nhận", note); // nhãn tiếng Việt thay cho mã trạng thái
        Assert.Contains("hạn hết ngày", note);
        Assert.Contains("Nếu hủy ngay bây giờ", note);
        Assert.DoesNotContain("0901234567", note); // không gửi số điện thoại cho nhà cung cấp AI

        // Không cache: hỏi lại y hệt vẫn gọi model (số liệu đơn có thể vừa thay đổi).
        await Read<AiChatResponse>(await customer.PostAsJsonAsync("/api/v1/ai/customer-chat", request));
        Assert.Equal(2, handler.Bodies.Count);

        // Chatbot khách vãng lai không nhận dữ liệu đơn.
        await Read<AiChatResponse>(await app.CreateClient().PostAsJsonAsync("/api/v1/ai/guest-chat", request));
        Assert.DoesNotContain(booking.BookingCode, handler.Bodies[2]);
        Assert.DoesNotContain("ĐƠN CỦA KHÁCH (dữ liệu hệ thống", handler.Bodies[2]);

        // "Thông tin cá nhân của tôi": máy chủ tự trả lời từ hồ sơ, không gọi AI.
        var calls = handler.Bodies.Count;
        var profile = await Read<AiChatResponse>(await customer.PostAsJsonAsync("/api/v1/ai/customer-chat",
            new AiChatRequest([new AiChatMessage("user", "Cho mình xem thông tin cá nhân của tôi")])));
        Assert.True(profile.Private);
        Assert.Contains("customer1@example.test", profile.Reply);
        Assert.Contains("Thông tin tài khoản", profile.Reply);
        Assert.Equal(calls, handler.Bodies.Count);
        Assert.False(CustomerProfileReply.IsProfileQuestion("Tài khoản ngân hàng để nhận hoàn tiền khai ở đâu?"));
        Assert.True(CustomerProfileReply.IsProfileQuestion("số điện thoại của tôi là gì"));

        Assert.Equal(HttpStatusCode.Unauthorized, (await app.CreateClient().PostAsJsonAsync("/api/v1/ai/customer-chat", request)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await app.Client("agency1@example.test")).PostAsJsonAsync("/api/v1/ai/customer-chat", request)).StatusCode);
    }

    private sealed class CustomerAiRecorder : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Bodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"choices":[{"index":0,"message":{"role":"assistant","content":"Đơn của bạn còn phải trả 3.000.000đ."}}]}""", Encoding.UTF8, "application/json"),
            };
        }
    }
}
