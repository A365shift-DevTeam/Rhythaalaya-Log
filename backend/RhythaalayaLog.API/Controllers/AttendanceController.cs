using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/attendance")]
public sealed class AttendanceController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AttendanceLogDto>> Get(
        [FromQuery] DateOnly date, [FromQuery] Guid batchId, CancellationToken ct) =>
        Ok(await service.GetAttendanceAsync(date, batchId, ct));

    [HttpPut]
    public async Task<ActionResult<AttendanceLogDto>> Submit(
        SubmitAttendanceRequest request, CancellationToken ct) =>
        Ok(await service.SubmitAttendanceAsync(request, ct));
}
