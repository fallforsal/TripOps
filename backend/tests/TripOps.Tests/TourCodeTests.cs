using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

// Mã tour tự tạo theo điểm đến và thời lượng thay cho "TOUR-xxxxxxxx".
public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData("Đà Lạt", 4, 3, "DL4N3D")]
    [InlineData("Nha Trang, Khánh Hòa", 3, 2, "NT3N2D")]
    [InlineData("TP. Hồ Chí Minh", 2, 1, "HCM2N1D")]
    [InlineData("Phú Quốc – Kiên Giang", 4, 3, "PQ4N3D")]
    [InlineData("Hà Nội", 1, 0, "HN1N")]
    [InlineData("", 3, 2, "TOUR3N2D")]
    public void Tour_code_is_suggested_from_destination_and_duration(string destination, int days, int nights, string expected) =>
        Assert.Equal(expected, TourCodes.Suggest(destination, days, nights));

    [Fact]
    public async Task New_tour_without_code_gets_a_readable_unique_code()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        var first = await Create(agency, Complete() with { Code = null });
        var second = await Create(agency, Complete() with { Code = null });
        Assert.Equal("DL2N1D", first.Code);
        Assert.Equal("DL2N1D-2", second.Code);
        var own = await Create(agency, Complete() with { Code = "my-code" });
        Assert.Equal("MY-CODE", own.Code);
    }
}
