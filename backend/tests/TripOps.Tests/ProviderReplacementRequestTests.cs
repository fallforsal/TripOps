using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Replacing_rejected_hotel_creates_separate_request_and_notification(bool differentProvider)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider");
        var booking = await PublishedBookingWithProviderServices(customer, agency);
        var before = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        var old = Assert.Single(before, r => r.SlotKey.StartsWith("hotel:"));
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{old.Id}/respond",
            new ProviderReply("reject", null, "No rooms available")));
        await app.Inspect(async db => {
            if (differentProvider) {
                var user = new User { Id = "replacement-provider", Name = "Replacement Provider", Email = "replacement-provider@example.test",
                    Role = UserRole.Provider, Status = UserStatus.Active };
                user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "TourTest123!");
                user.BusinessProfile = new BusinessProfile { UserId = user.Id, BusinessName = user.Name, Status = BusinessProfileStatus.Approved };
                db.Users.Add(user);
            }
            db.Services.Add(new Data.Entities.Service { Id = 202, ProviderId = differentProvider ? "replacement-provider" : "provider",
                Name = "Replacement hotel", Category = ServiceCategory.Hotel, Status = ServiceStatus.Approved, PriceUnit = "person_night", Price = 100000 });
            await db.SaveChangesAsync();
        });
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/service-changes",
            new BookingServiceChange("hotel", booking.SnapshotHotels!.Single().Id, "Customer agreed replacement", booking.TotalAmount, ServiceId: 202)));
        using var recipient = await app.Login(differentProvider ? "replacement-provider" : "provider");
        var inbox = await Read<ProviderInboxView[]>(await recipient.GetAsync("/api/v1/provider/booking-requests"));
        var fresh = Assert.Single(inbox, r => r.ServiceId == 202);
        Assert.NotEqual(old.Id, fresh.Id); Assert.Equal("Pending", fresh.Status);
        Assert.Null(fresh.Note); Assert.Null(fresh.QuotedCost); Assert.Null(fresh.RespondedAt);
        Assert.Equal(old.ServiceDateFrom, fresh.ServiceDateFrom); Assert.Equal(old.ServiceDateTo, fresh.ServiceDateTo);
        var history = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        var replaced = Assert.Single(history, r => r.Id == old.Id);
        Assert.Equal("Rejected", replaced.Status); Assert.Null(replaced.CancelReason);
        Assert.Equal("No rooms available", replaced.Note);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{old.Id}/respond",
            new ProviderReply("confirm", 500000, "Cannot confirm superseded request"))).StatusCode);
        if (differentProvider) Assert.DoesNotContain(history, r => r.Id == fresh.Id);
        await app.Inspect(async db => {
            Assert.Contains(await db.WorkflowNotifications.Where(n => n.BookingId == booking.Id && n.UserId == fresh.ProviderId).ToListAsync(),
                n => n.Message.Contains("Replacement hotel") && n.Message.Contains("Yêu cầu dịch vụ mới"));
            Assert.Equal(3, await db.BookingSupplierRequests.CountAsync(r => r.BookingId == booking.Id));
        });
    }
}
