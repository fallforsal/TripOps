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
using TripOps.Service.Accounts;

namespace TripOps.Api.Controllers;

public sealed record PassengerEdit(int Id, [Required, StringLength(150)] string FullName, DateTime? DateOfBirth,
    string? Gender, string? IdentityNumber, string? Note, string? RoommateNote, string? RestaurantNote, [Phone, StringLength(30)] string? PhoneNumber = null);
public sealed record PassengerEdits([Required] PassengerEdit[] Participants);
// The Guide confirms arrival with photos, checks out with photos, or skips with a reason.
public sealed record LocationCheckin(
    [Required, AllowedValues("CheckedIn", "Skipped")] string Status,
    [StringLength(500)] string? Note);

/// <summary>One to five check-in or skip photos, uploaded in the same action.</summary>
public sealed class GuideCheckinImagesForm
{
    [Required, AllowedValues("CheckedIn", "Skipped")]
    public string Status { get; set; } = "CheckedIn";
    [StringLength(500)]
    public string? Note { get; set; }
    public List<IFormFile> Images { get; set; } = [];
}

public sealed class GuideCheckoutImagesForm
{
    [StringLength(500)] public string? Note { get; set; }
    public List<IFormFile> Images { get; set; } = [];
}

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
        if (request.Participants.Length==0 || request.Participants.Select(p => p.Id).Distinct().Count() != request.Participants.Length) throw new BookingException(422, "Chỉ sửa thông tin hành khách đã có.");
        foreach (var input in request.Participants)
        {
            var p = b.Participants.SingleOrDefault(p => p.Id == input.Id) ?? throw new BookingException(422, "Passenger does not belong to booking.");
            if (input.DateOfBirth?.Date != p.DateOfBirth?.Date) throw new BookingException(422, "Đổi ngày sinh cần Agency kiểm tra lại phân khúc giá.");
            foreach(var copy in b.Participants.Where(row=>row.ParticipantIndex==p.ParticipantIndex)) {
                copy.PhoneNumber = string.IsNullOrWhiteSpace(input.PhoneNumber) ? null : input.PhoneNumber.Trim(); copy.FullName = input.FullName.Trim(); copy.Gender = input.Gender; copy.IdentityNumber = input.IdentityNumber; copy.Note = input.Note; copy.RoommateNote = input.RoommateNote; copy.RestaurantNote = input.RestaurantNote;
            }
        }
        await db.SaveChangesAsync(ct); return Ok(await bookings.Get(Actor, id, ct));
    }

    [HttpDelete("guide-assignments/{guideId}"), Authorize(Roles = "agency")]
    [EndpointSummary("Remove an Agency guide assignment before departure")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> RemoveGuide(int id, string guideId, CancellationToken ct)
    {
        var b = await db.Bookings.Include(x => x.Tour).Include(x=>x.BookingAgencies).Include(x => x.AssignedGuides).Include(x => x.Participants).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new BookingException(404, "Booking not found.");
        if (!BookingAlliance.IsMember(b,Actor)) throw new BookingException(403, "Agency không thuộc booking.");
        if (b.Status is BookingStatus.InProgress or BookingStatus.Completed) throw new BookingException(409, "Cannot remove a guide after departure.");
        var assignment = b.AssignedGuides.SingleOrDefault(g => g.GuideId == guideId) ?? throw new BookingException(404, "Assignment not found.");
        if(assignment.AgencyId!=Actor)throw new BookingException(403,"Chỉ được gỡ HDV của công ty mình.");
        var routes=await db.BookingAttractionCheckins.Where(c=>c.BookingTimelineAttraction.BookingTimeline.BookingId==id && c.GuideId==guideId).ToListAsync(ct);
        if(routes.Any(c=>c.AttendanceStatus!=AttractionCheckinStatus.Pending))throw new BookingException(409,"HDV đã check-in, không thể gỡ phân công.");
        db.BookingAttractionCheckins.RemoveRange(routes);
        foreach(var location in await db.BookingTimelineAttractions.Include(a=>a.Checkins).Where(a=>a.BookingTimeline.BookingId==id && a.GuideId==guideId).ToListAsync(ct)) {
            location.GuideId=null;
        }
        foreach (var p in b.Participants.Where(p => p.AssignedGuideId == guideId)) p.AssignedGuideId = null;
        await db.SaveChangesAsync(ct);
        db.BookingAssignedGuides.Remove(assignment);
        WorkflowNotice.Queue(db, guideId, $"Agency đã hủy phân công booking {b.BookingCode}.",
            id, actorId: Actor);
        await db.SaveChangesAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
}

[ApiController, Authorize(Roles = "guide"), Route("api/v1/guide/bookings/{id:int}"), Tags("Guide Operations")]
public sealed class GuideOperationsController(TripOpsDbContext db, BookingService bookings, CloudinaryStorage media) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    private async Task<Booking> Assigned(int id, CancellationToken ct) => await db.Bookings
        .Include(b => b.Tour)
        .Include(b => b.BookingAgencies)
        .Include(b => b.AssignedGuides)
        .Include(b => b.Accommodations)
        .Include(b => b.Timelines).ThenInclude(t => t.Attractions).ThenInclude(a => a.Checkins)
        .Include(b => b.Timelines).ThenInclude(t => t.Meals)
        .AsSplitQuery()
        .SingleOrDefaultAsync(b => b.Id == id && b.AssignedGuides.Any(g => g.GuideId == Actor), ct)
        ?? throw new BookingException(403, "Guide is not assigned to this booking.");
    [HttpPost("start")]
    [EndpointSummary("Start an assigned tour on or after its departure date")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Start(int id, CancellationToken ct)
    {
        var b = await Assigned(id, ct);
        var ownAgency = b.AssignedGuides.Single(a => a.GuideId == Actor).AgencyId;
        if (!GuideBookingRules.IsAssignedToDayOne(b, Actor, ownAgency))
            throw new BookingException(403, "Chỉ hướng dẫn viên được phân công vào Ngày 1 mới có quyền bắt đầu tour.");
        if (b.Status is not (BookingStatus.Confirmed or BookingStatus.Paid) || b.StartDate.Date > PaymentRules.VietnamDate(DateTime.UtcNow))
            throw new BookingException(409, "Booking is not ready to depart.");
        b.Status = BookingStatus.InProgress;
        WorkflowNotice.Queue(db, b.Tour!.AgencyId, $"Hướng dẫn viên đã bắt đầu tour booking {b.BookingCode}.", id, actorId: Actor);
        await db.SaveChangesAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
    [HttpPost("locations/{locationId:int}/check-in")]
    [EndpointSummary("Deprecated: photo-less check-in or skip is rejected")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public Task<IActionResult> Checkin(int id, int locationId, LocationCheckin request, CancellationToken ct) =>
        CheckinInternal(id, locationId, request, null, ct);

    [HttpPost("locations/{locationId:int}/check-in-with-images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(22 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 22 * 1024 * 1024)]
    [EndpointSummary("Check in or skip next stop with 1–5 JPEG/PNG/WebP photos (5 MB each, 20 MB total)")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public Task<IActionResult> CheckinWithImages(
        int id, int locationId, [FromForm] GuideCheckinImagesForm request, CancellationToken ct) =>
        CheckinInternal(id, locationId, new LocationCheckin(request.Status, request.Note), request.Images, ct);

    [HttpPost("locations/{locationId:int}/check-out-with-images")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(22 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 22 * 1024 * 1024)]
    [EndpointSummary("Check out the active location with 1-5 photos")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckoutWithImages(
        int id, int locationId, [FromForm] GuideCheckoutImagesForm request, CancellationToken ct)
    {
        GuideCheckinPhotoRules.ValidateFiles(request.Images.Select(f => (f.Length, f.ContentType)).ToArray());
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var booking = await Assigned(id, ct);
        var days = await db.BookingTimelines
            .Include(d => d.Attractions).ThenInclude(a => a.Checkins)
            .Include(d => d.Meals)
            .Where(d => d.BookingId == id).ToListAsync(ct);
        var location = GuideLocationCheckinRules.OrderedStops(days).SingleOrDefault(a => a.Id == locationId)
            ?? throw new BookingException(404, "Booking location not found.");
        var agencyId = booking.AssignedGuides.Single(a => a.GuideId == Actor).AgencyId;
        if ((location.AgencyId ?? booking.Tour!.AgencyId) != agencyId)
            throw new BookingException(403, "HDV chỉ check-out điểm thuộc chặng công ty mình.");
        var checkin = location.Checkins.SingleOrDefault(c => c.GuideId == Actor && c.AgencyId == agencyId)
            ?? throw new BookingException(403, "Bạn chưa được phân công tại địa điểm này.");
        if (!GuideLocationCheckinRules.CanCheckIn(booking, Actor, agencyId, DateTime.UtcNow))
            throw new BookingException(409, "Tour chưa khởi hành hoặc đã đóng.");
        if (checkin.AttendanceStatus != AttractionCheckinStatus.CheckedIn ||
            checkin.CheckoutTime.HasValue ||
            GuideLocationCheckinRules.NextUncheckedStopIdForGuide(booking, Actor, agencyId) != locationId)
            throw new BookingException(409, "Chỉ được check-out điểm đang check-in.");

        var urls = new List<string>();
        foreach (var file in request.Images)
        {
            await using var stream = new MemoryStream();
            await file.CopyToAsync(stream, ct);
            var bytes = stream.ToArray();
            if (bytes.Length != file.Length || !GuideCheckinPhotoRules.IsValidImage(bytes, file.ContentType))
                throw new BookingException(422, "Ảnh không đúng định dạng.");
            urls.Add(await media.UploadGuideCheckinImage(Actor, bytes, file.ContentType, ct));
        }
        checkin.CheckoutPhotoUrl = GuideCheckinPhotoRules.Encode(urls);
        checkin.CheckoutNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        checkin.CheckoutTime = DateTime.UtcNow;
        checkin.AttendanceStatus = AttractionCheckinStatus.CheckedOut;
        GuideLocationCheckinRules.SyncAttractionStatus(location);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }

    private async Task<IActionResult> CheckinInternal(
        int id, int locationId, LocationCheckin request, IReadOnlyList<IFormFile>? images, CancellationToken ct)
    {
        if (request.Status is not ("CheckedIn" or "Skipped"))
            throw new BookingException(422, "Chỉ được xác nhận đã đến hoặc bỏ qua địa điểm.");
        if (images is not null)
            GuideCheckinPhotoRules.ValidateFiles(images.Select(f => (f.Length, f.ContentType)).ToArray());

        // Preserve the original sequential/date/Agency validation for JSON and multipart.
        // Serializable transaction prevents two parallel check-ins from racing forward.
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        var booking = await Assigned(id, ct);

        // Read the complete itinerary rather than only the requested stop.
        // A guide from another Agency may not check in another Agency's stage.
        var days = await db.BookingTimelines
            .Include(d => d.Attractions).ThenInclude(a => a.Checkins)
            .Include(d => d.Meals)
            .Where(d => d.BookingId == id).ToListAsync(ct);
        var ordered = GuideLocationCheckinRules.OrderedStops(days);
        var location = ordered.SingleOrDefault(a => a.Id == locationId)
            ?? throw new BookingException(404, "Booking location not found.");
        var agencyId = booking.AssignedGuides.Single(a => a.GuideId == Actor).AgencyId;
        if ((location.AgencyId ?? booking.Tour!.AgencyId) != agencyId)
            throw new BookingException(403, "HDV chỉ check-in điểm thuộc chặng công ty mình.");
        var checkin = location.Checkins.SingleOrDefault(c => c.GuideId == Actor && c.AgencyId == agencyId)
            ?? throw new BookingException(403, "Bạn chưa được phân công tại địa điểm này.");
        if (images is null)
            throw new BookingException(422, request.Status == "Skipped"
                ? "Bỏ qua điểm dừng bắt buộc có ảnh chụp camera."
                : "Check-in bắt buộc có ảnh chụp camera.");
        // Check ownership before lifecycle rules, including before departure.
        if (!GuideLocationCheckinRules.CanCheckIn(booking, Actor, agencyId, DateTime.UtcNow))
            throw new BookingException(409, "Chưa đến ngày khởi hành hoặc tour đã đóng, không thể check-in.");

        var guideAlreadyHandled = checkin.AttendanceStatus is
            AttractionCheckinStatus.CheckedIn or AttractionCheckinStatus.CheckedOut or AttractionCheckinStatus.Skipped;
        if (guideAlreadyHandled)
            throw new BookingException(409, "Điểm đến này đã được xử lý.");

        var nextId = GuideLocationCheckinRules.NextUncheckedStopIdForGuide(booking, Actor, agencyId);
        if (nextId != locationId)
            throw new BookingException(409, "Phải check-out hoặc bỏ qua điểm trước khi xử lý điểm tiếp theo.");

        // Only update the existing routing row; check-in must never create an assignment.
        // No GPS, coordinates, location permission, or device-location payload.
        var skipped = request.Status == "Skipped";
        var photoUrls = new List<string>(images.Count);
        foreach (var file in images)
        {
            await using var stream = new MemoryStream();
            await file.CopyToAsync(stream, ct);
            var bytes = stream.ToArray();
            if (bytes.Length != file.Length || !GuideCheckinPhotoRules.IsValidImage(bytes, file.ContentType))
                throw new BookingException(422, "Ảnh không đúng định dạng JPEG, PNG hoặc WebP.");
            photoUrls.Add(await media.UploadGuideCheckinImage(Actor, bytes, file.ContentType, ct));
        }
        checkin.PhotoUrl = GuideCheckinPhotoRules.Encode(photoUrls);
        checkin.AttendanceStatus = skipped ? AttractionCheckinStatus.Skipped : AttractionCheckinStatus.CheckedIn;
        checkin.CheckinTime = DateTime.UtcNow;
        checkin.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        GuideLocationCheckinRules.SyncAttractionStatus(location);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
}
