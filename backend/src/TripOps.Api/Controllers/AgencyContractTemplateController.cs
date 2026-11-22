using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Contracts;

namespace TripOps.Api.Controllers;

/// <summary>
/// Agency soạn mẫu hợp đồng của công ty: nội dung từng điều, bảng phí hủy (Điều 4), ghi chú và điều khoản bổ sung;
/// xem trước bản PDF trước khi lưu. Áp dụng cho các đơn đặt sau khi lưu.
/// </summary>
[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/contract-template")]
[Tags("Contract Template")]
public sealed class AgencyContractTemplateController(ContractTemplateService templates) : ControllerBase
{
    private string Agency => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("Get the agency contract template (TripOps default policy when the agency has not saved one)")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await templates.Get(Agency, ct));

    [HttpPut]
    [EndpointSummary("Save the cancellation tiers, cancellation note and additional terms of the agency contract")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Save(ContractTemplateRequest request, CancellationToken ct) =>
        Ok(await templates.Save(Agency, request, ct));

    // File PDF nằm dưới /api/v1/files/ như các file hợp đồng khác.
    [HttpPost("~/api/v1/files/contract-template/preview")]
    [Produces("application/pdf")]
    [EndpointSummary("Render a sample contract PDF from the template being edited (not saved)")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Preview(ContractTemplateRequest request, CancellationToken ct) =>
        File(await templates.Preview(Agency, request, ct), "application/pdf");
}
