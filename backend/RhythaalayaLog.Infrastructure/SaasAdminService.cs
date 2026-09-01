using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class SaasAdminService(AppDbContext db, PasswordHasher<UserAccount> hasher) : ISaasAdminService
{
    public async Task<IReadOnlyList<PlanDto>> GetPlansAsync(CancellationToken ct) =>
        await db.SubscriptionPlans.AsNoTracking().OrderBy(x => x.MonthlyPrice)
            .Select(x => new PlanDto(x.Id, x.Name, x.Code, x.MonthlyPrice,
                x.MaxUsers, x.MaxStudents, x.IsActive)).ToListAsync(ct);

    public async Task<PlanDto> CreatePlanAsync(CreatePlanRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Code)
            || request.MonthlyPrice < 0 || request.MaxUsers < 1 || request.MaxStudents < 1)
            throw new AppValidationException("Plan values are invalid.");
        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.SubscriptionPlans.AnyAsync(x => x.Code == code, ct))
            throw new ConflictException("The plan code already exists.");
        var plan = new SubscriptionPlan
        {
            Name = request.Name.Trim(), Code = code, MonthlyPrice = request.MonthlyPrice,
            MaxUsers = request.MaxUsers, MaxStudents = request.MaxStudents
        };
        db.SubscriptionPlans.Add(plan);
        await db.SaveChangesAsync(ct);
        return MapPlan(plan);
    }

    public async Task<IReadOnlyList<TenantDto>> GetTenantsAsync(CancellationToken ct)
    {
        var tenants = await db.Tenants.AsNoTracking().Include(x => x.Users)
            .Include(x => x.Subscriptions).ThenInclude(x => x.Plan).OrderBy(x => x.Name).ToListAsync(ct);
        var studentCounts = await db.Students.IgnoreQueryFilters().AsNoTracking()
            .GroupBy(x => x.TenantId).Select(x => new { TenantId = x.Key, Count = x.Count(s => s.IsActive) })
            .ToDictionaryAsync(x => x.TenantId, x => x.Count, ct);
        return tenants.Select(x => MapTenant(x, studentCounts.GetValueOrDefault(x.Id))).ToList();
    }

    public async Task<TenantDto> CreateTenantAsync(CreateTenantRequest request, CancellationToken ct)
    {
        ValidateTenant(request);
        var slug = request.Slug.Trim().ToLowerInvariant();
        var email = request.AdminEmail.Trim().ToLowerInvariant();
        if (await db.Tenants.AnyAsync(x => x.Slug == slug, ct)) throw new ConflictException("Tenant slug already exists.");
        if (await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Email == email, ct)) throw new ConflictException("Email already exists.");
        var plan = await db.SubscriptionPlans.SingleOrDefaultAsync(x => x.Id == request.PlanId && x.IsActive, ct)
            ?? throw new NotFoundException("Subscription plan not found.");
        var now = DateTimeOffset.UtcNow;
        if (request.SubscriptionEndsAt <= now) throw new AppValidationException("Subscription end date must be in the future.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var tenant = new Tenant { Name = request.Name.Trim(), Slug = slug };
        db.Tenants.Add(tenant);
        var admin = new UserAccount
        {
            Tenant = tenant, Email = email, FullName = request.AdminName.Trim(),
            PasswordHash = string.Empty, Role = UserRole.TenantAdmin
        };
        admin.PasswordHash = hasher.HashPassword(admin, request.AdminPassword);
        db.Users.Add(admin);
        db.TenantSubscriptions.Add(new TenantSubscription
        {
            Tenant = tenant, Plan = plan, Status = SubscriptionStatus.Active,
            StartsAt = now, EndsAt = request.SubscriptionEndsAt.ToUniversalTime()
        });
        db.OrganizationSettings.Add(new OrganizationSettings
        {
            Id = Guid.NewGuid(), TenantId = tenant.Id, Name = tenant.Name,
            Type = "Academy", Currency = "INR", Locale = "en-IN", TimeZone = "Asia/Kolkata"
        });
        var defaultHeads = new[] { "Tuition Fee", "Registration Fee", "Material Fee", "Exam Fee", "Transport Fee", "Other Fee" };
        for (var i = 0; i < defaultHeads.Length; i++)
            db.FeeHeads.Add(new FeeHead { TenantId = tenant.Id, Name = defaultHeads[i], DisplayOrder = i });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return MapTenant(tenant, 0);
    }

    public async Task<TenantDto> SetTenantStatusAsync(Guid tenantId, bool isActive, CancellationToken ct)
    {
        var tenant = await TenantQuery().SingleOrDefaultAsync(x => x.Id == tenantId, ct)
            ?? throw new NotFoundException("Tenant not found.");
        tenant.IsActive = isActive;
        await db.SaveChangesAsync(ct);
        var students = await db.Students.IgnoreQueryFilters().CountAsync(x => x.TenantId == tenantId && x.IsActive, ct);
        return MapTenant(tenant, students);
    }

    public async Task<SubscriptionDto> AssignSubscriptionAsync(Guid tenantId,
        AssignSubscriptionRequest request, CancellationToken ct)
    {
        if (request.EndsAt <= request.StartsAt) throw new AppValidationException("Subscription dates are invalid.");
        if (request.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Trial))
            throw new AppValidationException("A newly assigned subscription must be Active or Trial.");
        if (!await db.Tenants.AnyAsync(x => x.Id == tenantId, ct)) throw new NotFoundException("Tenant not found.");
        var plan = await db.SubscriptionPlans.SingleOrDefaultAsync(x => x.Id == request.PlanId && x.IsActive, ct)
            ?? throw new NotFoundException("Subscription plan not found.");
        var current = await db.TenantSubscriptions.Where(x => x.TenantId == tenantId
            && (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)).ToListAsync(ct);
        foreach (var item in current)
        {
            item.Status = SubscriptionStatus.Cancelled;
            item.CancelledAt = DateTimeOffset.UtcNow;
        }
        var subscription = new TenantSubscription
        {
            TenantId = tenantId, PlanId = plan.Id, Status = request.Status,
            StartsAt = request.StartsAt.ToUniversalTime(), EndsAt = request.EndsAt.ToUniversalTime()
        };
        db.TenantSubscriptions.Add(subscription);
        await db.SaveChangesAsync(ct);
        return MapSubscription(subscription, plan.Name);
    }

    public async Task<IReadOnlyList<TenantUserDto>> GetTenantUsersAsync(Guid tenantId, CancellationToken ct) =>
        await db.Users.IgnoreQueryFilters().AsNoTracking().Where(x => x.TenantId == tenantId)
            .OrderBy(x => x.FullName).Select(x => new TenantUserDto(x.Id, x.TenantId, x.Email,
                x.FullName, x.Role, x.IsActive, x.OtpEnabled, x.LastLoginAt)).ToListAsync(ct);

    public async Task<TenantUserDto> CreateTenantUserAsync(Guid tenantId,
        CreateTenantUserRequest request, CancellationToken ct)
    {
        if (request.Role is UserRole.SuperAdmin) throw new AppValidationException("Super Admin cannot belong to a tenant.");
        ValidateUser(request.FullName, request.Email, request.Password);
        var tenant = await db.Tenants.SingleOrDefaultAsync(x => x.Id == tenantId && x.IsActive, ct)
            ?? throw new NotFoundException("Active tenant not found.");
        var subscription = await ActiveSubscription(tenantId, ct)
            ?? throw new ConflictException("Tenant has no active subscription.");
        var userCount = await db.Users.IgnoreQueryFilters().CountAsync(x => x.TenantId == tenantId && x.IsActive, ct);
        if (userCount >= subscription.Plan.MaxUsers) throw new ConflictException("Subscription user limit reached.");
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Email == email, ct)) throw new ConflictException("Email already exists.");
        var user = new UserAccount
        {
            Tenant = tenant, Email = email, FullName = request.FullName.Trim(), PasswordHash = string.Empty,
            Role = request.Role
        };
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return MapUser(user);
    }

    private IQueryable<Tenant> TenantQuery() => db.Tenants
        .Include(x => x.Users)
        .Include(x => x.Subscriptions).ThenInclude(x => x.Plan);

    private Task<TenantSubscription?> ActiveSubscription(Guid tenantId, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        return db.TenantSubscriptions.Include(x => x.Plan)
            .Where(x => x.TenantId == tenantId
                && (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)
                && x.StartsAt <= now && x.EndsAt > now)
            .OrderByDescending(x => x.EndsAt)
            .FirstOrDefaultAsync(ct);
    }

    private static PlanDto MapPlan(SubscriptionPlan plan) => new(plan.Id, plan.Name, plan.Code,
        plan.MonthlyPrice, plan.MaxUsers, plan.MaxStudents, plan.IsActive);

    private static SubscriptionDto MapSubscription(TenantSubscription subscription, string? planName = null) =>
        new(subscription.Id, subscription.PlanId, planName ?? subscription.Plan?.Name ?? string.Empty,
            subscription.Status, subscription.StartsAt, subscription.EndsAt);

    private static TenantDto MapTenant(Tenant tenant, int studentCount)
    {
        var now = DateTimeOffset.UtcNow;
        var subscription = tenant.Subscriptions
            .Where(x => x.Status is SubscriptionStatus.Active or SubscriptionStatus.Trial)
            .Where(x => x.StartsAt <= now && x.EndsAt > now)
            .OrderByDescending(x => x.EndsAt)
            .FirstOrDefault();
        return new TenantDto(tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive,
            tenant.Users.Count(x => x.IsActive), studentCount,
            subscription is null ? null : MapSubscription(subscription), tenant.CreatedAt);
    }

    private static TenantUserDto MapUser(UserAccount user) => new(user.Id, user.TenantId,
        user.Email, user.FullName, user.Role, user.IsActive, user.OtpEnabled, user.LastLoginAt);

    public async Task<TenantUserDto> SetUserOtpEnabledAsync(Guid tenantId, Guid userId, bool otpEnabled,
        bool restrictToStaff, CancellationToken ct)
    {
        var user = await db.Users.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.Id == userId && x.TenantId == tenantId, ct)
            ?? throw new NotFoundException("Tenant user not found.");
        if (user.Role == UserRole.SuperAdmin)
            throw new AppValidationException("Super Admin accounts always skip OTP.");
        if (restrictToStaff && user.Role != UserRole.Staff)
            throw new AppValidationException("Tenant administrators can manage Staff users only.");
        user.OtpEnabled = otpEnabled;
        await db.SaveChangesAsync(ct);
        return MapUser(user);
    }

    public async Task<TenantUserDto> UpdateTenantUserAsync(Guid tenantId, Guid userId,
        UpdateTenantUserRequest request, bool restrictToStaff, CancellationToken ct)
    {
        var user = await ManagedTenantUserAsync(tenantId, userId, restrictToStaff, ct, "edited");
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email)
            || !request.Email.Contains('@'))
            throw new AppValidationException("A valid name and email are required.");
        if (!string.IsNullOrEmpty(request.NewPassword) && request.NewPassword.Length < 8)
            throw new AppValidationException("The new password must be at least 8 characters.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.IgnoreQueryFilters().AnyAsync(x => x.Email == email && x.Id != userId, ct))
            throw new ConflictException("Email already exists.");

        user.FullName = request.FullName.Trim();
        user.Email = email;
        if (!string.IsNullOrEmpty(request.NewPassword))
            user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
        await db.SaveChangesAsync(ct);
        return MapUser(user);
    }

    public async Task<TenantUserDto> SetTenantUserActiveAsync(Guid tenantId, Guid userId, bool isActive,
        bool restrictToStaff, CancellationToken ct)
    {
        var user = await ManagedTenantUserAsync(tenantId, userId, restrictToStaff, ct, "deactivated");
        if (!isActive && user.Role == UserRole.TenantAdmin)
        {
            var otherActiveAdmins = await db.Users.IgnoreQueryFilters().CountAsync(x =>
                x.TenantId == tenantId && x.Role == UserRole.TenantAdmin && x.IsActive && x.Id != userId, ct);
            if (otherActiveAdmins == 0)
                throw new ConflictException("Cannot deactivate the academy's only active admin.");
        }
        user.IsActive = isActive;
        await db.SaveChangesAsync(ct);
        return MapUser(user);
    }

    // Shared lookup+guard for UpdateTenantUserAsync/SetTenantUserActiveAsync/SetUserOtpEnabledAsync's
    // "target user" step: must belong to tenantId, can never be a SuperAdmin, and (for the
    // TenantAdmin self-service path) must be Staff.
    private async Task<UserAccount> ManagedTenantUserAsync(Guid tenantId, Guid userId, bool restrictToStaff,
        CancellationToken ct, string action)
    {
        var user = await db.Users.IgnoreQueryFilters()
            .SingleOrDefaultAsync(x => x.Id == userId && x.TenantId == tenantId, ct)
            ?? throw new NotFoundException("Tenant user not found.");
        if (user.Role == UserRole.SuperAdmin)
            throw new AppValidationException($"Super Admin accounts cannot be {action} here.");
        if (restrictToStaff && user.Role != UserRole.Staff)
            throw new AppValidationException("Tenant administrators can manage Staff users only.");
        return user;
    }

    private static void ValidateTenant(CreateTenantRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Slug))
            throw new AppValidationException("Tenant name and slug are required.");
        ValidateUser(request.AdminName, request.AdminEmail, request.AdminPassword);
    }

    private static void ValidateUser(string fullName, string email, string password)
    {
        if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(email)
            || !email.Contains('@') || string.IsNullOrWhiteSpace(password) || password.Length < 8)
            throw new AppValidationException("A valid name, email, and password of at least 8 characters are required.");
    }
}
