using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AuthService(AppDbContext db, PasswordHasher<UserAccount> hasher, IEmailSender emailSender)
    : IAuthService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ResendCooldown = TimeSpan.FromSeconds(30);
    private const int MaxAttempts = 5;
    private const int MaxSends = 3;
    private const string GenericOtpError = "That code is invalid or has expired. Please log in again.";

    public async Task<LoginStartResult> BeginLoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.IgnoreQueryFilters().Include(x => x.Tenant)
            .SingleOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !user.IsActive || hasher.VerifyHashedPassword(user, user.PasswordHash,
                request.Password) == PasswordVerificationResult.Failed)
            throw new InvalidCredentialsException("Invalid email or password.");
        // Fail fast on an inactive tenant/subscription rather than emailing a code nobody can use.
        var authUser = await BuildAuthUserAsync(user, ct);

        // SuperAdmin always skips OTP (hardcoded, not a stored toggle); everyone else can have it
        // switched off per-account via OtpEnabled.
        if (user.Role == UserRole.SuperAdmin || !user.OtpEnabled)
        {
            // A session is granted right here (the controller issues the JWT unconditionally
            // for a non-null User), so this is the real moment of sign-in — not the earlier
            // BuildAuthUserAsync call above, which also runs on the fail-fast check before an
            // OTP-required login has actually completed.
            user.LastLoginAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return new LoginStartResult(authUser, null);
        }

        // Only one live OTP per user at a time; also clears out the consumed row from any prior
        // successful login so this table doesn't grow unboundedly.
        var stale = await db.LoginOtps.Where(x => x.UserId == user.Id).ToListAsync(ct);
        db.LoginOtps.RemoveRange(stale);

        var (code, otp) = CreateOtp(user.Id);
        db.LoginOtps.Add(otp);
        await db.SaveChangesAsync(ct);

        await emailSender.SendOtpAsync(user.Email, user.FullName, code, ct);
        return new LoginStartResult(null, new LoginOtpResponse(otp.PendingToken, otp.ExpiresAt));
    }

    public async Task<AuthUserDto> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken ct)
    {
        var otp = await db.LoginOtps.Include(x => x.User).ThenInclude(x => x.Tenant)
            .SingleOrDefaultAsync(x => x.PendingToken == request.PendingToken, ct);
        var now = DateTimeOffset.UtcNow;
        if (otp is null || otp.ConsumedAt.HasValue || otp.ExpiresAt <= now || otp.Attempts >= MaxAttempts)
            throw new InvalidCredentialsException(GenericOtpError);

        var expectedHash = HashCode(request.Code.Trim(), otp.PendingToken);
        if (!CryptographicOperations.FixedTimeEquals(Convert.FromHexString(expectedHash),
                Convert.FromHexString(otp.CodeHash)))
        {
            // Persist the failed attempt before throwing, or brute force is unlimited.
            otp.Attempts++;
            await db.SaveChangesAsync(ct);
            throw new InvalidCredentialsException(GenericOtpError);
        }

        otp.ConsumedAt = now;
        otp.User.LastLoginAt = now;
        await db.SaveChangesAsync(ct);
        return await BuildAuthUserAsync(otp.User, ct);
    }

    public async Task<LoginOtpResponse> ResendOtpAsync(ResendOtpRequest request, CancellationToken ct)
    {
        var otp = await db.LoginOtps.Include(x => x.User)
            .SingleOrDefaultAsync(x => x.PendingToken == request.PendingToken, ct);
        var now = DateTimeOffset.UtcNow;
        if (otp is null || otp.ConsumedAt.HasValue || otp.ExpiresAt <= now || otp.Attempts >= MaxAttempts)
            throw new InvalidCredentialsException(GenericOtpError);
        if (otp.SendCount >= MaxSends)
            throw new ConflictException("Too many codes requested for this login. Please start over.");
        if (now - otp.LastSentAt < ResendCooldown)
            throw new ConflictException("Please wait a little before requesting another code.");

        // New code, same pending token — the attempt counter is NOT reset, otherwise resend
        // would be a way around the attempt limit.
        var code = GenerateCode();
        otp.CodeHash = HashCode(code, otp.PendingToken);
        otp.ExpiresAt = now.Add(OtpLifetime);
        otp.SendCount++;
        otp.LastSentAt = now;
        await db.SaveChangesAsync(ct);

        await emailSender.SendOtpAsync(otp.User.Email, otp.User.FullName, code, ct);
        return new LoginOtpResponse(otp.PendingToken, otp.ExpiresAt);
    }

    private async Task<AuthUserDto> BuildAuthUserAsync(UserAccount user, CancellationToken ct)
    {
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

    private static (string Code, LoginOtp Otp) CreateOtp(Guid userId)
    {
        var code = GenerateCode();
        var pendingToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var now = DateTimeOffset.UtcNow;
        var otp = new LoginOtp
        {
            UserId = userId, PendingToken = pendingToken, CodeHash = HashCode(code, pendingToken),
            ExpiresAt = now.Add(OtpLifetime), SendCount = 1, LastSentAt = now
        };
        return (code, otp);
    }

    private static string GenerateCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    // Salted with the pending token so the hash isn't a plain lookup table of 1,000,000 codes.
    private static string HashCode(string code, string pendingToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{code}:{pendingToken}")));
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
