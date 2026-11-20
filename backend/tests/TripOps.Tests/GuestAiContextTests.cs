using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Ai;

namespace TripOps.Tests;

// Guest AI giữ ngữ cảnh "danh sách tour vừa gợi ý": câu hỏi tiếp theo chỉ dùng đúng các tour đó (ID do frontend gửi, backend kiểm tra lại).
public sealed partial class BookingFlowTests
{
    private const string GuestChat = "/api/v1/ai/guest-chat";

    /// <summary>3 tour Đà Lạt công khai (giá 4,5tr / 2,5tr / 3,5tr) và 1 tour Nha Trang; tour 102 có lịch trình 2 ngày.</summary>
    private static async Task SeedDaLatTours(App app)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        Tour Make(int id, string name, string destination, decimal price, int days) => new()
        {
            Id = id, Code = $"DALAT-{id}", AgencyId = "agency1", Name = name, Destination = destination, BasePrice = price, DurationDays = days, DurationNights = days - 1,
            MinGuests = 1, MaxGuests = 30, Status = TourStatus.Completed, Visibility = TourVisibility.Public,
            CreatedAt = DateTime.UtcNow.AddMinutes(-id),
        };
        var second = Make(102, "Đà Lạt săn mây 2N1Đ", "Đà Lạt", 2_500_000, 2);
        second.Timelines =
        [
            new TourTimeline { DayNumber = 1, Title = "Thành phố ngàn hoa", Attractions = [new TouristAttraction { Name = "Hồ Xuân Hương" }, new TouristAttraction { Name = "Chợ đêm Đà Lạt" }] },
            new TourTimeline { DayNumber = 2, Title = "Săn mây Cầu Đất", Attractions = [new TouristAttraction { Name = "Đồi chè Cầu Đất" }] },
        ];
        db.Tours.AddRange(
            Make(101, "Đà Lạt nghỉ dưỡng 4N3Đ", "Đà Lạt", 4_500_000, 4),
            second,
            Make(103, "Đà Lạt team building 3N2Đ", "Đà Lạt", 3_500_000, 3),
            Make(201, "Nha Trang biển xanh 3N2Đ", "Nha Trang", 4_000_000, 3));
        await db.SaveChangesAsync();
    }

    private static async Task Change(App app, Action<TripOpsDbContext> change)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
        change(db);
        await db.SaveChangesAsync();
    }

    private static AiChatRequest Next(AiChatResponse previous, string firstQuestion, string question, IReadOnlyList<int>? ids = null) => new(
        [new AiChatMessage("user", firstQuestion), new AiChatMessage("assistant", previous.Reply), new AiChatMessage("user", question)],
        (ids ?? previous.ContextTourIds)!.ToList());

    private const string FirstQuestion = "Gợi ý tour Đà Lạt dưới 5 triệu";

    [Fact]
    public async Task Guest_chat_follow_up_cheapest_uses_only_the_previous_list()
    {
        using var app = new App(); await app.Initialize(); await SeedDaLatTours(app);
        var guest = app.CreateClient();
        var first = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Ask(FirstQuestion)));
        Assert.Subset(first.Tours.Select(t => t.Id).ToHashSet(), new HashSet<int> { 101, 102, 103 });
        Assert.DoesNotContain(201, first.Tours.Select(t => t.Id));
        Assert.Equal(first.Tours.Select(t => t.Id), first.ContextTourIds);

        // Tour Đà Lạt rẻ hơn mới mở bán sau lượt 1: không được lẫn vào câu trả lời về "các tour vừa gợi ý".
        await Change(app, db => db.Tours.Add(new Tour
        {
            Id = 104, Code = "DALAT-104", AgencyId = "agency1", Name = "Đà Lạt tiết kiệm 2N1Đ", Destination = "Đà Lạt", BasePrice = 1_000_000, DurationDays = 2,
            Status = TourStatus.Completed, Visibility = TourVisibility.Public,
        }));

        var answer = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Trong các tour vừa gợi ý, tour nào rẻ nhất?")));
        Assert.False(answer.AiConfigured);
        Assert.Equal(102, Assert.Single(answer.Tours).Id);
        Assert.Contains("Đà Lạt săn mây 2N1Đ", answer.Reply);
        Assert.Contains("2.500.000đ", answer.Reply);
        Assert.DoesNotContain("tiết kiệm", answer.Reply);
        Assert.Equal(first.ContextTourIds, answer.ContextTourIds); // vẫn giữ danh sách cũ cho lượt sau
    }

    [Fact]
    public async Task Guest_chat_follow_up_second_tour_returns_its_details()
    {
        using var app = new App(); await app.Initialize(); await SeedDaLatTours(app);
        var guest = app.CreateClient();
        var first = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Ask(FirstQuestion)));
        // Frontend gửi thứ tự khách đã thấy; tour thứ hai = phần tử thứ 2 của danh sách đó.
        var ordered = new[] { 101, 102, 103 };

        var answer = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Mô tả chi tiết tour thứ hai giúp mình", ordered)));
        Assert.Equal(102, Assert.Single(answer.Tours).Id);
        Assert.Contains("Tour thứ 2", answer.Reply);
        Assert.Contains("Hồ Xuân Hương", answer.Reply);
        Assert.Contains("Đồi chè Cầu Đất", answer.Reply);

        var places = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Mô tả các địa điểm của những tour đó", ordered)));
        Assert.Equal(ordered, places.Tours.Select(t => t.Id));
        Assert.Contains("Chợ đêm Đà Lạt", places.Reply);
        Assert.DoesNotContain("Nha Trang", places.Reply);
    }

    [Fact]
    public async Task Guest_chat_new_destination_starts_a_new_list()
    {
        using var app = new App(); await app.Initialize(); await SeedDaLatTours(app);
        var guest = app.CreateClient();
        var first = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Ask(FirstQuestion)));

        var answer = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Còn tour Nha Trang thì sao?")));
        Assert.Equal(201, Assert.Single(answer.Tours).Id);
        Assert.Equal(new[] { 201 }, answer.ContextTourIds);

        // Nêu địa danh khác dù có chữ "rẻ nhất" vẫn là tìm mới.
        var cheapest = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Tour Nha Trang nào rẻ nhất?")));
        Assert.Equal(201, Assert.Single(cheapest.Tours).Id);
    }

    [Fact]
    public async Task Guest_chat_drops_tours_that_are_no_longer_public_and_ignores_unknown_ids()
    {
        using var app = new App(); await app.Initialize(); await SeedDaLatTours(app);
        var guest = app.CreateClient();
        var first = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Ask(FirstQuestion)));

        await Change(app, db => db.Tours.Single(t => t.Id == 102).Visibility = TourVisibility.Hidden);
        // Danh sách khách đã thấy là 3 tour Đà Lạt; client tự thêm id tour không tồn tại (9999): bị bỏ qua.
        var ids = new List<int> { 101, 102, 103, 9999 };
        var answer = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Tour nào rẻ nhất trong các tour vừa gợi ý?", ids)));
        Assert.Equal(103, Assert.Single(answer.Tours).Id);
        Assert.Contains("3.500.000đ", answer.Reply);
        Assert.Contains("2 tour trong danh sách trước không còn mở bán", answer.Reply);
        Assert.DoesNotContain(102, answer.ContextTourIds!);
        Assert.DoesNotContain(9999, answer.ContextTourIds!);

        // Cả danh sách không còn mở bán: báo rõ, không tự gợi ý danh sách khác.
        await Change(app, db => { foreach (var t in db.Tours.Where(t => t.Id >= 101 && t.Id <= 103)) t.Visibility = TourVisibility.Hidden; });
        var none = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat, Next(first, FirstQuestion, "Tour thứ hai giá bao nhiêu?", [101, 102, 103])));
        Assert.Empty(none.Tours);
        Assert.Empty(none.ContextTourIds!);
        Assert.Contains("không còn mở bán", none.Reply);
    }

    [Fact]
    public async Task Guest_chat_policy_question_keeps_the_list_and_does_not_search_again()
    {
        using var app = new App(); await app.Initialize(); await SeedDaLatTours(app);
        var answer = await Read<AiChatResponse>(await app.CreateClient().PostAsJsonAsync(GuestChat,
            new AiChatRequest([new AiChatMessage("user", FirstQuestion), new AiChatMessage("assistant", "..."),
                new AiChatMessage("user", "Chính sách hủy tour thế nào?")], [101, 102, 103])));
        Assert.Empty(answer.Tours);
        Assert.Contains("8–14 ngày: 50%", answer.Reply);
        Assert.Equal(new[] { 101, 102, 103 }, answer.ContextTourIds);
    }

    [Fact]
    public async Task Guest_chat_model_error_falls_back_and_still_answers_from_previous_list()
    {
        using var app = OpenAiApp(new ErrorOpenAi("{\"error\":{\"message\":\"bad\"}}"));
        await app.Initialize(); await SeedDaLatTours(app);
        var guest = app.CreateClient();
        var answer = await Read<AiChatResponse>(await guest.PostAsJsonAsync(GuestChat,
            new AiChatRequest([new AiChatMessage("user", FirstQuestion), new AiChatMessage("assistant", "..."),
                new AiChatMessage("user", "Trong các tour vừa gợi ý, tour nào rẻ nhất?")], [101, 102, 103])));
        Assert.False(answer.AiConfigured);
        Assert.StartsWith("Trợ lý AI đang bận", answer.Reply);
        Assert.Equal(102, Assert.Single(answer.Tours).Id);
        Assert.Equal(new[] { 101, 102, 103 }, answer.ContextTourIds);
    }

    [Fact]
    public async Task Guest_chat_model_follow_up_gets_list_details_and_backend_blocks_search_and_other_ids()
    {
        var model = new ScriptedOpenAi(
            """{"role":"assistant","content":null,"tool_calls":[{"id":"c0","type":"function","function":{"name":"search_tours","arguments":"{\"query\":\"Đà Lạt\"}"}},{"id":"c1","type":"function","function":{"name":"get_tour_details","arguments":"{\"tour_id\":102}"}},{"id":"c2","type":"function","function":{"name":"get_tour_details","arguments":"{\"tour_id\":1}"}}]}""",
            """{"role":"assistant","content":"Tour rẻ nhất trong danh sách là Đà Lạt săn mây 2N1Đ, từ 2.500.000đ/khách."}""");
        using var app = OpenAiApp(model);
        await app.Initialize(); await SeedDaLatTours(app);

        var answer = await Read<AiChatResponse>(await app.CreateClient().PostAsJsonAsync(GuestChat,
            new AiChatRequest([new AiChatMessage("user", FirstQuestion), new AiChatMessage("assistant", "Có 3 tour Đà Lạt."),
                new AiChatMessage("user", "Trong các tour vừa gợi ý, tour nào rẻ nhất?")], [101, 102, 103])));

        Assert.True(answer.AiConfigured);
        Assert.Equal(102, Assert.Single(answer.Tours).Id);
        Assert.Equal(new[] { 101, 102, 103 }, answer.ContextTourIds);
        var request = JsonDocument.Parse(model.Bodies[0]).RootElement;
        var tools = request.GetProperty("tools").EnumerateArray().Select(t => t.GetProperty("function").GetProperty("name").GetString()).ToArray();
        // Vẫn khai báo đủ 2 công cụ (bớt công cụ làm gpt-oss/Groq lỗi tool_use_failed); backend tự chặn khi chạy.
        Assert.Equal(new[] { "search_tours", "get_tour_details" }, tools);
        var context = request.GetProperty("messages")[1].GetProperty("content").GetString()!;
        Assert.Contains("DANH SÁCH TOUR VỪA GỢI Ý", context);
        Assert.Contains("\"id\":102", context);
        Assert.Contains("2500000", context); // giá lấy từ hệ thống
        Assert.Contains("Hồ Xuân Hương", context); // hỏi tiếp: gửi sẵn lịch trình, địa điểm
        Assert.Contains("không tìm tour mới", model.Bodies[1]); // search_tours bị chặn
        // id 1 không thuộc danh sách vừa gợi ý: công cụ từ chối.
        Assert.Contains("Tour này không có trong danh sách vừa gợi ý", model.Bodies[1]);
    }

    [Fact]
    public async Task Guest_chat_model_new_search_keeps_search_tool_and_replaces_the_list()
    {
        var model = new ScriptedOpenAi(
            """{"role":"assistant","content":null,"tool_calls":[{"id":"c1","type":"function","function":{"name":"search_tours","arguments":"{\"query\":\"Nha Trang\"}"}}]}""",
            """{"role":"assistant","content":"Có tour Nha Trang biển xanh 3N2Đ."}""");
        using var app = OpenAiApp(model);
        await app.Initialize(); await SeedDaLatTours(app);

        var answer = await Read<AiChatResponse>(await app.CreateClient().PostAsJsonAsync(GuestChat,
            new AiChatRequest([new AiChatMessage("user", FirstQuestion), new AiChatMessage("assistant", "Có 3 tour Đà Lạt."),
                new AiChatMessage("user", "Còn tour Nha Trang thì sao?")], [101, 102, 103])));

        Assert.Equal(201, Assert.Single(answer.Tours).Id);
        Assert.Equal(new[] { 201 }, answer.ContextTourIds);
        Assert.Contains("search_tours", model.Bodies[0]);
        Assert.Contains("đổi tiêu chí", model.Bodies[0]);
    }

    [Fact]
    public async Task Guest_chat_retries_tool_use_failed_then_answers_follow_up_without_tools()
    {
        // Lần 1: model sinh lệnh gọi công cụ hỏng → client gọi lại. Kèm công cụ thì luôn lỗi → hỏi lại không kèm công cụ.
        var model = new ToolUseFailingOpenAi("""{"role":"assistant","content":"Tour rẻ nhất là Đà Lạt săn mây 2N1Đ, từ 2.500.000đ/khách."}""");
        using var app = OpenAiApp(model);
        await app.Initialize(); await SeedDaLatTours(app);

        var answer = await Read<AiChatResponse>(await app.CreateClient().PostAsJsonAsync(GuestChat,
            new AiChatRequest([new AiChatMessage("user", FirstQuestion), new AiChatMessage("assistant", "Có 3 tour Đà Lạt."),
                new AiChatMessage("user", "Trong các tour vừa gợi ý, tour nào rẻ nhất?")], [101, 102, 103])));

        Assert.True(answer.AiConfigured);
        Assert.Equal(102, Assert.Single(answer.Tours).Id);
        Assert.Equal(new[] { 101, 102, 103 }, answer.ContextTourIds);
        Assert.Equal(3, model.Bodies.Count(b => b.Contains("\"tools\"")));      // 3 lần thử kèm công cụ
        Assert.DoesNotContain("\"tools\"", model.Bodies[^1]);                     // lần cuối không kèm công cụ
    }

    [Fact]
    public async Task Openai_client_retries_a_single_tool_use_failed_generation()
    {
        var model = new ToolUseFailingOpenAi("""{"role":"assistant","content":"OK"}""", failures: 1);
        using var http = new HttpClient(model);
        var client = new OpenAiChatClient(http, new AiAssistantOptions { ApiKey = "k", BaseUrl = "https://openai.test/v1", Model = "m" });
        var tools = new System.Text.Json.Nodes.JsonArray { System.Text.Json.Nodes.JsonNode.Parse("""{"type":"function","function":{"name":"x","parameters":{"type":"object"}}}""") };
        var turn = await client.Complete(new System.Text.Json.Nodes.JsonArray { new System.Text.Json.Nodes.JsonObject { ["role"] = "user", ["content"] = "hi" } }, tools, CancellationToken.None);
        Assert.Equal("OK", turn.Content);
        Assert.Equal(2, model.Bodies.Count);
    }

    /// <summary>Giả lập Groq: request có "tools" trả 400 tool_use_failed (tối đa `failures` lần), không có "tools" thì trả lời bình thường.</summary>
    private sealed class ToolUseFailingOpenAi(string reply, int failures = int.MaxValue) : HttpMessageHandler
    {
        private int failed;
        public List<string> Bodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Bodies.Add(body);
            if (body.Contains("\"tools\"") && failed++ < failures)
                return new HttpResponseMessage(HttpStatusCode.BadRequest)
                {
                    Content = new StringContent("""{"error":{"message":"Failed to call a function.","type":"invalid_request_error","code":"tool_use_failed","failed_generation":"..."}}""", Encoding.UTF8, "application/json"),
                };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"choices\":[{\"index\":0,\"message\":" + reply + "}]}", Encoding.UTF8, "application/json"),
            };
        }
    }

    private static App OpenAiApp(HttpMessageHandler handler) => new(builder =>
    {
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["OpenAI:ApiKey"] = "test-openai-key",
            ["OpenAI:BaseUrl"] = "https://openai.test/v1",
            ["OpenAI:Model"] = "test-model",
        }));
        builder.ConfigureServices(services => services.AddHttpClient<OpenAiChatClient>().ConfigurePrimaryHttpMessageHandler(() => handler));
    });

    /// <summary>Trả lần lượt các tin nhắn model đã soạn sẵn và ghi lại body từng request.</summary>
    private sealed class ScriptedOpenAi(params string[] replies) : HttpMessageHandler
    {
        public List<string> Bodies { get; } = [];
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Bodies.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            var message = replies[Math.Min(Bodies.Count, replies.Length) - 1];
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"choices\":[{\"index\":0,\"message\":" + message + "}]}", Encoding.UTF8, "application/json"),
            };
        }
    }
}
