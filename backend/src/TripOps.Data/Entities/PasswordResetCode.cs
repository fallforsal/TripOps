using TripOps.Data.Common;
namespace TripOps.Data.Entities;

/// <summary>Mã OTP 6 số đặt lại mật khẩu (quên mật khẩu). Chỉ lưu mã băm; hết hạn sau 10 phút, dùng 1 lần, sai 5 lần thì khóa.</summary>
public class PasswordResetCode : BaseEntity<int>
{
    public string UserId { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public int FailedAttempts { get; set; }
    public DateTime? UsedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public virtual User User { get; set; } = null!;
}
