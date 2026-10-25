using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

[ApiController, Authorize, Route("api/v1/bookings")]
[Tags("Booking Management")]
public sealed class CustomerBookingsController(BookingService bookings) : ControllerBase
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
    [EndpointSummary("Pay deposit or payment proof for booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Deposit(int id, BookingDepositRequest request, CancellationToken ct) =>
        Ok(await bookings.Deposit(Actor, id, request, ct));

    [HttpPost("{id:int}/cancel")]
    [EndpointSummary("Cancel a pending or confirmed booking")]
    [ProducesResponseType<BookingDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Cancel(int id, BookingCancellationRequest request, CancellationToken ct) =>
        Ok(await bookings.Cancel(Actor, id, request, ct));
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/bookings")]
[Tags("Booking Management")]
public sealed class AgencyBookingsController(BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

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
