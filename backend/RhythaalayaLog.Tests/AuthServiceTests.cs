using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class FakeEmailSender : IEmailSender
{
    public string? LastCode { get; private set; }
    public int SendCount { get; private set; }

    public Task SendOtpAsync(string toEmail, string toName, string code, CancellationToken ct)
    {
        LastCode = code;
        SendCount++;
        return Task.CompletedTask;
    }
}

public sealed class AuthServiceTests
{
    private const string Password = "Passw0rd!";

    // Defaults to a TenantAdmin (with an active tenant/subscription) so the normal OTP-required
    // path is exercised; pass UserRole.SuperAdmin or otpEnabled:false to test the bypass paths.
    private static (AppDbContext Db, AuthService Auth, FakeEmailSender Email, UserAccount User) Build(
        UserRole role = UserRole.TenantAdmin, bool otpEnabled = true)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var db = new AppDbContext(options, new FixedTenantContext());
        var hasher = new PasswordHasher<UserAccount>();
        var email = new FakeEmailSender();
        var auth = new AuthService(db, hasher, email);

        var user = new UserAccount
        {
            Email = "admin@test.com", FullName = "Admin", PasswordHash = "", Role = role, OtpEnabled = otpEnabled
        };
        if (role != UserRole.SuperAdmin)
        {
            var tenant = new Tenant { Name = "Test Academy", Slug = "test-academy" };
            var plan = new SubscriptionPlan { Name = "Basic", Code = "BASIC", MaxUsers = 10, MaxStudents = 100 };
            var subscription = new TenantSubscription
            {
                Tenant = tenant, Plan = plan, Status = SubscriptionStatus.Active,
                StartsAt = DateTimeOffset.UtcNow.AddDays(-1), EndsAt = DateTimeOffset.UtcNow.AddYears(1)
            };
            db.AddRange(tenant, plan, subscription);
            user.Tenant = tenant;
        }
        user.PasswordHash = hasher.HashPassword(user, Password);
        db.Users.Add(user);
        db.SaveChanges();
        return (db, auth, email, user);
    }

    [Fact]
    public async Task BeginLogin_WithValidCredentials_EmailsCodeAndReturnsPendingToken()
    {
        var (_, auth, email, _) = Build();

        var result = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);

        Assert.Null(result.User);
        Assert.NotNull(result.Challenge);
        Assert.False(string.IsNullOrWhiteSpace(result.Challenge!.PendingToken));
        Assert.Equal(1, email.SendCount);
        Assert.NotNull(email.LastCode);
        Assert.Equal(6, email.LastCode!.Length);
    }

    [Fact]
    public async Task BeginLogin_WithWrongPassword_ThrowsWithoutSendingEmail()
    {
        var (_, auth, email, _) = Build();

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            auth.BeginLoginAsync(new LoginRequest("admin@test.com", "wrong"), default));
        Assert.Equal(0, email.SendCount);
    }

    [Fact]
    public async Task BeginLogin_ForSuperAdmin_SkipsOtpAndReturnsUserDirectly()
    {
        var (_, auth, email, user) = Build(UserRole.SuperAdmin);

        var result = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);

        Assert.Null(result.Challenge);
        Assert.NotNull(result.User);
        Assert.Equal(user.Id, result.User!.Id);
        Assert.Equal(0, email.SendCount);
    }

    [Fact]
    public async Task BeginLogin_WhenOtpDisabledForUser_SkipsOtp()
    {
        var (_, auth, email, user) = Build(UserRole.TenantAdmin, otpEnabled: false);

        var result = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);

        Assert.Null(result.Challenge);
        Assert.NotNull(result.User);
        Assert.Equal(user.Id, result.User!.Id);
        Assert.Equal(0, email.SendCount);
    }

    [Fact]
    public async Task VerifyOtp_WithCorrectCode_ReturnsAuthUser()
    {
        var (_, auth, email, user) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);

        var result = await auth.VerifyOtpAsync(new VerifyOtpRequest(begin.Challenge!.PendingToken, email.LastCode!), default);

        Assert.Equal(user.Id, result.Id);
    }

    [Fact]
    public async Task VerifyOtp_WithWrongCode_IncrementsAttemptsAndThrows()
    {
        var (db, auth, email, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        _ = email;

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            auth.VerifyOtpAsync(new VerifyOtpRequest(begin.Challenge!.PendingToken, "000000"), default));

        var otp = await db.LoginOtps.SingleAsync(x => x.PendingToken == begin.Challenge!.PendingToken);
        Assert.Equal(1, otp.Attempts);
    }

    [Fact]
    public async Task VerifyOtp_AfterMaxAttempts_RejectsEvenTheCorrectCode()
    {
        var (_, auth, email, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        var pendingToken = begin.Challenge!.PendingToken;
        var correctCode = email.LastCode!;

        for (var i = 0; i < 5; i++)
        {
            await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
                auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, "000000"), default));
        }

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, correctCode), default));
    }

    [Fact]
    public async Task VerifyOtp_WithExpiredOtp_Throws()
    {
        var (db, auth, email, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        var pendingToken = begin.Challenge!.PendingToken;
        var otp = await db.LoginOtps.SingleAsync(x => x.PendingToken == pendingToken);
        otp.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, email.LastCode!), default));
    }

    [Fact]
    public async Task VerifyOtp_ConsumedToken_CannotBeReused()
    {
        var (_, auth, email, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        var pendingToken = begin.Challenge!.PendingToken;
        await auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, email.LastCode!), default);

        await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
            auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, email.LastCode!), default));
    }

    [Fact]
    public async Task ResendOtp_DoesNotResetAttemptCounter()
    {
        var (db, auth, email, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        var pendingToken = begin.Challenge!.PendingToken;

        for (var i = 0; i < 3; i++)
        {
            await Assert.ThrowsAsync<InvalidCredentialsException>(() =>
                auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, "000000"), default));
        }

        // Bypass the resend cooldown directly, the same way a real 30s wait would.
        var otp = await db.LoginOtps.SingleAsync(x => x.PendingToken == pendingToken);
        otp.LastSentAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        await auth.ResendOtpAsync(new ResendOtpRequest(pendingToken), default);

        otp = await db.LoginOtps.SingleAsync(x => x.PendingToken == pendingToken);
        Assert.Equal(3, otp.Attempts);

        // The new code still works, and the old failed attempts still count toward the limit.
        var result = await auth.VerifyOtpAsync(new VerifyOtpRequest(pendingToken, email.LastCode!), default);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task ResendOtp_AfterMaxSends_Throws()
    {
        var (db, auth, _, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);
        var pendingToken = begin.Challenge!.PendingToken;

        async Task BypassCooldownAsync()
        {
            var otp = await db.LoginOtps.SingleAsync(x => x.PendingToken == pendingToken);
            otp.LastSentAt = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
        }

        await BypassCooldownAsync();
        await auth.ResendOtpAsync(new ResendOtpRequest(pendingToken), default); // SendCount 1 -> 2

        await BypassCooldownAsync();
        await auth.ResendOtpAsync(new ResendOtpRequest(pendingToken), default); // SendCount 2 -> 3

        await BypassCooldownAsync();
        await Assert.ThrowsAsync<ConflictException>(() =>
            auth.ResendOtpAsync(new ResendOtpRequest(pendingToken), default)); // capped at 3
    }

    [Fact]
    public async Task ResendOtp_BeforeCooldownElapses_Throws()
    {
        var (_, auth, _, _) = Build();
        var begin = await auth.BeginLoginAsync(new LoginRequest("admin@test.com", Password), default);

        await Assert.ThrowsAsync<ConflictException>(() =>
            auth.ResendOtpAsync(new ResendOtpRequest(begin.Challenge!.PendingToken), default));
    }
}
