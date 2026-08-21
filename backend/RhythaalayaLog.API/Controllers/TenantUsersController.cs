using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.TenantAdmin))]
[Route("api/tenant/users")]
public sealed class TenantUsersController(ISaasAdminService service, ITenantContext tenantContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TenantUserDto>>> Get(CancellationToken ct) =>
        Ok(await service.GetTenantUsersAsync(RequireTenant(), ct));

    [HttpPost]
    public async Task<ActionResult<TenantUserDto>> Create(CreateTenantUserRequest request, CancellationToken ct)
    {
        if (request.Role != UserRole.Staff)
            return BadRequest(new ProblemDetails { Title = "Tenant administrators can create Staff users only." });
        var tenantId = RequireTenant();
        var result = await service.CreateTenantUserAsync(tenantId, request, ct);
        return Created($"/api/tenant/users/{result.Id}", result);
    }

    private Guid RequireTenant() => tenantContext.TenantId
        ?? throw new AppValidationException("A tenant context is required.");
}
