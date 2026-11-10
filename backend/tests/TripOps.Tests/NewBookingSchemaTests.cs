using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;
using Microsoft.EntityFrameworkCore;

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
            db.TourTimelines.Add(new TourTimeline { TourId = 1, DayNumber = 1, Title = "Day one",
                Attractions = [
                    new TouristAttraction { Name = "Beach", AgencyId = "agency1", Latitude = 10.345, Longitude = 107.08, GeofenceRadiusMeters = 1500 },
                    new TouristAttraction { Name = "Lighthouse", AgencyId = "agency1", Latitude = 10.348, Longitude = 107.083, GeofenceRadiusMeters = 1500 }
                ] });
            await db.SaveChangesAsync();
        }
        using var customer=await app.Client("customer1@example.test");using var agency=await app.Client("agency1@example.test");using var guide=await app.Client("guide1@example.test");
        var request=new CreateBookingRequest(1,PaymentRules.VietnamDate(DateTime.UtcNow),"Customer","0901234567","customer1@example.test",null,[new("Passenger",null,new DateTime(1990,1,1),"Nam",null,2,RoommateNote:"Room A",RestaurantNote:"Vegetarian")],HotelChoices:[new("Da Nang","Upgrade")]);
        var created=await customer.PostAsJsonAsync("/api/v1/bookings",request);created.EnsureSuccessStatusCode();var booking=(await created.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.Equal(3300000,booking.TotalAmount);Assert.Equal("Room A",booking.Participants[0].RoommateNote);Assert.Equal("Upgrade",booking.SnapshotHotels![0].Name);
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",new BookingDecisionRequest("approve",null))).EnsureSuccessStatusCode();
        (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/guide-assignments",new GuideAssignmentRequest("guide1","lead_guide",null))).EnsureSuccessStatusCode();
        var firstStop = booking.SnapshotDays![0].Locations[0];
        var secondStop = booking.SnapshotDays[0].Locations[1];
        var firstUrl = $"/api/v1/guide/bookings/{booking.Id}/locations/{firstStop.Id}/check-in";
        var secondUrl = $"/api/v1/guide/bookings/{booking.Id}/locations/{secondStop.Id}/check-in";
        var near = new {
            status = "CheckedIn", note = "Arrived",
            latitude = 10.345, longitude = 107.08, accuracyMeters = 12.0,
            recordedAtUtc = DateTime.UtcNow
        };

        // Date gate: even fresh and accurate GPS is rejected before departure.
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.SingleAsync(b => b.Id == booking.Id);
            stored.StartDate = PaymentRules.VietnamDate(DateTime.UtcNow).AddDays(1);
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(firstUrl, near)).StatusCode);
        // Multi-day tours remain eligible after departure day until completed.
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.SingleAsync(b => b.Id == booking.Id);
            stored.StartDate = PaymentRules.VietnamDate(DateTime.UtcNow).AddDays(-1);
            await db.SaveChangesAsync();
        }
        var inProgressDay = await guide.GetFromJsonAsync<BookingDto>(
            $"/api/v1/guide/bookings/{booking.Id}");
        Assert.True(inProgressDay!.CanCheckInLocations);
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stored = await db.Bookings.SingleAsync(b => b.Id == booking.Id);
            stored.StartDate = PaymentRules.VietnamDate(DateTime.UtcNow);
            await db.SaveChangesAsync();
        }

        (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/start",null)).EnsureSuccessStatusCode();
        var before = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{booking.Id}");
        Assert.True(before!.CanCheckInLocations);
        Assert.Equal(firstStop.Id, before.NextLocationCheckInId);
        Assert.Equal(10.345, before.SnapshotDays![0].Locations[0].Latitude);

        // Old bookings without configured geofences must fail closed.
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var stop = await db.BookingTimelineAttractions.SingleAsync(x => x.Id == firstStop.Id);
            stop.Latitude = null; stop.Longitude = null;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(firstUrl, near)).StatusCode);
        var geofenceUrl = $"/api/v1/bookings/{booking.Id}/locations/{firstStop.Id}/geofence";
        var geofence = new {
            locationId = firstStop.Id, latitude = 10.345,
            longitude = 107.08, radiusMeters = 1500
        };
        Assert.Equal(HttpStatusCode.Forbidden,
            (await customer.PutAsJsonAsync(geofenceUrl, geofence)).StatusCode);
        (await agency.PutAsJsonAsync(geofenceUrl, geofence)).EnsureSuccessStatusCode();

        // Sequence gate: cannot check in stop 2 before stop 1.
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(secondUrl, near)).StatusCode);
        // Distance gate: valid GPS outside of the planned geofence is denied.
        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(firstUrl, new {
                status = "CheckedIn", latitude = 10.8, longitude = 107.8,
                accuracyMeters = 10.0, recordedAtUtc = DateTime.UtcNow
            })).StatusCode);
        // Unverified or stale position is never accepted.
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsJsonAsync(firstUrl, new {status="CheckedIn"})).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await guide.PostAsJsonAsync(firstUrl, new {
                status="CheckedIn", latitude=10.345, longitude=107.08,
                accuracyMeters=15.0, recordedAtUtc=DateTime.UtcNow.AddMinutes(-10)
            })).StatusCode);
        // "Skipped" must not unlock later stops.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await guide.PostAsJsonAsync(firstUrl, new {status="Skipped"})).StatusCode);

        var checkedResponse = await guide.PostAsJsonAsync(firstUrl, near);
        checkedResponse.EnsureSuccessStatusCode();
        var next = await guide.GetFromJsonAsync<BookingDto>($"/api/v1/guide/bookings/{booking.Id}");
        Assert.Equal(secondStop.Id, next!.NextLocationCheckInId);

        Assert.Equal(HttpStatusCode.Conflict,
            (await guide.PostAsJsonAsync(firstUrl, near)).StatusCode);
        (await guide.PostAsJsonAsync(secondUrl, new {
            status="CheckedIn", latitude=10.348, longitude=107.083,
            accuracyMeters=12.0, recordedAtUtc=DateTime.UtcNow
        })).EnsureSuccessStatusCode();
        var read = await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}");
        Assert.All(read!.SnapshotDays![0].Locations, s => Assert.Equal("CheckedIn", s.AttendanceStatus));
        Assert.Null(read.NextLocationCheckInId);
        using (var scope = app.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<TripOpsDbContext>();
            var proof = await db.BookingAttractionCheckins.SingleAsync(x =>
                x.BookingTimelineAttractionId == firstStop.Id);
            Assert.Equal(10.345, proof.GpsLatitude);
            Assert.Equal(12.0, proof.GpsAccuracyMeters);
            Assert.NotNull(proof.GpsRecordedAtUtc);
        }
        (await guide.PostAsync($"/api/v1/guide/bookings/{booking.Id}/complete",null)).EnsureSuccessStatusCode();
        read=await customer.GetFromJsonAsync<BookingDto>($"/api/v1/bookings/{booking.Id}");Assert.Equal("Completed",read!.Status);
        var invalid=await customer.PostAsJsonAsync("/api/v1/bookings",request with{HotelChoices=[new("Da Nang","Not offered")]});Assert.Equal(HttpStatusCode.UnprocessableEntity,invalid.StatusCode);
    }
}
