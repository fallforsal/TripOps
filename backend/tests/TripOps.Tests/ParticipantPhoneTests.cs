using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Participant_phone_persists_through_booking_alliance_copy_edit_and_clear()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider"); using var other = await app.Login("other");
        var booking = await PublishedBookingWithProviderServices(customer, agency, "0901234567");
        var person = Assert.Single(booking.Participants, p => p.FullName == "One");
        Assert.Equal("0901234567", person.PhoneNumber);
        Assert.DoesNotContain("Điện thoại:", person.Note ?? "");
        Assert.Null(Assert.Single(booking.Participants, p => p.FullName == "Two").PhoneNumber);
        await app.Inspect(async db => {
            var original = await db.BookingParticipants.SingleAsync(p => p.Id == person.Id);
            Assert.Equal("0901234567", original.PhoneNumber);
            db.BookingAgencies.Add(new BookingAgency { BookingId=booking.Id, AgencyId="other", IsHost=false });
            var copy = BookingAlliance.Copy(original, "other", original.Price, false);
            copy.BookingId=booking.Id;
            db.BookingParticipants.Add(copy); await db.SaveChangesAsync();
            Assert.Equal(original.PhoneNumber, copy.PhoneNumber);
        });
        var url = $"/api/v1/bookings/{booking.Id}/participants";
        object Body(string? phone) => new { participants = new[] { new {
            id=person.Id, fullName=person.FullName, dateOfBirth=person.DateOfBirth,
            gender=person.Gender, identityNumber=person.IdentityNumber, note="Ăn chay", phoneNumber=phone
        } } };
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PutAsJsonAsync(url, Body("0912345678"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PutAsJsonAsync(url, Body("0912345678"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PutAsJsonAsync(url, Body("not a phone"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await agency.PutAsJsonAsync(url, Body(new string('1',31)))).StatusCode);
        booking = await Read<BookingDto>(await agency.PutAsJsonAsync(url, Body("+84 912 345 678")));
        Assert.All(booking.Participants.Where(p => p.ParticipantIndex == person.ParticipantIndex), p => Assert.Equal("+84 912 345 678", p.PhoneNumber));
        var inbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.All(inbox, request => Assert.Equal("+84 912 345 678", Assert.Single(request.Guests, g => g.FullName == "One").PhoneNumber));
        var reloaded = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"));
        Assert.All(reloaded.Participants.Where(p=>p.ParticipantIndex==person.ParticipantIndex), p=>Assert.Equal("+84 912 345 678",p.PhoneNumber));
        booking = await Read<BookingDto>(await agency.PutAsJsonAsync(url, Body(null)));
        Assert.All(booking.Participants.Where(p => p.ParticipantIndex == person.ParticipantIndex), p => Assert.Null(p.PhoneNumber));
    }
}
