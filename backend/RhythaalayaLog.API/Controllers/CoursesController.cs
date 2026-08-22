using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/courses")]
public sealed class CoursesController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CourseDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetCoursesAsync(ct));

    [HttpPost]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<CourseDto>> Create(CreateCourseRequest request, CancellationToken ct)
    {
        var result = await service.CreateCourseAsync(request, ct);
        return Created($"/api/courses/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<CourseDto>> Update(Guid id, UpdateCourseRequest request, CancellationToken ct) =>
        Ok(await service.UpdateCourseAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveCourseAsync(id, ct);
        return NoContent();
    }
}
