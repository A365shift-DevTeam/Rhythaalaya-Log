using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

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

    [HttpGet("{studentId:guid}/achievements")]
    public async Task<ActionResult<IReadOnlyList<StudentAchievementDto>>> GetAchievements(Guid studentId, CancellationToken ct) =>
        Ok(await service.GetAchievementsAsync(studentId, ct));

    [HttpPost("{studentId:guid}/achievements")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    public async Task<ActionResult<StudentAchievementDto>> CreateAchievement(Guid studentId,
        [FromForm] string title, [FromForm] AchievementCategory category, [FromForm] string? level,
        [FromForm] DateOnly eventDate, [FromForm] string? note, IFormFile file, CancellationToken ct)
    {
        if (file is null) return BadRequest("A certificate file is required.");
        var request = new CreateAchievementRequest(title, category, level, eventDate, note);
        await using var stream = file.OpenReadStream();
        var result = await service.CreateAchievementAsync(studentId, request, stream, file.FileName, file.ContentType, file.Length, ct);
        return CreatedAtAction(nameof(GetAchievements), new { studentId }, result);
    }

    [HttpDelete("{studentId:guid}/achievements/{achievementId:guid}")]
    public async Task<IActionResult> DeleteAchievement(Guid studentId, Guid achievementId, CancellationToken ct)
    {
        await service.DeleteAchievementAsync(studentId, achievementId, ct);
        return NoContent();
    }

    [HttpGet("{studentId:guid}/achievements/{achievementId:guid}/file")]
    public async Task<IActionResult> GetAchievementFile(Guid studentId, Guid achievementId, CancellationToken ct)
    {
        var (data, contentType, fileName) = await service.GetAchievementFileAsync(studentId, achievementId, ct);
        return File(data, contentType, fileName);
    }
}
