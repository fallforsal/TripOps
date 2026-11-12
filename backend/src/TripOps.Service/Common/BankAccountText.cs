using System.Globalization;
using System.Text;

namespace TripOps.Service.Common;

// Chuẩn hóa thông tin tài khoản ngân hàng dùng chung cho khách, Agency và Admin.
public static class BankAccountText
{
    /// <summary>Tên chủ tài khoản: IN HOA, không dấu, đ → D, gộp khoảng trắng ("hoàng tùng lâm" → "HOANG TUNG LAM").</summary>
    public static string Holder(string? value)
    {
        var text = (value ?? string.Empty).Trim().Normalize(NormalizationForm.FormD);
        var chars = text.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .Select(c => c is 'đ' or 'Đ' ? 'D' : c).ToArray();
        return string.Join(' ', new string(chars).Normalize(NormalizationForm.FormC).ToUpperInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>Số tài khoản: bỏ khoảng trắng.</summary>
    public static string Number(string? value) => new((value ?? string.Empty).Where(c => !char.IsWhiteSpace(c)).ToArray());

    public static bool IsValidNumber(string number) => number.Length is >= 6 and <= 30 && number.All(char.IsAsciiDigit);
}
