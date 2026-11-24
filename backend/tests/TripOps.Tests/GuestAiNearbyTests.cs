using Microsoft.Extensions.DependencyInjection;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Ai;

namespace TripOps.Tests;

// Khách hỏi một địa danh chưa có tour: chỉ gợi ý tour ở tỉnh giáp ranh, không lấy tour ở xa (vd "Hà Giang" không được ra An Giang).
public sealed partial class BookingFlowTests
{
    [Fact]
    public void Places_are_detected_and_neighbours_stay_close()
    {
        var hg = VietnamRegions.DetectPlaces("tour ha giang 3 ngay")!.Value;
        Assert.Equal(["HA_GIANG"], hg.Codes);
        Assert.Equal("tour 3 ngay", hg.Remainder);
        Assert.Null(VietnamRegions.DetectPlaces("tour gia re"));
        Assert.Equal(["QUANG_NINH"], VietnamRegions.DetectPlaces("vinh ha long")!.Value.Codes); // "vịnh" không phải TP Vinh

        var near = VietnamRegions.NearbyOf(hg.Codes);
        Assert.Contains("LAO_CAI", near);
        Assert.Contains("CAO_BANG", near);
        Assert.DoesNotContain("AN_GIANG", near);
        Assert.DoesNotContain("HA_GIANG", near);
    }

    [Fact]
    public async Task Guest_search_for_place_without_tours_suggests_only_nearby_tours()
    {
        using var app = new App(); await app.Initialize();
        await Change(app, db =>
        {
            Tour Make(int id, string name, string destination, params string[] provinces) => new()
            {
                Id = id, Code = $"NEAR-{id}", AgencyId = "agency1", Name = name, Destination = destination, BasePrice = 2_000_000, DurationDays = 3,
                Status = TourStatus.Completed, Visibility = TourVisibility.Public,
                Provinces = provinces.Select(p => new TourProvince { ProvinceCode = p }).ToList(),
            };
            db.Tours.AddRange(
                Make(911, "Châu Đốc – An Giang 2N1Đ", "An Giang", "AN_GIANG"),
                Make(912, "Sapa mùa lúa chín", "Lào Cai", "LAO_CAI"),
                Make(913, "Thác Bản Giốc 3N2Đ", "Cao Bằng", "CAO_BANG"),
                Make(914, "Biển Nha Trang 3N2Đ", "Nha Trang", "KHANH_HOA"));
        });
        var finder = app.Services.CreateScope().ServiceProvider.GetRequiredService<PublicTourFinder>();

        var hg = await finder.Find(new TourSearchCriteria("tour Hà Giang", null, null, null, 8), CancellationToken.None);
        Assert.True(hg.Nearby);
        Assert.Equal(["Hà Giang"], hg.Places);
        Assert.Equal([912, 913], hg.Tours.Select(t => t.Id).Order());
        Assert.Contains("Lào Cai", hg.NearbyPlaces);

        var sapa = await finder.Find(new TourSearchCriteria("Sapa", null, null, null, 8), CancellationToken.None);
        Assert.False(sapa.Nearby);
        Assert.Equal([912], sapa.Tours.Select(t => t.Id));

        var far = await finder.Find(new TourSearchCriteria("Cà Mau", null, null, null, 8), CancellationToken.None);
        Assert.Empty(far.Tours); // An Giang không giáp Cà Mau: không gợi ý cho đủ
        Assert.False(far.Nearby);

        await Change(app, db => db.Tours.Add(new Tour
        {
            Id = 915, Code = "NEAR-915", AgencyId = "agency1", Name = "Cung đường Hà Giang 4N3Đ", Destination = "Hà Giang", BasePrice = 3_000_000, DurationDays = 4,
            Status = TourStatus.Completed, Visibility = TourVisibility.Public, Provinces = [new TourProvince { ProvinceCode = "TUYEN_QUANG" }],
        }));
        var exact = await finder.Find(new TourSearchCriteria("tour Hà Giang", null, null, null, 8), CancellationToken.None);
        Assert.False(exact.Nearby);
        Assert.Equal([915], exact.Tours.Select(t => t.Id));
    }
}
