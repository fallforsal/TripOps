using TripOps.Data.Entities;

namespace TripOps.Api.Infrastructure;

/// <summary>
/// Compact FCM title/body derived from persisted workflow notices.
/// No schema migration is needed and historical notifications remain readable.
/// </summary>
public static class NotificationPushContent
{
    public sealed record Text(string Title, string Body);

    public static Text Build(WorkflowNotification notice)
    {
        var message = string.Join(" ", (notice.Message ?? "").Split(
            (char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        var text = message.ToLowerInvariant();

        // Incident details may contain personal health or safety information.
        // Show the event category on the lock screen, not the incident narrative.
        if (text.StartsWith("sự cố [") || text.Contains("incident report") ||
            text.Contains("báo cáo sự cố"))
            return new("Báo cáo sự cố tour", "Có báo cáo sự cố mới. Mở TripOps để xem chi tiết.");

        if (text.StartsWith("bạn được phân công booking"))
            return new("Phân công tour mới", Shorten(message));

        if (text.Contains("hủy phân công"))
            return new("Cập nhật phân công", Shorten(message));

        if (text.Contains("lịch trình") || text.Contains("đổi tuyến"))
            return new("Lịch trình tour thay đổi", Shorten(message));

        if (text.Contains("tạm khóa tài khoản") || text.Contains("kích hoạt lại tài khoản"))
            return new("Cập nhật tài khoản", "Có thay đổi trạng thái tài khoản hướng dẫn viên. Mở TripOps để xem.");

        if (text.Contains("đã bị hủy") || text.Contains("đã hủy booking"))
            return new("Tour đã bị hủy", Shorten(message));

        if (text.Contains("đã bắt đầu tour"))
            return new("Tour đã bắt đầu", Shorten(message));

        if (text.Contains("hoàn tiền"))
            return new("Cập nhật hoàn tiền", Shorten(message));

        if (text.Contains("dịch vụ") || text.Contains("slot"))
            return new("Cập nhật dịch vụ", Shorten(message));

        if (text.Contains("booking") || text.Contains("đặt tour"))
            return new("Cập nhật booking", Shorten(message));

        return new("Thông báo TripOps", Shorten(message));
    }

    private static string Shorten(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return "Bạn có thông báo mới.";
        if (message.Length <= 180) return message;
        return message[..177].TrimEnd() + "...";
    }
}
