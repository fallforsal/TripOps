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
        var refunds=await Db.BookingFinancialChanges.AsNoTracking().Include(x=>x.RefundRequest)
            .Where(x=>x.BookingId==b.Id&&x.RefundRequestId!=null).ToListAsync(ct);
        var agencies=b.BookingAgencies.OrderByDescending(a=>a.IsHost).Select(a=> {
            var fees=b.PaymentRequests.Where(p=>BookingBilling.IsSurcharge(p) && p.Status!=PaymentRequestStatus.Cancelled && (p.BeneficiaryAgencyId??b.Tour!.AgencyId)==a.AgencyId).ToArray();
            decimal Paid(PaymentRequest p)=>b.PaymentTransactions.Where(t=>t.PaymentRequestId==p.Id && t.Status==PaymentTransactionStatus.Success).Sum(t=>t.Amount);
            return new BookingAgencyDto(a.Id,a.AgencyId,a.Agency?.BusinessProfile?.BusinessName??a.Agency?.Name??"Agency",a.IsHost==true,
                financial?a.OriginalAmount??0:0,financial?a.FinalAmount:0,financial?a.NetPayout??0:0,a.SettlementStatus?.ToString()??"Unpaid",
                config?.CoHosts?.FirstOrDefault(h=>h.CompanyId==a.AgencyId)?.AssignedSegments,
                financial?config?.AgencyPricing?.SingleOrDefault(p=>p.AgencyId==a.AgencyId)?.Tiers:null,
                financial?fees.Sum(p=>Math.Min(Paid(p),Math.Max(0,p.Amount-p.CreditAmount))):0,
                financial?fees.Sum(p=>Math.Max(0,p.Amount-p.CreditAmount-Paid(p))):0,
                financial?fees.Sum(p=>p.Amount):0,
                financial?Math.Max(0,(BookingBilling.HasBeenApproved(b)?a.OriginalAmount??0:a.FinalAmount)+fees.Sum(p=>p.Amount)-a.FinalAmount):0,
                financial?refunds.Where(x=>x.AgencyId==a.AgencyId&&x.RefundRequest!.Status is RefundStatus.Pending or RefundStatus.Reviewing or RefundStatus.Approved).Sum(x=>x.RefundRequest!.OriginalPaidAmount):0,
                financial?a.PlatformFee??0:0);
        }).ToArray();
        var hotels = dto.SnapshotHotels;
        var days = dto.SnapshotDays;
        if (financial) {
            var ownerIds = b.BookingAgencies.Select(a => a.AgencyId).Append(b.Tour?.AgencyId ?? "").Where(x => !string.IsNullOrEmpty(x)).Distinct().ToArray();
            var suppliers = ownerIds.Length == 0 ? [] : await Db.AgencySuppliers.AsNoTracking().Where(s => ownerIds.Contains(s.AgencyId)).ToListAsync(ct);
            var byId = suppliers.ToDictionary(s => s.Id);
            BookingSupplierDto? Enrich(BookingSupplierDto? current, string type, string? agencyId, string name, int? supplierId) {
                var match = (supplierId.HasValue ? byId.GetValueOrDefault(supplierId.Value) : null)
                    ?? suppliers.FirstOrDefault(s => s.SupplierType == type && s.AgencyId == (agencyId ?? b.Tour?.AgencyId) && string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase));
                if (match is null) return current;
                return new BookingSupplierDto(
                    current?.Address ?? match.Address,
                    current?.ContactPhone ?? match.ContactPhone,
                    current?.Area ?? match.Area,
                    current?.ContactName ?? match.ContactName,
                    current?.ReferencePrice ?? match.ReferencePrice,
                    current?.Conditions ?? match.Conditions,
                    current?.ContactEmail ?? match.ContactEmail,
                    current?.Notes ?? match.Notes);
            }
            hotels = hotels?.Select(h => {
                if (h.ServiceId.HasValue) return h;
                var sid = config?.Timelines?.SelectMany(d => d.Accommodations ?? []).FirstOrDefault(x => string.Equals(x.DestinationName, h.Destination, StringComparison.OrdinalIgnoreCase) && string.Equals(x.HotelName, h.Name, StringComparison.OrdinalIgnoreCase))?.AgencySupplierId;
                return h with { Supplier = Enrich(h.Supplier, AgencySupplier.Hotel, h.AgencyId, h.Name, sid) };
            }).ToArray();
            days = days?.Select(d => d with {
                Meals = d.Meals.Select(m => {
                    if (m.ServiceId.HasValue) return m;
                    var sid = config?.Timelines?.FirstOrDefault(x => x.DayNumber == d.DayNumber)?.Meals?.FirstOrDefault(x => x.MealType == m.MealType && string.Equals(x.RestaurantName, m.Name, StringComparison.OrdinalIgnoreCase))?.AgencySupplierId;
                    return m with { Supplier = Enrich(m.Supplier, AgencySupplier.Restaurant, m.AgencyId, m.Name, sid) };
                }).ToArray()
            }).ToArray();
        }
        return dto with {SnapshotHotels=hotels,SnapshotDays=days,BookingAgencies=agencies,AgencyDirectory=agencies.Select(a=>new BookingAgencyIdentityDto(a.AgencyId,a.AgencyName)).ToArray(),AttractionCheckins=b.Timelines.SelectMany(d=>d.Attractions).SelectMany(a=>a.Checkins.Select(c=>new BookingCheckinDto(c.Id,a.Id,c.AgencyId,c.GuideId,c.Guide?.Name??"HDV",c.AttendanceStatus?.ToString()??"Pending",c.CheckinTime,c.Note,GuideAvatar:c.Guide?.Avatar))).ToArray()};
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
