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

public sealed record PassengerEdit(int Id, [Required, StringLength(150)] string FullName, DateTime? DateOfBirth,
    string? Gender, string? IdentityNumber, string? Note, string? RoommateNote, string? RestaurantNote);
public sealed record PassengerEdits([Required] PassengerEdit[] Participants);
public sealed record LocationCheckin([AllowedValues("CheckedIn", "Skipped", "Pending")] string Status, string? Note);

[ApiController, Authorize, Route("api/v1/bookings/{id:int}")]
[Tags("Booking Management")]
public sealed class BookingOperationsController(TripOpsDbContext db, BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPut("participants")]
    [EndpointSummary("Update passenger identity and preferences without changing agreed prices")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Passengers(int id, PassengerEdits request, CancellationToken ct)
    {
        var b = await db.Bookings.Include(x => x.Tour).Include(x => x.Participants).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new BookingException(404, "Booking not found.");
        if (b.CustomerId != Actor && b.Tour?.AgencyId != Actor) throw new BookingException(403, "Bạn không có quyền sửa hành khách.");
        if (b.Status is BookingStatus.Cancelled or BookingStatus.Rejected or BookingStatus.Completed or BookingStatus.InProgress) throw new BookingException(409, "Booking không còn cho phép sửa hành khách.");
        if (request.Participants.Select(p => p.Id).Distinct().Count() != request.Participants.Length || request.Participants.Length != b.Participants.Count) throw new BookingException(422, "Thêm/bớt khách cần chốt lại giá với Agency; thao tác này chỉ sửa hồ sơ hiện có.");
        foreach (var input in request.Participants)
        {
            var p = b.Participants.SingleOrDefault(p => p.Id == input.Id) ?? throw new BookingException(422, "Passenger does not belong to booking.");
            if (input.DateOfBirth?.Date != p.DateOfBirth?.Date) throw new BookingException(422, "Đổi ngày sinh cần Agency kiểm tra lại phân khúc giá.");
            p.FullName = input.FullName.Trim(); p.Gender = input.Gender; p.IdentityNumber = input.IdentityNumber; p.Note = input.Note; p.RoommateNote = input.RoommateNote; p.RestaurantNote = input.RestaurantNote;
        }
        await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct));
    }

    [HttpDelete("guide-assignments/{guideId}"), Authorize(Roles = "agency")]
    [EndpointSummary("Remove an Agency guide assignment before departure")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> RemoveGuide(int id, string guideId, CancellationToken ct)
    {
        var b = await db.Bookings.Include(x => x.Tour).Include(x => x.AssignedGuides).Include(x => x.Participants).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new BookingException(404, "Booking not found.");
        if (b.Tour?.AgencyId != Actor) throw new BookingException(403, "Agency does not own this booking.");
        if (b.Status is BookingStatus.InProgress or BookingStatus.Completed) throw new BookingException(409, "Cannot remove a guide after departure.");
        var assignment = b.AssignedGuides.SingleOrDefault(g => g.GuideId == guideId) ?? throw new BookingException(404, "Assignment not found.");
        foreach (var p in b.Participants.Where(p => p.AssignedGuideId == guideId)) p.AssignedGuideId = null;
        await db.SaveChangesAsync(ct); db.BookingAssignedGuides.Remove(assignment); await db.SaveChangesAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }

    [HttpGet("snapshots")]
    [EndpointSummary("List snapshot version history for the booking")]
    [ProducesResponseType<List<BookingSnapshotSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListSnapshots(int id, CancellationToken ct) =>
        Ok(await bookings.ListSnapshots(Actor, id, ct));

    [HttpGet("snapshots/{snapshotId:int}")]
    [EndpointSummary("Get detailed snapshot content for a specific version")]
    [ProducesResponseType<BookingSnapshotDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSnapshot(int id, int snapshotId, CancellationToken ct) =>
        Ok(await bookings.GetSnapshot(Actor, id, snapshotId, ct));

    [HttpPost("snapshots/{snapshotId:int}/accept")]
    [EndpointSummary("Customer accepts an agency proposal version")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AcceptProposal(int id, int snapshotId, CancellationToken ct) =>
        Ok(await bookings.AcceptProposal(Actor, id, snapshotId, ct));
#if false
    }
}

#endif
}
[ApiController, Authorize(Roles = "guide"), Route("api/v1/guide/bookings/{id:int}"), Tags("Guide Operations")]
public sealed class GuideOperationsController(TripOpsDbContext db, BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private async Task<Booking> Assigned(int id, CancellationToken ct) => await db.Bookings.Include(b => b.Tour).Include(b => b.AssignedGuides).SingleOrDefaultAsync(b => b.Id == id && b.AssignedGuides.Any(g => g.GuideId == Actor), ct) ?? throw new BookingException(403, "Guide is not assigned to this booking.");
    [HttpPost("start")]
    [EndpointSummary("Start an assigned tour on or after its departure date")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Start(int id, CancellationToken ct) { var b = await Assigned(id, ct); if (b.Status is not (BookingStatus.Confirmed or BookingStatus.Paid) || b.StartDate.Date > DateTime.UtcNow.Date) throw new BookingException(409, "Booking is not ready to depart."); b.Status = BookingStatus.InProgress; await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct)); }
    [HttpPost("complete")]
    [EndpointSummary("Complete an assigned tour already in progress")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(int id, CancellationToken ct) { var b = await Assigned(id, ct); if (b.Status != BookingStatus.InProgress) throw new BookingException(409, "Booking must be in progress."); b.Status = BookingStatus.Completed; await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct)); }
    [HttpPost("locations/{locationId:int}/check-in")]
    [EndpointSummary("Record a guide check-in against a booking itinerary location")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Checkin(int id, int locationId, LocationCheckin request, CancellationToken ct)
    {
        var b = await Assigned(id, ct);
        if (b.Status is not (BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress)) throw new BookingException(409, "Booking is not active.");
        var location = await db.BookingTimelineAttractions.SingleOrDefaultAsync(l => l.Id == locationId && l.BookingTimeline.BookingId == id, ct) ?? throw new BookingException(404, "Booking location not found.");
        var check = await db.BookingAttractionCheckins.SingleOrDefaultAsync(c => c.BookingTimelineAttractionId == locationId && c.GuideId == Actor, ct);
        if (check is null) { check = new BookingAttractionCheckin { BookingTimelineAttractionId = locationId, GuideId = Actor, AgencyId = b.AssignedGuides.Single(g => g.GuideId == Actor).AgencyId }; db.BookingAttractionCheckins.Add(check); }
        check.AttendanceStatus = Enum.Parse<AttractionCheckinStatus>(request.Status, true); check.CheckinTime = DateTime.UtcNow; check.Note = request.Note; location.GuideId = Actor; location.AttendanceStatus = request.Status;
        await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct));
    }
}
