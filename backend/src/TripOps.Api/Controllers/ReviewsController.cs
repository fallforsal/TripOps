using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;
using TripOps.Service.Reviews;

namespace TripOps.Api.Controllers;

/// <summary>Gửi khiếu nại mới, kèm 0–5 ảnh bằng chứng (JPEG/PNG/WebP, 5 MB mỗi ảnh).</summary>
public sealed class ComplaintForm
{
    /// <summary>"Trip" (về chuyến đi, cần BookingId) hoặc "Platform" (về nền tảng TripOps).</summary>
    [Required, AllowedValues("Trip", "Platform")]
    public string Type { get; set; } = "Trip";
    public int? BookingId { get; set; }
    [Required, StringLength(50)]
    public string ReasonCode { get; set; } = "other";
    [Required, StringLength(255, MinimumLength = 5)]
    public string Title { get; set; } = "";
    [Required, StringLength(4000, MinimumLength = 10)]
    public string Description { get; set; } = "";
    public List<IFormFile> Images { get; set; } = [];
}

/// <summary>Tin nhắn trong khiếu nại, kèm 0–5 ảnh.</summary>
public sealed class ComplaintMessageForm
{
    [Required, StringLength(4000, MinimumLength = 1)]
    public string Content { get; set; } = "";
    public List<IFormFile> Images { get; set; } = [];
}

internal static class ComplaintUploads
{
    public const long RequestLimit = 27 * 1024 * 1024;

    public static async Task<IReadOnlyList<UploadedImage>> Read(IReadOnlyList<IFormFile>? files, CancellationToken ct)
    {
        if (files is null || files.Count == 0) return [];
        if (files.Count > ComplaintService.MaxImages) throw new BookingException(422, $"Tối đa {ComplaintService.MaxImages} ảnh bằng chứng.");
        var result = new List<UploadedImage>(files.Count);
        foreach (var file in files)
        {
            if (file.Length is <= 0 or > ComplaintService.MaxImageBytes) throw new BookingException(413, "Mỗi ảnh tối đa 5 MB.");
            await using var stream = new MemoryStream();
            await file.CopyToAsync(stream, ct);
            result.Add(new UploadedImage(stream.ToArray(), file.ContentType));
        }
        return result;
    }
}

[ApiController, Authorize(Roles = "user"), Route("api/v1/me/feedbacks")]
[Tags("Reviews")]
public sealed class MyFeedbacksController(FeedbackService feedbacks) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List the customer's own tour reviews with Agency replies")]
    [ProducesResponseType<IReadOnlyList<MyFeedbackDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await feedbacks.Mine(Actor, ct));

    [HttpGet("reviewable-bookings")]
    [EndpointSummary("Completed bookings the customer can still review (not reviewed, within 7 days)")]
    [ProducesResponseType<IReadOnlyList<ReviewableBookingDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reviewable(CancellationToken ct) => Ok(await feedbacks.ReviewableBookings(Actor, ct));

    [HttpPost]
    [EndpointSummary("Review a completed tour with 1–5 stars (once per booking, within 7 days)")]
    [ProducesResponseType<MyFeedbackDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateFeedbackRequest request, CancellationToken ct)
    {
        var created = await feedbacks.Create(Actor, request, ct);
        return Created($"/api/v1/me/feedbacks/{created.Id}", created);
    }
}

[ApiController, Authorize(Roles = "user"), Route("api/v1/me/complaints")]
[Tags("Complaints")]
public sealed class MyComplaintsController(ComplaintService complaints) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List the customer's own trip and platform complaints")]
    [ProducesResponseType<IReadOnlyList<ComplaintSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await complaints.Mine(Actor, ct));

    [HttpGet("booking-options")]
    [EndpointSummary("Completed bookings with their 1-day complaint deadline")]
    [ProducesResponseType<IReadOnlyList<ComplaintBookingOptionDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> BookingOptions(CancellationToken ct) => Ok(await complaints.BookingOptions(Actor, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get one of the customer's complaints with its conversation with Admin")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await complaints.MineDetail(Actor, id, ct));

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ComplaintUploads.RequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = ComplaintUploads.RequestLimit)]
    [EndpointSummary("Submit a trip complaint (completed booking, within 1 day) or a platform complaint, with up to 5 evidence images")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromForm] ComplaintForm form, CancellationToken ct)
    {
        var images = await ComplaintUploads.Read(form.Images, ct);
        var created = await complaints.Create(Actor,
            new CreateComplaintInput(form.Type, form.BookingId, form.ReasonCode, form.Title, form.Description), images, ct);
        return Created($"/api/v1/me/complaints/{created.Id}", created);
    }

    [HttpPost("{id:int}/messages")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ComplaintUploads.RequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = ComplaintUploads.RequestLimit)]
    [EndpointSummary("Customer replies to Admin inside an open complaint")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Message(int id, [FromForm] ComplaintMessageForm form, CancellationToken ct) =>
        Ok(await complaints.CustomerMessage(Actor, id, form.Content, await ComplaintUploads.Read(form.Images, ct), ct));
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/feedbacks")]
[Tags("Reviews")]
public sealed class AgencyFeedbacksController(FeedbackService feedbacks) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("Agency's computed rating and the reviews on its tours")]
    [ProducesResponseType<AgencyFeedbackOverviewDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await feedbacks.ForAgency(Actor, ct));

    [HttpPut("{id:int}/reply")]
    [EndpointSummary("Agency posts or edits its public reply under a review")]
    [ProducesResponseType<AgencyFeedbackDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reply(int id, FeedbackReplyRequest request, CancellationToken ct) =>
        Ok(await feedbacks.Reply(Actor, id, request, ct));
}

[ApiController, Authorize(Roles = "admin"), Route("api/v1/admin/complaints")]
[Tags("Complaints")]
public sealed class AdminComplaintsController(ComplaintService complaints) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List complaints, open first; filter by status or type (Trip/Platform)")]
    [ProducesResponseType<IReadOnlyList<ComplaintSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, string? type = null) =>
        Ok(await complaints.AdminList(status, type, ct));

    [HttpGet("agency-stats")]
    [EndpointSummary("Trip complaints per Agency: total, open, upheld and dismissed (not used in star ratings)")]
    [ProducesResponseType<IReadOnlyList<AgencyComplaintStatDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AgencyStats(CancellationToken ct) => Ok(await complaints.AgencyStats(ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get a complaint with the full customer–Admin conversation")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) => Ok(await complaints.AdminDetail(id, ct));

    [HttpPost("{id:int}/messages")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ComplaintUploads.RequestLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = ComplaintUploads.RequestLimit)]
    [EndpointSummary("Admin replies to the customer; a new complaint moves to InReview")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Message(int id, [FromForm] ComplaintMessageForm form, CancellationToken ct) =>
        Ok(await complaints.AdminMessage(Actor, id, form.Content, await ComplaintUploads.Read(form.Images, ct), ct));

    [HttpPost("{id:int}/resolve")]
    [EndpointSummary("Admin closes a complaint as Resolved (upheld) or Rejected, with a conclusion")]
    [ProducesResponseType<ComplaintDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Resolve(int id, ResolveComplaintRequest request, CancellationToken ct) =>
        Ok(await complaints.Resolve(Actor, id, request, ct));
}

[ApiController, Route("api/v1")]
[Tags("Reviews")]
public sealed class PublicReviewsController(FeedbackService feedbacks) : ControllerBase
{
    [HttpGet("tours/{id:int}/reviews")]
    [EndpointSummary("Public reviews of a tour with average stars and distribution")]
    [ProducesResponseType<TourReviewsDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> TourReviews(int id, CancellationToken ct) => Ok(await feedbacks.ForTour(id, ct));

    [HttpGet("agencies/{id}/rating")]
    [EndpointSummary("Agency star rating computed from all reviews of all its tours")]
    [ProducesResponseType<AgencyRatingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AgencyRating(string id, CancellationToken ct) => Ok(await feedbacks.AgencyRating(id, ct));
}
