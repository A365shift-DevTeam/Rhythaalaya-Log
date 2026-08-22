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

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<BatchDto>> Update(Guid id, UpdateBatchRequest request, CancellationToken ct) =>
        Ok(await service.UpdateBatchAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveBatchAsync(id, ct);
        return NoContent();
    }
}
