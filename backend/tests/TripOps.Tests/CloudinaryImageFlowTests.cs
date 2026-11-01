using System.Net.Http.Json;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Existing_local_tour_images_remain_editable_after_switching_to_Cloudinary()
    {
        await using var app = new App(); await app.Initialize(); using var agency = await app.Login("agency");
        const string legacy = "/api/v1/files/tours/agency/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png";
        var tour = await Create(agency, Complete() with { Images = [legacy] });
        var saved = (await agency.GetFromJsonAsync<TourDto>($"{Root}/{tour.Id}"))!;
        Assert.Equal(new[] { legacy }, saved.Configuration.Images);
    }
}
