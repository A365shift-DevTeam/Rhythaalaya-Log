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

    [HttpPatch("{userId:guid}/otp")]
    public async Task<ActionResult<TenantUserDto>> SetUserOtp(Guid userId, UpdateUserOtpRequest request,
        CancellationToken ct) =>
        Ok(await service.SetUserOtpEnabledAsync(RequireTenant(), userId, request.OtpEnabled, restrictToStaff: true, ct));

    [HttpPut("{userId:guid}")]
    public async Task<ActionResult<TenantUserDto>> Update(Guid userId, UpdateTenantUserRequest request,
        CancellationToken ct) =>
        Ok(await service.UpdateTenantUserAsync(RequireTenant(), userId, request, restrictToStaff: true, ct));

    [HttpPatch("{userId:guid}/status")]
    public async Task<ActionResult<TenantUserDto>> SetStatus(Guid userId, UpdateTenantUserStatusRequest request,
        CancellationToken ct) =>
        Ok(await service.SetTenantUserActiveAsync(RequireTenant(), userId, request.IsActive, restrictToStaff: true, ct));

    private Guid RequireTenant() => tenantContext.TenantId
        ?? throw new AppValidationException("A tenant context is required.");
}
