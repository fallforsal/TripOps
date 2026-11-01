using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Api.Controllers;
using TripOps.Data.Enums;
using TripOps.Service.Common;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Service_metadata_and_additional_images_round_trip_through_all_existing_read_APIs()
    {
        await using var app = new App();
        await app.Initialize();
        const string thumbnail = "https://example.test/thumbnail.jpg";
        const string extra = "https://example.test/gallery.jpg";
        await app.Inspect(async db =>
        {
            var service = await db.Services.SingleAsync(s => s.Id == 102);
            service.SubCategory = "Resort";
            service.FullAddress = "12 Trần Phú, Phường Xuân Hương, Lâm Đồng";
            service.OperatingHours = "Nhận phòng 14:00, trả phòng 12:00";
            service.HiddenReason = "Lý do ẩn trước đó";
            service.Capacity = 37;
            service.ThumbnailUrl = thumbnail;
            service.Images = JsonSerializer.Serialize(new string?[] { thumbnail, extra, extra, null });
            await db.SaveChangesAsync();
        });

        using var agency = await app.Login("agency");
        var detail = await agency.GetFromJsonAsync<TourServiceReference>("/api/v1/services/102");
        Assert.NotNull(detail);
        Assert.Equal("Resort", detail.SubCategory);
        Assert.Equal("12 Trần Phú, Phường Xuân Hương, Lâm Đồng", detail.FullAddress);
        Assert.Equal("Nhận phòng 14:00, trả phòng 12:00", detail.OperatingHours);
        Assert.Equal("Lý do ẩn trước đó", detail.HiddenReason);
        Assert.Equal(37, detail.Capacity);
        Assert.Equal(thumbnail, detail.ThumbnailUrl);
        Assert.Equal(new[] { extra }, detail.Images);

        var page = await agency.GetFromJsonAsync<TourPage<TourServiceReference>>("/api/v1/services?category=hotel");
        var listed = Assert.Single(page!.Items);
        Assert.Equal(detail.SubCategory, listed.SubCategory);
        Assert.Equal(detail.FullAddress, listed.FullAddress);
        Assert.Equal(detail.OperatingHours, listed.OperatingHours);
        Assert.Equal(detail.HiddenReason, listed.HiddenReason);
        Assert.Equal(new[] { extra }, listed.Images);

        using var anonymous = app.CreateClient();
        var items = await anonymous.GetFromJsonAsync<CatalogueItem[]>("/api/v1/catalogue");
        var item = Assert.Single(items!, s => s.Id == "102");
        Assert.Equal(detail.SubCategory, item.SubCategory);
        Assert.Equal(detail.FullAddress, item.FullAddress);
        Assert.Equal(item.FullAddress, item.Location);
        Assert.Equal(detail.OperatingHours, item.OperatingHours);
        Assert.Equal(detail.HiddenReason, item.HiddenReason);
        Assert.Equal(detail.Capacity, item.Capacity);
        Assert.Equal(thumbnail, item.Image);
        Assert.Equal(thumbnail, item.ThumbnailUrl);
        Assert.Equal(new[] { extra }, item.Images);

        await app.Inspect(async db =>
        {
            var service = await db.Services.SingleAsync(s => s.Id == 102);
            service.Status = ServiceStatus.Hidden;
            await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.NotFound, (await agency.GetAsync("/api/v1/services/102")).StatusCode);
        items = await anonymous.GetFromJsonAsync<CatalogueItem[]>("/api/v1/catalogue");
        Assert.DoesNotContain(items!, s => s.Id == "102");
    }

    [Fact]
    public void Missing_or_invalid_gallery_does_not_duplicate_the_thumbnail()
    {
        Assert.Empty(ServiceMedia.AdditionalImages(null, "https://example.test/thumbnail.jpg"));
        Assert.Empty(ServiceMedia.AdditionalImages("not-json", "https://example.test/thumbnail.jpg"));
        Assert.Empty(ServiceMedia.AdditionalImages("[\"https://example.test/thumbnail.jpg\"]", "https://example.test/thumbnail.jpg"));
    }
}
