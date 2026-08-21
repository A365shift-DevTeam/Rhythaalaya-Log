using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/batches")]
public sealed class BatchesController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BatchDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetBatchesAsync(ct));

    [HttpPost]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<BatchDto>> Create(CreateBatchRequest request, CancellationToken ct)
    {
        var result = await service.CreateBatchAsync(request, ct);
        return Created($"/api/batches/{result.Id}", result);
    }
}
