using Microsoft.EntityFrameworkCore;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
namespace TripOps.Service.Bookings;

public sealed partial class BookingQuotationService
{
    public async Task InitializeAllianceRoster(Booking b,CancellationToken ct)
    {
        if(b.BookingAgencies.Count<2)return;
        var config=await BookingAlliance.BookedConfiguration(Db,b,ct);
        Require(config?.AgencyPricing?.Length==b.BookingAgencies.Count,"Thiếu bảng giá từng chặng của phiên bản đã đặt.");
        var source=b.Participants.ToArray();b.Participants.Clear();
        foreach(var p in source) {
            var age=p.DateOfBirth.HasValue?BookingAlliance.Age(p.DateOfBirth.Value,b.StartDate):
                config!.PricingTiers?.FirstOrDefault(t=>t.Name==p.TierName)?.MinAge??30;
            var rows=b.BookingAgencies.Select(a=>BookingAlliance.Copy(p,a.AgencyId,Money(BookingAlliance.Tier(config,a.AgencyId,age)?.PricePerGuest??0),a.IsHost==true)).ToArray();
            var host=rows.Single(r=>r.IsPrimary);host.Price+=p.Price-rows.Sum(r=>r.Price);
            Require(host.Price>=0,"Giá vé không đủ phân bổ cho các chặng.");
            foreach(var row in rows)b.Participants.Add(row);
        }
    }

    public async Task<BookingDto> AllianceDetails(Booking b,BookingDto dto,bool financial,CancellationToken ct)
    {
        var config=await BookingAlliance.BookedConfiguration(Db,b,ct);
        var agencies=b.BookingAgencies.OrderByDescending(a=>a.IsHost).Select(a=> {
            var fees=b.PaymentRequests.Where(p=>BookingBilling.IsSurcharge(p) && p.Status!=PaymentRequestStatus.Cancelled && (p.BeneficiaryAgencyId??b.Tour!.AgencyId)==a.AgencyId).ToArray();
            decimal Paid(PaymentRequest p)=>b.PaymentTransactions.Where(t=>t.PaymentRequestId==p.Id && t.Status==PaymentTransactionStatus.Success).Sum(t=>t.Amount);
            return new BookingAgencyDto(a.Id,a.AgencyId,a.Agency?.BusinessProfile?.BusinessName??a.Agency?.Name??"Agency",a.IsHost==true,
                financial?a.OriginalAmount??0:0,financial?a.FinalAmount:0,financial?a.NetPayout??0:0,a.SettlementStatus?.ToString()??"Unpaid",
                config?.CoHosts?.FirstOrDefault(h=>h.CompanyId==a.AgencyId)?.AssignedSegments,
                financial?config?.AgencyPricing?.SingleOrDefault(p=>p.AgencyId==a.AgencyId)?.Tiers:null,
                financial?fees.Sum(Paid):0,financial?fees.Sum(p=>Math.Max(0,p.Amount-Paid(p))):0);
        }).ToArray();
        return dto with {BookingAgencies=agencies,AgencyDirectory=agencies.Select(a=>new BookingAgencyIdentityDto(a.AgencyId,a.AgencyName)).ToArray(),AttractionCheckins=b.Timelines.SelectMany(d=>d.Attractions).SelectMany(a=>a.Checkins.Select(c=>new BookingCheckinDto(c.Id,a.Id,c.AgencyId,c.GuideId,c.Guide?.Name??"HDV",c.AttendanceStatus?.ToString()??"Pending",c.CheckinTime,c.Note))).ToArray()};
    }

    private void NotifyAgencies(Booking b,string message,string[]? affected=null)
    {
        foreach(var id in b.BookingAgencies.Where(a=>affected==null || affected.Contains(a.AgencyId)).Select(a=>a.AgencyId).Append(b.Tour!.AgencyId).Distinct())
            Db.WorkflowNotifications.Add(new WorkflowNotification {UserId=id,BookingId=b.Id,Message=message});
    }

    public async Task NotifyAllianceBooking(Booking b,CancellationToken ct) {
        NotifyAgencies(b,$"Có booking {b.BookingCode}. Vui lòng xem danh sách khách và điều phối chặng của công ty.");
        await Db.SaveChangesAsync(ct);
    }
}
