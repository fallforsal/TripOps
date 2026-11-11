using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Service.Bookings;
using TripOps.Service.Tours;

namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    private static async Task<BookingDto> FinancialAlliance(HttpClient customer,HttpClient lead,HttpClient partner)
    {
        var request=await DesignRequest(customer);await Receive(lead,request.Id);
        var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var initial=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,Complete(),true)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other","Partner stage")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour"));
        var tiers=work.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers.Select(t=>t with{PricePerGuest=600000}).ToArray();
        var days=work.Configuration.Timelines!;
        days[1]=days[1] with{Meals=[new MealInput("lunch","Partner meal",ServiceId:103,AgencyId:"other",Id:"financial-meal")]};
        var edited=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,days,tiers)));
        var final=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(edited.Revision,edited.Configuration,true)));
        var shared=await Share(lead,request.Id,final);
        return await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",DesignBooking(shared)),HttpStatusCode.Created);
    }

    [Fact]
    public async Task Partner_requests_charge_host_decides_and_only_beneficiary_allocation_changes()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var b=await FinancialAlliance(customer,lead,partner);var root=$"/api/v1/agency/bookings/{b.Id}";
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(root+"/decision",new BookingDecisionRequest("approve",null)));
        var baseTotal=b.TotalAmount;var leadAmount=b.BookingAgencies!.Single(a=>a.IsHost).FinalAmount;
        var partnerAmount=b.BookingAgencies!.Single(a=>!a.IsHost).FinalAmount;var url=$"/api/v1/bookings/{b.Id}/financial-changes";
        var proposal=new FinancialChangeInput(100000,"Đổi khách sạn theo thỏa thuận",partnerAmount,Guid.NewGuid());
        var partnerMeal=b.SnapshotDays!.SelectMany(d=>d.Meals).Single(m=>m.AgencyId=="other");
        await Read<BookingDto>(await partner.PostAsJsonAsync(root+"/service-changes",new BookingServiceChange("meal",partnerMeal.Id,
            proposal.Reason,partnerAmount,ServiceId:103,ProposedAmount:proposal.Amount,FinancialRequestId:proposal.RequestId)));
        var rows=await Read<FinancialChangeDto[]>(await partner.GetAsync(url));
        var pending=Assert.Single(rows);Assert.Equal("Pending",pending.Status);
        Assert.Single(await Read<FinancialChangeDto[]>(await partner.PostAsJsonAsync(url,proposal with{Reason=pending.Reason})));
        var unchanged=await Read<BookingDto>(await lead.GetAsync(root));Assert.Equal(baseTotal,unchanged.TotalAmount);
        Assert.Empty(await Read<FinancialChangeDto[]>(await customer.GetAsync(url)));
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync(url+$"/{pending.Id}/decision",new FinancialChangeDecision("approve",partnerAmount))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(url,proposal with{AgencyId="agency",RequestId=Guid.NewGuid()})).StatusCode);
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(url+$"/{pending.Id}/decision",new FinancialChangeDecision("approve",baseTotal)));
        Assert.Equal(baseTotal+100000,b.TotalAmount);Assert.Equal(baseTotal,b.BaseTourAmount);Assert.Equal("Confirmed",b.Status);
        Assert.Equal(leadAmount,b.BookingAgencies!.Single(a=>a.IsHost).FinalAmount);
        Assert.Equal(partnerAmount+100000,b.BookingAgencies!.Single(a=>!a.IsHost).FinalAmount);
        Assert.Equal("other",Assert.Single(b.PaymentSchedule!,p=>p.Stage=="surcharge").BeneficiaryAgencyId);
        Assert.Equal(b.TotalAmount,b.BookingAgencies!.Sum(a=>a.FinalAmount));
        Assert.Equal(HttpStatusCode.Conflict,(await lead.PostAsJsonAsync(url+$"/{pending.Id}/decision",new FinancialChangeDecision("approve",b.TotalAmount))).StatusCode);
        var rejected=(await Read<FinancialChangeDto[]>(await partner.PostAsJsonAsync(url,proposal with{RequestId=Guid.NewGuid(),ExpectedTotal=partnerAmount+100000}))).First(x=>x.Status=="Pending");
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(url+$"/{rejected.Id}/decision",new FinancialChangeDecision("reject",b.TotalAmount))).StatusCode);
        var unchangedAfterRejection=await Read<BookingDto>(await lead.PostAsJsonAsync(url+$"/{rejected.Id}/decision",new FinancialChangeDecision("reject",b.TotalAmount,"Không thu thêm khách")));
        Assert.Equal(b.TotalAmount,unchangedAfterRejection.TotalAmount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    public async Task Approved_credit_reduces_outstanding_or_refunds_excess_without_cancelling_booking(int payments)
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");using var admin=await app.Login("admin");
        var b=await FinancialAlliance(customer,lead,partner);var root=$"/api/v1/agency/bookings/{b.Id}";
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(root+"/decision",new BookingDecisionRequest("approve",null)));
        var original=b.TotalAmount;var contract=b.Contract!.Id;
        await app.Inspect(async db=>{(await db.BookingContracts.SingleAsync(c=>c.Id==contract)).Status="Verified";await db.SaveChangesAsync();});
        for(var i=0;i<payments;i++) {
            var due=b.PaymentSchedule!.First(p=>p.Status=="Pending");
            b=await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/deposit",new BookingDepositRequest(due.Outstanding,$"financial-{payments}-{i}",null)));
        }
        b=await Read<BookingDto>(await lead.GetAsync(root));
        var paid=b.PaidAmount;var partnerAmount=b.BookingAgencies!.Single(a=>!a.IsHost).FinalAmount;
        var deadlines=b.PaymentSchedule!.Select(p=>(p.Id,p.DueAt)).ToArray();
        var url=$"/api/v1/bookings/{b.Id}/financial-changes";
        var proposal=Assert.Single(await Read<FinancialChangeDto[]>(await partner.PostAsJsonAsync(url,new FinancialChangeInput(-100000,"Giảm giá chặng theo thỏa thuận",partnerAmount,Guid.NewGuid()))));
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(url+$"/{proposal.Id}/decision",new FinancialChangeDecision("approve",b.TotalAmount)));
        Assert.Equal(original-100000,b.TotalAmount);Assert.Equal(original,b.BaseTourAmount);Assert.Equal(contract,b.Contract!.Id);
        Assert.Equal(deadlines,b.PaymentSchedule!.Select(p=>(p.Id,p.DueAt)).ToArray());
        Assert.Equal(partnerAmount-100000,b.BookingAgencies!.Single(a=>!a.IsHost).FinalAmount);
        Assert.Equal(b.TotalAmount,b.BookingAgencies!.Sum(a=>a.FinalAmount));
        Assert.Equal(Math.Max(0,b.TotalAmount-paid),b.PaymentSchedule!.Sum(p=>p.Outstanding));
        Assert.Null(b.Cancellation);
        var visible=Assert.Single(await Read<FinancialChangeDto[]>(await customer.GetAsync(url)));
        if(payments<2) Assert.Null(visible.RefundRequestId);
        else {
            Assert.Equal(100000,visible.RefundAmount);Assert.Equal("Pending",visible.RefundStatus);
            Assert.Equal(HttpStatusCode.NoContent,(await customer.PutAsJsonAsync(url+$"/refunds/{visible.RefundRequestId}/account",new RefundAccountRequest("Vietcombank","1234567890","CUSTOMER"))).StatusCode);
            Assert.Equal(HttpStatusCode.UnprocessableEntity,(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{visible.RefundRequestId}/approve",new RefundApprovalRequest(99999,"wrong-ref","Wrong amount"))).StatusCode);
            await Read<AdminRefundDto>(await admin.PostAsJsonAsync($"/api/v1/admin/refunds/{visible.RefundRequestId}/approve",new RefundApprovalRequest(100000,"credit-refund-test",null)));
            b=await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{b.Id}"));
            Assert.Equal("Paid",b.Status);Assert.Equal("Paid",b.PaymentStatus);Assert.Equal(b.TotalAmount,b.PaidAmount);Assert.Null(b.Cancellation);
            Assert.Equal("Completed",Assert.Single(await Read<FinancialChangeDto[]>(await customer.GetAsync(url))).RefundStatus);
        }
    }

    [Fact]
    public async Task Credit_offsets_unpaid_base_before_refunding_a_surcharge_paid_before_deposit()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");
        var b=await FinancialAlliance(customer,lead,partner);var root=$"/api/v1/agency/bookings/{b.Id}";
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(root+"/decision",new BookingDecisionRequest("approve",null)));
        var baseAmount=b.TotalAmount;
        await app.Inspect(async db=>{(await db.BookingContracts.SingleAsync(c=>c.Id==b.Contract!.Id)).Status="Verified";await db.SaveChangesAsync();});
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(root+"/surcharges",new BookingSurchargeInput(baseAmount,"Phụ thu chặng B độc lập",b.TotalAmount,Guid.NewGuid(),"other")));
        var fee=Assert.Single(b.PaymentSchedule!,p=>p.Stage=="surcharge");
        await Read<BookingDto>(await customer.PostAsJsonAsync($"/api/v1/bookings/{b.Id}/deposit",new BookingDepositRequest(fee.Outstanding,"fee-before-deposit",null,fee.Id)));
        b=await Read<BookingDto>(await lead.GetAsync(root));
        var url=$"/api/v1/bookings/{b.Id}/financial-changes";
        var proposal=Assert.Single(await Read<FinancialChangeDto[]>(await partner.PostAsJsonAsync(url,new FinancialChangeInput(-baseAmount-100000,"Giảm giá gồm phí bổ sung chặng B",b.BookingAgencies!.Single(a=>!a.IsHost).FinalAmount,Guid.NewGuid()))));
        b=await Read<BookingDto>(await lead.PostAsJsonAsync(url+$"/{proposal.Id}/decision",new FinancialChangeDecision("approve",b.TotalAmount)));
        Assert.Equal(baseAmount-100000,b.TotalAmount);
        Assert.Equal(0,b.PaymentSchedule!.Sum(p=>p.Outstanding));
        Assert.Equal(100000,Assert.Single(await Read<FinancialChangeDto[]>(await customer.GetAsync(url))).RefundAmount);
        Assert.Equal(b.TotalAmount,b.BookingAgencies!.Sum(a=>a.FinalAmount));
    }
}
