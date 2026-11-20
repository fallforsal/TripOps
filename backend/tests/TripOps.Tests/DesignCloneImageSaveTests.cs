using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Design_clone_can_save_images_in_place_and_as_new_version_but_rejects_stale_edits()
    {
        await using var app = new App(withCloudinary: true);
        await app.Initialize();
        using var agency = await app.Login("agency");
        using var customer = await app.Login("customer");
        var source = await Create(agency);
        var request = await DesignRequest(customer);
        await Receive(agency, request.Id);
        var url = $"/api/v1/agency/tour-design-requests/{request.Id}";
        var clone = await Read<TourDto>(await agency.PostAsJsonAsync(url + "/clone", new DesignCloneInput(source.Id)), HttpStatusCode.Created);

        TourDto saved;
        using (var form = TourForm(new SaveDesignTourInput(clone.Revision,
            clone.Configuration with { Name = "Edited clone", Images = ["upload:0"] }, Version: 1), TourPng))
            saved = await Read<TourDto>(await agency.PutAsync(url + "/tour-with-images", form));
        Assert.Equal(clone.Id, saved.Id);
        Assert.Equal(1, saved.Version);
        Assert.True(saved.Revision > clone.Revision);
        Assert.Equal("Edited clone", saved.Configuration.Name);
        Assert.EndsWith("image1.png", saved.Configuration.Images![0]);

        // An outdated form must fail before uploading another image or overwriting the saved tour.
        using (var form = TourForm(new SaveDesignTourInput(clone.Revision,
            clone.Configuration with { Name = "Stale edit", Images = ["upload:0"] }, Version: 1), TourPng))
            Assert.Equal(HttpStatusCode.Conflict, (await agency.PutAsync(url + "/tour-with-images", form)).StatusCode);
        Assert.Equal(1, app.Cloud.Calls);

        TourDto next;
        using (var form = TourForm(new SaveDesignTourInput(saved.Revision,
            saved.Configuration with { Name = "New version", Images = ["upload:0"] }, CreateNewVersion: true, Version: 1), TourPng))
            next = await Read<TourDto>(await agency.PutAsync(url + "/tour-with-images", form));
        Assert.Equal(2, next.Version);
        Assert.EndsWith("image2.png", next.Configuration.Images![0]);
        var first = await Read<TourDto>(await agency.GetAsync(url + "/versions/1"));
        Assert.Equal("Edited clone", first.Configuration.Name);
        Assert.Equal(saved.Configuration.Images, first.Configuration.Images);
        Assert.Equal(source.Configuration.Name, (await Read<TourDto>(await agency.GetAsync($"{Root}/{source.Id}"))).Configuration.Name);
        await app.Inspect(async db => Assert.Equal(2, await db.TourVersions.CountAsync(v => v.TourId == clone.Id)));
    }
}
