using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace TripOps.Service.Payments;

/// <summary>
/// Tạo URL thanh toán và kiểm tra chữ ký VNPAY (API 2.1.0, HMAC-SHA512).
/// Chuỗi ký = các tham số vnp_* (trừ vnp_SecureHash/vnp_SecureHashType) sắp xếp theo tên,
/// mỗi cặp dạng UrlEncode(key)=UrlEncode(value), nối bằng '&amp;' — đúng như thư viện mẫu .NET của VNPAY.
/// </summary>
public sealed class VnPayGateway(VnPayOptions options)
{
    public VnPayOptions Options => options;

    /// <summary>Giờ Việt Nam (GMT+7, không có giờ mùa hè) theo định dạng VNPAY yêu cầu.</summary>
    public static string VietnamTime(DateTime utc) =>
        DateTime.SpecifyKind(utc, DateTimeKind.Utc).AddHours(7).ToString("yyyyMMddHHmmss", CultureInfo.InvariantCulture);

    public string CreatePaymentUrl(string txnRef, decimal amount, string orderInfo, string? ipAddress, DateTime utcNow)
    {
        if (!options.IsConfigured) throw new InvalidOperationException("VNPAY chưa được cấu hình.");
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = options.TmnCode,
            // VNPAY nhận số tiền nhân 100 (không có phần thập phân).
            ["vnp_Amount"] = ((long)decimal.Round(amount * 100m, 0, MidpointRounding.AwayFromZero)).ToString(CultureInfo.InvariantCulture),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = txnRef,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = options.ReturnUrl,
            ["vnp_IpAddr"] = NormalizeIp(ipAddress),
            ["vnp_CreateDate"] = VietnamTime(utcNow),
            ["vnp_ExpireDate"] = VietnamTime(utcNow.AddMinutes(options.ExpireMinutes)),
        };
        var query = Encode(parameters);
        return $"{options.BaseUrl}?{query}&vnp_SecureHash={Sign(query)}";
    }

    /// <summary>Kiểm tra chữ ký của dữ liệu VNPAY gửi về (IPN hoặc return URL).</summary>
    public bool Verify(IEnumerable<KeyValuePair<string, string>> query)
    {
        if (!options.IsConfigured) return false;
        var data = new SortedDictionary<string, string>(StringComparer.Ordinal);
        string? secureHash = null;
        foreach (var (key, value) in query)
        {
            if (key == "vnp_SecureHash") { secureHash = value; continue; }
            if (key == "vnp_SecureHashType" || !key.StartsWith("vnp_", StringComparison.Ordinal) || string.IsNullOrEmpty(value)) continue;
            data[key] = value;
        }
        if (string.IsNullOrWhiteSpace(secureHash)) return false;
        var expected = Encoding.ASCII.GetBytes(Sign(Encode(data)));
        var actual = Encoding.ASCII.GetBytes(secureHash.Trim().ToLowerInvariant());
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    /// <summary>Ký thêm vnp_SecureHash cho bộ tham số (dùng trong test để giả lập dữ liệu VNPAY gửi về).</summary>
    public string Sign(IEnumerable<KeyValuePair<string, string>> parameters) =>
        Sign(Encode(new SortedDictionary<string, string>(parameters.ToDictionary(p => p.Key, p => p.Value), StringComparer.Ordinal)));

    private string Sign(string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(options.HashSecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    private static string Encode(SortedDictionary<string, string> parameters) => string.Join("&", parameters
        .Where(p => !string.IsNullOrEmpty(p.Value))
        .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));

    private static string NormalizeIp(string? ip) =>
        string.IsNullOrWhiteSpace(ip) || ip == "::1" ? "127.0.0.1"
        : ip.StartsWith("::ffff:", StringComparison.Ordinal) ? ip[7..] : ip;
}
