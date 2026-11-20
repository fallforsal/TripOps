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
    [InlineData("hotel", 202, false)]
    [InlineData("meal", 203, false)]
    [InlineData("hotel", 202, true)]
    public async Task Supplementary_guests_preserve_original_confirmation_and_replacement_only_serves_new_guests(string kind, int serviceId, bool legacyLink)
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider"); using var other = await app.Login("other");
        var b = await PublishedBookingWithProviderServices(customer, agency);
        var original = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        foreach (var r in original)
            await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{r.Id}/respond", new ProviderReply("confirm", 1000000, "Original group confirmed")));
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/decision", new BookingDecisionRequest("approve", null)));
        var baseAmount = b.BaseTourAmount; var contractId = b.Contract?.Id;
        var schedule = b.PaymentSchedule!.Where(p => p.Stage != "surcharge").Select(p => (p.Id, p.Amount)).ToArray();
        var input = new AgencyParticipantInput("Extra guest", new DateTime(2000, 1, 1), "Nam", null, "Ở cùng đoàn", "Ăn chay", null,
            100000, "Bổ sung khách theo yêu cầu", b.TotalAmount, Guid.NewGuid(), PhoneNumber: "0901234567");
        b = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/participants", input));
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{b.Id}/participants", input));
        var inbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(4, inbox.Length);
        foreach (var r in inbox.Where(r => !r.ParentRequestId.HasValue)) {
            Assert.Equal("Confirmed", r.Status); Assert.Equal(1000000, r.QuotedCost); Assert.Equal(2, r.Guests.Count);
            Assert.DoesNotContain(r.Guests, g => g.FullName == "Extra guest"); Assert.Equal("Original group confirmed", r.Note);
        }
        foreach (var r in inbox.Where(r => r.ParentRequestId.HasValue)) {
            Assert.Equal("Pending", r.Status); Assert.Null(r.QuotedCost); Assert.Null(r.RespondedAt);
            Assert.Equal("Extra guest", Assert.Single(r.Guests).FullName); Assert.Equal("0901234567", r.Guests[0].PhoneNumber);
        }
        Assert.Equal("Confirmed", b.Status); Assert.Equal(baseAmount, b.BaseTourAmount); Assert.Equal(contractId, b.Contract?.Id);
        Assert.Equal(schedule, b.PaymentSchedule!.Where(p => p.Stage != "surcharge").Select(p => (p.Id, p.Amount)).ToArray());
        await app.Inspect(async db => {
            Assert.Equal(2, await db.WorkflowNotifications.CountAsync(n => n.BookingId == b.Id && n.UserId == "provider" && n.Message.Contains("đề nghị bổ sung")));
            var user = new User { Id = "supplement-provider", Name = "Extra Provider", Email = "supplement-provider@example.test", Role = UserRole.Provider, Status = UserStatus.Active };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, "TourTest123!");
            user.BusinessProfile = new BusinessProfile { UserId = user.Id, BusinessName = user.Name, Status = BusinessProfileStatus.Approved };
            db.Users.Add(user);
            db.Services.Add(new Data.Entities.Service { Id = serviceId, ProviderId = user.Id, Name = "Extra service", Category = kind == "hotel" ? ServiceCategory.Hotel : ServiceCategory.Fnb,
                Status = ServiceStatus.Approved, PriceUnit = kind == "hotel" ? "person_night" : "meal", Price = 100000 });
            await db.SaveChangesAsync();
        });
        var extra = inbox.Single(r => r.ParentRequestId.HasValue && r.SlotKey.StartsWith(kind + ":"));
        var endpoint = $"/api/v1/bookings/{b.Id}/quotations/supplier-requests/{extra.Id}/replace-supplement";
        var replacement = new SupplementReplacementInput(serviceId, "Provider không nhận thêm khách");
        Assert.Equal(HttpStatusCode.Forbidden, (await customer.PostAsJsonAsync(endpoint, replacement)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.PostAsJsonAsync(endpoint, replacement)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(endpoint, replacement)).StatusCode);
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{extra.Id}/respond", new ProviderReply("reject", null, "Hết chỗ cho khách bổ sung")));
        var fresh = await Read<ProviderRequestView>(await agency.PostAsJsonAsync(endpoint, replacement));
        Assert.NotEqual(extra.Id, fresh.Id); Assert.Equal(extra.Id, fresh.ParentRequestId); Assert.False(fresh.IsSupplement); Assert.Equal("Pending", fresh.Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(endpoint, replacement)).StatusCode);
        if (legacyLink) await app.Inspect(async db => {
            (await db.BookingSupplierRequests.SingleAsync(r=>r.Id==fresh.Id)).ParentRequestId=extra.ParentRequestId;
            await db.SaveChangesAsync();
        });
        using var recipient = await app.Login("supplement-provider");
        var received = Assert.Single(await Read<ProviderInboxView[]>(await recipient.GetAsync("/api/v1/provider/booking-requests")));
        Assert.Equal("Extra guest", Assert.Single(received.Guests).FullName); Assert.False(received.IsSupplement);
        Assert.Equal(extra.ServiceDateFrom, received.ServiceDateFrom); Assert.Equal(extra.ServiceDateTo, received.ServiceDateTo);
        await Read<ProviderRequestView>(await recipient.PostAsJsonAsync($"/api/v1/provider/booking-requests/{fresh.Id}/respond", new ProviderReply("confirm", 200000, "Nhận khách bổ sung")));
        var oldInbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal("Confirmed", oldInbox.Single(r => r.Id == extra.ParentRequestId).Status);
        Assert.Equal("Rejected", oldInbox.Single(r => r.Id == extra.Id).Status);
        Assert.Equal("Hết chỗ cho khách bổ sung", oldInbox.Single(r => r.Id == extra.Id).Note);
        Assert.DoesNotContain(oldInbox, r => r.Id == fresh.Id);
        var reloaded = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
        Assert.Equal("Confirmed", reloaded.Status); Assert.Equal(b.TotalAmount, reloaded.TotalAmount);
        Assert.Equal("Hotel", reloaded.SnapshotHotels!.Single().Name);
        var costs = await Read<QuotationView[]>(await agency.GetAsync($"/api/v1/bookings/{b.Id}/quotations"));
        Assert.Equal(1000000, costs[0].Costs!.Single(l => l.SlotKey == extra.SlotKey).Total);
        Assert.Equal(200000, costs[0].Costs!.Single(l => l.SlotKey == "supplement:" + fresh.Id).Total);
        await app.Inspect(async db => Assert.Contains(await db.WorkflowNotifications.Where(n => n.UserId == "supplement-provider").ToListAsync(), n => n.BookingId == b.Id && n.Message.Contains("yêu cầu dịch vụ mới")));
    }
    [Theory]
    [InlineData("HOTEL", "hotel:")]
    [InlineData("RESTAURANT", "meal:")]
    public async Task Supplement_can_use_own_directory_without_notifying_provider_or_changing_original(string type,string slot)
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var agency=await app.Login("agency");using var provider=await app.Login("provider");
        var booking=await PublishedBookingWithProviderServices(customer,agency);
        var original=await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        foreach(var r in original) await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{r.Id}/respond",new ProviderReply("confirm",1000000,"Confirmed")));
        booking=await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",new BookingDecisionRequest("approve",null)));
        booking=await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/participants",new AgencyParticipantInput("Extra",new DateTime(2000,1,1),"Nam",null,null,null,null,100000,"Add extra guest",booking.TotalAmount,Guid.NewGuid())));
        var extra=(await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"))).Single(r=>r.ParentRequestId.HasValue&&r.SlotKey.StartsWith(slot));
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{extra.Id}/respond",new ProviderReply("reject",null,"No capacity")));
        await app.Inspect(async db=>{
            db.AgencySuppliers.Add(new AgencySupplier{Id=800,AgencyId="agency",SupplierType=type,Name="Private supplier",ReferencePrice=120000,Address="Private address",ContactPhone="0901234567"});
            db.AgencySuppliers.Add(new AgencySupplier{Id=801,AgencyId="other",SupplierType=type,Name="Other agency supplier"});
            db.AgencySuppliers.Add(new AgencySupplier{Id=802,AgencyId="agency",SupplierType=type,Name="Archived",Status=AgencySupplier.Archived});
            await db.SaveChangesAsync();
        });
        var endpoint=$"/api/v1/bookings/{booking.Id}/quotations/supplier-requests/{extra.Id}/replace-supplement";
        foreach(var id in new[]{801,802}) Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(endpoint,new SupplementReplacementInput(null,"Need another supplier",id))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(endpoint,new SupplementReplacementInput(extra.ServiceId,"Cannot choose both",800))).StatusCode);
        var arranged=await Read<ProviderRequestView>(await agency.PostAsJsonAsync(endpoint,new SupplementReplacementInput(null,"Provider cannot take extra",800)));
        Assert.Equal("External",arranged.Status);Assert.Equal(800,arranged.AgencySupplierId);Assert.Null(arranged.ProviderId);Assert.Null(arranged.ServiceId);
        Assert.Equal("Private address",arranged.FullAddress);Assert.Equal("0901234567",arranged.ProviderPhone);Assert.Equal("Private supplier",arranged.ServiceName);
        var providerInbox=await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.DoesNotContain(providerInbox,r=>r.Id==arranged.Id);Assert.Equal("Rejected",providerInbox.Single(r=>r.Id==extra.Id).Status);
        Assert.All(providerInbox.Where(r=>!r.ParentRequestId.HasValue),r=>Assert.Equal("Confirmed",r.Status));
        var details=await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"));
        Assert.Equal(booking.TotalAmount,details.TotalAmount);Assert.Equal("Confirmed",details.Status);
        var rows=await Read<ProviderRequestView[]>(await agency.GetAsync($"/api/v1/bookings/{booking.Id}/quotations/supplier-requests"));
        Assert.Contains(rows,r=>r.Id==arranged.Id&&r.Status=="External");
    }

}
