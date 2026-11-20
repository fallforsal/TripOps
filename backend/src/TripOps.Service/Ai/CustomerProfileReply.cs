using TripOps.Service.Accounts;

namespace TripOps.Service.Ai;

/// <summary>
/// Khách hàng hỏi "thông tin cá nhân / tài khoản của tôi": máy chủ tự trả lời từ hồ sơ, KHÔNG gọi model,
/// để họ tên, email, số điện thoại, địa chỉ, tài khoản ngân hàng không bị gửi tới nhà cung cấp AI.
/// </summary>
public sealed class CustomerProfileReply(CustomerProfileService profiles, AccountService accounts)
{
    // Câu hỏi đã bỏ dấu (GuestAssistantKnowledge.Fold). Chỉ bắt câu hỏi về CHÍNH tài khoản của khách.
    private static readonly string[] Phrases =
    [
        "thong tin ca nhan", "ho so ca nhan", "ho so cua toi", "ho so cua minh", "thong tin tai khoan", "tai khoan cua toi", "tai khoan cua minh",
        "thong tin cua toi", "thong tin cua minh", "email cua toi", "mail cua toi", "so dien thoai cua toi", "sdt cua toi",
        "dia chi cua toi", "ten cua toi", "toi ten gi", "toi la ai", "tai khoan ngan hang cua toi", "stk cua toi",
    ];

    public static bool IsProfileQuestion(string question)
    {
        var text = $" {GuestAssistantKnowledge.Fold(question)} ";
        return Phrases.Any(p => text.Contains($" {p} ", StringComparison.Ordinal));
    }

    public async Task<string> Reply(string customerId, CancellationToken ct)
    {
        var profile = await profiles.Get(customerId, ct);
        var bank = await accounts.GetBankAccount(customerId, ct);
        string Or(string? value) => string.IsNullOrWhiteSpace(value) ? "chưa cập nhật" : value.Trim();
        var address = string.Join(", ", new[] { profile.AddressLine, profile.WardName, profile.ProvinceName }.Where(v => !string.IsNullOrWhiteSpace(v)));
        var lines = new List<string>
        {
            "Thông tin tài khoản của bạn trên TripOps:",
            $"- Họ tên: {Or(profile.Name)}",
        };
        if (!string.IsNullOrWhiteSpace(profile.OrganizationName)) lines.Add($"- Tổ chức/doanh nghiệp: {profile.OrganizationName.Trim()}");
        lines.Add($"- Email: {Or(profile.Email)}");
        lines.Add($"- Số điện thoại: {Or(profile.Phone)}");
        lines.Add($"- Địa chỉ: {Or(address)}");
        lines.Add(bank.HasAccount
            ? $"- Tài khoản nhận tiền hoàn: {bank.BankName} – {Mask(bank.AccountNumber)} – {bank.AccountHolder}"
            : "- Tài khoản nhận tiền hoàn: chưa khai báo");
        lines.Add("");
        lines.Add("Bạn xem và sửa các thông tin này ở mục \"Thông tin tài khoản\" (bấm vào tên của bạn ở góc trên trang).");
        return string.Join('\n', lines);
    }

    /// <summary>Chỉ hiện 4 số cuối của số tài khoản ngân hàng.</summary>
    private static string Mask(string? number)
    {
        var digits = (number ?? string.Empty).Trim();
        return digits.Length <= 4 ? digits : new string('*', Math.Min(digits.Length - 4, 6)) + digits[^4..];
    }
}
