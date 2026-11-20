using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Service.Ai;

namespace TripOps.Tests;

// DeepSeek: tắt suy luận, gửi đúng tham số max_tokens; chatbot khách cache câu hỏi lặp lại để không gọi model thêm.
public sealed partial class BookingFlowTests
{
    [Fact]
    public void DeepSeek_options_disable_thinking_and_use_max_tokens()
    {
        var options = AiAssistantOptions.From(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["OpenAI:ApiKey"] = "k", ["OpenAI:BaseUrl"] = "https://api.deepseek.com/", ["OpenAI:Model"] = "deepseek-flash",
            ["OpenAI:Thinking"] = "Disabled",
        }).Build());
        Assert.Equal(("https://api.deepseek.com", "deepseek-flash", "disabled", "max_tokens", 10),
            (options.BaseUrl, options.Model, options.Thinking, options.MaxTokensParameter, options.ResponseCacheMinutes));

        var openAi = AiAssistantOptions.From(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["OpenAI:ApiKey"] = "k", ["OpenAI:Thinking"] = "maybe", ["OpenAI:ResponseCacheMinutes"] = "0",
        }).Build());
        Assert.Equal((null, "max_completion_tokens", 0), (openAi.Thinking, openAi.MaxTokensParameter, openAi.ResponseCacheMinutes));
    }

    [Fact]
    public async Task Request_body_sends_thinking_disabled_and_max_tokens()
    {
        var handler = new DeepSeekRecorder();
        using var http = new HttpClient(handler);
        var client = new OpenAiChatClient(http, new AiAssistantOptions
        {
            ApiKey = "k", BaseUrl = "https://api.deepseek.test", Model = "deepseek-flash", Thinking = "disabled", MaxTokensParameter = "max_tokens",
        });
        await client.Complete(new JsonArray { new JsonObject { ["role"] = "user", ["content"] = "Xin chào" } }, null, CancellationToken.None, maxTokens: 300);
        var body = JsonNode.Parse(handler.Bodies.Single())!;
        Assert.Equal("disabled", body["thinking"]?["type"]?.GetValue<string>());
        Assert.Equal(300, body["max_tokens"]?.GetValue<int>());
        Assert.Null(body["max_completion_tokens"]);
    }

    [Fact]
    public async Task Repeated_first_question_is_answered_from_cache()
    {
        var handler = new DeepSeekRecorder();
        using var app = new App(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenAI:ApiKey"] = "test-key", ["OpenAI:BaseUrl"] = "https://api.deepseek.test", ["OpenAI:Model"] = "deepseek-flash",
            }));
            builder.ConfigureServices(services => services.AddHttpClient<OpenAiChatClient>().ConfigurePrimaryHttpMessageHandler(() => handler));
        });
        await app.Initialize();
        var guest = app.CreateClient();
        static AiChatRequest Ask(params string[] turns) =>
            new(turns.Select((t, i) => new AiChatMessage(i % 2 == 0 ? "user" : "assistant", t)).ToList());

        var first = await Read<AiChatResponse>(await guest.PostAsJsonAsync("/api/v1/ai/guest-chat", Ask("Chính sách thanh toán thế nào?")));
        var again = await Read<AiChatResponse>(await guest.PostAsJsonAsync("/api/v1/ai/guest-chat", Ask("  chính sách thanh toán   thế nào ")));
        Assert.Equal(first.Reply, again.Reply);
        Assert.Single(handler.Bodies);
        Assert.Contains("max_tokens", handler.Bodies[0]);

        // Câu hỏi nối tiếp hội thoại phụ thuộc lịch sử nên luôn gọi model.
        await Read<AiChatResponse>(await guest.PostAsJsonAsync("/api/v1/ai/guest-chat",
            Ask("Chính sách thanh toán thế nào?", first.Reply, "Chính sách thanh toán thế nào?")));
        Assert.Equal(2, handler.Bodies.Count);
    }

    private sealed class DeepSeekRecorder : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Bodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("""{"choices":[{"index":0,"message":{"role":"assistant","content":"Đặt cọc 50% qua payOS."}}]}""", Encoding.UTF8, "application/json"),
            };
        }
    }
}
