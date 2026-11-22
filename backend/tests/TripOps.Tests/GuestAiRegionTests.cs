using Microsoft.Extensions.DependencyInjection;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Ai;

namespace TripOps.Tests;

// Chatbot hiểu câu hỏi theo vùng miền ("tour miền Tây", "Tây Bắc") dù tên tour chỉ ghi tỉnh/địa danh.
public sealed partial class BookingFlowTests
{
    [Theory]
    [InlineData("tour mien tay 3 ngay", "miền Tây", "CAN_THO", "tour 3 ngay")]
    [InlineData("cac tour o mien nam", "miền Nam", "TP_HCM", "cac tour o")]
    [InlineData("tour dong nam bo", "Đông Nam Bộ", "TAY_NINH", "tour")]
    [InlineData("di tay bac thang sau", "Tây Bắc", "LAO_CAI", "di thang sau")]
    [InlineData("tour mien trung co bien", "miền Trung", "KHANH_HOA", "tour co bien")]
    [InlineData("tay nguyen", "Tây Nguyên", "LAM_DONG", "")]
    [InlineData("tour mien bac", "miền Bắc", "HA_NOI", "tour")]
    public void Regions_are_detected_from_the_question(string folded, string label, string member, string rest)
    {
        var region = VietnamRegions.Detect(folded)!.Value;
        Assert.Contains(label, region.Labels);
        Assert.Contains(member, region.Codes);
        Assert.Equal(rest, region.Remainder);
    }

    [Fact]
    public void Region_matching_uses_province_codes_and_place_names()
    {
        var mekong = VietnamRegions.Detect("mien tay")!.Value.Codes;
        Assert.Null(VietnamRegions.Detect("tour da lat"));
        Assert.Null(VietnamRegions.Detect("nam nay di dau")); // "năm" không phải miền Nam
        Assert.True(VietnamRegions.Matches(["CAN_THO"], "", mekong));
        Assert.True(VietnamRegions.Matches(["ca_mau"], "", mekong));
        Assert.True(VietnamRegions.Matches([], "cho noi cai rang 2n1d", mekong));       // địa danh của Cần Thơ
        Assert.True(VietnamRegions.Matches([], "kham pha chau doc", mekong));
        Assert.False(VietnamRegions.Matches(["KHANH_HOA"], "nha trang bien xanh", mekong));
        Assert.False(VietnamRegions.Matches(["TAY_NINH"], "", mekong));                 // Tây Ninh mới gồm cả Long An: không đoán theo mã
        Assert.True(VietnamRegions.Matches(["TAY_NINH"], "lang noi tan lap long an", mekong)); // nhưng tên địa danh thì nhận
    }

    [Fact]
    public async Task Guest_search_by_region_returns_tours_in_that_region()
    {
        using var app = new App(); await app.Initialize();
        await Change(app, db =>
        {
            Tour Make(int id, string name, string destination, params string[] provinces) => new()
            {
                Id = id, Code = $"REG-{id}", AgencyId = "agency1", Name = name, Destination = destination, BasePrice = 2_000_000, DurationDays = 3,
                Status = TourStatus.Completed, Visibility = TourVisibility.Public,
                Provinces = provinces.Select(p => new TourProvince { ProvinceCode = p }).ToList(),
            };
            db.Tours.AddRange(
                Make(901, "Sông nước Cần Thơ 3N2Đ", "Cần Thơ", "CAN_THO"),
                Make(902, "Chợ nổi Cái Răng – Châu Đốc", "Cái Răng"),
                Make(903, "Sapa mùa lúa chín", "Lào Cai", "LAO_CAI"),
                Make(904, "Biển Nha Trang 3N2Đ", "Nha Trang", "KHANH_HOA"));
        });
        var finder = app.Services.CreateScope().ServiceProvider.GetRequiredService<PublicTourFinder>();

        var mekong = (await finder.Search(new TourSearchCriteria("các tour ở miền Tây", null, null, null, 8), CancellationToken.None)).Select(t => t.Id).ToList();
        Assert.Contains(901, mekong);
        Assert.Contains(902, mekong);
        Assert.DoesNotContain(903, mekong);
        Assert.DoesNotContain(904, mekong);

        var northwest = await finder.Search(new TourSearchCriteria("Tây Bắc", null, null, null, 8), CancellationToken.None);
        Assert.Contains(903, northwest.Select(t => t.Id));
        Assert.DoesNotContain(901, northwest.Select(t => t.Id));

        var central = await finder.Search(new TourSearchCriteria("miền Trung", null, null, null, 8), CancellationToken.None);
        Assert.Contains(904, central.Select(t => t.Id));
        Assert.DoesNotContain(901, central.Select(t => t.Id));
    }
}
