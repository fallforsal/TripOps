using System.Security.Claims;
using System.Data;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TripOps.Data;
using TripOps.Data.Entities;
using TripOps.Data.Enums;
using TripOps.Service.Bookings;
using TripOps.Service.Payments;

namespace TripOps.Api.Controllers;

public sealed record PassengerEdit(int Id, [Required, StringLength(150)] string FullName, DateTime? DateOfBirth,
    string? Gender, string? IdentityNumber, string? Note, string? RoommateNote, string? RestaurantNote);
public sealed record PassengerEdits([Required] PassengerEdit[] Participants);
public sealed record LocationCheckin(
    [Required, AllowedValues("CheckedIn")] string Status,
    [StringLength(500)] string? Note,
    [Range(-90.0, 90.0)] double? Latitude = null,
    [Range(-180.0, 180.0)] double? Longitude = null,
    [Range(0.0, 100.0)] double? AccuracyMeters = null,
    DateTime? RecordedAtUtc = null);
public sealed record BookingStopGeofence(
    [Range(1, int.MaxValue)] int LocationId,
    [Range(-90.0, 90.0)] double Latitude,
    [Range(-180.0, 180.0)] double Longitude,
    [Range(200, 20000)] int RadiusMeters);

[ApiController, Authorize, Route("api/v1/bookings/{id:int}")]
[Tags("Booking Management")]
public sealed class BookingOperationsController(TripOpsDbContext db, BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPut("participants"), Authorize(Roles = "agency")]
    [EndpointSummary("Update passenger identity and preferences without changing agreed prices")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Passengers(int id, PassengerEdits request, CancellationToken ct)
    {
        var b = await db.Bookings.Include(x => x.Tour).Include(x => x.Participants).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new BookingException(404, "Booking not found.");
        if (b.Tour?.AgencyId != Actor) throw new BookingException(403, "Bạn không có quyền sửa hành khách.");
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
    [HttpPut("locations/{locationId:int}/geofence"), Authorize(Roles = "agency")]
    [EndpointSummary("Configure stop geofence before guide check-in")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ConfigureGeofence(int id, int locationId,
        BookingStopGeofence request, CancellationToken ct)
    {
        if (request.LocationId != locationId)
            throw new BookingException(422, "Location ID does not match route.");
        var b = await db.Bookings.Include(x => x.Tour).SingleOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new BookingException(404, "Booking not found.");
        if (b.Tour?.AgencyId != Actor) throw new BookingException(403, "Only the managing Agency can configure stop GPS.");
        if (b.Status is BookingStatus.Completed or BookingStatus.Cancelled or BookingStatus.Rejected)
            throw new BookingException(409, "Booking is closed.");
        var stop = await db.BookingTimelineAttractions
            .SingleOrDefaultAsync(x => x.Id == locationId && x.BookingTimeline.BookingId == id, ct)
            ?? throw new BookingException(404, "Booking stop not found.");
        if (stop.AttendanceStatus == "CheckedIn")
            throw new BookingException(409, "A completed stop cannot be moved.");
        stop.Latitude = request.Latitude;
        stop.Longitude = request.Longitude;
        stop.GeofenceRadiusMeters = request.RadiusMeters;
        await db.SaveChangesAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
}

[ApiController, Authorize(Roles = "guide"), Route("api/v1/guide/bookings/{id:int}"), Tags("Guide Operations")]
public sealed class GuideOperationsController(TripOpsDbContext db, BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private async Task<Booking> Assigned(int id, CancellationToken ct) => await db.Bookings.Include(b => b.Tour).Include(b => b.AssignedGuides).SingleOrDefaultAsync(b => b.Id == id && b.AssignedGuides.Any(g => g.GuideId == Actor), ct) ?? throw new BookingException(403, "Guide is not assigned to this booking.");
    [HttpPost("start")]
    [EndpointSummary("Start an assigned tour on or after its departure date")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Start(int id, CancellationToken ct) { var b = await Assigned(id, ct); if (b.Status is not (BookingStatus.Confirmed or BookingStatus.Paid) || b.StartDate.Date > PaymentRules.VietnamDate(DateTime.UtcNow)) throw new BookingException(409, "Booking is not ready to depart."); b.Status = BookingStatus.InProgress; await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct)); }
    [HttpPost("complete")]
    [EndpointSummary("Complete an assigned tour already in progress")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(int id, CancellationToken ct) { var b = await Assigned(id, ct); if (b.Status != BookingStatus.InProgress) throw new BookingException(409, "Booking must be in progress."); b.Status = BookingStatus.Completed; await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct)); }
    private static double DistanceMeters(double aLat, double aLon, double bLat, double bLon)
    {
        const double earth = 6371000.0;
        static double Radians(double d) => d * Math.PI / 180.0;
        var dLat = Radians(bLat - aLat);
        var dLon = Radians(bLon - aLon);
        var hav = Math.Pow(Math.Sin(dLat / 2), 2) +
            Math.Cos(Radians(aLat)) * Math.Cos(Radians(bLat)) * Math.Pow(Math.Sin(dLon / 2), 2);
        return earth * 2 * Math.Asin(Math.Min(1.0, Math.Sqrt(hav)));
    }

    [HttpPost("locations/{locationId:int}/check-in")]
    [EndpointSummary("GPS-validated ordered guide check-in, from Vietnam departure date onwards")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Checkin(int id, int locationId, LocationCheckin request, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var b = await Assigned(id, ct);
        if (b.Status is not (BookingStatus.Confirmed or BookingStatus.Paid or BookingStatus.InProgress))
            throw new BookingException(409, "Booking is not active.");
        var now = DateTime.UtcNow;
        if (PaymentRules.VietnamDate(now) < b.StartDate.Date)
            throw new BookingException(409, "Chưa đến ngày khởi hành, không thể check-in.");
        if (request.Status != "CheckedIn")
            throw new BookingException(422, "Chỉ hỗ trợ xác nhận đã đến địa điểm; không thể bỏ qua thứ tự.");

        var stops = await db.BookingTimelineAttractions.Include(x => x.BookingTimeline)
            .Where(x => x.BookingTimeline.BookingId == id).ToListAsync(ct);
        var ordered = stops.OrderBy(x => x.BookingTimeline.DayNumber)
            .ThenBy(x => x.VisitOrder > 0 ? x.VisitOrder : int.MaxValue)
            .ThenBy(x => x.Id).ToList();
        var location = ordered.SingleOrDefault(x => x.Id == locationId)
            ?? throw new BookingException(404, "Booking location not found.");
        if (location.AttendanceStatus == "CheckedIn")
            throw new BookingException(409, "Điểm dừng này đã được check-in.");
        var next = ordered.FirstOrDefault(x => x.AttendanceStatus != "CheckedIn");
        if (next?.Id != locationId)
            throw new BookingException(409, "Phải check-in điểm đến trước đó theo thứ tự lịch trình.");

        if (!location.Latitude.HasValue || !location.Longitude.HasValue)
            throw new BookingException(409, "Agency chưa cấu hình tọa độ GPS cho điểm đến.");
        if (!request.Latitude.HasValue || !request.Longitude.HasValue ||
            !request.AccuracyMeters.HasValue || !request.RecordedAtUtc.HasValue)
            throw new BookingException(422, "Cần vị trí GPS hiện tại và độ chính xác.");
        if (!double.IsFinite(request.Latitude.Value) || !double.IsFinite(request.Longitude.Value) ||
            !double.IsFinite(request.AccuracyMeters.Value) ||
            request.Latitude.Value is < -90 or > 90 || request.Longitude.Value is < -180 or > 180 ||
            request.AccuracyMeters.Value is < 0 or > 100)
            throw new BookingException(422, "Tọa độ hoặc độ chính xác GPS không hợp lệ.");
        var recordedAt = request.RecordedAtUtc.Value.ToUniversalTime();
        if (now - recordedAt > TimeSpan.FromMinutes(3) || recordedAt - now > TimeSpan.FromSeconds(30))
            throw new BookingException(422, "Vị trí GPS đã cũ, hãy cập nhật GPS mới.");
        var distance = DistanceMeters(request.Latitude.Value, request.Longitude.Value,
            location.Latitude.Value, location.Longitude.Value);
        var radius = location.GeofenceRadiusMeters;
        if (radius is < 200 or > 20000 || distance + request.AccuracyMeters.Value > radius)
            throw new BookingException(409, "Bạn chưa ở trong phạm vi GPS của điểm đến.");

        var check = await db.BookingAttractionCheckins.SingleOrDefaultAsync(
            x => x.BookingTimelineAttractionId == locationId && x.GuideId == Actor, ct);
        if (check is null)
        {
            check = new BookingAttractionCheckin
            {
                BookingTimelineAttractionId = locationId,
                GuideId = Actor,
                AgencyId = b.AssignedGuides.Single(x => x.GuideId == Actor).AgencyId
            };
            db.BookingAttractionCheckins.Add(check);
        }
        check.AttendanceStatus = AttractionCheckinStatus.CheckedIn;
        check.CheckinTime = now;
        check.GpsLatitude = request.Latitude;
        check.GpsLongitude = request.Longitude;
        check.GpsAccuracyMeters = request.AccuracyMeters;
        check.GpsRecordedAtUtc = recordedAt;
        check.Note = request.Note;
        location.GuideId = Actor;
        location.AttendanceStatus = "CheckedIn";
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
}
