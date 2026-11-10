using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;

namespace TripOps.Api.Controllers;

[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/bookings/{id:int}"), Tags("Booking Management")]
public sealed class BookingAmendmentsController(BookingQuotationService amendments, BookingService bookings) : ControllerBase
{
    private string Actor => User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpPost("location-changes")]
    [ProducesResponseType<BookingDto>(200)]
    public async Task<IActionResult> Location(int id, BookingLocationChange input, CancellationToken ct)
    {
        await amendments.ChangeLocation(Actor, id, input, ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
    [HttpPost("participants")]
    [ProducesResponseType<BookingDto>(200)]
    public async Task<IActionResult> AddParticipant(int id, AgencyParticipantInput input, CancellationToken ct)
    {
        await amendments.AddParticipant(Actor, id, input, ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
    [HttpPost("surcharges")]
    [ProducesResponseType<BookingDto>(200)]
    public async Task<IActionResult> Surcharge(int id, BookingSurchargeInput input, CancellationToken ct)
    {
        await amendments.AddSurcharge(Actor, id, input, ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
    [HttpPost("price-adjustments")]
    [ProducesResponseType<BookingDto>(200)]
    public async Task<IActionResult> Price(int id, BookingPriceChange input, CancellationToken ct)
    {
        await amendments.ChangePrice(Actor, id, input, ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }

    [HttpPost("service-changes")]
    [ProducesResponseType<BookingDto>(200)]
    public async Task<IActionResult> Service(int id, BookingServiceChange input, CancellationToken ct)
    {
        await amendments.ChangeService(Actor, id, input, ct);
        return Ok(await bookings.Get(Actor, id, ct));
    }
}
