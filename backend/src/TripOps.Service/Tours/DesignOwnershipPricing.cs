using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TripOps.Data.Entities;
namespace TripOps.Service.Tours;

public sealed partial class TourService
{
    private static TourConfiguration SingleAgencyConfiguration(TourConfiguration c,string actor) => c with {CoHosts=null,AgencyPricing=null,Timelines=c.Timelines?.Select(d=>d with {
        AgencyId=actor,Activities=d.Activities?.Select(a=>a with {AgencyId=actor}).ToArray(),Meals=d.Meals?.Select(a=>a with {AgencyId=actor}).ToArray(),Accommodations=d.Accommodations?.Select(a=>a with {AgencyId=actor}).ToArray()
    }).ToArray()};
    private static OwnedTextItem[] LinesToOwned(string? text,string prefix,string owner) =>
        (text??"").Split('\n',StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select((t,i)=>new OwnedTextItem(t,$"{prefix}-{i}",owner)).ToArray();

    private static OwnedTextItem[] EnsureOwnedText(OwnedTextItem[]? items,string? text,string prefix,string lead) =>
        items is not null
            ? items.Select((x,i)=>x with {Id=x.Id??$"{prefix}-{i}",AgencyId=x.AgencyId??lead}).ToArray()
            : LinesToOwned(text,prefix,lead);

    private static OwnedImageItem[] EnsureOwnedImages(OwnedImageItem[]? items,string[]? urls,string lead) =>
        items is not null
            ? items.Select((x,i)=>x with {Id=x.Id??$"img-{i}",AgencyId=x.AgencyId??lead}).ToArray()
            : (urls??[]).Where(u=>!string.IsNullOrWhiteSpace(u)).Select((u,i)=>new OwnedImageItem(u,$"img-{i}",lead)).ToArray();

    private static string? OwnedToText(OwnedTextItem[]? items) {
        var lines=(items??[]).Select(x=>x.Text.Trim()).Where(x=>x.Length>0).ToArray();
        return lines.Length>0 ? string.Join("\n",lines) : null;
    }

    private static TourConfiguration EnsureOwnership(TourConfiguration c,string lead) => c with {
        Timelines=c.Timelines?.Select(d=>d with {
            Activities=d.Activities?.Select((a,i)=>a with {Id=a.Id??$"activity-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray(),
            Meals=d.Meals?.Select((a,i)=>a with {Id=a.Id??$"meal-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray(),
            Accommodations=d.Accommodations?.Select((a,i)=>a with {Id=a.Id??$"hotel-{d.DayNumber}-{i}",AgencyId=a.AgencyId??d.AgencyId??lead}).ToArray()
        }).ToArray(),
        OwnedHighlights=EnsureOwnedText(c.OwnedHighlights,c.Highlights,"hl",lead),
        OwnedInclusions=EnsureOwnedText(c.OwnedInclusions,c.Inclusions,"inc",lead),
        OwnedExclusions=EnsureOwnedText(c.OwnedExclusions,c.Exclusions,"exc",lead),
        OwnedCancellationPolicy=EnsureOwnedText(c.OwnedCancellationPolicy,c.CancellationPolicy,"pol",lead),
        OwnedImages=EnsureOwnedImages(c.OwnedImages,c.Images,lead)
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
        var highlights=MergeOwned(current.OwnedHighlights??[],input.OwnedHighlights??(actor==lead?LinesToOwned(input.Highlights,"hl",lead):current.OwnedHighlights??[]),actor,x=>x.Id,x=>x.AgencyId,(x,id,agency)=>x with {Id=id,AgencyId=agency});
        var inclusions=MergeOwned(current.OwnedInclusions??[],input.OwnedInclusions??(actor==lead?LinesToOwned(input.Inclusions,"inc",lead):current.OwnedInclusions??[]),actor,x=>x.Id,x=>x.AgencyId,(x,id,agency)=>x with {Id=id,AgencyId=agency});
        var exclusions=MergeOwned(current.OwnedExclusions??[],input.OwnedExclusions??(actor==lead?LinesToOwned(input.Exclusions,"exc",lead):current.OwnedExclusions??[]),actor,x=>x.Id,x=>x.AgencyId,(x,id,agency)=>x with {Id=id,AgencyId=agency});
        var policies=MergeOwned(current.OwnedCancellationPolicy??[],input.OwnedCancellationPolicy??(actor==lead?LinesToOwned(input.CancellationPolicy,"pol",lead):current.OwnedCancellationPolicy??[]),actor,x=>x.Id,x=>x.AgencyId,(x,id,agency)=>x with {Id=id,AgencyId=agency});
        var rawInImages=input.OwnedImages??(actor==lead?(input.Images??[]).Where(u=>!string.IsNullOrWhiteSpace(u)).Select((u,i)=>new OwnedImageItem(u,current.OwnedImages?.FirstOrDefault(o=>o.Url==u)?.Id??$"img-{i}",current.OwnedImages?.FirstOrDefault(o=>o.Url==u)?.AgencyId??lead)).ToArray():current.OwnedImages??[]);
        var mergedImages=MergeOwned(current.OwnedImages??[],rawInImages,actor,x=>x.Id,x=>x.AgencyId,(x,id,agency)=>x with {Id=id,AgencyId=agency});
        if(actor==lead && rawInImages.Length>0) {
            var byId=mergedImages.ToDictionary(x=>x.Id!);
            var ordered=new List<OwnedImageItem>();
            foreach(var item in rawInImages) if(item.Id!=null && byId.Remove(item.Id,out var resolved)) ordered.Add(resolved);
            ordered.AddRange(byId.Values);
            mergedImages=ordered.ToArray();
        }
        var result=(actor==lead?input:current) with {
            Timelines=days.ToArray(),
            AgencyPricing=prices,
            OwnedHighlights=highlights,
            Highlights=OwnedToText(highlights),
            OwnedInclusions=inclusions,
            Inclusions=OwnedToText(inclusions),
            OwnedExclusions=exclusions,
            Exclusions=OwnedToText(exclusions),
            OwnedCancellationPolicy=policies,
            CancellationPolicy=OwnedToText(policies),
            OwnedImages=mergedImages,
            Images=mergedImages.Select(x=>x.Url).ToArray(),
            ShareAllVersions=original.ShareAllVersions
        };
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
            prices=Configuration(tour).AgencyPricing;
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
