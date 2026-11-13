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

    // Lỗi tạm thời phía nhà cung cấp (quá tải, bảo trì) thì thử lại; lỗi khóa/hạn mức/tham số thì không.
    private static readonly HashSet<HttpStatusCode> Transient =
        [HttpStatusCode.InternalServerError, HttpStatusCode.BadGateway, HttpStatusCode.ServiceUnavailable, HttpStatusCode.GatewayTimeout];

    /// <summary>
    /// Gọi model chính, lỗi tạm thời (503 quá tải...) thì thử lại 2 lần (chờ 1s, 3s);
    /// vẫn lỗi và có cấu hình OpenAI:FallbackModel thì chuyển sang model dự phòng.
    /// </summary>
    public async Task<OpenAiTurn> Complete(JsonArray messages, JsonArray? tools, CancellationToken ct)
    {
        if (!options.Configured) throw new OpenAiException("OpenAI chưa được cấu hình.");
        var models = new List<string> { options.Model };
        if (options.FallbackModel is { } fallback && fallback != options.Model) models.Add(fallback);
        OpenAiException? last = null;
        foreach (var model in models)
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                if (attempt > 0) await Task.Delay(TimeSpan.FromSeconds(attempt == 1 ? 1 : 3), ct);
                try { return await Send(model, messages, tools, ct); }
                catch (OpenAiException ex) when (ex.Status is { } status && Transient.Contains(status)) { last = ex; }
                // Model không tồn tại/không có quyền: không thử lại model này, chuyển sang model dự phòng (nếu có).
                catch (OpenAiException ex) when (ex.Status == HttpStatusCode.NotFound && models.Count > 1) { last = ex; break; }
            }
        }
        throw new OpenAiException($"{last?.Message ?? "OpenAI lỗi."} Đã thử các model: {string.Join(", ", models)}.", last?.Status);
    }

    private async Task<OpenAiTurn> Send(string model, JsonArray messages, JsonArray? tools, CancellationToken ct)
    {
        var body = new JsonObject
        {
            ["model"] = model,
            ["messages"] = messages.DeepClone(),
            ["temperature"] = 0.3,
            ["max_completion_tokens"] = 900,
        };
        if (options.ReasoningEffort is { } effort) body["reasoning_effort"] = effort;
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
                throw new OpenAiException($"Model '{model}' trả lỗi HTTP {(int)response.StatusCode}{ErrorCode(text)}.", response.StatusCode);
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

    /// <summary>Lấy mã lỗi có cấu trúc để ghi log; không ghi nội dung phản hồi hoặc khóa API.</summary>
    private static string ErrorCode(string body)
    {
        try
        {
            if (JsonNode.Parse(body) is not JsonObject root || root["error"] is not JsonObject error)
                return string.Empty;

            // Google trả error.code dạng số và error.status dạng chuỗi; các API khác có thể dùng error.type.
            // Ưu tiên mã cụ thể (vd model_not_found, invalid_api_key) rồi mới tới loại lỗi chung (invalid_request_error).
            var code = (error["status"] as JsonValue)?.ToString()
                ?? (error["code"] is JsonValue c && c.TryGetValue<string>(out var named) ? named : null)
                ?? (error["type"] as JsonValue)?.ToString()
                ?? (error["code"] as JsonValue)?.ToString();
            if (string.IsNullOrWhiteSpace(code) || code.Length > 64 ||
                code.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('_' or '-' or '.')))
                return string.Empty;
            return $" ({code})";
        }
        catch (JsonException) { return string.Empty; }
    }
}
