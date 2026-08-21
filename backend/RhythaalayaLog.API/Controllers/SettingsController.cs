using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/settings")]
public sealed class SettingsController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<SettingsDto>> Get(CancellationToken ct) =>
        Ok(await service.GetSettingsAsync(ct));

    [HttpPut]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<SettingsDto>> Update(
        UpdateSettingsRequest request, CancellationToken ct) =>
        Ok(await service.UpdateSettingsAsync(request, ct));
}
