using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = "TenantAdmin,Staff")]
[Route("api/staff")]
public sealed class StaffController(IAcademyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StaffDto>>> GetAll(CancellationToken ct) =>
        Ok(await service.GetStaffAsync(ct));

    [HttpPost]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<StaffDto>> Create(CreateStaffRequest request, CancellationToken ct)
    {
        var result = await service.CreateStaffAsync(request, ct);
        return Created($"/api/staff/{result.Id}", result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "TenantAdmin")]
    public async Task<ActionResult<StaffDto>> Update(Guid id, UpdateStaffRequest request, CancellationToken ct) =>
        Ok(await service.UpdateStaffAsync(id, request, ct));
}
