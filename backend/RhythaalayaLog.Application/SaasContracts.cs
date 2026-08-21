using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public interface ITenantContext
{
    Guid? TenantId { get; }
    Guid? UserId { get; }
    UserRole? Role { get; }
}

public sealed record AuthUserDto(Guid Id, Guid? TenantId, string Email, string FullName, UserRole Role,
    string? TenantName, DateTimeOffset? SubscriptionEndsAt);
public sealed record LoginRequest(string Email, string Password);
public sealed record LoginResponse(string Token, DateTimeOffset ExpiresAt, AuthUserDto User);

public sealed record PlanDto(Guid Id, string Name, string Code, decimal MonthlyPrice,
    int MaxUsers, int MaxStudents, bool IsActive);
public sealed record SubscriptionDto(Guid Id, Guid PlanId, string PlanName, SubscriptionStatus Status,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record TenantDto(Guid Id, string Name, string Slug, bool IsActive, int UserCount,
    int StudentCount, SubscriptionDto? Subscription);
public sealed record TenantUserDto(Guid Id, Guid? TenantId, string Email, string FullName,
    UserRole Role, bool IsActive);

public sealed record CreatePlanRequest(string Name, string Code, decimal MonthlyPrice,
    int MaxUsers, int MaxStudents);
public sealed record CreateTenantRequest(string Name, string Slug, Guid PlanId,
    DateTimeOffset SubscriptionEndsAt, string AdminName, string AdminEmail, string AdminPassword);
public sealed record UpdateTenantStatusRequest(bool IsActive);
public sealed record AssignSubscriptionRequest(Guid PlanId, SubscriptionStatus Status,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record CreateTenantUserRequest(string FullName, string Email, string Password, UserRole Role);

public interface IAuthService
{
    Task<AuthUserDto> ValidateCredentialsAsync(LoginRequest request, CancellationToken cancellationToken);
}

public interface ISaasAdminService
{
    Task<IReadOnlyList<PlanDto>> GetPlansAsync(CancellationToken cancellationToken);
    Task<PlanDto> CreatePlanAsync(CreatePlanRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<TenantDto>> GetTenantsAsync(CancellationToken cancellationToken);
    Task<TenantDto> CreateTenantAsync(CreateTenantRequest request, CancellationToken cancellationToken);
    Task<TenantDto> SetTenantStatusAsync(Guid tenantId, bool isActive, CancellationToken cancellationToken);
    Task<SubscriptionDto> AssignSubscriptionAsync(Guid tenantId, AssignSubscriptionRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<TenantUserDto>> GetTenantUsersAsync(Guid tenantId, CancellationToken cancellationToken);
    Task<TenantUserDto> CreateTenantUserAsync(Guid tenantId, CreateTenantUserRequest request, CancellationToken cancellationToken);
}
