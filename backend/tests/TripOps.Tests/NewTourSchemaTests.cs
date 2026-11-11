using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Provider_service_ids_and_meal_times_survive_save_edit_and_restore()
    {
        await using var app=new App();await app.Initialize();using var agency=await app.Login("agency");
        var config=Complete();
        config=config with {Timelines=config.Timelines!.Select(d=>d with {
            Meals=d.Meals?.Select(m=>m with {ServiceId=103,Time=new TimeSpan(12,30,0)}).ToArray(),
            Accommodations=d.Accommodations?.Select(h=>h with {ServiceId=102}).ToArray()}).ToArray()};
        var tour=await Create(agency,config);
        var loaded=await agency.GetFromJsonAsync<TourDto>($"{Root}/{tour.Id}");
        Assert.Equal(103,loaded!.Configuration.Timelines![0].Meals![0].ServiceId);
        Assert.Equal(new TimeSpan(12,30,0),loaded.Configuration.Timelines[0].Meals![0].Time);
        await app.Inspect(async db=>{
            Assert.All(await db.TourMeals.ToListAsync(),m=>Assert.Equal(103,m.ServiceId));
            Assert.All(await db.TourAccommodations.ToListAsync(),h=>Assert.Equal(102,h.ServiceId));
        });
        var edited=await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{tour.Id}",new UpdateTourRequest(tour.Revision,config with{Name="Edited"},"edit")));
        var reloaded=await Read<TourDto>(await agency.GetAsync($"{Root}/{tour.Id}"));
        Assert.Equal(102,reloaded.Configuration.Timelines![0].Accommodations![0].ServiceId);
        var wrong=config with{Timelines=[config.Timelines![0] with{Meals=[new("lunch","Wrong",ServiceId:102)]},config.Timelines[1]]};
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(Root,wrong)).StatusCode);
    }

    [Fact]
    public async Task Complete_hidden_validates_without_making_tour_public()
    {
        await using var app=new App();await app.Initialize();using var agency=await app.Login("agency");
        var draft=await Create(agency);
        var completed=await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete",new TourCommand(draft.Revision)));
        Assert.Equal("completed",completed.Status);Assert.Equal("hidden",completed.Visibility);
        Assert.Equal(HttpStatusCode.NotFound,(await app.CreateClient().GetAsync($"/api/v1/tours/{draft.Id}")).StatusCode);
        var published=await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/publish",new TourCommand(completed.Revision)));
        Assert.Equal("public",published.Visibility);
    }
}
