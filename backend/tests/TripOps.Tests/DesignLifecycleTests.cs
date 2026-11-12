using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;
namespace TripOps.Tests;
public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Design_archive_is_personal_and_does_not_stop_customer_booking()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var other=await app.Login("other");
        var(request,plan)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        Assert.Equal(HttpStatusCode.NotFound,(await other.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("archive"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("archive"))).StatusCode);
        var agencyRow=Assert.Single(await Read<DesignRequestDto[]>(await lead.GetAsync("/api/v1/agency/tour-design-requests")));
        Assert.NotNull(agencyRow.ArchivedAt);Assert.Equal("designed",agencyRow.Status);
        var customerRow=Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests")));
        Assert.Null(customerRow.ArchivedAt);Assert.Equal("designed",customerRow.Status);
        var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(plan)),HttpStatusCode.Created);
        customerRow=Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests")));
        Assert.Equal("booked",customerRow.Status);Assert.Equal(booking.Id,customerRow.BookingId);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("unarchive"))).StatusCode);
    }
    [Fact]
    public async Task Design_close_keeps_plan_readable_blocks_edits_and_booking_and_reopen_invalidates_old_revision()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var(request,plan)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("close"," "))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("close",new string('x',2001)))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await customer.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("close","test"))).StatusCode);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("close","test"))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("close"," Khách chưa có kế hoạch tiếp tục "))).StatusCode);
        var row=Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests")));
        Assert.Equal("closed",row.Status);Assert.Equal("Khách chưa có kế hoạch tiếp tục",row.CloseReason);Assert.NotNull(row.ClosedAt);
        var visible=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        Assert.Equal(1,visible.Version);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(visible.Revision,Complete()))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await customer.PostAsJsonAsync($"/api/v1/tour-design-requests/{request.Id}/messages",new {message="hello"})).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("reopen"))).StatusCode);
        row=Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests")));
        Assert.Equal("designed",row.Status);Assert.Null(row.CloseReason);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(visible))).StatusCode);
    }
    [Fact]
    public async Task Design_booked_request_is_frozen_and_cancelled_booking_requires_explicit_reopen()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");
        var(request,plan)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var booking=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(plan)),HttpStatusCode.Created);
        foreach(var action in new[]{"close","reopen"})Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput(action,"test"))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(plan.Revision,Complete(),CreateNewVersion:true))).StatusCode);
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{booking.Id}/cancel",new BookingCancellationRequest("Đổi ngày đi")));
        var row=Assert.Single(await Read<DesignRequestDto[]>(await customer.GetAsync("/api/v1/tour-design-requests")));
        Assert.Equal("closed",row.Status);Assert.Null(row.BookingId);Assert.Contains("hủy",row.CloseReason);
        Assert.Equal(HttpStatusCode.Conflict,(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(plan))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,(await lead.PostAsJsonAsync(root+"/lifecycle",new DesignLifecycleInput("reopen"))).StatusCode);
        var fresh=await Read<TourDto>(await customer.GetAsync($"/api/v1/tour-design-requests/{request.Id}/tour"));
        var second=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(fresh)),HttpStatusCode.Created);
        Assert.NotEqual(booking.Id,second.Id);
    }
    [Fact]
    public async Task Design_global_termination_preserves_v1_but_requires_new_acceptance_before_selection()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var(request,plan)=await SharedDesign(customer,lead);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:1)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:1))).StatusCode);
        var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour?version=1"));
        var prices=work.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=100000}).ToArray();
        await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,work.Configuration.Timelines!,prices,Version:1)));
        var before=await Read<TourDto>(await lead.GetAsync(root+"/working-tour?version=1"));
        Assert.Equal(HttpStatusCode.NoContent,(await lead.DeleteAsync(root+"/co-hosts/other?terminate=true")).StatusCode);
        var after=await Read<TourDto>(await lead.GetAsync(root+"/versions/1"));
        Assert.Contains(after.Configuration.CoHosts!,h=>h.CompanyId=="other");
        var hosts=await Read<DesignCoHostDto[]>(await lead.GetAsync(root+"/co-hosts?version=1"));Assert.Equal("revoked",hosts.Single(h=>h.CompanyId=="other").Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(root+"/share",new ShareDesignVersionInput(after.Revision,1))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await partner.GetAsync(root+"/working-tour?version=1")).StatusCode);
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other",Version:1)));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept",Version:1))).StatusCode);
        var restored=await Read<TourDto>(await lead.GetAsync(root+"/working-tour?version=1"));
        Assert.Equal(before.Configuration.Name,restored.Configuration.Name);Assert.Equal(1,(await Share(lead,request.Id,restored)).SharedVersion);
        await app.Inspect(async db=>Assert.Equal(1,await db.TourVersions.CountAsync(v=>v.TourId==plan.Id)));
    }
}
