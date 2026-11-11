using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
namespace TripOps.Api.Controllers;

public sealed record GuideRouteInput(int LocationId,string[] GuideIds);
public sealed record GuideRoutesInput(GuideRouteInput[] Locations);
public sealed record BookingDayEdit([Required,StringLength(255)] string Title,[StringLength(10000)] string? Description);

[ApiController,Authorize(Roles="agency"),Route("api/v1/agency/bookings/{id:int}")]
public sealed class BookingAllianceOperationsController(TripOpsDbContext db,BookingService bookings,TripOps.Data.Repositories.BookingRepository repository):ControllerBase
{
    private string Actor=>User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPut("guide-routing")]
    public async Task<BookingDto> Routes(int id,GuideRoutesInput input,CancellationToken ct) {
        await using var tx=await repository.BeginPaymentChange(id,ct);
        var b=await repository.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(!BookingAlliance.IsMember(b,Actor))throw new BookingException(403,"Agency không thuộc booking.");
        if(b.Status is not (BookingStatus.Confirmed or BookingStatus.Deposited or BookingStatus.Paid or BookingStatus.InProgress))throw new BookingException(409,"Booking chưa sẵn sàng phân công.");
        var own=b.Timelines.SelectMany(d=>d.Attractions).Where(a=>(a.AgencyId??b.Tour!.AgencyId)==Actor).ToArray();
        if(input.Locations.Select(l=>l.LocationId).Distinct().Count()!=input.Locations.Length || input.Locations.Any(l=>own.All(a=>a.Id!=l.LocationId)))throw new BookingException(403,"Chỉ phân công điểm thuộc chặng công ty mình.");
        foreach(var item in input.Locations) {
            if(item.GuideIds.Distinct().Count()!=item.GuideIds.Length || item.GuideIds.Any(g=>!b.AssignedGuides.Any(a=>a.AgencyId==Actor && a.GuideId==g)))throw new BookingException(422,"HDV phải thuộc công ty và đã được giao booking.");
            var location=own.Single(a=>a.Id==item.LocationId);
            var checks=await db.BookingAttractionCheckins.Where(c=>c.BookingTimelineAttractionId==location.Id && c.AgencyId==Actor).ToListAsync(ct);
            if(checks.Any(c=>c.AttendanceStatus!=AttractionCheckinStatus.Pending && !item.GuideIds.Contains(c.GuideId)))throw new BookingException(409,"Không gỡ phân công đã check-in.");
            db.BookingAttractionCheckins.RemoveRange(checks.Where(c=>!item.GuideIds.Contains(c.GuideId)));
            foreach(var guide in item.GuideIds.Where(g=>checks.All(c=>c.GuideId!=g)))db.BookingAttractionCheckins.Add(new BookingAttractionCheckin {BookingTimelineAttractionId=location.Id,GuideId=guide,AgencyId=Actor});
        }
        await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);return await bookings.Get(Actor,id,ct);
    }
    [HttpPut("timeline-days/{dayId:int}")]
    public async Task<BookingDto> Day(int id,int dayId,BookingDayEdit input,CancellationToken ct) {
        await using var tx=await repository.BeginPaymentChange(id,ct);
        var b=await repository.Find(id,ct)??throw new BookingException(404,"Không tìm thấy booking.");
        if(!BookingAlliance.IsMember(b,Actor))throw new BookingException(403,"Agency không thuộc booking.");
        if(b.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed)throw new BookingException(409,"Booking đã đóng.");
        var day=b.Timelines.SingleOrDefault(d=>d.Id==dayId)??throw new BookingException(404,"Không tìm thấy ngày.");
        day.Title=input.Title.Trim();day.Description=input.Description?.Trim();await db.SaveChangesAsync(ct);await tx.CommitAsync(ct);return await bookings.Get(Actor,id,ct);
    }
}

[ApiController,Authorize(Roles="admin"),Route("api/v1/admin/bookings")]
public sealed class AdminBookingAllocationsController(TripOpsDbContext db,BookingService bookings):ControllerBase
{
    [HttpGet("{id:int}/allocations")]
    public async Task<BookingDto> Detail(int id,CancellationToken ct)=>await bookings.Get(User.FindFirstValue(ClaimTypes.NameIdentifier)!,id,ct);
    [HttpGet("allocations")]
    public async Task<BookingDto[]> List(CancellationToken ct) {
        var ids=await db.Bookings.OrderByDescending(b=>b.CreatedAt).Select(b=>b.Id).Take(200).ToListAsync(ct);
        var result=new List<BookingDto>();foreach(var id in ids)result.Add(await bookings.Get(User.FindFirstValue(ClaimTypes.NameIdentifier)!,id,ct));return result.ToArray();
    }
}
