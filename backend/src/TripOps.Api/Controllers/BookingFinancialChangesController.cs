using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Bookings;
namespace TripOps.Api.Controllers;

[ApiController,Authorize,Route("api/v1/bookings/{id:int}/financial-changes"),Tags("Booking Management")]
public sealed class BookingFinancialChangesController(BookingQuotationService finance,BookingService bookings):ControllerBase
{
    private string Actor=>User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    [HttpGet]
    public async Task<FinancialChangeDto[]> List(int id,CancellationToken ct)=>await finance.FinancialChanges(Actor,id,ct);
    [HttpPost,Authorize(Roles="agency")]
    public async Task<FinancialChangeDto[]> Submit(int id,FinancialChangeInput input,CancellationToken ct) {
        await finance.RequestFinancialChange(Actor,id,input,ct);return await finance.FinancialChanges(Actor,id,ct);
    }
    [HttpPost("{changeId:int}/decision"),Authorize(Roles="agency")]
    public async Task<BookingDto> Decide(int id,int changeId,FinancialChangeDecision input,CancellationToken ct) {
        await finance.ReviewFinancialChange(Actor,id,changeId,input,ct);return await bookings.Get(Actor,id,ct);
    }
    [HttpPut("refunds/{refundId:int}/account"),Authorize(Roles="user")]
    public async Task<IActionResult> Account(int id,int refundId,RefundAccountRequest input,CancellationToken ct) {
        await bookings.UpdatePriceRefundAccount(Actor,id,refundId,input,ct);return NoContent();
    }
}
