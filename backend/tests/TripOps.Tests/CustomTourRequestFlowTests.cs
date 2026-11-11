using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;
namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    private static async Task<DesignRequestDto> DesignRequest(HttpClient customer) => await Read<DesignRequestDto>(await customer.PostAsJsonAsync("/api/v1/tour-design-requests",
        new CreateDesignRequestInput("agency", "Customer", "customer@example.test", "0900000000", "Da Lat", DateTime.UtcNow.Date.AddDays(20), DateTime.UtcNow.Date.AddDays(21), 2)), HttpStatusCode.Created);
    private static async Task Receive(HttpClient agency, int id) => _ = await Read<DesignRequestDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{id}/action", new DesignRequestAction("review")));
    private static async Task<TourDto> Share(HttpClient agency, int id, TourDto plan) => await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{id}/share", new ShareDesignVersionInput(plan.Revision,plan.Version)));
    private static async Task<(DesignRequestDto Request, TourDto Plan)> SharedDesign(HttpClient customer, HttpClient agency, TourConfiguration? config = null)
    {
        var request = await DesignRequest(customer); await Receive(agency,request.Id);
        var draft = await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours", config ?? Complete()),HttpStatusCode.Created);
        var plan = await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{draft.Id}/complete",new TourCommand(draft.Revision)));
        return (request,await Share(agency,request.Id,plan));
    }
    private static CreateBookingRequest DesignBooking(TourDto plan) => new(plan.Id,DateTime.UtcNow.Date.AddDays(20),"Customer","0900000000","customer@example.test",null,
        [new ParticipantInput("One",null,null,null,null,null),new ParticipantInput("Two",null,null,null,null,null)],TourVersion:plan.Version,TourRevision:plan.Revision);

    [Fact]
    public async Task Design_decision_requires_reason_and_only_target_agency_can_receive()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");using var other=await app.Login("other");
        var request=await DesignRequest(customer);var url=$"/api/v1/agency/tour-design-requests/{request.Id}/action";
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync(url,new DesignRequestAction("review"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await other.PostAsJsonAsync(url,new DesignRequestAction("review"))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(url,new DesignRequestAction("reject"," "))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours",Complete())).StatusCode);
        var rejected=await Read<DesignRequestDto>(await agency.PostAsJsonAsync(url,new DesignRequestAction("reject","Không đủ nhân sự")));
        Assert.Equal("rejected",rejected.Status);Assert.Equal("Không đủ nhân sự",rejected.RejectionReason);Assert.NotNull(rejected.RespondedAt);
        Assert.Equal(rejected.RejectionReason,Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests"))).RejectionReason);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(url,new DesignRequestAction("review"))).StatusCode);
    }
    [Fact]
    public async Task Design_save_and_share_are_separate_and_one_request_has_one_tour()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");using var other=await app.Login("other");
        var request=await DesignRequest(customer);await Receive(agency,request.Id);
        var draft=await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours",Complete()),HttpStatusCode.Created);
        Assert.Empty(await Read<TourDto[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/plans")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tours",Complete())).StatusCode);
        var complete=draft;
        Assert.Empty(await Read<TourDto[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/plans")));
        Assert.Equal(HttpStatusCode.NotFound,(await other.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/share",new TourCommand(complete.Revision))).StatusCode);
        var shared=await Share(agency,request.Id,complete);Assert.Equal(shared.Version,shared.SharedVersion);
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));Assert.Equal(shared.Version,visible.Version);
        var notificationCount=0;await app.Inspect(async db=>notificationCount=await db.WorkflowNotifications.CountAsync());
        await Share(agency,request.Id,shared);await app.Inspect(async db=>Assert.Equal(notificationCount,await db.WorkflowNotifications.CountAsync()));
    }
    [Theory]
    [InlineData(false)] [InlineData(true)]
    public async Task Design_customer_books_shared_snapshot_while_agency_has_unshared_changes(bool completeAgain)
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");
        var (request,plan)=await SharedDesign(customer,agency);
        var edited=await Read<TourDto>(await agency.PutAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/tour",new SaveDesignTourInput(plan.Revision,plan.Configuration with {Name="Not shared",BasePrice=9000000},CreateNewVersion:true,Version:plan.Version)));
        if(completeAgain)await Read<TourDto>(await agency.PostAsJsonAsync($"{Root}/{plan.Id}/complete",new TourCommand(edited.Revision)));
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));Assert.Equal(plan.Configuration.Name,visible.Configuration.Name);Assert.Equal(plan.Version,visible.Version);
        Assert.Equal(HttpStatusCode.NotFound,(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/history")).StatusCode);
        var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible)),HttpStatusCode.Created);
        Assert.Equal(plan.Configuration.BasePrice*2,booking.TotalAmount);
        await app.Inspect(async db=>Assert.Equal(plan.Version,(await db.Bookings.SingleAsync(b=>b.Id==booking.Id)).TourVersion));
        var approved=await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision",new BookingDecisionRequest("approve",null)));
        Assert.Equal("Confirmed",approved.Status);Assert.Equal(booking.TotalAmount,approved.Contract!.TotalAmount);Assert.NotEmpty(approved.PaymentSchedule!);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible))).StatusCode);
    }
    [Fact]
    public async Task Design_shares_any_existing_plan_without_restore_and_booking_freezes_selected_version()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");
        var(request,plan)=await SharedDesign(customer,agency);
        var url=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var next=await Read<TourDto>(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(plan.Revision,plan.Configuration with {BasePrice=4000000},CreateNewVersion:true,Version:1)));
        next=await Share(agency,request.Id,next);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(plan))).StatusCode);
        var reshared=await Read<TourDto>(await agency.PostAsJsonAsync(url+"/share",new ShareDesignVersionInput(next.Revision,1)));
        Assert.Equal(1,reshared.Version);Assert.Equal(1,reshared.SharedVersion);
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Equal(plan.Configuration.BasePrice,visible.Configuration.BasePrice);Assert.Equal(1,visible.Version);
        Assert.Equal(2,(await Read<DesignRequestService.PlanHistory[]>(await agency.GetAsync(url+"/history"))).Length);
        Assert.Equal(HttpStatusCode.NotFound,(await agency.PostAsJsonAsync($"{Root}/{plan.Id}/versions/1/restore",new TourCommand(reshared.Revision))).StatusCode);
        var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible)),HttpStatusCode.Created);
        Assert.Equal(plan.Configuration.BasePrice*2,booking.TotalAmount);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PutAsJsonAsync(url+"/tour",new SaveDesignTourInput(reshared.Revision,Complete("Cannot change booked plan"),Version:1))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync(url+"/share",new ShareDesignVersionInput(reshared.Revision,2))).StatusCode);
        await app.Inspect(async db=> {
            var row=await db.Bookings.SingleAsync(x=>x.Id==booking.Id);
            Assert.Equal(1,row.TourVersion);
            var frozen=await BookingAlliance.BookedConfiguration(db,row,CancellationToken.None);
            Assert.Equal(plan.Configuration.BasePrice,frozen!.BasePrice);
        });
    }
    [Fact]
    public async Task Design_clone_copies_owned_tour_without_mutating_source_or_allowing_second_plan()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");using var other=await app.Login("other");
        var source=await Create(agency);var request=await DesignRequest(customer);await Receive(agency,request.Id);
        Assert.Equal(HttpStatusCode.NotFound,(await other.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/clone",new DesignCloneInput(source.Id))).StatusCode);
        var clone=await Read<TourDto>(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/clone",new DesignCloneInput(source.Id)),HttpStatusCode.Created);
        Assert.NotEqual(source.Id,clone.Id);Assert.True(clone.IsRequest);Assert.Equal(request.Id,clone.DesignRequestId);Assert.Null(clone.SharedVersion);
        await Read<TourDto>(await agency.PutAsJsonAsync($"{Root}/{clone.Id}",new UpdateTourRequest(clone.Revision,clone.Configuration with {Name="Private clone"},"Edited clone")));
        Assert.Equal(source.Configuration.Name,(await Read<TourDto>(await agency.GetAsync($"{Root}/{source.Id}"))).Configuration.Name);
        await app.Inspect(async db=>Assert.Equal(source.Id,(await db.Tours.SingleAsync(t=>t.Id==clone.Id)).ClonedFromTourId));
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await agency.PostAsJsonAsync($"/api/v1/agency/tour-design-requests/{request.Id}/clone",new DesignCloneInput(source.Id))).StatusCode);
    }
    [Fact]
    public async Task Design_chat_uses_existing_tables_and_is_scoped_to_owned_request()
    {
        await using var app=new App();await app.Initialize();using var customer=await app.Login("customer");using var agency=await app.Login("agency");using var other=await app.Login("other");
        var request=await DesignRequest(customer);var second=await DesignRequest(customer);
        var url=$"/api/v1/tour-design-requests/{request.Id}/messages";var agencyUrl=$"/api/v1/agency/tour-design-requests/{request.Id}/messages";
        Assert.Equal(HttpStatusCode.NoContent,(await customer.PostAsJsonAsync(url,new {message="Xin dùng lại phiên bản 2"})).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await agency.PostAsJsonAsync(agencyUrl,new {message="Agency sẽ điều chỉnh và chia sẻ lại"})).StatusCode);
        Assert.Equal(2,(await Read<DesignRequestService.RequestMessage[]>(await customer.GetAsync(url))).Length);
        Assert.Empty(await Read<DesignRequestService.RequestMessage[]>(await customer.GetAsync($"/api/v1/tour-design-requests/{second.Id}/messages")));
        Assert.Equal(HttpStatusCode.NotFound,(await other.GetAsync(agencyUrl)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await customer.PostAsJsonAsync(url,new {message=" "})).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await customer.PostAsJsonAsync(url,new {message=new string('x',2001)})).StatusCode);
        await app.Inspect(async db=> { Assert.Single(await db.ChatConversations.ToListAsync());Assert.Equal(2,await db.ChatMessages.CountAsync(m=>m.DesignRequestId==request.Id));
            Assert.DoesNotContain(db.Model.GetEntityTypes(),t=>t.GetTableName() is "tour_plan_proposals"); });
        Assert.Equal(HttpStatusCode.NotFound,(await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/agree-plan",new {tourId=1,version=1})).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/proposals")).StatusCode);
    }
    [Fact]
    public async Task Rejected_platform_hotel_can_be_replaced_with_agency_supplier_before_approval()
    {
        await using var app = new App(); await app.Initialize();
        using var customer = await app.Login("customer"); using var agency = await app.Login("agency");
        using var provider = await app.Login("provider");
        var config = Complete() with { Timelines = [new TimelineInput(1, "Arrival",
            Activities: [new ActivityInput("Visit", EstimatedTime: TimeSpan.FromHours(9))],
            Accommodations: [new AccommodationInput("Platform hotel", "Da Lat", ServiceId: 102)]), new TimelineInput(2, "Departure")] };
        var (_, plan) = await SharedDesign(customer, agency, config);
        var booking = await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings", DesignBooking(plan)), HttpStatusCode.Created);
        var providerRequest = Assert.Single(await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests")));
        await Read<ProviderRequestView>(await provider.PostAsJsonAsync($"/api/v1/provider/booking-requests/{providerRequest.Id}/respond",
            new ProviderReply("reject", null, "Hết phòng")));
        var changed = await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/service-changes",
            new BookingServiceChange("hotel", booking.SnapshotHotels!.Single().Id, "Đổi sang khách sạn riêng đã xác nhận", booking.TotalAmount,
                Name: "Agency hotel", Supplier: new SupplierSnapshotInput("Private address", ContactPhone: "0900000000"))));
        Assert.Equal("Agency hotel", changed.SnapshotHotels!.Single().Name);
        Assert.DoesNotContain(await Read<ProviderRequestView[]>(await provider.GetAsync("/api/v1/provider/booking-requests")), r => r.Status == "Pending");
        await Read<BookingDto>(await agency.PostAsJsonAsync($"/api/v1/agency/bookings/{booking.Id}/decision", new BookingDecisionRequest("approve", null)));
    }
}
