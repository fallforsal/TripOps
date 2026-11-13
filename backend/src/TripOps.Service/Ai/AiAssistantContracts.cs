using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;

namespace TripOps.Service.Ai;

/// <summary>Một lượt trong hội thoại: role chỉ nhận "user" hoặc "assistant" (client không được gửi "system").</summary>
public sealed record AiChatMessage([Required, StringLength(12)] string Role, [Required, StringLength(4000)] string Content);

public sealed record AiChatRequest([Required, MinLength(1), MaxLength(30)] List<AiChatMessage> Messages);

/// <summary>Thẻ tour công khai hiển thị dưới câu trả lời (frontend mở #/tours/{Id}).</summary>
public sealed record AiTourCard(int Id, string Name, string? Destination, int? DurationDays, int? DurationNights,
    decimal? Price, string? ImageUrl, string? AgencyName, int? MinGuests, int? MaxGuests);

/// <param name="AiConfigured">false = chưa cấu hình khóa OpenAI hoặc AI lỗi, câu trả lời do bộ quy tắc dự phòng tạo.</param>
public sealed record AiChatResponse(string Reply, IReadOnlyList<AiTourCard> Tours, bool AiConfigured);

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
    public int MaxToolRounds { get; init; } = 3;
    public bool Configured => !string.IsNullOrWhiteSpace(ApiKey);

    public static AiAssistantOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("OpenAI");
        return new AiAssistantOptions
        {
            ApiKey = section["ApiKey"],
            Model = string.IsNullOrWhiteSpace(section["Model"]) ? "gpt-4.1-mini" : section["Model"]!.Trim(),
            BaseUrl = string.IsNullOrWhiteSpace(section["BaseUrl"]) ? "https://api.openai.com/v1" : section["BaseUrl"]!.Trim().TrimEnd('/'),
            TimeoutSeconds = int.TryParse(section["TimeoutSeconds"], out var timeout) && timeout is > 0 and <= 180 ? timeout : 60,
            ReasoningEffort = string.IsNullOrWhiteSpace(section["ReasoningEffort"]) ? null : section["ReasoningEffort"]!.Trim(),
            MaxToolRounds = int.TryParse(section["MaxToolRounds"], out var rounds) && rounds is > 0 and <= 5 ? rounds : 3,
        };
    }
}
