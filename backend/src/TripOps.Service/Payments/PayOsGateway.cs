using System.Globalization;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace TripOps.Service.Payments;

/// <summary>Lỗi khi gọi payOS (mạng, HTTP lỗi, code khác "00", hoặc chữ ký phản hồi không khớp).</summary>
public sealed class PayOsException(string message) : Exception(message);

/// <summary>Link vừa tạo trên payOS.</summary>
public sealed record PayOsCreatedLink(string CheckoutUrl, string PaymentLinkId);

/// <summary>
/// Trạng thái link do payOS trả về (đã kiểm tra chữ ký).
/// Status: PENDING, PROCESSING, PAID, UNDERPAID, CANCELLED, EXPIRED, FAILED (theo SDK .NET chính thức).
/// </summary>
public sealed record PayOsLinkInfo(long OrderCode, string Status, long Amount, long AmountPaid, string? PaymentLinkId, string? Reference);

/// <summary>Dữ liệu webhook đã kiểm tra chữ ký.</summary>
public sealed record PayOsWebhookData(long OrderCode, long Amount, string Code, string? Reference, string? PaymentLinkId);

/// <summary>
/// Gọi REST API payOS (https://api-merchant.payos.vn) theo tài liệu payos.vn/docs/api và cách làm của SDK .NET
/// chính thức (payOSHQ/payos-lib-dotnet, CryptoProvider):
/// <list type="bullet">
/// <item>Tạo link: HMAC-SHA256 (Checksum Key) trên chuỗi
/// "amount=..&amp;cancelUrl=..&amp;description=..&amp;orderCode=..&amp;returnUrl=.." (không URL-encode), hex chữ thường.</item>
/// <item>Phản hồi API và webhook: HMAC-SHA256 trên object "data" sắp xếp theo tên khóa, dạng key=value nối bằng '&amp;',
/// null → chuỗi rỗng, mảng → JSON của các phần tử đã sắp xếp khóa.</item>
/// </list>
/// </summary>
public sealed class PayOsGateway(HttpClient http, PayOsOptions options, ILogger<PayOsGateway> logger)
{
    private static readonly JsonSerializerOptions ArrayJson = new()
    {
        WriteIndented = false,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public PayOsOptions Options => options;

    public async Task<PayOsCreatedLink> CreateLink(long orderCode, long amount, string description, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var signature = SignPaymentRequest(amount, options.ReturnUrl, description, orderCode, options.ReturnUrl, options.ChecksumKey);
        var body = new Dictionary<string, object>
        {
            ["orderCode"] = orderCode,
            ["amount"] = amount,
            ["description"] = description,
            ["cancelUrl"] = options.ReturnUrl,
            ["returnUrl"] = options.ReturnUrl,
            ["expiredAt"] = expiresAt.ToUnixTimeSeconds(),
            ["signature"] = signature
        };
        var data = await Send(HttpMethod.Post, "/v2/payment-requests", body, ct);
        var checkoutUrl = Text(data, "checkoutUrl");
        var linkId = Text(data, "paymentLinkId");
        if (string.IsNullOrWhiteSpace(checkoutUrl) || !Uri.TryCreate(checkoutUrl, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            throw new PayOsException("payOS không trả về địa chỉ thanh toán hợp lệ.");
        return new PayOsCreatedLink(checkoutUrl, linkId ?? string.Empty);
    }

    public async Task<PayOsLinkInfo> GetLink(long orderCode, CancellationToken ct)
    {
        var data = await Send(HttpMethod.Get, $"/v2/payment-requests/{orderCode.ToString(CultureInfo.InvariantCulture)}", null, ct);
        string? reference = null;
        if (data.TryGetProperty("transactions", out var transactions) && transactions.ValueKind == JsonValueKind.Array)
            foreach (var transaction in transactions.EnumerateArray())
                reference = Text(transaction, "reference") ?? reference;
        return new PayOsLinkInfo(
            Long(data, "orderCode"),
            (Text(data, "status") ?? string.Empty).ToUpperInvariant(),
            Long(data, "amount"),
            Long(data, "amountPaid"),
            Text(data, "id"),
            reference);
    }

    /// <summary>Kiểm tra chữ ký webhook payOS gửi tới. Trả về null nếu sai chữ ký hoặc thiếu dữ liệu.</summary>
    public PayOsWebhookData? VerifyWebhook(JsonElement body)
    {
        if (!options.IsConfigured || body.ValueKind != JsonValueKind.Object) return null;
        if (!body.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object) return null;
        var signature = Text(body, "signature");
        if (string.IsNullOrWhiteSpace(signature) || !SignatureMatches(SignData(data, options.ChecksumKey), signature)) return null;
        return new PayOsWebhookData(Long(data, "orderCode"), Long(data, "amount"), Text(data, "code") ?? string.Empty,
            Text(data, "reference"), Text(data, "paymentLinkId"));
    }

    private async Task<JsonElement> Send(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        if (!options.IsConfigured) throw new PayOsException("payOS chưa được cấu hình.");
        using var request = new HttpRequestMessage(method, options.BaseUrl.TrimEnd('/') + path);
        request.Headers.Add("x-client-id", options.ClientId);
        request.Headers.Add("x-api-key", options.ApiKey);
        if (body is not null) request.Content = JsonContent.Create(body);

        HttpResponseMessage response;
        try { response = await http.SendAsync(request, ct); }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogWarning(exception, "payOS request failed: {Method} {Path}", method, path);
            throw new PayOsException("Không kết nối được payOS. Vui lòng thử lại sau.");
        }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("payOS HTTP {Status} for {Method} {Path}", (int)response.StatusCode, method, path);
                throw new PayOsException(response.StatusCode == (System.Net.HttpStatusCode)429
                    ? "payOS đang giới hạn tần suất gọi. Vui lòng thử lại sau ít phút."
                    : $"payOS từ chối yêu cầu (HTTP {(int)response.StatusCode}).");
            }

            JsonElement root;
            try
            {
                using var document = JsonDocument.Parse(text);
                root = document.RootElement.Clone();
            }
            catch (JsonException) { throw new PayOsException("Phản hồi payOS không đọc được."); }

            var code = Text(root, "code");
            if (code != "00" || !root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            {
                logger.LogWarning("payOS returned code {Code}: {Desc}", code, Text(root, "desc"));
                throw new PayOsException($"payOS báo lỗi: {Text(root, "desc") ?? code ?? "không rõ"}.");
            }
            // Như SDK chính thức: có chữ ký thì phải khớp mới dùng dữ liệu.
            var signature = Text(root, "signature");
            if (!string.IsNullOrEmpty(signature) && !SignatureMatches(SignData(data, options.ChecksumKey), signature))
            {
                logger.LogWarning("payOS response signature mismatch for {Method} {Path}", method, path);
                throw new PayOsException("Không xác minh được chữ ký phản hồi từ payOS.");
            }
            return data;
        }
    }

    // ------------------------------------------------------------ chữ ký

    public static string SignPaymentRequest(long amount, string cancelUrl, string description, long orderCode, string returnUrl, string key) =>
        Hmac(key, $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}");

    /// <summary>Ký object "data" (phản hồi API, webhook) giống CryptoProvider.CreateSignatureFromObject của SDK.</summary>
    public static string SignData(JsonElement data, string key)
    {
        var parameters = new SortedDictionary<string, string>(StringComparer.Ordinal);
        Flatten(data, string.Empty, parameters);
        return Hmac(key, string.Join("&", parameters.Select(p => $"{p.Key}={p.Value}")));
    }

    private static void Flatten(JsonElement element, string prefix, SortedDictionary<string, string> parameters)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                foreach (var property in element.EnumerateObject())
                    Flatten(property.Value, string.IsNullOrEmpty(prefix) ? property.Name : $"{prefix}.{property.Name}", parameters);
                break;
            case JsonValueKind.Array:
                parameters[prefix] = JsonSerializer.Serialize(element.EnumerateArray().Select(Value).ToList(), ArrayJson);
                break;
            case JsonValueKind.String:
                parameters[prefix] = element.GetString() ?? string.Empty;
                break;
            case JsonValueKind.Number:
                parameters[prefix] = element.TryGetInt64(out var integer)
                    ? integer.ToString(CultureInfo.InvariantCulture) : element.GetDouble().ToString(CultureInfo.InvariantCulture);
                break;
            case JsonValueKind.True: parameters[prefix] = "true"; break;
            case JsonValueKind.False: parameters[prefix] = "false"; break;
            case JsonValueKind.Null: parameters[prefix] = string.Empty; break;
        }
    }

    private static object? Value(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => new SortedDictionary<string, object?>(
            element.EnumerateObject().ToDictionary(p => p.Name, p => Value(p.Value)), StringComparer.Ordinal),
        JsonValueKind.Array => element.EnumerateArray().Select(Value).ToArray(),
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.TryGetInt64(out var integer) ? integer : element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null
    };

    private static string Hmac(string key, string data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    private static bool SignatureMatches(string expected, string actual) => CryptographicOperations.FixedTimeEquals(
        Encoding.ASCII.GetBytes(expected), Encoding.ASCII.GetBytes(actual.Trim().ToLowerInvariant()));

    private static string? Text(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static long Long(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number) ? number : 0;
}
