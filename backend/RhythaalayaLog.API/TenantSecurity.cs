using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;

namespace RhythaalayaLog.API;

public sealed class HttpTenantContext(IHttpContextAccessor accessor) : ITenantContext
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public Guid? TenantId => Guid.TryParse(User?.FindFirstValue("tenant_id"), out var id) ? id : null;
    public Guid? UserId => Guid.TryParse(User?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;
    public UserRole? Role => Enum.TryParse<UserRole>(User?.FindFirstValue("role"), out var role) ? role : null;
}

public sealed class JwtTokenService(IConfiguration configuration)
{
    public LoginResponse Create(AuthUserDto user)
    {
        var issuer = configuration["Jwt:Issuer"] ?? "RhythaalayaLog";
        var audience = configuration["Jwt:Audience"] ?? "RhythaalayaLog.Web";
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
            throw new InvalidOperationException("Jwt:Key must contain at least 32 bytes.");

        var expiresAt = DateTimeOffset.UtcNow.AddHours(8);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.FullName),
            new("role", user.Role.ToString())
        };
        if (user.TenantId.HasValue) claims.Add(new Claim("tenant_id", user.TenantId.Value.ToString()));

        var token = new JwtSecurityToken(issuer, audience, claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256));
        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, user);
    }
}

public sealed class TenantAccessMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db)
    {
        if (context.User.Identity?.IsAuthenticated == true
            && !context.User.IsInRole(nameof(UserRole.SuperAdmin)))
        {
            var tenantText = context.User.FindFirstValue("tenant_id");
            var userText = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            if (!Guid.TryParse(tenantText, out var tenantId) || !Guid.TryParse(userText, out var userId))
            {
                await Deny(context, "The access token has no valid tenant context.");
                return;
            }

            var now = DateTimeOffset.UtcNow;
            var validUser = await db.Users.IgnoreQueryFilters().AsNoTracking()
                .AnyAsync(x => x.Id == userId && x.TenantId == tenantId && x.IsActive,
                    context.RequestAborted);
            var validTenant = await db.Tenants.AsNoTracking()
                .AnyAsync(x => x.Id == tenantId && x.IsActive, context.RequestAborted);
            var validSubscription = await db.TenantSubscriptions.IgnoreQueryFilters().AsNoTracking()
                .AnyAsync(x => x.TenantId == tenantId
                    && (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)
                    && x.StartsAt <= now && x.EndsAt > now, context.RequestAborted);
            if (!validUser || !validTenant || !validSubscription)
            {
                await Deny(context, "The user, academy, or subscription is inactive.");
                return;
            }
        }
        await next(context);
    }

    private static Task Deny(HttpContext context, string detail)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Results.Problem(statusCode: StatusCodes.Status403Forbidden,
            title: "Tenant access denied.", detail: detail).ExecuteAsync(context);
    }
}
