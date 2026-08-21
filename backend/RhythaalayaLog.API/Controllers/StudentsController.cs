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

    [HttpPost("enrollments")]
    public async Task<ActionResult<StudentDto>> Enroll(CreateEnrollmentRequest request, CancellationToken ct) =>
        Ok(await service.CreateEnrollmentAsync(request, ct));

    [HttpPut("enrollments/{enrollmentId:guid}/end")]
    public async Task<ActionResult<StudentDto>> EndEnrollment(Guid enrollmentId, EndEnrollmentRequest request, CancellationToken ct) =>
        Ok(await service.EndEnrollmentAsync(enrollmentId, request, ct));
}
