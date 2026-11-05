using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

[ApiController, Authorize, Route("api/v1/bookings/{bookingId:int}/quotations"), Tags("Booking Quotations")]
public sealed class BookingQuotationsController(BookingQuotationService quotations) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List quotation revisions for the booking")]
    [ProducesResponseType<IReadOnlyList<QuotationView>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(int bookingId, CancellationToken ct) =>
        Ok(await quotations.Quotations(Actor, bookingId, User.IsInRole("agency"), ct));
    [HttpGet("supplier-requests"), Authorize(Roles = "agency")]
    [EndpointSummary("List Provider confirmations requested for an Agency booking")]
    [ProducesResponseType<IReadOnlyList<ProviderRequestView>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SupplierRequests(int bookingId, CancellationToken ct) =>
        Ok(await quotations.AgencyRequests(Actor, bookingId, ct));
    [HttpPut("draft"), Authorize(Roles = "agency")]
    [EndpointSummary("Set Agency supplier costs and Agency profit on the current draft")]
    [ProducesResponseType<QuotationView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Price(int bookingId, AgencyQuotationInput input, CancellationToken ct) =>
        Ok(await quotations.Price(Actor, bookingId, input, ct));
    [HttpPost("send"), Authorize(Roles = "agency")]
    [EndpointSummary("Send the fully confirmed quotation revision to the customer")]
    [ProducesResponseType<QuotationView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Send(int bookingId, CancellationToken ct) =>
        Ok(await quotations.Send(Actor, bookingId, ct));
    [HttpPost("{version:int}/accept"), Authorize(Roles = "user")]
    [EndpointSummary("Customer accepts the latest sent quotation before deposit")]
    [ProducesResponseType<QuotationView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Accept(int bookingId, int version, CancellationToken ct) =>
        Ok(await quotations.Accept(Actor, bookingId, version, ct));
    [HttpPost("change-plan"), Authorize(Roles = "user")]
    [EndpointSummary("Customer changes a custom Tour plan or service selection before deposit")]
    [ProducesResponseType<QuotationView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangePlan(int bookingId, BookingPlanChange input, CancellationToken ct) =>
        Ok(await quotations.ChangePlan(Actor, bookingId, input, ct));
}

[ApiController, Authorize(Roles = "provider"), Route("api/v1/provider/booking-requests"), Tags("Provider Booking Requests")]
public sealed class ProviderBookingRequestsController(BookingQuotationService quotations) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    [EndpointSummary("List booking service requests addressed to the signed-in Provider")]
    [ProducesResponseType<IReadOnlyList<ProviderInboxView>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await quotations.ProviderRequests(Actor, ct));
    [HttpPost("{id:int}/respond")]
    [EndpointSummary("Provider confirms availability and total cost or declines a booking request")]
    [ProducesResponseType<ProviderRequestView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Respond(int id, ProviderReply input, CancellationToken ct) =>
        Ok(await quotations.Respond(Actor, id, input, ct));
}

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/bookings/{bookingId:int}/change-plan"), Tags("Booking Quotations")]
public sealed class AgencyBookingPlanController(BookingQuotationService quotations) : ControllerBase
{
    [HttpPost]
    [EndpointSummary("Agency replaces a declined Provider or changes a custom Tour plan before deposit")]
    [ProducesResponseType<QuotationView>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ChangePlan(int bookingId, BookingPlanChange input, CancellationToken ct) =>
        Ok(await quotations.ChangePlan(User.FindFirstValue(ClaimTypes.NameIdentifier)!, bookingId, input, ct, true));
}
