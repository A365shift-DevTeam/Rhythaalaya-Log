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
public sealed record LoginOtpResponse(string PendingToken, DateTimeOffset ExpiresAt);
public sealed record VerifyOtpRequest(string PendingToken, string Code);
public sealed record ResendOtpRequest(string PendingToken);
/// <summary>What BeginLoginAsync hands back to the controller: either an OTP challenge to
/// relay to the client, or (SuperAdmin / OtpEnabled=false) a user to build a session for
/// directly. Exactly one of the two is populated.</summary>
public sealed record LoginStartResult(AuthUserDto? User, LoginOtpResponse? Challenge);
/// <summary>The wire shape for POST /auth/login — always one shape, distinguished by
/// OtpRequired, so the client never has to guess which fields are present.</summary>
public sealed record LoginStartResponse(bool OtpRequired, string? PendingToken,
    DateTimeOffset? OtpExpiresAt, LoginResponse? Session);

public sealed record PlanDto(Guid Id, string Name, string Code, decimal MonthlyPrice,
    int MaxUsers, int MaxStudents, bool IsActive);
public sealed record SubscriptionDto(Guid Id, Guid PlanId, string PlanName, SubscriptionStatus Status,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record TenantDto(Guid Id, string Name, string Slug, bool IsActive, int UserCount,
    int StudentCount, SubscriptionDto? Subscription);
public sealed record TenantUserDto(Guid Id, Guid? TenantId, string Email, string FullName,
    UserRole Role, bool IsActive, bool OtpEnabled);

public sealed record CreatePlanRequest(string Name, string Code, decimal MonthlyPrice,
    int MaxUsers, int MaxStudents);
public sealed record CreateTenantRequest(string Name, string Slug, Guid PlanId,
    DateTimeOffset SubscriptionEndsAt, string AdminName, string AdminEmail, string AdminPassword);
public sealed record UpdateTenantStatusRequest(bool IsActive);
public sealed record AssignSubscriptionRequest(Guid PlanId, SubscriptionStatus Status,
    DateTimeOffset StartsAt, DateTimeOffset EndsAt);
public sealed record CreateTenantUserRequest(string FullName, string Email, string Password, UserRole Role);
public sealed record UpdateUserOtpRequest(bool OtpEnabled);

public interface IAuthService
{
    /// <summary>Validates email/password. Normally issues and emails an OTP; for a SuperAdmin,
    /// or a user with OtpEnabled=false, skips straight to returning the user (see
    /// LoginStartResult). Throws InvalidCredentialsException/ConflictException exactly as the
    /// old direct login did.</summary>
    Task<LoginStartResult> BeginLoginAsync(LoginRequest request, CancellationToken cancellationToken);
    Task<AuthUserDto> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken);
    Task<LoginOtpResponse> ResendOtpAsync(ResendOtpRequest request, CancellationToken cancellationToken);
}

/// <summary>Sends the OTP email. Implementations must not throw for a missing/blank SMTP
/// config in Development — see SmtpEmailSender.</summary>
public interface IEmailSender
{
    Task SendOtpAsync(string toEmail, string toName, string code, CancellationToken cancellationToken);
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
    /// <summary>Toggles a tenant user's OTP requirement. Rejects a SuperAdmin target (that
    /// role's OTP bypass isn't toggleable) and, when restrictToStaff is set (the TenantAdmin
    /// self-service path), rejects a non-Staff target too.</summary>
    Task<TenantUserDto> SetUserOtpEnabledAsync(Guid tenantId, Guid userId, bool otpEnabled,
        bool restrictToStaff, CancellationToken cancellationToken);
}
