using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/students")]
public sealed class StudentsController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudentDto>>> GetAll(
        [FromQuery] string? search, [FromQuery] Guid? batchId,
        [FromQuery] bool includeInactive, CancellationToken ct) =>
        Ok(await service.GetStudentsAsync(search, batchId, includeInactive, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudentDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await service.GetStudentAsync(id, ct));

    [HttpPost]
    public async Task<ActionResult<StudentDto>> Create(CreateStudentRequest request, CancellationToken ct)
    {
        var result = await service.CreateStudentAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StudentDto>> Update(Guid id, UpdateStudentRequest request, CancellationToken ct) =>
        Ok(await service.UpdateStudentAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveStudentAsync(id, ct);
        return NoContent();
    }
}
