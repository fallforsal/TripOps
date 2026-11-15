using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private static async Task<(int Booking, int First, int Second)> InlineRoutingFixture(App app, HttpClient agency)
    {
        var tour = await Create(agency, Complete());
        var result = (Booking: 0, First: 0, Second: 0);
        await app.Inspect(async db => {
            db.Users.AddRange(
                new User { Id="inline-guide", Name="Own guide", Avatar="/api/v1/files/avatars/inline.jpg", Email="inline@example.test", Role=UserRole.TourGuide, AgencyId="agency", Status=UserStatus.Active },
                new User { Id="inline-partner", Name="Partner guide", Email="partner-inline@example.test", Role=UserRole.TourGuide, AgencyId="other", Status=UserStatus.Active },
                new User { Id="inline-inactive", Name="Inactive guide", Email="inactive-inline@example.test", Role=UserRole.TourGuide, AgencyId="agency", Status=UserStatus.Banned });
            var first=new BookingTimelineAttraction { AgencyId="agency", OriginalLocationName="First stop" };
            var second=new BookingTimelineAttraction { AgencyId="agency", OriginalLocationName="Second stop" };
            var booking=new Booking { BookingCode="INLINE-ROUTING", TourId=tour.Id, CustomerId="customer", Status=BookingStatus.Confirmed,
                StartDate=DateTime.UtcNow.Date.AddDays(30), BookingAgencies=[new() {AgencyId="agency",IsHost=true}],
                Participants=[new() {AgencyId="agency",ParticipantIndex=1,FullName="Test passenger",DateOfBirth=new DateTime(1990,1,1)}],
                Timelines=[new() {DayNumber=1,Title="Day one",Attractions=[first,second]}] };
            db.Bookings.Add(booking); await db.SaveChangesAsync();
            result=(booking.Id,first.Id,second.Id);
        });
        return result;
    }

    [Fact]
    public async Task Inline_routing_enrolls_own_guide_atomically_and_keeps_other_stops()
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency");
        var f=await InlineRoutingFixture(app,agency); var url=$"/api/v1/agency/bookings/{f.Booking}/guide-routing";
        var response=await agency.PutAsJsonAsync(url,new {locations=new[]{new {locationId=f.First,guideIds=new[]{"inline-guide"}}}});
        var saved=await Read<BookingDto>(response);
        Assert.Equal("/api/v1/files/avatars/inline.jpg",Assert.Single(saved.AssignedGuides).GuideAvatar);
        Assert.Equal("/api/v1/files/avatars/inline.jpg",Assert.Single(saved.AttractionCheckins!).GuideAvatar);
        await Read<BookingDto>(await agency.PutAsJsonAsync(url,new {locations=new[]{new {locationId=f.Second,guideIds=new[]{"inline-guide"}}}}));
        await app.Inspect(async db => {
            Assert.Single(await db.BookingAssignedGuides.Where(g=>g.BookingId==f.Booking).ToListAsync());
            Assert.Equal("inline-guide",(await db.BookingParticipants.SingleAsync(p=>p.BookingId==f.Booking)).AssignedGuideId);
            Assert.Equal(2,await db.BookingAttractionCheckins.CountAsync(c=>c.BookingTimelineAttraction.BookingTimeline.BookingId==f.Booking));
        });
        await Read<BookingDto>(await agency.PutAsJsonAsync(url,new {locations=new[]{new {locationId=f.First,guideIds=Array.Empty<string>()}}}));
        await app.Inspect(async db => {
            Assert.False(await db.BookingAttractionCheckins.AnyAsync(c=>c.BookingTimelineAttractionId==f.First));
            Assert.True(await db.BookingAttractionCheckins.AnyAsync(c=>c.BookingTimelineAttractionId==f.Second));
        });
    }

    [Theory]
    [InlineData("inline-partner")]
    [InlineData("inline-inactive")]
    [InlineData("does-not-exist")]
    public async Task Inline_routing_rejects_invalid_guides_without_partial_enrollment(string invalidGuide)
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency");
        var f=await InlineRoutingFixture(app,agency);
        var response=await agency.PutAsJsonAsync($"/api/v1/agency/bookings/{f.Booking}/guide-routing",new {locations=new[]{new {locationId=f.First,guideIds=new[]{"inline-guide",invalidGuide}}}});
        Assert.Equal(HttpStatusCode.UnprocessableEntity,response.StatusCode);
        await app.Inspect(async db => {
            Assert.False(await db.BookingAssignedGuides.AnyAsync(g=>g.BookingId==f.Booking));
            Assert.False(await db.BookingAttractionCheckins.AnyAsync());
        });
    }

    [Fact]
    public async Task Inline_routing_rejects_overlapping_trips_and_rolls_back()
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency");
        var f=await InlineRoutingFixture(app,agency);
        await app.Inspect(async db => {
            var target=await db.Bookings.SingleAsync(b=>b.Id==f.Booking);
            db.Bookings.Add(new Booking {BookingCode="INLINE-CONFLICT",CustomerId="customer",TourId=target.TourId,Status=BookingStatus.Confirmed,StartDate=target.StartDate,
                BookingAgencies=[new() {AgencyId="agency",IsHost=true}],
                AssignedGuides=[new() {GuideId="inline-guide",AgencyId="agency"}]});
            await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.Conflict,(await agency.PutAsJsonAsync($"/api/v1/agency/bookings/{f.Booking}/guide-routing",new {locations=new[]{new {locationId=f.First,guideIds=new[]{"inline-guide"}}}})).StatusCode);
        await app.Inspect(async db => Assert.False(await db.BookingAssignedGuides.AnyAsync(g=>g.BookingId==f.Booking)));
    }

    [Fact]
    public async Task Inline_routing_cannot_remove_checked_in_guide()
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency");
        var f=await InlineRoutingFixture(app,agency); var url=$"/api/v1/agency/bookings/{f.Booking}/guide-routing";
        await Read<BookingDto>(await agency.PutAsJsonAsync(url,new {locations=new[]{new {locationId=f.First,guideIds=new[]{"inline-guide"}}}}));
        await app.Inspect(async db => {
            (await db.BookingAttractionCheckins.SingleAsync()).AttendanceStatus=AttractionCheckinStatus.CheckedIn; await db.SaveChangesAsync();
        });
        Assert.Equal(HttpStatusCode.Conflict,(await agency.PutAsJsonAsync(url,new {locations=new[]{new {locationId=f.First,guideIds=Array.Empty<string>()}}})).StatusCode);
        await app.Inspect(async db => Assert.Equal(AttractionCheckinStatus.CheckedIn,(await db.BookingAttractionCheckins.SingleAsync()).AttendanceStatus));
    }

    [Theory]
    [InlineData(BookingStatus.Confirmed, 0, false)]
    [InlineData(BookingStatus.Confirmed, -1, false)]
    [InlineData(BookingStatus.Confirmed, -2, true)]
    [InlineData(BookingStatus.Confirmed, 1, true)]
    [InlineData(BookingStatus.Cancelled, 0, true)]
    [InlineData(BookingStatus.Completed, 0, true)]
    [InlineData(BookingStatus.Rejected, 0, true)]
    public async Task Guide_picker_checks_entire_trip_and_ignores_closed_bookings(BookingStatus status,int startOffset,bool expectedAvailable)
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency");
        var f=await InlineRoutingFixture(app,agency);
        await app.Inspect(async db => {
            var target=await db.Bookings.SingleAsync(b=>b.Id==f.Booking);
            db.Bookings.Add(new Booking {BookingCode="AVAILABILITY-CONFLICT",CustomerId="customer",TourId=target.TourId,Status=status,StartDate=target.StartDate.AddDays(startOffset),
                BookingAgencies=[new() {AgencyId="agency",IsHost=true}],AssignedGuides=[new() {GuideId="inline-guide",AgencyId="agency"}]});
            await db.SaveChangesAsync();
        });
        var rows=await Read<AvailableGuideDto[]>(await agency.GetAsync($"/api/v1/agency/bookings/available-guides?bookingId={f.Booking}"));
        var own=Assert.Single(rows);
        Assert.Equal("inline-guide",own.Id); Assert.Equal("/api/v1/files/avatars/inline.jpg",own.Avatar);
        Assert.Equal(expectedAvailable,own.IsAvailable);
        Assert.Equal(expectedAvailable?null:"Trùng lịch với booking khác.",own.UnavailableReason);
    }

    [Fact]
    public async Task Guide_picker_excludes_current_booking_and_rejects_unrelated_agency()
    {
        await using var app=new App(); await app.Initialize(); using var agency=await app.Login("agency"); using var other=await app.Login("other");
        var f=await InlineRoutingFixture(app,agency);
        await Read<BookingDto>(await agency.PutAsJsonAsync($"/api/v1/agency/bookings/{f.Booking}/guide-routing",new {locations=new[]{new {locationId=f.First,guideIds=new[]{"inline-guide"}}}}));
        Assert.True(Assert.Single(await Read<AvailableGuideDto[]>(await agency.GetAsync($"/api/v1/agency/bookings/available-guides?bookingId={f.Booking}"))).IsAvailable);
        Assert.Equal(HttpStatusCode.Forbidden,(await other.GetAsync($"/api/v1/agency/bookings/available-guides?bookingId={f.Booking}")).StatusCode);
    }
}
