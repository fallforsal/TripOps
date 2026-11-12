using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class BookingFlowTests
{
    [Fact]
    public async Task Snapshot_selection_passenger_preferences_and_guide_operations_persist()
    {
        using var app=new App();await app.Initialize();
        using(var scope=app.Services.CreateScope()){
            var db=scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            db.TourAccommodations.AddRange(new TourAccommodation{TourId=1,AgencyId="agency1",DestinationName="Da Nang",HotelName="Default",IsDefault=true,NightsCount=2},new TourAccommodation{TourId=1,AgencyId="agency1",DestinationName="Da Nang",HotelName="Upgrade",PriceDifference=300000,NightsCount=2});
            db.TourTimelines.Add(new TourTimeline{TourId=1,DayNumber=1,Title="Day one",Attractions=[new TouristAttraction{Name="Beach",AgencyId="agency1"}]});
            await db.SaveChangesAsync();
        }
        using var customer=await app.Client("customer1@example.test");using var agency=await app.Client("agency1@example.test");using var guide=await app.Client("guide1@example.test");
        var request=new CreateBookingRequest(1,DateTime.UtcNow.Date,"Customer","0901234567","customer1@example.test",null,[new("Passenger",null,new DateTime(1990,1,1),"Nam",null,2,RoommateNote:"Room A",RestaurantNote:"Vegetarian")],HotelChoices:[new("Da Nang","Upgrade")]);
        var created=await customer.PostAsJsonAsync("/api/v1/bookings",request);created.EnsureSuccessStatusCode();var booking=(await created.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(3300000,booking.TotalAmount);Assert.Equal("Room A",booking.Participants[0].RoommateNote);Assert.Equal("Upgrade",booking.SnapshotHotels![0].Name);
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",new BookingDecisionRequest("approve",null))).EnsureSuccessStatusCode();
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/guide-assignments",new GuideAssignmentRequest("guide1","lead_guide",null))).EnsureSuccessStatusCode();
        (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/start",null)).EnsureSuccessStatusCode();
        var checkedResponse=await guide.PostAsJsonAsync($"/api/v1/guide/bookings/{booking.Id}/locations/{booking.SnapshotDays![0].Locations[0].Id}/check-in",new{status="CheckedIn",note="Arrived"});checkedResponse.EnsureSuccessStatusCode();
        var read=await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}");Assert.Equal("CheckedIn",read!.SnapshotDays![0].Locations[0].AttendanceStatus);
        (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/complete",null)).EnsureSuccessStatusCode();
        read=await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}");Assert.Equal("Completed",read!.Status);
        var invalid=await customer.PostAsJsonAsync("/api/v1/bookings",request with{HotelChoices=[new("Da Nang","Not offered")]});Assert.Equal(HttpStatusCode.UnprocessableEntity,invalid.StatusCode);
    }
}
