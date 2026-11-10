using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TripOps.Data.Entities;
namespace TripOps.Service.Tours;

public sealed partial class TourService
{
    private static TourConfiguration SingleAgencyConfiguration(TourConfiguration c,string actor) => c with {CoHosts=null,AgencyPricing=null,Timelines=c.Timelines?.Select(d=>d with {
        AgencyId=actor,Activities=d.Activities?.Select(a=>a with {AgencyId=actor}).ToArray(),Meals=d.Meals?.Select(a=>a with {AgencyId=actor}).ToArray(),Accommodations=d.Accommodations?.Select(a=>a with {AgencyId=actor}).ToArray()
    }).ToArray()};
    private static TourConfiguration EnsureOwnership(TourConfiguration c,string lead) => c with {
        Timelines=c.Timelines?.Select(d=>d with {
            Activities=d.Activities?.Select((a,i)=>a with {Id=a.Id??$"activity-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray(),
            Meals=d.Meals?.Select((a,i)=>a with {Id=a.Id??$"meal-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray(),
            Accommodations=d.Accommodations?.Select((a,i)=>a with {Id=a.Id??$"hotel-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray()
        }).ToArray()
    };
    private static T[] MergeOwned<T>(T[] old,T[] incoming,string actor,Func<T,string?> id,Func<T,string?> owner,Func<T,string,string,T> stamp)
    {
        Require(incoming.Where(x=>id(x)!=null).Select(id).Distinct().Count()==incoming.Count(x=>id(x)!=null),"Trùng mã mục trong lịch trình.");
        var foreign=old.Where(x=>owner(x)!=actor).ToArray();
        foreach(var item in incoming) {
            var original=foreign.FirstOrDefault(x=>id(x)==id(item));
            // Foreign records are always retained from the server snapshot, never from the form.
            if(original is null) Require(owner(item)==null || owner(item)==actor,"Không thể gán nội dung mới cho Agency khác.");
        }
        return foreign.Concat(incoming.Where(x=>foreign.All(f=>id(f)!=id(x))).Select(x=>stamp(x,id(x)??Guid.NewGuid().ToString("N"),actor))).ToArray();
    }
    private static TourConfiguration MergeDesign(TourConfiguration original,TourConfiguration input,string actor,string lead)
    {
        var current=EnsureOwnership(original,lead);
        Require((input.Timelines??[]).Select(d=>d.DayNumber).Distinct().Count()==(input.Timelines??[]).Length,"Trùng ngày lịch trình.");
        var days=new List<TimelineInput>();
        foreach(var number in (current.Timelines??[]).Select(d=>d.DayNumber).Union((input.Timelines??[]).Select(d=>d.DayNumber)).Order()) {
            var old=current.Timelines?.FirstOrDefault(d=>d.DayNumber==number)??new TimelineInput(number,$"Ngày {number}");
            var updated=input.Timelines?.FirstOrDefault(d=>d.DayNumber==number);
            // Parent day metadata is shared. Omitted foreign children survive a full-form save.
            var day=updated??old;
            var activityInput=updated?.Activities?.Select(a=>a with {OrderIndex=old.Activities?.FirstOrDefault(o=>o.Id==a.Id && o.AgencyId!=actor)?.OrderIndex??a.OrderIndex}).ToArray();
            var activities=MergeOwned(old.Activities??[],activityInput??[],actor,a=>a.Id,a=>a.AgencyId,(a,id,agency)=>a with {Id=id,AgencyId=agency});
            var meals=MergeOwned(old.Meals??[],updated?.Meals??[],actor,a=>a.Id,a=>a.AgencyId,(a,id,agency)=>a with {Id=id,AgencyId=agency});
            var hotels=MergeOwned(old.Accommodations??[],updated?.Accommodations??[],actor,a=>a.Id,a=>a.AgencyId,(a,id,agency)=>a with {Id=id,AgencyId=agency});
            if(updated!=null || activities.Length+meals.Length+hotels.Length>0)
                days.Add(day with {AgencyId=null,Activities=activities.Select((a,i)=>a with {OrderIndex=i}).ToArray(),Meals=meals,Accommodations=hotels});
        }
        var prices=MergeSharedPricing(current,input.PricingTiers??[],actor,lead);
        var result=(actor==lead?input:current) with {Timelines=days.ToArray(),AgencyPricing=prices};
        var lastNight=days.SelectMany(d=>(d.Accommodations??[]).Select(h=>d.DayNumber+h.NightsCount-1)).DefaultIfEmpty(0).Max();
        result=result with {DurationNights=Math.Max(result.DurationNights,lastNight),DurationDays=Math.Max(result.DurationDays,Math.Max(days.Select(d=>d.DayNumber).DefaultIfEmpty(1).Max(),lastNight+1))};
        foreach(var ids in new[]{days.SelectMany(d=>d.Activities??[]).Select(a=>a.Id),days.SelectMany(d=>d.Meals??[]).Select(a=>a.Id),days.SelectMany(d=>d.Accommodations??[]).Select(a=>a.Id)})
            Require(ids.Distinct().Count()==ids.Count(),"Một mục không được xuất hiện ở nhiều ngày.");
        return WithTotalPricing(result,lead);
    }

    private static PricingTierInput[] PriceFrames(TourConfiguration c,string lead) =>
        (c.AgencyPricing?.SingleOrDefault(p=>p.AgencyId==lead)?.Tiers??c.PricingTiers??[])
        .OrderBy(t=>t.DisplayOrder).Select((t,i)=>t with {Key=t.Key??$"tier-{i}"}).ToArray();

    private static bool SameFrame(PricingTierInput a,PricingTierInput b) =>
        a.Name==b.Name && a.MinAge==b.MinAge && a.MaxAge==b.MaxAge;

    private static PricingTierInput? FramePrice(IEnumerable<PricingTierInput> prices,PricingTierInput frame) =>
        prices.SingleOrDefault(t=>t.Key==frame.Key && t.Key!=null)??prices.SingleOrDefault(t=>t.Key==null && SameFrame(t,frame));

    private static AgencyPricingInput[] AlignPriceTables(AgencyPricingInput[] tables,PricingTierInput[] frames) =>
        tables.Select(p=>new AgencyPricingInput(p.AgencyId,frames.Where(frame=>FramePrice(p.Tiers,frame)!=null).Select(frame=>frame with {
            PricePerGuest=FramePrice(p.Tiers,frame)!.PricePerGuest
        }).ToArray())).ToArray();

    private static AgencyPricingInput[] MergeSharedPricing(TourConfiguration current,PricingTierInput[] incoming,string actor,string lead)
    {
        var frames=PriceFrames(current,lead);
        var tables=AlignPriceTables(current.AgencyPricing??[new(lead,current.PricingTiers??[])],frames);
        PricingTierInput[] own;
        if(actor==lead) {
            own=incoming.Select((t,i)=>t with {Key=t.Key??frames.FirstOrDefault(f=>SameFrame(f,t))?.Key??Guid.NewGuid().ToString("N"),DisplayOrder=i}).ToArray();
            Require(own.Select(t=>t.Key).Distinct().Count()==own.Length,"Khung giá vé bị trùng mã.");
            tables=AlignPriceTables(tables,own);
        } else {
            Require(incoming.Length==frames.Length,"Chỉ Agency chủ trì được thêm hoặc xóa khung giá vé.");
            Require(incoming.All(t=>frames.Any(f=>(t.Key==null || t.Key==f.Key) && SameFrame(t,f) && t.DisplayOrder==f.DisplayOrder)),
                "Chỉ Agency chủ trì được sửa tên, khoảng tuổi và thứ tự khung giá vé.");
            own=frames.Select(f=> {
                var matches=incoming.Where(t=>(t.Key==null || t.Key==f.Key) && SameFrame(t,f)).ToArray();
                Require(matches.Length==1,"Cần nhập đúng một mức giá cho mỗi khung vé do Agency chủ trì thiết lập.");
                return f with {PricePerGuest=matches[0].PricePerGuest};
            }).ToArray();
        }
        return tables.Where(p=>p.AgencyId!=actor).Append(new(actor,own)).ToArray();
    }

    private static TourConfiguration WithTotalPricing(TourConfiguration c,string lead)
    {
        if(c.AgencyPricing==null)return c;
        var frames=PriceFrames(c,lead);
        c=c with {AgencyPricing=AlignPriceTables(c.AgencyPricing,frames)};
        c=c with {AgencyPricing=c.AgencyPricing.Select(p=>p with {Tiers=p.Tiers.Select(t=>t with {PricePerGuest=Money(t.PricePerGuest)}).ToArray()}).ToArray()};
        foreach(var agency in c.AgencyPricing) {
            ValidateObject(agency);
            var rows=agency.Tiers.OrderBy(t=>t.MinAge).ToArray();
            for(var i=0;i<rows.Length;i++) {
                Require(rows[i].MinAge.HasValue && (rows[i].MaxAge==null || rows[i].MaxAge>=rows[i].MinAge),"Khoảng tuổi không hợp lệ.");
                if(i>0)Require(rows[i].MinAge>(rows[i-1].MaxAge??150),"Bảng giá riêng của Agency có khoảng tuổi trùng nhau.");
            }
        }
        var totals=frames.Select(frame=>frame with {PricePerGuest=Money(c.AgencyPricing.Sum(p=>FramePrice(p.Tiers,frame)?.PricePerGuest??0))}).ToArray();
        var adult=totals.LastOrDefault(t=>(t.MaxAge??150)>=100);
        return c with {PricingTiers=totals,BasePrice=adult?.PricePerGuest??0};
    }
    public async Task<List<BookingAgency>> BookingAllocations(Tour tour,List<BookingParticipant> guests,DateTime start,decimal total,int?[] tierIds,CancellationToken ct)
    {
        AgencyPricingInput[]? prices=null;
        if(tour.DesignRequestId.HasValue) {
            var raw=await db.TourVersions.Where(v=>v.TourId==tour.Id && v.VersionNumber==tour.Version).Select(v=>v.SnapshotData).SingleAsync(ct);
            prices=JsonSerializer.Deserialize<TourSnapshot>(raw,Json)?.Configuration.AgencyPricing;
        }
        if(prices==null || prices.Length<2)return [new BookingAgency {AgencyId=tour.AgencyId,IsHost=true,OriginalAmount=total,FinalAmount=total,NetPayout=total}];
        var result=prices.Select(p=>new BookingAgency {AgencyId=p.AgencyId,IsHost=p.AgencyId==tour.AgencyId}).ToList();
        for(var i=0;i<guests.Count;i++) {
            var guest=guests[i];
            int? age=null;
            if(guest.DateOfBirth.HasValue){var birth=guest.DateOfBirth.Value.Date;age=start.Year-birth.Year;if(birth.AddYears(age.Value)>start)age--;}
            else {
                var selected=tierIds[i].HasValue?tour.PricingTiers.Single(t=>t.Id==tierIds[i]):tour.PricingTiers.LastOrDefault(t=>t.PricePerGuest==tour.BasePrice);
                age=selected?.MinAge??30;
            }
            foreach(var p in prices) {
                var amount=p.Tiers.FirstOrDefault(t=>age>=(t.MinAge??0) && (!t.MaxAge.HasValue || age<=t.MaxAge.Value))?.PricePerGuest??0;
                var row=result.Single(r=>r.AgencyId==p.AgencyId);row.FinalAmount+=Money(amount);
            }
        }
        // Any booking option difference is assigned to the lead; raw tour shares remain frozen.
        var host=result.Single(r=>r.IsHost==true);host.FinalAmount+=total-result.Sum(r=>r.FinalAmount);
        Require(host.FinalAmount>=0,"Tổng tiền booking không đủ phân bổ cho các Agency.");
        foreach(var row in result){row.OriginalAmount=row.FinalAmount;row.NetPayout=row.FinalAmount;}
        return result;
    }
}
