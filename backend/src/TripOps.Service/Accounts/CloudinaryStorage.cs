using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Configuration;
namespace TripOps.Service.Accounts;
public sealed class CloudinaryStorage(HttpClient http, IConfiguration config)
{
    private string Setting(string key) => config[$"Cloudinary:{key}"] is { Length: > 0 } value ? value
        : throw new AccountException(503, "Chưa cấu hình Cloudinary trên server.");
    public async Task<string> Upload(string userId, byte[] bytes, string mime, CancellationToken ct)
    {
        var png = bytes.Length >= 8 && bytes.AsSpan(0,8).SequenceEqual(new byte[] {137,80,78,71,13,10,26,10});
        var jpg = bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255;
        if (bytes.Length > 5 * 1024 * 1024 || !(png && mime == "image/png" || jpg && mime == "image/jpeg"))
            throw new AccountException(400, "Chỉ nhận ảnh PNG/JPEG tối đa 5 MB.");
        var cloud = Setting("CloudName"); var key = Setting("ApiKey"); var secret = Setting("ApiSecret");
        using var body = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes); file.Headers.ContentType = new MediaTypeHeaderValue(mime);
        body.Add(file, "file", png ? "license.png" : "license.jpg");
        body.Add(new StringContent($"tripops/licenses/{userId}/{Guid.NewGuid():N}"), "public_id");
        body.Add(new StringContent("authenticated"), "type");
        using var request = new HttpRequestMessage(HttpMethod.Post, $"https://api.cloudinary.com/v1_1/{Uri.EscapeDataString(cloud)}/image/upload") { Content = body };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{key}:{secret}")));
        using var response = await Send(request, ct);
        if (!response.IsSuccessStatusCode) throw new AccountException(502, "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        return json.RootElement.GetProperty("secure_url").GetString()!;
    }
    private async Task<HttpResponseMessage> Send(HttpRequestMessage request, CancellationToken ct)
    {
        try { return await http.SendAsync(request, ct); }
        catch (HttpRequestException) { throw new AccountException(502, "Không kết nối được Cloudinary."); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        { throw new AccountException(504, "Cloudinary phản hồi quá lâu. Vui lòng thử lại."); }
    }
    public string? DeliveryUrl(string? url)
    {
        if (url is null || !url.Contains("/image/authenticated/")) return url;
        
        // Nếu URL đã có sẵn chữ ký hợp lệ (vd /image/authenticated/s--...--/) thì trả về luôn, không ký đè
        if (Regex.IsMatch(url, @"/image/authenticated/s--[^/]+--/"))
            return url;

        var start = url.IndexOf("/image/authenticated/", StringComparison.Ordinal) + "/image/authenticated/".Length;
        var path = url[start..];
        var digest = SHA1.HashData(Encoding.UTF8.GetBytes(path + Setting("ApiSecret")));
        var signature = Convert.ToBase64String(digest).Replace('+', '-').Replace('/', '_')[..8];
        return url[..start] + $"s--{signature}--/" + url[start..];
    }
}
