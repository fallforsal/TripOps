using TripOps.Data.Common;
namespace TripOps.Data.Entities;

/// <summary>
/// Mẫu hợp đồng riêng của một Travel Agency: bảng phí hủy (JSON các mốc ngày/%), ghi chú chính sách hủy
/// điều khoản bổ sung và nội dung các điều Agency sửa lại (JSON theo mã điều; điều không sửa dùng bản mặc định của TripOps).
/// Agency lưu được nhiều mẫu có tên (VD "Mùa thường", "Lễ Tết") và chọn một mẫu đang áp dụng (IsActive) cho mọi tour;
/// không mẫu nào được chọn thì dùng mẫu mặc định của TripOps.
/// </summary>
public class AgencyContractTemplate : BaseEntity<int>
{
    public string AgencyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string CancellationTiers { get; set; } = "[]";
    public string? CancellationNote { get; set; }
    public string? AdditionalTerms { get; set; }
    public string? Clauses { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public virtual User Agency { get; set; } = null!;
}
