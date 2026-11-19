using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripOps.Service.Contracts;

namespace TripOps.Api.Controllers;

/// <summary>
/// Agency soạn mẫu hợp đồng của công ty: bảng phí hủy (Điều 4), ghi chú chính sách hủy và điều khoản bổ sung.
/// Các điều còn lại theo format chung của TripOps. Áp dụng cho các đơn đặt sau khi lưu.
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
}
