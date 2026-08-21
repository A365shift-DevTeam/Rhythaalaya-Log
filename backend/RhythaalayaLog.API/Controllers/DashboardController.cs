using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/dashboard")]
public sealed class DashboardController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get([FromQuery] DateOnly? date, CancellationToken ct) =>
        Ok(await service.GetDashboardAsync(date ?? DateOnly.FromDateTime(DateTime.UtcNow), ct));
}
