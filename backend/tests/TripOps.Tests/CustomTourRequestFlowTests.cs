using System.Net;
using System.Net.Http.Json;
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
        Assert.Equal(2, (await Read<TourDto[]>(await customer.GetAsync(
            $"/api/v1/tour-design-requests/{request.Id}/plans"))).Length);
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
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete()), HttpStatusCode.Created);
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        var alternative = await Read<TourDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/tour-design-requests/{request.Id}/tours", Complete("Alternative")), HttpStatusCode.Created);
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{alternative.Id}/complete", new TourCommand(alternative.Version)));
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(draft.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000",
                "customer@example.test", null, [new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        var initial = Assert.Single(await Read<QuotationView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations")));
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")).StatusCode);
        Assert.Equal("Draft", initial.Status);
        Assert.Empty(await Read<QuotationView[]>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}/quotations")));
        var priced = await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(500000, initial.Costs!.Where(l => l.Source == "AGENCY_SUPPLIER")
                .Select(l => new AgencyCostInput(l.SlotKey, 100000)).ToArray(), "Giá thực tế")));
        Assert.True(priced.SaleTotal >= 500000);
        var sent = await Read<QuotationView>(await agency.PostAsync($"/api/v1/bookings/{booking.Id}/quotations/send", null));
        Assert.Equal("Sent", sent.Status);
        Assert.Null(Assert.Single(await Read<QuotationView[]>(await customer.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations"))).TotalCost);
        var changed = await Read<QuotationView>(await customer.PostAsJsonAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/change-plan",
            new BookingPlanChange(alternative.Id, SpecialRequests: "Cần thêm điểm dừng",
                StartDate: DateTime.UtcNow.Date.AddDays(12), Participants: [
                    new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null),
                    new ParticipantInput("Three", null, null, null, null, null)])));
        Assert.Equal(3, changed.Version);
        var changedBooking = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"));
        Assert.Equal(3, changedBooking.TotalGuests);
        Assert.Equal(DateTime.UtcNow.Date.AddDays(12), changedBooking.StartDate.Date);
        Assert.Equal("Cần thêm điểm dừng", changedBooking.SpecialRequests);
        Assert.Contains(changedBooking.SnapshotDays!.SelectMany(d => d.Locations), l => l.Name == "Gardens");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await customer.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/{sent.Version}/accept", null)).StatusCode);
        await Read<QuotationView>(await agency.PutAsJsonAsync($"/api/v1/bookings/{booking.Id}/quotations/draft",
            new AgencyQuotationInput(400000, (await Read<QuotationView[]>(await agency.GetAsync(
                $"/api/v1/bookings/{booking.Id}/quotations")))[0].Costs!.Where(l => l.Source == "AGENCY_SUPPLIER")
                .Select(l => new AgencyCostInput(l.SlotKey, 110000)).ToArray(), "Đổi plan",
                [new ExtraCostInput("Xe riêng", 1, "chuyến", 90000)])));
        var revised = await Read<QuotationView>(await agency.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/send", null));
        Assert.Contains(revised.Costs!, l => l.Name == "Xe riêng" && l.Total == 90000);
        await Read<QuotationView>(await customer.PostAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/{revised.Version}/accept", null));
        var acceptedBooking = await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"));
        Assert.Equal(revised.SaleTotal, acceptedBooking.TotalAmount);
        Assert.Equal(revised.SaleTotal, acceptedBooking.Participants.Sum(p => p.Price));
        await Read<BookingDto>(await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
        var afterApproval = await Read<QuotationView>(await customer.PostAsJsonAsync(
            $"/api/v1/bookings/{booking.Id}/quotations/change-plan", new BookingPlanChange(draft.Id)));
        Assert.True(afterApproval.Version > revised.Version);
        Assert.Equal("Pending", (await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{booking.Id}"))).Status);
        await app.Inspect(db => {
            Assert.All(db.PaymentRequests.Where(p => p.BookingId == booking.Id).ToList(),
                p => Assert.Equal(TripOps.Data.Enums.PaymentRequestStatus.Cancelled, p.Status));
            Assert.All(db.BookingContracts.Where(c => c.BookingId == booking.Id).ToList(),
                c => Assert.Equal("Superseded", c.Status));
            return Task.CompletedTask;
        });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
    }

    [Fact]
    public async Task Platform_provider_confirms_real_cost_before_agency_can_send_quote()
    {
        await using var app = new App(); await app.Initialize();
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
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",
            new CreateBookingRequest(draft.Id, DateTime.UtcNow.Date.AddDays(10), "Customer", "0900000000",
                "customer@example.test", null, [new ParticipantInput("One", null, null, null, null, null),
                    new ParticipantInput("Two", null, null, null, null, null)])), HttpStatusCode.Created);
        var requests = await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests"));
        Assert.Equal(2, requests.Length);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await agency.PostAsJsonAsync(
            $"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await other.PostAsJsonAsync($"/api/v1/provider/booking-requests/{requests[0].Id}/respond",
                new ProviderReply("confirm", 200000, null))).StatusCode);
        foreach (var row in requests)
            await Read<ProviderRequestView>(await provider.PostAsJsonAsync(
                $"/api/v1/provider/booking-requests/{row.Id}/respond",
                new ProviderReply("confirm", row.ServiceId == 102 ? 300000 : 120000, "Còn chỗ")));
        var current = (await Read<QuotationView[]>(await agency.GetAsync(
            $"/api/v1/bookings/{booking.Id}/quotations")))[0];
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
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
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
        await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete", new TourCommand(draft.Version)));
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
