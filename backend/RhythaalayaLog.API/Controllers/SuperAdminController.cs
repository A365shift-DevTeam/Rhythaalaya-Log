using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.API.Controllers;

[ApiController]
[Authorize(Roles = nameof(UserRole.SuperAdmin))]
[Route("api/superadmin")]
public sealed class SuperAdminController(ISaasAdminService service) : ControllerBase
{
    [HttpGet("plans")]
    public async Task<ActionResult<IReadOnlyList<PlanDto>>> GetPlans(CancellationToken ct) =>
        Ok(await service.GetPlansAsync(ct));

    [HttpPost("plans")]
    public async Task<ActionResult<PlanDto>> CreatePlan(CreatePlanRequest request, CancellationToken ct)
    {
        var result = await service.CreatePlanAsync(request, ct);
        return Created($"/api/superadmin/plans/{result.Id}", result);
    }

    [HttpGet("tenants")]
    public async Task<ActionResult<IReadOnlyList<TenantDto>>> GetTenants(CancellationToken ct) =>
        Ok(await service.GetTenantsAsync(ct));

    [HttpPost("tenants")]
    public async Task<ActionResult<TenantDto>> CreateTenant(CreateTenantRequest request, CancellationToken ct)
    {
        var result = await service.CreateTenantAsync(request, ct);
        return Created($"/api/superadmin/tenants/{result.Id}", result);
    }

    [HttpPatch("tenants/{tenantId:guid}/status")]
    public async Task<ActionResult<TenantDto>> SetTenantStatus(Guid tenantId,
        UpdateTenantStatusRequest request, CancellationToken ct) =>
        Ok(await service.SetTenantStatusAsync(tenantId, request.IsActive, ct));

    [HttpPost("tenants/{tenantId:guid}/subscription")]
    public async Task<ActionResult<SubscriptionDto>> AssignSubscription(Guid tenantId,
        AssignSubscriptionRequest request, CancellationToken ct) =>
        Ok(await service.AssignSubscriptionAsync(tenantId, request, ct));

    [HttpGet("tenants/{tenantId:guid}/users")]
    public async Task<ActionResult<IReadOnlyList<TenantUserDto>>> GetUsers(Guid tenantId, CancellationToken ct) =>
        Ok(await service.GetTenantUsersAsync(tenantId, ct));

    [HttpPost("tenants/{tenantId:guid}/users")]
    public async Task<ActionResult<TenantUserDto>> CreateUser(Guid tenantId,
        CreateTenantUserRequest request, CancellationToken ct)
    {
        var result = await service.CreateTenantUserAsync(tenantId, request, ct);
        return Created($"/api/superadmin/tenants/{tenantId}/users/{result.Id}", result);
    }

    [HttpPatch("tenants/{tenantId:guid}/users/{userId:guid}/otp")]
    public async Task<ActionResult<TenantUserDto>> SetUserOtp(Guid tenantId, Guid userId,
        UpdateUserOtpRequest request, CancellationToken ct) =>
        Ok(await service.SetUserOtpEnabledAsync(tenantId, userId, request.OtpEnabled, restrictToStaff: false, ct));

    [HttpPut("tenants/{tenantId:guid}/users/{userId:guid}")]
    public async Task<ActionResult<TenantUserDto>> UpdateUser(Guid tenantId, Guid userId,
        UpdateTenantUserRequest request, CancellationToken ct) =>
        Ok(await service.UpdateTenantUserAsync(tenantId, userId, request, restrictToStaff: false, ct));

    [HttpPatch("tenants/{tenantId:guid}/users/{userId:guid}/status")]
    public async Task<ActionResult<TenantUserDto>> SetUserStatus(Guid tenantId, Guid userId,
        UpdateTenantUserStatusRequest request, CancellationToken ct) =>
        Ok(await service.SetTenantUserActiveAsync(tenantId, userId, request.IsActive, restrictToStaff: false, ct));
}
