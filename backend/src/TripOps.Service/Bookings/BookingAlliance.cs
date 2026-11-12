using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Service.Tours;
namespace TripOps.Service.Bookings;

public static class BookingAlliance
{
    // Construct the response separately: never mutate tracked entities to enforce read permissions.
    public static BookingDto PartnerView(Booking b,BookingDto dto,string agency) {
        var share=dto.BookingAgencies!.Single(a=>a.AgencyId==agency);
        var days=dto.SnapshotDays?.Select(d=>d with {
            Meals=d.Meals.Select(m=>(m.AgencyId??b.Tour!.AgencyId)==agency?m:m with {PriceDifference=0}).ToArray()
        }).ToArray();
        return dto with {
            IsPartnerView=true,Participants=dto.Participants.Where(p=>p.AgencyId==agency && p.Status!="INACTIVE").ToArray(),
            TotalGuests=GuestCount(b,agency),BookingAgencies=[share],TotalAmount=share.FinalAmount,
            BaseTourAmount=BookingBilling.HasBeenApproved(b)?share.OriginalAmount:share.FinalAmount,
            OriginalTotalPrice=share.OriginalAmount,SurchargeAmount=share.PaidSurchargeAmount+share.UnpaidSurchargeAmount,
            PaidAmount=0,DepositAmount=0,PaymentSchedule=[],PaymentTransactions=[],Contract=null,Cancellation=null,PriceAdjustments=[],
            SnapshotDays=days,SnapshotHotels=dto.SnapshotHotels?.Select(h=>(h.AgencyId??b.Tour!.AgencyId)==agency?h:h with {PriceDifference=0}).ToArray(),
            AssignedGuides=dto.AssignedGuides.Where(g=>g.AgencyId==agency).ToArray(),
            AttractionCheckins=dto.AttractionCheckins?.Where(c=>c.AgencyId==agency).ToArray(),
            Incidents=dto.Incidents?.Where(i=>b.Incidents.Any(x=>x.Id==i.Id && x.AgencyId==agency)).ToArray()
        };
    }
    public static bool IsMember(Booking b,string actor) => b.Tour?.AgencyId==actor || b.BookingAgencies.Any(a=>a.AgencyId==actor);
    public static int GuestCount(Booking b,string? agency=null) => b.Participants.Where(p=>p.Status!="INACTIVE" && (agency==null || p.AgencyId==agency)).Select(p=>p.ParticipantIndex).Distinct().Count();
    public static string OwnerOfSlot(Booking b,string slot) {
        var parts=slot.Split(':');if(parts.Length!=2 || !int.TryParse(parts[1],out var id))return b.Tour!.AgencyId;
        return (parts[0]=="hotel"?b.Accommodations.SingleOrDefault(h=>h.Id==id)?.AgencyId:
            b.Timelines.SelectMany(d=>d.Meals).SingleOrDefault(m=>m.Id==id)?.AgencyId)??b.Tour!.AgencyId;
    }
    public static async Task<TourConfiguration?> BookedConfiguration(TripOpsDbContext db,Booking b,CancellationToken ct) {
        if (b.TourConfigurationData is not null) return JsonSerializer.Deserialize<TourConfiguration>(b.TourConfigurationData,new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var raw=await db.TourVersions.AsNoTracking().Where(v=>v.TourId==b.TourId && v.VersionNumber==b.TourVersion).Select(v=>v.SnapshotData).SingleOrDefaultAsync(ct);
        return raw==null?null:JsonSerializer.Deserialize<TourSnapshot>(raw,new JsonSerializerOptions(JsonSerializerDefaults.Web))?.Configuration;
    }
    public static int Age(DateTime birth,DateTime start) {var age=start.Year-birth.Year;return birth.Date.AddYears(age)>start.Date?age-1:age;}
    public static PricingTierInput? Tier(TourConfiguration? c,string agency,int age) =>
        (c?.AgencyPricing?.SingleOrDefault(p=>p.AgencyId==agency)?.Tiers??c?.PricingTiers??[]).FirstOrDefault(t=>age>=(t.MinAge??0) && (!t.MaxAge.HasValue || age<=t.MaxAge));
    public static BookingParticipant Copy(BookingParticipant p,string agency,decimal price,bool primary) => new() {
        CreationKey=p.CreationKey,AgencyId=agency,ParticipantIndex=p.ParticipantIndex,IsPrimary=primary,FullName=p.FullName,PhoneNumber=p.PhoneNumber,DateOfBirth=p.DateOfBirth,Gender=p.Gender,
        IdentityNumber=p.IdentityNumber,Note=p.Note,TierName=p.TierName,Price=price,Status=p.Status,RoommateNote=p.RoommateNote,RestaurantNote=p.RestaurantNote
    };
    public static void SetPrimary(Booking b) {
        foreach(var group in b.Participants.GroupBy(p=>p.ParticipantIndex)) {
            var primary=group.FirstOrDefault(p=>p.IsPrimary)??group.First();
            foreach(var row in group)row.IsPrimary=ReferenceEquals(row,primary);
        }
    }
}
