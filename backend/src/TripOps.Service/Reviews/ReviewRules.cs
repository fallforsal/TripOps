using TripOps.Data.Entities;
using TripOps.Data.Enums;

namespace TripOps.Service.Reviews;

/// <summary>
/// Thời hạn và công thức dùng chung cho đánh giá (feedback) và khiếu nại (complaint).
/// Hạn khiếu nại phải NGẮN HƠN thời gian chờ tự chuyển tiền cho Agency (Settlement:AutoPayoutDelayDays, mặc định 2 ngày),
/// để mọi khiếu nại về chuyến đi đều tới kịp và chặn việc chuyển tiền trước khi tiền rời sàn.
/// </summary>
public static class ReviewRules
{
    /// <summary>Khách được đánh giá trong 7 ngày kể từ lúc Agency bấm hoàn thành tour.</summary>
    public static readonly TimeSpan FeedbackWindow = TimeSpan.FromDays(7);

    /// <summary>Khách được khiếu nại về chuyến đi trong 1 ngày kể từ lúc tour hoàn thành.</summary>
    public static readonly TimeSpan ComplaintWindow = TimeSpan.FromDays(1);

    /// <summary>Số đánh giá "giả định" kéo điểm Agency về mức trung bình toàn sàn (Bayesian average).</summary>
    public const decimal PriorWeight = 5m;

    /// <summary>Điểm trung bình toàn sàn dùng khi sàn chưa có đánh giá nào.</summary>
    public const decimal DefaultPlatformAverage = 4m;

    /// <summary>Thời điểm tour hoàn thành: lúc Agency chủ trì bấm hoàn thành; dữ liệu cũ không có thì lấy lần cập nhật cuối của booking.</summary>
    public static DateTime? CompletedAt(Booking booking)
    {
        if (booking.Status != BookingStatus.Completed) return null;
        var host = booking.BookingAgencies.FirstOrDefault(a => a.IsHost == true) ?? booking.BookingAgencies.FirstOrDefault();
        var at = host?.TourCompletedAt ?? booking.UpdatedAt;
        return at is null ? null : DateTime.SpecifyKind(at.Value, DateTimeKind.Utc);
    }

    public static string? HostAgencyId(Booking booking) =>
        booking.BookingAgencies.FirstOrDefault(a => a.IsHost == true)?.AgencyId ?? booking.Tour?.AgencyId;

    /// <summary>
    /// Điểm Agency = (C × m + tổng số sao) / (C + n). Agency ít đánh giá bị kéo về mức trung bình toàn sàn m,
    /// nên 1 đánh giá 5★ không vượt được 100 đánh giá trung bình 4.8★.
    /// </summary>
    public static decimal BayesianScore(int count, int sum, decimal platformAverage) =>
        decimal.Round((PriorWeight * platformAverage + sum) / (PriorWeight + count), 2);

    /// <summary>Tên hiển thị công khai: chữ đầu + tên gọi, ví dụ "Nguyễn Văn An" → "Nguyễn ... An".</summary>
    public static string PublicName(string? name)
    {
        var parts = (name ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length switch { 0 => "Khách TripOps", 1 => parts[0], 2 => $"{parts[0]} {parts[1]}", _ => $"{parts[0]} ... {parts[^1]}" };
    }
}
