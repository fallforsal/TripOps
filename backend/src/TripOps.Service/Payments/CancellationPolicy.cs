namespace TripOps.Service.Payments;

/// <summary>
/// Chính sách hủy chung của nền tảng (một chính sách cho mọi tour). D = số ngày còn lại trước ngày khởi hành,
/// tính theo ngày giờ Việt Nam tại thời điểm khách GỬI yêu cầu (Admin duyệt chậm không làm khách thiệt).
/// <list type="bullet">
/// <item>Trong 72 giờ sau khi trả cọc và D ≥ 15: phí 0%.</item>
/// <item>D ≥ 30: 0% · 15–29: 25% · 8–14: 50% · 3–7: 75% · 1–2: 90% · ngày khởi hành trở đi: 100%.</item>
/// </list>
/// Phí = % × tổng giá trị tour; tiền hoàn = số đã trả − phí, không âm.
/// Agency hủy: hoàn 100%. Quá hạn thanh toán mà chưa trả đủ: khách mất số đã trả.
/// </summary>
public static class CancellationPolicy
{
    public static readonly TimeSpan CoolingOff = TimeSpan.FromHours(72);
    public const int CoolingOffMinDays = 15;

    /// <summary>Số ngày còn lại trước ngày khởi hành theo lịch Việt Nam (0 = hôm nay khởi hành, âm = đã khởi hành).</summary>
    public static int DaysBeforeDeparture(DateTime startDate, DateTime nowUtc) =>
        (startDate.Date - PaymentRules.VietnamDate(nowUtc)).Days;

    /// <summary>Có đang trong 72 giờ cân nhắc kể từ lần trả tiền đầu tiên hay không (và còn ít nhất 15 ngày).</summary>
    public static bool InCoolingOff(DateTime? firstPaidAtUtc, int daysBeforeDeparture, DateTime nowUtc) =>
        firstPaidAtUtc is { } paidAt && daysBeforeDeparture >= CoolingOffMinDays
        && nowUtc - DateTime.SpecifyKind(paidAt, DateTimeKind.Utc) <= CoolingOff;

    /// <summary>Phần trăm phí hủy (trên tổng giá trị tour) khi khách hủy.</summary>
    public static decimal FeePercent(int daysBeforeDeparture, bool coolingOff) => daysBeforeDeparture switch
    {
        <= 0 => 100m,
        _ when coolingOff => 0m,
        >= 30 => 0m,
        >= 15 => 25m,
        >= 8 => 50m,
        >= 3 => 75m,
        _ => 90m
    };
}
