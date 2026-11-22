using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Contracts;

namespace TripOps.Api.Controllers;

/// <summary>
/// Agency soạn mẫu hợp đồng của công ty: nội dung từng điều, bảng phí hủy (Điều 4), ghi chú và điều khoản bổ sung;
/// xem trước bản PDF trước khi lưu. Lưu được nhiều mẫu có tên và chọn một mẫu áp dụng cho các đơn đặt mới.
/// /contract-template (số ít) làm việc trên mẫu đang áp dụng.
/// </summary>
[ApiController, Authorize(Roles = "agency"), Route("api/v1/agency/contract-template")]
[Tags("Contract Template")]
public sealed class AgencyContractTemplateController(ContractTemplateService templates) : ControllerBase
{
    private string Agency => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    [EndpointSummary("Get the contract template in use (TripOps default when the agency applies none)")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await templates.Get(Agency, ct));

    [HttpPut]
    [EndpointSummary("Save changes to the contract template in use (creates and applies one if none is in use)")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Save(ContractTemplateRequest request, CancellationToken ct) =>
        Ok(await templates.Save(Agency, request, ct));

    // ------------------------------------------------------------ nhiều mẫu có tên

    [HttpGet("~/api/v1/agency/contract-templates")]
    [EndpointSummary("List the agency's saved contract templates (the one in use first)")]
    [ProducesResponseType<IReadOnlyList<ContractTemplateSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(CancellationToken ct) => Ok(await templates.List(Agency, ct));

    [HttpGet("~/api/v1/agency/contract-templates/{id:int}")]
    [EndpointSummary("Get one saved contract template")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetOne(int id, CancellationToken ct) => Ok(await templates.Get(Agency, id, ct));

    [HttpPost("~/api/v1/agency/contract-templates")]
    [EndpointSummary("Save a new named contract template (optionally apply it at once)")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(ContractTemplateRequest request, CancellationToken ct) =>
        Ok(await templates.Create(Agency, request, ct));

    [HttpPut("~/api/v1/agency/contract-templates/{id:int}")]
    [EndpointSummary("Update a saved contract template")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(int id, ContractTemplateRequest request, CancellationToken ct) =>
        Ok(await templates.Update(Agency, id, request, ct));

    [HttpPost("~/api/v1/agency/contract-templates/{id:int}/activate")]
    [EndpointSummary("Apply a saved contract template to new bookings")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Activate(int id, CancellationToken ct) => Ok(await templates.Activate(Agency, id, ct));

    [HttpPost("~/api/v1/agency/contract-templates/use-default")]
    [EndpointSummary("Stop applying saved templates and use the TripOps default contract for new bookings")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> UseDefault(CancellationToken ct) => Ok(await templates.UseDefault(Agency, ct));

    [HttpPost("~/api/v1/agency/contract-templates/{id:int}/duplicate")]
    [EndpointSummary("Copy a saved contract template into a new one")]
    [ProducesResponseType<ContractTemplateDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Duplicate(int id, CancellationToken ct) => Ok(await templates.Duplicate(Agency, id, ct));

    [HttpDelete("~/api/v1/agency/contract-templates/{id:int}")]
    [EndpointSummary("Delete a saved contract template that is not in use")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await templates.Delete(Agency, id, ct);
        return NoContent();
    }

    // File PDF nằm dưới /api/v1/files/ như các file hợp đồng khác.
    [HttpPost("~/api/v1/files/contract-template/preview")]
    [Produces("application/pdf")]
    [EndpointSummary("Render a sample contract PDF from the template being edited (not saved)")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Preview(ContractTemplateRequest request, CancellationToken ct) =>
        File(await templates.Preview(Agency, request, ct), "application/pdf");
}
