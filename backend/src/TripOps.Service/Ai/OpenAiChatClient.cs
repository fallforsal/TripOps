using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace TripOps.Service.Ai;

/// <summary>Lỗi khi gọi OpenAI. Message không bao giờ chứa khóa API.</summary>
public sealed class OpenAiException(string message, HttpStatusCode? status = null) : Exception(message)
{
    public HttpStatusCode? Status { get; } = status;
}

/// <summary>Một lệnh gọi công cụ do model yêu cầu.</summary>
public sealed record OpenAiToolCall(string Id, string Name, string Arguments);

/// <summary>Kết quả một lượt: hoặc là câu trả lời (Content), hoặc là danh sách công cụ model muốn gọi.</summary>
public sealed record OpenAiTurn(string? Content, IReadOnlyList<OpenAiToolCall> ToolCalls, JsonObject AssistantMessage);

/// <summary>Gọi API Chat Completions của OpenAI (function calling). Chỉ chạy ở backend; khóa nằm trong cấu hình máy chủ.</summary>
public sealed class OpenAiChatClient(HttpClient http, AiAssistantOptions options)
{
    // Gửi tiếng Việt nguyên dạng UTF-8 (không đổi thành \uXXXX) để model đọc tự nhiên và log dễ đọc.
    private static readonly JsonSerializerOptions Json = new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public async Task<OpenAiTurn> Complete(JsonArray messages, JsonArray? tools, CancellationToken ct)
    {
        if (!options.Configured) throw new OpenAiException("OpenAI chưa được cấu hình.");
        var body = new JsonObject
        {
            ["model"] = options.Model,
            ["messages"] = messages.DeepClone(),
            ["temperature"] = 0.3,
            ["max_completion_tokens"] = 900,
        };
        if (tools is { Count: > 0 })
        {
            body["tools"] = tools.DeepClone();
            body["tool_choice"] = "auto";
        }
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{options.BaseUrl}/chat/completions")
        {
            Content = new StringContent(body.ToJsonString(Json), Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", options.ApiKey);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(options.TimeoutSeconds));
        HttpResponseMessage response;
        try { response = await http.SendAsync(request, timeout.Token); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new OpenAiException("OpenAI phản hồi quá lâu."); }
        catch (HttpRequestException) { throw new OpenAiException("Không kết nối được OpenAI."); }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                throw new OpenAiException($"OpenAI trả lỗi HTTP {(int)response.StatusCode}.", response.StatusCode);
            JsonNode? root;
            try { root = JsonNode.Parse(text); }
            catch (JsonException) { throw new OpenAiException("Phản hồi OpenAI không hợp lệ."); }
            if (root?["choices"]?[0]?["message"] is not JsonObject message)
                throw new OpenAiException("Phản hồi OpenAI không có nội dung.");

            var calls = new List<OpenAiToolCall>();
            if (message["tool_calls"] is JsonArray toolCalls)
                foreach (var call in toolCalls)
                {
                    var id = call?["id"]?.GetValue<string>();
                    var name = call?["function"]?["name"]?.GetValue<string>();
                    if (id is null || name is null) continue;
                    calls.Add(new OpenAiToolCall(id, name, call?["function"]?["arguments"]?.GetValue<string>() ?? "{}"));
                }
            var content = message["content"] is JsonValue value && value.TryGetValue<string>(out var s) ? s : null;
            // Chỉ giữ các trường cần gửi lại ở lượt sau.
            var assistant = new JsonObject { ["role"] = "assistant", ["content"] = content };
            if (message["tool_calls"] is JsonArray original) assistant["tool_calls"] = original.DeepClone();
            return new OpenAiTurn(content, calls, assistant);
        }
    }
}
