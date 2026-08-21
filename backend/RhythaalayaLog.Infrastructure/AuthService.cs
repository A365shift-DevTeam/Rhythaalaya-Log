using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AuthService(AppDbContext db, PasswordHasher<UserAccount> hasher) : IAuthService
{
    public async Task<AuthUserDto> ValidateCredentialsAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.IgnoreQueryFilters().Include(x => x.Tenant)
            .SingleOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !user.IsActive || hasher.VerifyHashedPassword(user, user.PasswordHash,
                request.Password) == PasswordVerificationResult.Failed)
            throw new InvalidCredentialsException("Invalid email or password.");
        if (user.Role != UserRole.SuperAdmin && (user.Tenant is null || !user.Tenant.IsActive))
            throw new ConflictException("This academy account is inactive.");

        DateTimeOffset? endsAt = null;
        if (user.TenantId.HasValue)
        {
            var now = DateTimeOffset.UtcNow;
            var subscription = await db.TenantSubscriptions.IgnoreQueryFilters()
                .Where(x => x.TenantId == user.TenantId &&
                    (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)
                    && x.StartsAt <= now)
                .OrderByDescending(x => x.EndsAt).FirstOrDefaultAsync(ct);
            if (subscription is null || subscription.EndsAt <= now)
                throw new ConflictException("The academy subscription is inactive or expired.");
            endsAt = subscription.EndsAt;
        }
        return new AuthUserDto(user.Id, user.TenantId, user.Email, user.FullName, user.Role,
            user.Tenant?.Name, endsAt);
    }
}

public sealed class DatabaseInitializer(AppDbContext db, IConfiguration configuration,
    PasswordHasher<UserAccount> hasher)
{
    public async Task InitializeAsync(CancellationToken ct = default)
    {
        await db.Database.MigrateAsync(ct);
        var email = configuration["Bootstrap:SuperAdminEmail"]?.Trim().ToLowerInvariant();
        var password = configuration["Bootstrap:SuperAdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;
        if (await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Role == UserRole.SuperAdmin, ct)) return;
        var user = new UserAccount
        {
            Email = email, FullName = "Platform Super Admin", PasswordHash = string.Empty,
            Role = UserRole.SuperAdmin
        };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
    }
}
