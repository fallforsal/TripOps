using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace TripOps.Service.Locations;

public sealed record ProvinceOption(string Code, string Name, string FullName);
public sealed record WardOption(string Code, string Name, string ProvinceCode);
public sealed class AdministrativeLocationException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
}

// Shared cache prevents every form opening from calling the public provider.
public sealed class VietnamAdministrativeService(IHttpClientFactory clients, IMemoryCache cache) : IDisposable
{
    public const string ClientName = "VietnamAdministrative";
    private readonly SemaphoreSlim gate = new(1, 1);
    private static readonly StringComparer Vietnamese = StringComparer.Create(CultureInfo.GetCultureInfo("vi-VN"), false);
    private sealed record Unit(int Code, string Name,
        [property: JsonPropertyName("province_code")] int? ProvinceCode = null, Unit[]? Wards = null);

    public Task<ProvinceOption[]> Provinces(CancellationToken ct) => Cached("provinces", async () => {
        var rows = await Get<Unit[]>("", ct);
        if (rows.Length == 0 || rows.Any(r => r.Code is < 1 or > 99 || string.IsNullOrWhiteSpace(r.Name)) ||
            rows.Select(r => r.Code).Distinct().Count() != rows.Length) throw new JsonException("Invalid province list.");
        return rows.Select(r => new ProvinceOption(r.Code.ToString("00"), ShortName(r.Name), r.Name))
            .OrderBy(r => r.Name, Vietnamese).ToArray();
    }, ct);

    public async Task<WardOption[]> Wards(string provinceCode, CancellationToken ct)
    {
        if (provinceCode.Length is < 1 or > 2 || provinceCode.Any(c => c is < '0' or > '9') ||
            !int.TryParse(provinceCode, out var code) || code is < 1 or > 99)
            throw new AdministrativeLocationException(400, "Mã tỉnh/thành không hợp lệ.");
        if (!(await Provinces(ct)).Any(p => p.Code == code.ToString("00")))
            throw new AdministrativeLocationException(404, "Không tìm thấy tỉnh/thành.");
        return await Cached($"wards:{code}", async () => {
            var province = await Get<Unit>($"p/{code}?depth=2", ct);
            if (province.Code != code || province.Wards is not { Length: > 0 } ||
                province.Wards.Any(w => w.ProvinceCode != code || w.Code is < 1 or > 99999 || string.IsNullOrWhiteSpace(w.Name)) ||
                province.Wards.Select(w => w.Code).Distinct().Count() != province.Wards.Length)
                throw new JsonException("Invalid ward list.");
            return province.Wards.Select(w => new WardOption(w.Code.ToString("00000"), w.Name, code.ToString("00")))
                .OrderBy(w => w.Name, Vietnamese).ToArray();
        }, ct);
    }

    private async Task<T> Cached<T>(string key, Func<Task<T>> fetch, CancellationToken ct) where T : class
    {
        key = $"administrative:v2:{key}";
        if (cache.TryGetValue<T>(key, out var existing)) return existing!;
        await gate.WaitAsync(ct);
        try {
            if (cache.TryGetValue<T>(key, out existing)) return existing!;
            var value = await fetch();
            cache.Set(key, value, TimeSpan.FromHours(24));
            return value;
        }
        catch (Exception e) when (e is HttpRequestException or JsonException || e is OperationCanceledException && !ct.IsCancellationRequested) {
            throw new AdministrativeLocationException(503, "Chưa tải được danh mục tỉnh/thành, phường/xã. Vui lòng thử lại.");
        }
        finally { gate.Release(); }
    }

    private async Task<T> Get<T>(string path, CancellationToken ct) =>
        await clients.CreateClient(ClientName).GetFromJsonAsync<T>(path, ct)
        ?? throw new JsonException("Empty administrative response.");
    private static string ShortName(string name) => name.StartsWith("Tỉnh ") ? name[5..]
        : name.StartsWith("Thành phố ") ? name[10..] : name;
    public void Dispose() => gate.Dispose();
}
