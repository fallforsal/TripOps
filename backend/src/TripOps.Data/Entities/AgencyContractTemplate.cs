using TripOps.Data.Common;
namespace TripOps.Data.Entities;

/// <summary>
/// Mẫu hợp đồng riêng của một Travel Agency: bảng phí hủy (JSON các mốc ngày/%), ghi chú chính sách hủy
/// và điều khoản bổ sung. Các điều khác của hợp đồng theo format chung của TripOps. Mỗi Agency một mẫu.
/// </summary>
public class AgencyContractTemplate : BaseEntity<int>
{
    public string AgencyId { get; set; } = string.Empty;
    public string CancellationTiers { get; set; } = "[]";
    public string? CancellationNote { get; set; }
    public string? AdditionalTerms { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual User Agency { get; set; } = null!;
}
