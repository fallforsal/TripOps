using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using TripOps.Service.Accounts;
using TripOps.Service.Tours;

namespace TripOps.Api.Infrastructure;

public sealed class TourSaveForm
{
    [Required] public string Payload {get;set;} = "";
    public List<IFormFile> Images {get;set;} = [];
    public const long MaxBytes = 105L * 1024 * 1024;
    public T Read<T>() {
        try {return JsonSerializer.Deserialize<T>(Payload,new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? throw new JsonException();}
        catch(JsonException) {throw new TourException(400,"Thông tin tour không hợp lệ.");}
    }
    public async Task<TourConfiguration> Upload(TourConfiguration configuration,CloudinaryStorage storage,string actor,CancellationToken ct)
    {
        if(configuration is null)throw new TourException(400,"Thiếu thông tin tour.");
        var urls=configuration.Images ?? [];
        if(Images.Count>20 || Images.Any(file=>file.Length is <=0 or >5*1024*1024 || file.ContentType is not ("image/png" or "image/jpeg")))
            throw new TourException(400,"Chỉ nhận tối đa 20 ảnh PNG/JPEG, mỗi ảnh tối đa 5 MB.");
        var expected=Enumerable.Range(0,Images.Count).Select(i=>$"upload:{i}").ToHashSet();
        if(!expected.SetEquals(urls.Where(url=>url.StartsWith("upload:",StringComparison.Ordinal))) || urls.Any(url=>url.StartsWith("blob:") || url.StartsWith("data:")))
            throw new TourException(400,"Danh sách ảnh tour không hợp lệ. Vui lòng chọn lại ảnh.");
        // Read and check every file before the first network upload.
        var contents=new List<byte[]>();
        foreach(var file in Images) {
            using var stream=new MemoryStream();await file.CopyToAsync(stream,ct);var bytes=stream.ToArray();
            var png=bytes.Length>=8 && bytes.AsSpan(0,8).SequenceEqual(new byte[]{137,80,78,71,13,10,26,10});
            var jpg=bytes.Length>=3 && bytes[0]==255 && bytes[1]==216 && bytes[2]==255;
            if(!(png && file.ContentType=="image/png" || jpg && file.ContentType=="image/jpeg"))throw new TourException(400,"Nội dung ảnh PNG/JPEG không hợp lệ.");
            contents.Add(bytes);
        }
        var uploaded=new Dictionary<string,string>();
        for(var i=0;i<Images.Count;i++)uploaded[$"upload:{i}"]=await storage.UploadTourImage(actor,contents[i],Images[i].ContentType,ct);
        return configuration with {Images=urls.Select(url=>uploaded.GetValueOrDefault(url,url)).ToArray()};
    }
}
