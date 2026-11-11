using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Tours;
using TripOps.Service.Bookings;
namespace TripOps.Tests;

public sealed partial class TourFlowTests
{
    [Fact]
    public async Task Alliance_booking_keeps_stage_rosters_permissions_locked_base_and_surcharge_beneficiaries()
    {
        await using var app=new App();await app.Initialize();
        using var customer=await app.Login("customer");using var lead=await app.Login("agency");using var partner=await app.Login("other");using var admin=await app.Login("admin");
        var request=await DesignRequest(customer);await Receive(lead,request.Id);var root=$"/api/v1/agency/tour-design-requests/{request.Id}";
        var configuration=Complete();
        configuration.Timelines![0]=configuration.Timelines[0] with {
            Accommodations=configuration.Timelines[0].Accommodations!.Select(h=>h.IsDefault?h with {ServiceId=102}:h).ToArray(),
            Meals=configuration.Timelines[0].Meals!.Select(m=>m.IsDefault?m with {ServiceId=103}:m).ToArray()
        };
        var initial=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(null,configuration with {DurationDays=3,DurationNights=2,Timelines=[..configuration.Timelines!,new(3,"Final")]},true)));
        await Read<DesignCoHostDto[]>(await lead.PostAsJsonAsync(root+"/co-hosts",new InviteDesignCoHost("other","Second stage")));
        Assert.Equal(HttpStatusCode.NoContent,(await partner.PostAsJsonAsync(root+"/co-hosts/decision",new DesignCoHostDecision("accept"))).StatusCode);
        var work=await Read<TourDto>(await partner.GetAsync(root+"/working-tour"));
        var days=work.Configuration.Timelines!;
        var pricing=work.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers.Select(t=>t with {PricePerGuest=t.MinAge==12?600000:300000}).ToArray();
        days[1]=days[1] with {Activities=[new("Partner visit",Id:"partner-visit",AgencyId:"other")],Accommodations=[new("Partner hotel","Second destination",ServiceId:102,Id:"partner-hotel",AgencyId:"other")],Meals=[new("dinner","Partner meal",ServiceId:103,Id:"partner-meal",AgencyId:"other")]};
        var modified=await Read<TourDto>(await partner.PutAsJsonAsync(root+"/segment",new DesignSegmentInput(work.Revision,days,pricing)));
        var final=await Read<TourDto>(await lead.PutAsJsonAsync(root+"/tour",new SaveDesignTourInput(modified.Revision,modified.Configuration with {PricingTiers=modified.Configuration.AgencyPricing!.Single(a=>a.AgencyId=="agency").Tiers},true)));
        var shared=await Share(lead,request.Id,final);
        var input=DesignBooking(shared) with {Participants=[new("Adult",null,new DateTime(1990,1,1),null,null,null),new("Child",null,new DateTime(2018,1,1),null,null,null)]};
        var created=await Read<BookingDto>(await customer.PostAsJsonAsync("/api/v1/bookings",input),HttpStatusCode.Created);
        await app.Inspect(async db=>{
            var tour=await db.Tours.SingleAsync(t=>t.Id==created.TourId);
            tour.MinGuests=2;tour.MaxGuests=2;await db.SaveChangesAsync();
        });
        var detail=await Read<BookingDto>(await partner.GetAsync($"/api/v1/agency/bookings/{created.Id}"));
        Assert.Equal(2,detail.TotalGuests);Assert.Equal(2,detail.Participants.Count);Assert.Single(detail.BookingAgencies!);
        Assert.True(detail.IsPartnerView);Assert.Equal(900000,detail.TotalAmount);Assert.Equal(0,detail.DepositAmount);
        Assert.All(detail.Participants,p=>Assert.Equal("other",p.AgencyId));Assert.All(detail.BookingAgencies!,a=>Assert.Equal("other",a.AgencyId));
        Assert.Empty(detail.PaymentSchedule!);Assert.Empty(detail.PaymentTransactions!);Assert.Empty(detail.PriceAdjustments!);Assert.Null(detail.Contract);
        var hostView=await Read<BookingDto>(await lead.GetAsync($"/api/v1/agency/bookings/{created.Id}"));
        Assert.Equal(4,hostView.Participants.Count);Assert.Equal(2,hostView.BookingAgencies!.Count);Assert.False(hostView.IsPartnerView);
        var listed=(await Read<BookingPage<BookingListItem>>(await partner.GetAsync("/api/v1/agency/bookings"))).Items.Single(b=>b.Id==created.Id);
        Assert.Equal(900000,listed.TotalAmount);Assert.Equal(2,listed.TotalGuests);Assert.Equal(0,listed.PaidAmount);
        Assert.Empty(await Read<QuotationView[]>(await partner.GetAsync($"/api/v1/bookings/{created.Id}/quotations")));
        Assert.Equal(600000,detail.Participants.Single(p=>p.FullName=="Adult" && p.AgencyId=="other").Price);
        Assert.Contains((await Read<BookingPage<BookingListItem>>(await partner.GetAsync("/api/v1/agency/bookings"))).Items,b=>b.Id==created.Id);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync($"/api/v1/agency/bookings/{created.Id}/decision",new BookingDecisionRequest("approve",null))).StatusCode);
        var approved=await Read<BookingDto>(await lead.PostAsJsonAsync($"/api/v1/agency/bookings/{created.Id}/decision",new BookingDecisionRequest("approve",null)));
        var original=approved.TotalAmount;var schedule=approved.PaymentSchedule!.Select(p=>(p.Id,p.Amount,p.DueAt)).ToArray();
        var baseUrl=$"/api/v1/agency/bookings/{created.Id}";
        var extra=new AgencyParticipantInput("B-only",new DateTime(1990,1,1),"Nam","EXTRA",null,null,null,1,"Khách tham gia chặng B",original,Guid.NewGuid(),["other"]);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync(baseUrl+"/participants",extra)).StatusCode);
        var added=await Read<BookingDto>(await lead.PostAsJsonAsync(baseUrl+"/participants",extra));
        Assert.Equal(3,added.TotalGuests);Assert.Single(added.Participants,p=>p.FullName=="B-only");
        Assert.Equal(original,added.BaseTourAmount);Assert.Equal(600000,added.SurchargeAmount);Assert.Equal("Confirmed",added.Status);
        Assert.Equal(schedule,added.PaymentSchedule!.Where(p=>p.Stage!="surcharge").Select(p=>(p.Id,p.Amount,p.DueAt)).ToArray());
        Assert.Equal("other",added.PaymentSchedule!.Single(p=>p.Stage=="surcharge").BeneficiaryAgencyId);
        Assert.Equal(added.TotalAmount,(await Read<BookingDto>(await lead.PostAsJsonAsync(baseUrl+"/participants",extra))).TotalAmount);
        var logical=added.Participants.First(p=>p.FullName=="Adult").ParticipantIndex!.Value;
        var stages=new ParticipantStagesInput(["agency"],"Khách không đi chặng B",added.TotalAmount,Guid.NewGuid());
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PutAsJsonAsync(baseUrl+$"/participants/{logical}/stages",stages)).StatusCode);
        var removed=await Read<BookingDto>(await lead.PutAsJsonAsync(baseUrl+$"/participants/{logical}/stages",stages));
        Assert.Equal(added.TotalAmount,removed.TotalAmount);Assert.Equal(original,removed.BaseTourAmount);Assert.Equal(3,removed.TotalGuests);
        Assert.Equal("INACTIVE",removed.Participants.Single(p=>p.FullName=="Adult" && p.AgencyId=="other").Status);
        var surcharge=new BookingSurchargeInput(50000,"Phụ thu chặng B",removed.TotalAmount,Guid.NewGuid(),"other");
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync(baseUrl+"/surcharges",surcharge)).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(baseUrl+"/surcharges",surcharge with {BeneficiaryAgencyId="pending"})).StatusCode);
        var charged=await Read<BookingDto>(await lead.PostAsJsonAsync(baseUrl+"/surcharges",surcharge));
        var audit=await Read<BookingDto>(await admin.GetAsync($"/api/v1/admin/bookings/{created.Id}/allocations"));
        Assert.Equal(1550000,audit.BookingAgencies!.Single(a=>a.AgencyId=="other").FinalAmount);
        Assert.Equal(2250000,audit.BookingAgencies!.Single(a=>a.AgencyId=="agency").FinalAmount);
        var partnerView=await Read<BookingDto>(await partner.GetAsync(baseUrl));
        Assert.Equal(1550000,partnerView.TotalAmount);Assert.Equal(2,partnerView.TotalGuests);
        Assert.DoesNotContain(partnerView.Participants,p=>p.FullName=="Adult");
        Assert.Equal(charged.SnapshotHotels!.Count,partnerView.SnapshotHotels!.Count);
        Assert.Equal(charged.SnapshotDays!.Count,partnerView.SnapshotDays!.Count);
        Assert.Contains(partnerView.SnapshotHotels!,h=>h.AgencyId=="agency");
        Assert.Contains(partnerView.SnapshotDays!.SelectMany(d=>d.Locations),l=>l.AgencyId=="agency");
        Assert.Contains(partnerView.AgencyDirectory!,a=>a.AgencyId=="agency" && a.AgencyName=="agency");
        Assert.Single(partnerView.BookingAgencies!);Assert.Equal("other",partnerView.BookingAgencies![0].AgencyId);
        var foreignHotel=charged.SnapshotHotels!.First(h=>h.AgencyId=="agency");
        var foreignMeal=charged.SnapshotDays!.SelectMany(d=>d.Meals).First(m=>m.AgencyId=="agency");
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(baseUrl+"/service-changes",new BookingServiceChange("hotel",foreignHotel.Id,"Cannot edit host hotel",partnerView.TotalAmount,ServiceId:102))).StatusCode);
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await partner.PostAsJsonAsync(baseUrl+"/service-changes",new BookingServiceChange("meal",foreignMeal.Id,"Cannot edit host meal",partnerView.TotalAmount,ServiceId:103))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.GetAsync($"/api/v1/files/contracts/{created.Id}/document")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.GetAsync($"/api/v1/files/contracts/{created.Id}/signed")).StatusCode);
        var ownSlots=partnerView.SnapshotHotels!.Where(h=>h.AgencyId=="other").Select(h=>"hotel:"+h.Id).Concat(partnerView.SnapshotDays!.SelectMany(d=>d.Meals).Where(m=>m.AgencyId=="other").Select(m=>"meal:"+m.Id)).ToArray();
        await app.Inspect(async db=>{foreach(var r in await db.BookingSupplierRequests.Where(r=>r.BookingId==created.Id && !ownSlots.Contains(r.SlotKey)).ToListAsync()) {r.EstimatedCost=777777;r.QuotedCost=888888;r.Quantity=42;r.Note="PRIVATE HOST SUPPLIER NOTE";}await db.SaveChangesAsync();});
        var ownRequests=await Read<ProviderRequestView[]>(await partner.GetAsync($"/api/v1/bookings/{created.Id}/quotations/supplier-requests"));
        Assert.Contains(ownRequests,r=>!ownSlots.Contains(r.SlotKey));
        Assert.All(ownRequests.Where(r=>!ownSlots.Contains(r.SlotKey)),r=> {Assert.Equal(0,r.EstimatedCost);Assert.Null(r.QuotedCost);Assert.Null(r.Note);Assert.Equal(0,r.Quantity);});
        var allRequests=await Read<ProviderRequestView[]>(await lead.GetAsync($"/api/v1/bookings/{created.Id}/quotations/supplier-requests"));
        var foreignRequest=allRequests.First(r=>!ownSlots.Contains(r.SlotKey));
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.GetAsync($"/api/v1/bookings/{created.Id}/quotations/supplier-requests/{foreignRequest.Id}/history")).StatusCode);
        var hotel=charged.SnapshotHotels!.Single(h=>h.AgencyId=="other");
        Assert.Equal(HttpStatusCode.UnprocessableEntity,(await lead.PostAsJsonAsync(baseUrl+"/service-changes",new BookingServiceChange("hotel",hotel.Id,"Cannot edit partner",charged.TotalAmount,ServiceId:102))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,(await partner.PostAsJsonAsync(baseUrl+"/service-changes",new BookingServiceChange("hotel",hotel.Id,"Provider changed plan",partnerView.TotalAmount,ServiceId:102))).StatusCode);
        await app.Inspect(async db=>{
            var g=new User {Id="guideb",Name="Guide B",Email="guideb@example.test",AgencyId="other",Role=UserRole.TourGuide,Status=UserStatus.Active};g.PasswordHash=new PasswordHasher<User>().HashPassword(g,"TourTest123!");db.Users.Add(g);await db.SaveChangesAsync();
            Assert.Contains(await db.WorkflowNotifications.Where(n=>n.BookingId==created.Id).ToListAsync(),n=>n.UserId=="other");
        });
        Assert.Equal(HttpStatusCode.OK,(await partner.PostAsJsonAsync(baseUrl+"/guide-assignments",new GuideAssignmentRequest("guideb",null,null))).StatusCode);
        using var guide=await app.Login("guideb");
        var guideView=await Read<BookingDto>(await guide.GetAsync($"/api/v1/guide/bookings/{created.Id}"));
        Assert.All(guideView.Participants,p=>Assert.Equal("other",p.AgencyId));
        var foreign=charged.Participants.First(p=>p.AgencyId=="agency");
        Assert.Equal(HttpStatusCode.Forbidden,(await guide.PostAsJsonAsync($"/api/v1/guide/bookings/{created.Id}/attendance",new AttendanceCheckinRequest(foreign.Id,"CheckedIn"))).StatusCode);
        var ownLocation=charged.SnapshotDays!.SelectMany(d=>d.Locations).Single(l=>l.AgencyId=="other");
        var foreignLocation=charged.SnapshotDays!.SelectMany(d=>d.Locations).First(l=>l.AgencyId=="agency");
        var changes=baseUrl+"/location-changes";
        Assert.Equal(HttpStatusCode.Forbidden,(await lead.PostAsJsonAsync(changes,new BookingLocationChange(ownLocation.Id,"Host cannot replace","Điểm do đối tác tạo",charged.TotalAmount))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync(changes,new BookingLocationChange(foreignLocation.Id,"Partner cannot replace","Điểm do chủ trì tạo",partnerView.TotalAmount))).StatusCode);
        var changedLocation=await Read<BookingDto>(await partner.PostAsJsonAsync(changes,new BookingLocationChange(ownLocation.Id,"Partner new visit","Đổi địa điểm của mình",partnerView.TotalAmount)));
        Assert.Equal("Partner visit",changedLocation.SnapshotDays!.SelectMany(d=>d.Locations).Single(l=>l.Id==ownLocation.Id).OriginalName);
        Assert.Equal("Partner new visit",changedLocation.SnapshotDays!.SelectMany(d=>d.Locations).Single(l=>l.Id==ownLocation.Id).Name);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PutAsJsonAsync(baseUrl+"/guide-routing",new {locations=new[]{new {locationId=foreignLocation.Id,guideIds=new[]{"guideb"}}}})).StatusCode);
        Assert.Equal(HttpStatusCode.OK,(await partner.PutAsJsonAsync(baseUrl+"/guide-routing",new {locations=new[]{new {locationId=ownLocation.Id,guideIds=new[]{"guideb"}}}})).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await guide.PostAsJsonAsync($"/api/v1/guide/bookings/{created.Id}/locations/{foreignLocation.Id}/check-in",new {status="CheckedIn"})).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await partner.PostAsJsonAsync(baseUrl+"/surcharges",surcharge)).StatusCode);
        var restored=await Read<BookingDto>(await lead.PutAsJsonAsync(baseUrl+$"/participants/{logical}/stages",new ParticipantStagesInput(["agency","other"],"Khách quay lại chặng đã trả tiền",charged.TotalAmount,Guid.NewGuid())));
        Assert.Equal(charged.TotalAmount,restored.TotalAmount);
        var bOnly=restored.Participants.Single(p=>p.FullName=="B-only");
        var join=new ParticipantStagesInput(["agency","other"],"Khách bổ sung chặng A",restored.TotalAmount,Guid.NewGuid());
        var joined=await Read<BookingDto>(await lead.PutAsJsonAsync(baseUrl+$"/participants/{bOnly.ParticipantIndex}/stages",join));
        Assert.Equal(1500000,joined.TotalAmount-restored.TotalAmount);Assert.Equal(original,joined.BaseTourAmount);
        Assert.Equal("agency",joined.PaymentSchedule!.Last(p=>p.Stage=="surcharge").BeneficiaryAgencyId);
        Assert.Equal(joined.TotalAmount,(await Read<BookingDto>(await lead.PutAsJsonAsync(baseUrl+$"/participants/{bOnly.ParticipantIndex}/stages",join))).TotalAmount);
        var customerView=await Read<BookingDto>(await customer.GetAsync($"/api/v1/bookings/{created.Id}"));
        Assert.Equal(3,customerView.Participants.Count);Assert.All(customerView.BookingAgencies!,a=>Assert.Null(a.PricingTiers));
        // Agency additions exceed the tour template's max; removals may go below its min, including zero.
        var current=await Read<BookingDto>(await lead.GetAsync(baseUrl));
        Assert.Equal(current.TotalAmount,current.BookingAgencies!.Sum(a=>a.FinalAmount));
        var allocated=current.BookingAgencies!.Select(a=>(a.AgencyId,a.FinalAmount)).ToArray();
        var payments=current.PaymentSchedule!.Select(p=>(p.Id,p.Amount,p.BeneficiaryAgencyId)).ToArray();
        foreach(var person in current.Participants.Select(p=>p.ParticipantIndex!.Value).Distinct().ToArray())
            current=await Read<BookingDto>(await lead.PutAsJsonAsync(baseUrl+$"/participants/{person}/stages",
                new ParticipantStagesInput([],"Khách rút khỏi toàn bộ chặng",current.TotalAmount,Guid.NewGuid())));
        Assert.Equal(0,current.TotalGuests);Assert.All(current.Participants,p=>Assert.Equal("INACTIVE",p.Status));
        Assert.Equal(allocated,current.BookingAgencies!.Select(a=>(a.AgencyId,a.FinalAmount)).ToArray());
        Assert.Equal(payments,current.PaymentSchedule!.Select(p=>(p.Id,p.Amount,p.BeneficiaryAgencyId)).ToArray());
    }
}
