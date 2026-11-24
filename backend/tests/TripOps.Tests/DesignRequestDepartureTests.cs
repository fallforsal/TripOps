using System.Net;
using System.Net.Http.Json;
using TripOps.Service.Tours;
namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Design_request_keeps_departure_province_for_customer_and_agency()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var input = new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
            DateTime.UtcNow.Date.AddDays(20), DateTime.UtcNow.Date.AddDays(21), 2,
            DepartureProvinceCode: "tp_hcm");
        var created = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests", input), HttpStatusCode.Created);
        Assert.Equal("TP_HCM", created.DepartureProvinceCode);
        Assert.Equal("TP. Hồ Chí Minh", created.DepartureProvinceName);
        var seen = Assert.Single(await Read<DesignRequestDto[]>(await agency.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal("TP. Hồ Chí Minh", seen.DepartureProvinceName);

        var invalid = input with { DepartureProvinceCode = "ATLANTIS" };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsJsonAsync("/api/v1/tour-design-requests", invalid)).StatusCode);
    }
}
