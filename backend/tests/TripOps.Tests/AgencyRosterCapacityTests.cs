using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Agency_roster_can_exceed_tour_capacity_and_remove_every_guest(bool approved)
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var agency=await app.Login("agency");
        var booking=await PublishedBookingWithProviderServices(customer,agency);
        await app.Inspect(async db=>{
            var tour=await db.Tours.SingleAsync(t=>t.Id==booking.TourId);
            tour.MinGuests=2;tour.MaxGuests=2;await db.SaveChangesAsync();
        });
        var url=$"/api/v1/agency/bookings/{booking.Id}";
        if(approved) booking=await Read<BookingDto>(await agency.PostAsJsonAsync(url+"/decision",new BookingDecisionRequest("approve",null)));
        var baseAmount=booking.TotalAmount;
        booking=await Read<BookingDto>(await agency.PostAsJsonAsync(url+"/participants",new AgencyParticipantInput(
            "Guest beyond tour capacity",new DateTime(1990,1,1),"Nam",null,null,null,null,123456,"Khách bổ sung theo thỏa thuận",booking.TotalAmount,Guid.NewGuid())));
        Assert.Equal(3,booking.TotalGuests);
        Assert.Equal(baseAmount+123456,booking.TotalAmount);
        Assert.Equal(booking.TotalAmount,booking.BookingAgencies!.Sum(a=>a.FinalAmount));
        if(approved) Assert.Equal("agency",Assert.Single(booking.PaymentSchedule!,p=>p.Stage=="surcharge").BeneficiaryAgencyId);
        foreach(var index in booking.Participants.Select(p=>p.ParticipantIndex!.Value).Distinct().ToArray())
            booking=await Read<BookingDto>(await agency.PutAsJsonAsync(url+$"/participants/{index}/stages",
                new ParticipantStagesInput([],"Khách yêu cầu rút khỏi đoàn",booking.TotalAmount,Guid.NewGuid())));
        Assert.Equal(0,booking.TotalGuests);
        Assert.All(booking.Participants,p=>Assert.Equal("INACTIVE",p.Status));
        if(approved) { Assert.Equal(baseAmount,booking.BaseTourAmount);Assert.Equal(baseAmount+123456,booking.TotalAmount); }
        else Assert.Equal(0,booking.TotalAmount);
        Assert.Equal(booking.TotalAmount,booking.BookingAgencies!.Sum(a=>a.FinalAmount));
    }
}
