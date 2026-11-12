using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "user"), Route("api/v1/bookings")]
[Tags("Booking Management")]
public sealed class CustomerBookingsController(BookingService bookings, IWebHostEnvironment environment) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost]
    [EndpointSummary("Create a new tour booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create(CreateBookingRequest request, CancellationToken ct)
    {
        var booking = await bookings.Create(Actor, request, ct);
        return CreatedAtAction(nameof(Get), new { id = booking.Id }, booking);
    }

    [HttpGet]
    [EndpointSummary("List the authenticated customer's bookings")]
    [ProducesResponseType<BookingPage<BookingListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, int page = 1, int pageSize = 20) =>
        Ok(await bookings.ListForCustomer(Actor, status, page, pageSize, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get detailed information for a specific booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) =>
        Ok(await bookings.Get(Actor, id, ct));

    [HttpPost("{id:int}/deposit")]
    [EndpointSummary("Record a simulated deposit in Development; no bank transaction is executed")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Deposit(int id, BookingDepositRequest request, CancellationToken ct)
    {
        if(!environment.IsDevelopment())throw new BookingException(503,"Thanh toán thực chưa được cấu hình.");
        return Ok(await bookings.Deposit(Actor, id, request, ct));
    }

    [HttpPost("{id:int}/payments/payos")]
    [EndpointSummary("Create (or reuse) a payOS link for the selected payment request; surcharges are independent, balance requires the deposit")]
    [ProducesResponseType<PayOsCheckoutDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> StartPayOs(int id, CancellationToken ct, [FromQuery] int? paymentRequestId = null) =>
        Ok(await bookings.StartPayOsDeposit(Actor, id, ct, paymentRequestId));

    [HttpPost("{id:int}/payments/payos/sync")]
    [EnableRateLimiting("payment-sync")]
    [EndpointSummary("Ask payOS for the real status of this booking's pending payment links and apply verified results")]
    [ProducesResponseType<PaymentSyncResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> SyncPayOs(int id, CancellationToken ct) =>
        Ok(await bookings.SyncPayOs(Actor, id, ct));

    [HttpPost("{id:int}/cancel")]
    [EndpointSummary("Cancel a booking that has no recorded payment")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(int id, BookingCancellationRequest request, CancellationToken ct) =>
        Ok(await bookings.Cancel(Actor, id, request, ct));

    [HttpPost("{id:int}/contract/signed"), RequestSizeLimit(11 * 1024 * 1024)]
    [EndpointSummary("Upload the signed travel contract (PDF, PNG or JPG up to 10 MB); required before the first payment")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadSignedContract(int id, IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length is <= 0 or > 10 * 1024 * 1024)
            throw new BookingException(400, "File hợp đồng đã ký phải là PDF, PNG hoặc JPG, tối đa 10 MB.");
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, ct);
        return Ok(await bookings.UploadSignedContract(Actor, id, stream.ToArray(), ct));
    }

    [HttpPost("{id:int}/contract/sign-sessions")]
    [EndpointSummary("Start online contract signing: returns a one-time token (15 minutes) for the QR code or for signing on this device")]
    [ProducesResponseType<SignSessionStartDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> StartSignSession(int id, CancellationToken ct) =>
        Ok(await bookings.StartSignSession(Actor, id, ct));

    [HttpGet("{id:int}/cancellation-quote")]
    [EndpointSummary("Preview the cancellation fee and refund computed by the platform policy at this moment")]
    [ProducesResponseType<CancellationQuoteDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> CancellationQuote(int id, CancellationToken ct) =>
        Ok(await bookings.CustomerCancellationQuote(Actor, id, ct));

    [HttpPost("{id:int}/cancellation-requests")]
    [EndpointSummary("Request cancellation of a paid booking; the booking is cancelled only after an Admin approves the refund")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> RequestCancellation(int id, CustomerCancellationRequest request, CancellationToken ct) =>
        Ok(await bookings.RequestCustomerCancellation(Actor, id, request, ct));

    [HttpPut("{id:int}/cancellation-requests/refund-account")]
    [EndpointSummary("Provide or update the bank account that receives the refund of a pending cancellation")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRefundAccount(int id, RefundAccountRequest request, CancellationToken ct) =>
        Ok(await bookings.UpdateRefundAccount(Actor, id, request, ct));
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/bookings")]
[Tags("Booking Management")]
public sealed class AgencyBookingsController(BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("available-guides")]
    [EndpointSummary("List active tour guides available for booking assignment")]
    [ProducesResponseType<IReadOnlyList<AvailableGuideDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AvailableGuides(CancellationToken ct) =>
        Ok(await bookings.AvailableGuides(Actor,ct));

    [HttpGet]
    [EndpointSummary("List bookings for tours owned by the authenticated agency")]
    [ProducesResponseType<BookingPage<BookingListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, string? status = null, string? search = null, int page = 1, int pageSize = 20) =>
        Ok(await bookings.ListForAgency(Actor, status, search, page, pageSize, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get agency booking details")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) =>
        Ok(await bookings.Get(Actor, id, ct));

    [HttpPost("{id:int}/decision")]
    [EndpointSummary("Approve or reject a tour booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Decide(int id, BookingDecisionRequest request, CancellationToken ct) =>
        Ok(await bookings.Decide(Actor, id, request, ct));

    [HttpPost("{id:int}/complete")]
    [EndpointSummary("The host agency completes an in-progress booking and schedules agency settlements")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Complete(int id, [FromServices] TripOps.Service.Settlements.AgencySettlementService settlements, CancellationToken ct) =>
        Ok(await bookings.Complete(Actor, id, settlements, ct));

    [HttpGet("{id:int}/cancellation-quote")]
    [EndpointSummary("Preview what cancelling this booking means for the customer (immediate, full refund, or forfeited when overdue)")]
    [ProducesResponseType<CancellationQuoteDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> CancellationQuote(int id, CancellationToken ct) =>
        Ok(await bookings.AgencyCancellationQuote(Actor, id, ct));

    [HttpPost("{id:int}/contract/review")]
    [EndpointSummary("Agency checks the customer's signed contract: verify it or ask the customer to sign again")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReviewContract(int id, ContractReviewRequest request, CancellationToken ct) =>
        Ok(await bookings.ReviewContract(Actor, id, request, ct));

    [HttpPost("{id:int}/cancel")]
    [EndpointSummary("Agency cancels a booking: immediately when unpaid, otherwise as a request an Admin must approve")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(int id, BookingCancellationRequest request, CancellationToken ct) =>
        Ok(await bookings.AgencyCancel(Actor, id, request, ct));

    [HttpPost("{id:int}/guide-assignments")]
    [EndpointSummary("Assign a Tour Guide to the booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> AssignGuide(int id, GuideAssignmentRequest request, CancellationToken ct) =>
        Ok(await bookings.AssignGuide(Actor, id, request, ct));
}

[ApiController, Authorize(Roles = "guide"), Route("api/v1/guide/bookings")]
[Tags("Tour Operations")]
public sealed class GuideBookingsController(BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("List trips/bookings assigned to the authenticated tour guide")]
    [ProducesResponseType<BookingPage<BookingListItem>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct, int page = 1, int pageSize = 20) =>
        Ok(await bookings.ListForGuide(Actor, page, pageSize, ct));

    [HttpGet("{id:int}")]
    [EndpointSummary("Get detailed trip and passenger information for assigned guide")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(int id, CancellationToken ct) =>
        Ok(await bookings.Get(Actor, id, ct));

    [HttpPost("{id:int}/attendance")]
    [EndpointSummary("Record attendance or roll-call for a passenger")]
    [ProducesResponseType<ParticipantDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Attendance(int id, AttendanceCheckinRequest request, CancellationToken ct) =>
        Ok(await bookings.RecordAttendance(Actor, id, request, ct));

    [HttpPost("{id:int}/incidents")]
    [EndpointSummary("Report an operational incident during the trip")]
    [ProducesResponseType<IncidentDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ReportIncident(int id, ReportIncidentRequest request, CancellationToken ct) =>
        Ok(await bookings.ReportIncident(Actor, id, request, ct));
}
