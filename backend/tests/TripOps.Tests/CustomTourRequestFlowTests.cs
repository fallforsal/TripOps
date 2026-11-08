using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Customer_request_reaches_only_target_agency_and_supports_multiple_private_plans()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer");
        using var agency = await app.Login("agency");
        using var other = await app.Login("other");
        using var anonymous = app.CreateClient();
        var agencies = await Read<AgencyChoiceDto[]>(await anonymous.GetAsync("/api/v1/tour-design-requests/agencies"));
        Assert.Contains(agencies, a => a.Id == "agency");
        Assert.DoesNotContain(agencies, a => a.Id == "pending");

        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 8, 2000000,
                "4", "Vegetarian meal", "Customer company", "company@example.test", "0900000001")), HttpStatusCode.Created);
        Assert.Equal("pending", request.Status);
        Assert.Equal("Customer company", request.BusinessName);
        Assert.Single(await Read<DesignRequestDto[]>(await agency.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Empty(await Read<DesignRequestDto[]>(await other.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete())).StatusCode);

        var tour = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete("Private itinerary")), HttpStatusCode.Created);
        Assert.True(tour.IsRequest);
        Assert.Equal(request.Id, tour.DesignRequestId);
        Assert.Equal("hidden", tour.Visibility);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await customer.PostAsync($"/api/v1/tour-design-requests/{request.Id}/cancel", null)).StatusCode);
        var alternative = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete("Alternative itinerary")), HttpStatusCode.Created);
        Assert.Equal(HttpStatusCode.NotFound,
            (await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict,
            (await agency.PostAsJsonAsync($"{Root}/{tour.Id}/publish", new TourCommand(tour.Version))).StatusCode);

        var completed = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"{Root}/{tour.Id}/complete", new TourCommand(tour.Version)));
        Assert.Equal("completed", completed.Status);
        Assert.Equal("hidden", completed.Visibility);
        await Read<TourDto>(await agency.PostAsJsonAsync(
            $"{Root}/{alternative.Id}/complete", new TourCommand(alternative.Version)));
        Assert.Single(await Read<TourDto[]>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/plans")));
        var customerTour = await Read<TourDto>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Contains(customerTour.Id, new[] { tour.Id, alternative.Id });
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/v1/tours/{tour.Id}")).StatusCode);
        var customerRequests = await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests"));
        Assert.Equal("designed", Assert.Single(customerRequests).Status);
        Assert.Contains(customerRequests[0].DesignedTourId, new int?[] { tour.Id, alternative.Id });
    }

    [Fact]
    public async Task Invalid_or_cancelled_request_cannot_start_tour()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        var invalid = new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
            DateTime.UtcNow.Date.AddDays(11), DateTime.UtcNow.Date.AddDays(10), 8);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await customer.PostAsJsonAsync("/api/v1/tour-design-requests", invalid)).StatusCode);
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            invalid with { ReturnDate = DateTime.UtcNow.Date.AddDays(12) }), HttpStatusCode.Created);
        var cancelled = await Read<DesignRequestDto>(await customer.PostAsync(
            $"/api/v1/tour-design-requests/{request.Id}/cancel", null));
        Assert.Equal("cancelled", cancelled.Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete())).StatusCode);
    }

    [Fact]
    public async Task Custom_booking_requires_current_customer_accepted_quotation_before_approval()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var other = await app.Login("other");
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 2)), HttpStatusCode.Created);
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete()), HttpStatusCode.Created);
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        var create = new CreateBookingRequest(plan.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000", "customer@example.test", null,
            [new ParticipantInput("One", null, null, null, null, null), new ParticipantInput("Two", null, null, null, null, null)]);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync("/api/v1/bookings", create)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new DesignRequestService.PlanAgreement(plan.Id, plan.Version))).StatusCode);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", create), HttpStatusCode.Created);
        Assert.Equal(HttpStatusCode.Conflict, (await customer.PostAsJsonAsync("/api/v1/bookings", create)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        var initial = Assert.Single(await Read<QuotationView[]>(await agency.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")));
        await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(500000, initial.Costs!.Where(l => l.Source == "AGENCY_SUPPLIER").Select(l => new AgencyCostInput(l.SlotKey, 100000)).ToArray(), "Giá chính thức", SaleTotal: 1500000)));
        var sent = await Read<QuotationView>(await agency.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/send", null));
        Assert.Equal(750000, sent.DepositAmount);
        var visible = Assert.Single(await Read<QuotationView[]>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")));
        Assert.Null(visible.TotalCost); Assert.Null(visible.Costs); Assert.Null(visible.AgencyProfit);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/terms", new QuotationTerms(DateTime.UtcNow.AddDays(5), "Changed"))).StatusCode);
        await Read<QuotationView>(await customer.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/{sent.Version}/accept", null));
        var approved = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        Assert.Equal(1500000, approved.TotalAmount);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")).StatusCode);
    }

    [Fact]
    public async Task Platform_provider_confirms_real_cost_before_agency_can_send_quote()
    {
        await using var app = new App(); await app.Initialize();
        await app.Inspect(async db => {
            var owner = await db.Users.Include(u => u.BusinessProfile).SingleAsync(u => u.Id == "provider");
            owner.Phone = "0900000011";
            owner.BusinessProfile!.BusinessName = "Provider business";
            foreach (var service in await db.Services.Where(s => s.Id == 102 || s.Id == 103).ToListAsync())
                service.FullAddress = $"Address {service.Id}, Da Lat";
            await db.SaveChangesAsync();
        });
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider"); using var other = await app.Login("other");
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 2)), HttpStatusCode.Created);
        var config = Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Meals: [new MealInput("lunch", "Restaurant", ServiceId: 103)],
            Accommodations: [new AccommodationInput("Hotel", "Da Lat", ServiceId: 102)]),
            new TimelineInput(2, "Departure")] };
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", config), HttpStatusCode.Created);
        draft = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new DesignRequestService.PlanAgreement(draft.Id, draft.Version))).StatusCode);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(draft.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000",
                "customer@example.test", null, [new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
        var requests = await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(2, requests.Length);
        Assert.All(requests, row => {
            Assert.Equal("Provider business", row.ProviderName);
            Assert.Equal("provider", row.ProviderId);
            Assert.Equal("0900000011", row.ProviderPhone);
            Assert.Equal($"Address {row.ServiceId}, Da Lat", row.FullAddress);
            Assert.Null(row.RespondedAt);
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await other.PostAsJsonAsync($"/api/v1/provider/booking-requests/{requests[0].Id}/respond",
                new ProviderReply("confirm", 200000, null))).StatusCode);
        foreach (var row in requests)
        {
            var reply = await Read<ProviderRequestView>(await provider.PostAsJsonAsync(
                $"/api/v1/provider/booking-requests/{row.Id}/respond",
                new ProviderReply("confirm", row.ServiceId == 102 ? 300000 : 120000, "Còn chỗ")));
            Assert.Equal("Confirmed", reply.Status);
            Assert.NotNull(reply.RespondedAt);
            Assert.Equal(row.SlotKey, reply.SlotKey);
            Assert.Equal(row.FullAddress, reply.FullAddress);
        }
        var agencyRequests = await Read<ProviderRequestView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/supplier-requests"));
        Assert.Equal(2, agencyRequests.Length);
        Assert.All(agencyRequests, row => {
            Assert.Equal("Confirmed", row.Status);
            Assert.Equal("Còn chỗ", row.Note);
            Assert.NotNull(row.RespondedAt);
            Assert.Equal("Provider business", row.ProviderName);
        });
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/supplier-requests")).StatusCode);
        var current = (await Read<QuotationView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations")))[0];
        Assert.True(current.RequiresCustomerAcceptance);
        Assert.Equal(3, current.Version);
        Assert.Equal(420000, current.TotalCost);
        await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(500000, [], "Provider đã xác nhận")));
        var sent = await Read<QuotationView>(await agency.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/send", null));
        Assert.Equal(920000, sent.SaleTotal);
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync(
            $"/api/v1/provider/booking-requests/{requests[0].Id}/respond",
            new ProviderReply("confirm", 350000, "Giá thay đổi")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/{sent.Version}/accept", null)).StatusCode);
        var repriced = await Read<QuotationView>(await agency.PutAsJsonAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(500000, [], "Provider điều chỉnh giá")));
        Assert.True(repriced.Version > sent.Version);
        sent = await Read<QuotationView>(await agency.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/send", null));
        await Read<QuotationView>(await customer.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/{sent.Version}/accept", null));
        await Read<BookingDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
    }

    [Fact]
    public async Task Provider_sees_hotel_and_restaurant_requests_with_group_details_and_cancelled_bookings_close_them()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider");
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 2)), HttpStatusCode.Created);
        var config = Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Meals: [new MealInput("lunch", "Restaurant", ServiceId: 103)],
            Accommodations: [new AccommodationInput("Hotel", "Da Lat", ServiceId: 102)]),
            new TimelineInput(2, "Departure")] };
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", config), HttpStatusCode.Created);
        draft = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new DesignRequestService.PlanAgreement(draft.Id, draft.Version))).StatusCode);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(draft.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000",
                "customer@example.test", null, [new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);

        var inbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(2, inbox.Length);
        Assert.All(inbox, r => Assert.Equal("Pending", r.Status));
        Assert.All(inbox, r => Assert.Equal(booking.BookingCode, r.BookingCode));
        Assert.All(inbox, r => Assert.Equal(2, r.Guests.Count));
        Assert.Contains(inbox, r => r.SlotKey.StartsWith("hotel:", StringComparison.Ordinal));
        Assert.Contains(inbox, r => r.SlotKey.StartsWith("meal:", StringComparison.Ordinal) && r.MealType == "lunch");

        // Khách hủy đơn khi nhà cung cấp chưa xác nhận: yêu cầu bên Provider cũng hủy theo, không phản hồi được nữa.
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",
            new BookingCancellationRequest("Đổi kế hoạch")));
        inbox = await Read<ProviderInboxView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.All(inbox, r => Assert.Equal("Cancelled", r.Status));
        Assert.All(inbox, r => Assert.Equal("Đổi kế hoạch", r.CancelReason));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await provider.PostAsJsonAsync(
            $"/api/v1/provider/booking-requests/{inbox[0].Id}/respond", new ProviderReply("confirm", 100000, null))).StatusCode);
    }

    [Fact]
    public async Task Rejected_platform_hotel_requires_agency_replacement_and_new_quotation()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider");
        var request = await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
            new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat",
                DateTime.UtcNow.Date.AddDays(10), DateTime.UtcNow.Date.AddDays(11), 2)), HttpStatusCode.Created);
        var config = Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Meals: [new MealInput("lunch", "Agency meal")],
            Accommodations: [new AccommodationInput("Platform hotel", "Da Lat", ServiceId: 102),
                new AccommodationInput("Agency hotel", "Da Lat", IsDefault: false,
                    SupplierSource: "AGENCY_SUPPLIER", Supplier: new SupplierSnapshotInput(Address: "Da Lat", ReferencePrice: 200000))]),
            new TimelineInput(2, "Departure")] };
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", config), HttpStatusCode.Created);
        draft = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        Assert.Equal(HttpStatusCode.NoContent, (await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan", new DesignRequestService.PlanAgreement(draft.Id, draft.Version))).StatusCode);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(draft.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000",
                "customer@example.test", null, [new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
        var providerRequest = Assert.Single(await Read<ProviderRequestView[]>(await provider.GetAsync(
            "/api/v1/provider/booking-requests")));
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync(
            $"/api/v1/provider/booking-requests/{providerRequest.Id}/respond",
            new ProviderReply("reject", null, "Hết phòng")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/send", null)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,
            (await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/change-plan",
                new BookingPlanChange(draft.Id))).StatusCode);
        var replaced = await Read<QuotationView>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/change-plan",
            new BookingPlanChange(draft.Id, [new HotelChoiceInput("Da Lat", "Agency hotel")])));
        Assert.Contains(replaced.Costs!, l => l.Name == "Agency hotel" && l.ReferenceUnitCost == 200000);
        await Read<QuotationView>(await customer.PostAsJsonAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/change-plan",
            new BookingPlanChange(draft.Id, StartDate: DateTime.UtcNow.Date.AddDays(12))));
        var rescheduled = (await Read<QuotationView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations")))[0];
        Assert.Contains(rescheduled.Costs!, l => l.Name == "Agency hotel");
        Assert.DoesNotContain(await Read<ProviderRequestView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/supplier-requests")), r => r.Status == "Pending");
        await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(500000, rescheduled.Costs!.Where(l => l.Source == "AGENCY_SUPPLIER")
                .Select(l => new AgencyCostInput(l.SlotKey, 200000)).ToArray(), "Thay khách sạn")));
        await Read<QuotationView>(await agency.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/send", null));
    }
}
