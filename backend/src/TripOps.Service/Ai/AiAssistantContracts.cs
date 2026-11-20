using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;

namespace TripOps.Service.Ai;

/// <summary>Một lượt trong hội thoại: role chỉ nhận "user" hoặc "assistant" (client không được gửi "system").</summary>
public sealed record AiChatMessage([Required, StringLength(12)] string Role, [Required, StringLength(4000)] string Content);

/// <param name="ContextTourIds">ID các tour AI vừa gợi ý ở lượt trước (theo thứ tự đã hiển thị). Backend tự tải lại và kiểm tra.</param>
public sealed record AiChatRequest([Required, MinLength(1), MaxLength(30)] List<AiChatMessage> Messages,
    [MaxLength(8)] List<int>? ContextTourIds = null);

/// <summary>Thẻ tour công khai hiển thị dưới câu trả lời (frontend mở #/tours/{Id}).</summary>
public sealed record AiTourCard(int Id, string Name, string? Destination, int? DurationDays, int? DurationNights,
    decimal? Price, string? ImageUrl, string? AgencyName, int? MinGuests, int? MaxGuests);

/// <param name="AiConfigured">false = chưa cấu hình khóa OpenAI hoặc AI lỗi, câu trả lời do bộ quy tắc dự phòng tạo.</param>
/// <param name="ContextTourIds">Danh sách tour gợi ý gần nhất mà frontend cần giữ và gửi lại ở lượt sau (rỗng = không còn danh sách).</param>
/// <param name="Private">
/// true = câu trả lời chứa thông tin cá nhân do máy chủ tự trả lời (không qua AI); frontend chỉ hiển thị, không gửi lại trong lịch sử hội thoại.
/// </param>
public sealed record AiChatResponse(string Reply, IReadOnlyList<AiTourCard> Tours, bool AiConfigured, IReadOnlyList<int>? ContextTourIds = null,
    bool Private = false);

public sealed class AiAssistantException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

/// <summary>
/// Cấu hình OpenAI. ApiKey là bí mật: đặt bằng dotnet user-secrets (OpenAI:ApiKey) hoặc biến môi trường OpenAI__ApiKey,
/// KHÔNG ghi vào appsettings/Git và không bao giờ gửi xuống frontend.
/// </summary>
public sealed class AiAssistantOptions
{
    public string? ApiKey { get; init; }
    public string Model { get; init; } = "gpt-4.1-mini";
    public string BaseUrl { get; init; } = "https://api.openai.com/v1";
    public int TimeoutSeconds { get; init; } = 60;
    /// <summary>Tùy chọn cho model có suy luận (vd Gemini 3: "low" để trả lời nhanh). Để trống với model không hỗ trợ.</summary>
    public string? ReasoningEffort { get; init; }
    /// <summary>
    /// Bật/tắt chế độ suy luận với API hỗ trợ tham số thinking (vd DeepSeek: "disabled" để không sinh token suy luận,
    /// rẻ và nhanh hơn). Để trống thì không gửi tham số này.
    /// </summary>
    public string? Thinking { get; init; }
    /// <summary>Tên tham số giới hạn độ dài câu trả lời: OpenAI dùng max_completion_tokens, DeepSeek dùng max_tokens.</summary>
    public string MaxTokensParameter { get; init; } = "max_completion_tokens";
    /// <summary>
    /// Số phút giữ câu trả lời của chatbot khách cho câu hỏi đầu tiên (chưa có ngữ cảnh) giống hệt nhau,
    /// để khách hỏi lại cùng một câu không tốn thêm lượt gọi model. 0 = tắt.
    /// </summary>
    public int ResponseCacheMinutes { get; init; } = 10;
    /// <summary>Model dự phòng khi model chính quá tải (vd model flash ổn định hơn). Để trống nếu không cần.</summary>
    public string? FallbackModel { get; init; }
    public int MaxToolRounds { get; init; } = 3;
    public bool Configured => !string.IsNullOrWhiteSpace(ApiKey);

    public static AiAssistantOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("OpenAI");
        var baseUrl = string.IsNullOrWhiteSpace(section["BaseUrl"]) ? "https://api.openai.com/v1" : section["BaseUrl"]!.Trim().TrimEnd('/');
        return new AiAssistantOptions
        {
            ApiKey = section["ApiKey"],
            Model = string.IsNullOrWhiteSpace(section["Model"]) ? "gpt-4.1-mini" : section["Model"]!.Trim(),
            BaseUrl = baseUrl,
            TimeoutSeconds = int.TryParse(section["TimeoutSeconds"], out var timeout) && timeout is > 0 and <= 180 ? timeout : 60,
            ReasoningEffort = string.IsNullOrWhiteSpace(section["ReasoningEffort"]) ? null : section["ReasoningEffort"]!.Trim(),
            FallbackModel = string.IsNullOrWhiteSpace(section["FallbackModel"]) ? null : section["FallbackModel"]!.Trim(),
            Thinking = section["Thinking"]?.Trim().ToLowerInvariant() is "enabled" or "disabled" ? section["Thinking"]!.Trim().ToLowerInvariant() : null,
            MaxTokensParameter = section["MaxTokensParameter"]?.Trim() is "max_tokens" or "max_completion_tokens"
                ? section["MaxTokensParameter"]!.Trim()
                : baseUrl.Contains("deepseek", StringComparison.OrdinalIgnoreCase) ? "max_tokens" : "max_completion_tokens",
            ResponseCacheMinutes = int.TryParse(section["ResponseCacheMinutes"], out var cache) && cache is >= 0 and <= 1440 ? cache : 10,
            MaxToolRounds = int.TryParse(section["MaxToolRounds"], out var rounds) && rounds is > 0 and <= 5 ? rounds : 3,
        };
    }
}
