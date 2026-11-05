using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace TripOps.Service.Payments;

/// <summary>
/// Cấu hình kênh chuyển tiền (chi hộ) payOS. Đây là bộ khóa RIÊNG của "Kênh chuyển tiền" trên my.payos.vn,
/// khác bộ khóa kênh thanh toán. Đặt bằng user-secrets (PayOsPayout:ClientId/ApiKey/ChecksumKey), không ghi vào Git.
/// Chi hộ là chuyển tiền thật, payOS không có môi trường thử.
/// </summary>
public sealed class PayOsPayoutOptions
{
    public string ClientId { get; init; } = string.Empty;
    public string ApiKey { get; init; } = string.Empty;
    public string ChecksumKey { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = PayOsOptions.DefaultBaseUrl;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId) && !string.IsNullOrWhiteSpace(ApiKey)
        && !string.IsNullOrWhiteSpace(ChecksumKey);

    public static PayOsPayoutOptions From(IConfiguration configuration)
    {
        var section = configuration.GetSection("PayOsPayout");
        return new PayOsPayoutOptions
        {
            ClientId = section["ClientId"]?.Trim() ?? string.Empty,
            ApiKey = section["ApiKey"]?.Trim() ?? string.Empty,
            ChecksumKey = section["ChecksumKey"]?.Trim() ?? string.Empty,
            BaseUrl = string.IsNullOrWhiteSpace(section["BaseUrl"]) ? PayOsOptions.DefaultBaseUrl : section["BaseUrl"]!.Trim().TrimEnd('/')
        };
    }
}

/// <summary>Lỗi khi gọi API chi hộ. Definite = payOS đã trả lời từ chối (chắc chắn chưa chuyển tiền).</summary>
public sealed class PayOsPayoutException(string message, bool definite) : Exception(message)
{
    public bool Definite { get; } = definite;
}

/// <summary>Trạng thái một lệnh chi (đã kiểm tra chữ ký phản hồi).</summary>
public sealed record PayOsPayoutInfo(string Id, string ReferenceId, string ApprovalState, string? State,
    string? BankReference, DateTime? TransactionTime, string? ErrorMessage)
{
    /// <summary>Tiền đã tới tài khoản người nhận.</summary>
    public bool Succeeded => State == "SUCCEEDED";

    /// <summary>Lệnh chi không thành công, chắc chắn không có tiền ra (có thể tạo lệnh mới).</summary>
    public bool Failed => State is "FAILED" or "CANCELLED" or "REVERSED"
        || ApprovalState is "REJECTED" or "CANCELLED" or "FAILED";
}

public sealed record PayOsPayoutAccount(string AccountNumber, string AccountName, decimal Balance);

/// <summary>
/// Gọi API chi hộ payOS theo SDK chính thức @payos/node 2.x (resources/v1/payouts):
/// <list type="bullet">
/// <item>Tạo lệnh: POST /v1/payouts/ — header x-idempotency-key (gửi lại cùng khóa không tạo lệnh thứ hai) và x-signature.</item>
/// <item>Tra cứu: GET /v1/payouts/{id}, GET /v1/payouts?referenceId=..., số dư GET /v1/payouts-account/balance.</item>
/// <item>Chữ ký (crypto.createSignature): sắp xếp khóa, giá trị mảng/đối tượng → JSON (khóa sắp xếp), null → "",
/// key và value mã hóa như encodeURIComponent, nối "k=v" bằng '&amp;', HMAC-SHA256 bằng Checksum Key, hex chữ thường.
/// Phản hồi có header x-signature ký trên object "data" theo cùng cách.</item>
/// </list>
/// </summary>
public sealed class PayOsPayoutGateway(HttpClient http, PayOsPayoutOptions options, ILogger<PayOsPayoutGateway> logger)
{
    public PayOsPayoutOptions Options => options;

    public async Task<PayOsPayoutInfo> Create(string referenceId, long amount, string description, string toBin,
        string toAccountNumber, CancellationToken ct)
    {
        var body = new SortedDictionary<string, object>(StringComparer.Ordinal)
        {
            ["referenceId"] = referenceId,
            ["amount"] = amount,
            ["description"] = description,
            ["toBin"] = toBin,
            ["toAccountNumber"] = toAccountNumber,
            ["category"] = new[] { "refund" }
        };
        var element = JsonSerializer.SerializeToElement(body);
        var data = await Send(HttpMethod.Post, "/v1/payouts/", element, referenceId, ct);
        return Info(data);
    }

    public async Task<PayOsPayoutInfo> Get(string payoutId, CancellationToken ct) =>
        Info(await Send(HttpMethod.Get, "/v1/payouts/" + Uri.EscapeDataString(payoutId), null, null, ct));

    /// <summary>Tìm lệnh chi theo mã tham chiếu của TripOps (dùng khi không chắc lệnh đã được tạo hay chưa).</summary>
    public async Task<PayOsPayoutInfo?> FindByReference(string referenceId, CancellationToken ct)
    {
        var data = await Send(HttpMethod.Get, "/v1/payouts?limit=5&offset=0&referenceId=" + Uri.EscapeDataString(referenceId), null, null, ct);
        if (!data.TryGetProperty("payouts", out var payouts) || payouts.ValueKind != JsonValueKind.Array) return null;
        foreach (var payout in payouts.EnumerateArray())
            if (Text(payout, "referenceId") == referenceId) return Info(payout);
        return null;
    }

    public async Task<PayOsPayoutAccount> Balance(CancellationToken ct)
    {
        var data = await Send(HttpMethod.Get, "/v1/payouts-account/balance", null, null, ct);
        var raw = data.TryGetProperty("balance", out var value)
            ? value.ValueKind == JsonValueKind.Number ? value.GetRawText() : value.GetString() : null;
        return new PayOsPayoutAccount(Text(data, "accountNumber") ?? "", Text(data, "accountName") ?? "",
            decimal.TryParse(raw, NumberStyles.Number, CultureInfo.InvariantCulture, out var balance) ? balance : 0);
    }

    private async Task<JsonElement> Send(HttpMethod method, string path, JsonElement? body, string? idempotencyKey, CancellationToken ct)
    {
        if (!options.IsConfigured) throw new PayOsPayoutException("Chưa cấu hình kênh chuyển tiền payOS (PayOsPayout).", true);
        using var request = new HttpRequestMessage(method, options.BaseUrl.TrimEnd('/') + path);
        request.Headers.Add("x-client-id", options.ClientId);
        request.Headers.Add("x-api-key", options.ApiKey);
        if (idempotencyKey is not null) request.Headers.Add("x-idempotency-key", idempotencyKey);
        if (body is { } json)
        {
            request.Headers.Add("x-signature", Sign(json, options.ChecksumKey));
            request.Content = JsonContent.Create(json);
        }

        HttpResponseMessage response;
        try { response = await http.SendAsync(request, ct); }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            // Không biết payOS đã nhận lệnh hay chưa: phải tra cứu lại theo mã tham chiếu trước khi làm gì tiếp.
            logger.LogWarning(exception, "payOS payout request failed: {Method} {Path}", method, path);
            throw new PayOsPayoutException("Không kết nối được payOS.", false);
        }

        using (response)
        {
            var text = await response.Content.ReadAsStringAsync(ct);
            JsonElement root = default;
            var parsed = false;
            try
            {
                using var document = JsonDocument.Parse(text);
                root = document.RootElement.Clone();
                parsed = root.ValueKind == JsonValueKind.Object;
            }
            catch (JsonException) { }

            if (!response.IsSuccessStatusCode || !parsed)
            {
                logger.LogWarning("payOS payout HTTP {Status} for {Method} {Path}", (int)response.StatusCode, method, path);
                var definite = (int)response.StatusCode is >= 400 and < 500 && (int)response.StatusCode != 408 && (int)response.StatusCode != 429;
                var desc = parsed ? Text(root, "desc") : null;
                var hint = response.StatusCode == HttpStatusCode.Forbidden
                    ? " Kiểm tra IP công khai của máy chạy backend đã được thêm vào kênh chuyển tiền trên my.payos.vn chưa." : "";
                throw new PayOsPayoutException(response.StatusCode == (HttpStatusCode)429
                    ? "payOS đang giới hạn tần suất gọi. Vui lòng thử lại sau ít phút."
                    : $"payOS từ chối yêu cầu chi hộ (HTTP {(int)response.StatusCode}{(desc is null ? "" : $": {desc}")}).{hint}", definite);
            }

            var code = Text(root, "code");
            if (code != "00" || !root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            {
                logger.LogWarning("payOS payout returned code {Code}: {Desc}", code, Text(root, "desc"));
                throw new PayOsPayoutException($"payOS báo lỗi: {Text(root, "desc") ?? code ?? "không rõ"}.", true);
            }
            if (response.Headers.TryGetValues("x-signature", out var values) && values.FirstOrDefault() is { Length: > 0 } signature
                && !CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Sign(data, options.ChecksumKey)),
                    Encoding.ASCII.GetBytes(signature.Trim().ToLowerInvariant())))
            {
                logger.LogWarning("payOS payout response signature mismatch for {Method} {Path}", method, path);
                throw new PayOsPayoutException("Không xác minh được chữ ký phản hồi chi hộ từ payOS.", false);
            }
            return data;
        }
    }

    /// <summary>Kết nối chỉ qua IPv4 (dùng cho HttpClient chi hộ) để IP nguồn khớp danh sách IP của kênh.</summary>
    public static async ValueTask<Stream> ConnectIPv4(SocketsHttpConnectionContext context, CancellationToken ct)
    {
        var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, AddressFamily.InterNetwork, ct);
        if (addresses.Length == 0)
            throw new HttpRequestException($"Không tìm thấy địa chỉ IPv4 của {context.DnsEndPoint.Host}.");
        var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
        try
        {
            await socket.ConnectAsync(addresses, context.DnsEndPoint.Port, ct);
            return new NetworkStream(socket, ownsSocket: true);
        }
        catch
        {
            socket.Dispose();
            throw;
        }
    }

    private static PayOsPayoutInfo Info(JsonElement payout)
    {
        JsonElement? first = null;
        if (payout.TryGetProperty("transactions", out var transactions))
        {
            if (transactions.ValueKind == JsonValueKind.Array)
                foreach (var t in transactions.EnumerateArray()) { first = t; break; }
            else if (transactions.ValueKind == JsonValueKind.Object) // tài liệu REST minh họa dạng {"0": {...}}
                foreach (var t in transactions.EnumerateObject()) { first = t.Value; break; }
        }
        DateTime? time = first is { } tx && Text(tx, "transactionDatetime") is { } rawTime
            && DateTimeOffset.TryParse(rawTime, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed)
            ? parsed.UtcDateTime : null;
        return new PayOsPayoutInfo(Text(payout, "id") ?? "", Text(payout, "referenceId") ?? "",
            (Text(payout, "approvalState") ?? "").ToUpperInvariant(),
            first is { } f ? Text(f, "state")?.ToUpperInvariant() : null,
            first is { } r ? Text(r, "reference") : null, time,
            first is { } e ? Text(e, "errorMessage") ?? Text(e, "errorCode") : null);
    }

    // ------------------------------------------------------------ chữ ký (createSignature của SDK)

    public static string Sign(JsonElement data, string key)
    {
        var parts = data.EnumerateObject()
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => $"{EncodeUriComponent(p.Name)}={EncodeUriComponent(TopLevelValue(p.Value))}");
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(string.Join("&", parts)))).ToLowerInvariant();
    }

    private static string TopLevelValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Object or JsonValueKind.Array => Json(value),
        JsonValueKind.String => value.GetString() ?? "",
        JsonValueKind.Number => value.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => ""
    };

    /// <summary>JSON.stringify của giá trị đã sắp xếp khóa (deepSortObj, giữ thứ tự mảng).</summary>
    private static string Json(JsonElement value)
    {
        var builder = new StringBuilder();
        Write(value, builder);
        return builder.ToString();

        static void Write(JsonElement element, StringBuilder sb)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    sb.Append('{');
                    var firstProperty = true;
                    foreach (var property in element.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal))
                    {
                        if (!firstProperty) sb.Append(',');
                        firstProperty = false;
                        WriteString(property.Name, sb);
                        sb.Append(':');
                        Write(property.Value, sb);
                    }
                    sb.Append('}');
                    break;
                case JsonValueKind.Array:
                    sb.Append('[');
                    var firstItem = true;
                    foreach (var item in element.EnumerateArray())
                    {
                        if (!firstItem) sb.Append(',');
                        firstItem = false;
                        Write(item, sb);
                    }
                    sb.Append(']');
                    break;
                case JsonValueKind.String: WriteString(element.GetString() ?? "", sb); break;
                case JsonValueKind.Number: sb.Append(element.GetRawText()); break;
                case JsonValueKind.True: sb.Append("true"); break;
                case JsonValueKind.False: sb.Append("false"); break;
                default: sb.Append("null"); break;
            }
        }

        static void WriteString(string text, StringBuilder sb)
        {
            sb.Append('"');
            foreach (var ch in text)
            {
                switch (ch)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (ch < 0x20) sb.Append("\\u").Append(((int)ch).ToString("x4", CultureInfo.InvariantCulture));
                        else sb.Append(ch);
                        break;
                }
            }
            sb.Append('"');
        }
    }

    /// <summary>Giống encodeURIComponent của JavaScript: giữ A–Z a–z 0–9 - _ . ! ~ * ' ( ), còn lại %XX (UTF-8, chữ hoa).</summary>
    public static string EncodeUriComponent(string value)
    {
        var sb = new StringBuilder(value.Length);
        foreach (var b in Encoding.UTF8.GetBytes(value))
        {
            var c = (char)b;
            if (c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '_' or '.' or '!' or '~' or '*' or '\'' or '(' or ')')
                sb.Append(c);
            else
                sb.Append('%').Append(b.ToString("X2", CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }

    private static string? Text(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}

/// <summary>Mã BIN ngân hàng (NAPAS/VietQR) để chi hộ. Nguồn: Ngân hàng Nhà nước — danh sách mã BIN.</summary>
public static class VietnamBanks
{
    public sealed record Bank(string Name, string Bin, string[] Aliases);

    public static readonly IReadOnlyList<Bank> All =
    [
        new("Vietcombank", "970436", ["vcb", "ngoaithuong"]),
        new("VietinBank", "970415", ["ctg", "congthuong"]),
        new("BIDV", "970418", ["dautuvaphattrien"]),
        new("Agribank", "970405", ["vba", "nongnghiep"]),
        new("Techcombank", "970407", ["tcb", "kythuong"]),
        new("MB Bank", "970422", ["mb", "mbbank", "quandoi"]),
        new("ACB", "970416", ["achau"]),
        new("VPBank", "970432", ["vpb", "vietnamthinhvuong"]),
        new("TPBank", "970423", ["tpb", "tienphong"]),
        new("Sacombank", "970403", ["stb", "saigonthuongtin"]),
        new("HDBank", "970437", ["hdb"]),
        new("VIB", "970441", ["quocte"]),
        new("SHB", "970443", ["saigonhanoi"]),
        new("Eximbank", "970431", ["eib", "xuatnhapkhau"]),
        new("MSB", "970426", ["hanghai", "maritimebank"]),
        new("OCB", "970448", ["phuongdong"]),
        new("SeABank", "970440", ["seab", "dongnama"]),
        new("LPBank", "970449", ["lienvietpostbank", "locphat", "lpb"]),
        new("Nam A Bank", "970428", ["nama", "namabank"]),
        new("Bac A Bank", "970409", ["baca", "bacabank"]),
        new("ABBANK", "970425", ["anbinh"]),
        new("BVBank", "970454", ["banviet", "vietcapitalbank"]),
        new("KienlongBank", "970452", ["kienlong"]),
        new("PVcomBank", "970412", ["pvcom"]),
        new("Saigonbank", "970400", ["saigoncongthuong"]),
        new("SCB", "970429", []),
        new("NCB", "970419", ["quocdan"]),
        new("Viet A Bank", "970427", ["vieta", "vietabank"]),
        new("BaoViet Bank", "970438", ["baoviet"]),
        new("PGBank", "970430", ["xangdaupetrolimex"]),
        new("DongA Bank", "970406", ["donga"]),
        new("VietBank", "970433", ["vietnamthuongtin"])
    ];

    /// <summary>Tìm mã BIN theo tên ngân hàng khách nhập (không phân biệt hoa thường, dấu cách, chữ "bank").</summary>
    public static string? BinOf(string? bankName)
    {
        if (string.IsNullOrWhiteSpace(bankName)) return null;
        var key = Normalize(bankName);
        foreach (var bank in All)
            if (Normalize(bank.Name) == key || bank.Aliases.Any(a => Normalize(a) == key) || bank.Bin == key)
                return bank.Bin;
        return null;
    }

    private static string Normalize(string value)
    {
        var text = new string(value.ToLowerInvariant().Where(char.IsAsciiLetterOrDigit).ToArray());
        return text.Length > 4 && text.EndsWith("bank", StringComparison.Ordinal) ? text[..^4] : text;
    }
}
