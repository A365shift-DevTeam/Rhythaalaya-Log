using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class SaasAdminServiceTests
{
    private static (AppDbContext Db, SaasAdminService Service, Guid TenantId, Guid OtherTenantId,
        Guid TenantAdminId, Guid StaffId, Guid SuperAdminId) Build()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        var db = new AppDbContext(options, new FixedTenantContext());
        var hasher = new PasswordHasher<UserAccount>();
        var service = new SaasAdminService(db, hasher);

        var tenant = new Tenant { Name = "Academy One", Slug = "academy-one" };
        var otherTenant = new Tenant { Name = "Academy Two", Slug = "academy-two" };
        var tenantAdmin = new UserAccount
        {
            Tenant = tenant, Email = "admin@one.com", FullName = "Admin One",
            PasswordHash = "x", Role = UserRole.TenantAdmin
        };
        var staff = new UserAccount
        {
            Tenant = tenant, Email = "staff@one.com", FullName = "Staff One",
            PasswordHash = "x", Role = UserRole.Staff
        };
        var superAdmin = new UserAccount
        {
            Email = "super@platform.com", FullName = "Super", PasswordHash = "x", Role = UserRole.SuperAdmin
        };
        db.AddRange(tenant, otherTenant, tenantAdmin, staff, superAdmin);
        db.SaveChanges();
        return (db, service, tenant.Id, otherTenant.Id, tenantAdmin.Id, staff.Id, superAdmin.Id);
    }

    [Fact]
    public async Task SuperAdminScope_CanToggleOtpForTenantAdmin()
    {
        var (db, service, tenantId, _, tenantAdminId, _, _) = Build();

        var result = await service.SetUserOtpEnabledAsync(tenantId, tenantAdminId, false, restrictToStaff: false, default);

        Assert.False(result.OtpEnabled);
        var reloaded = await db.Users.IgnoreQueryFilters().SingleAsync(x => x.Id == tenantAdminId);
        Assert.False(reloaded.OtpEnabled);
    }

    [Fact]
    public async Task SuperAdminScope_CannotReachSuperAdminTarget()
    {
        var (_, service, tenantId, _, _, _, superAdminId) = Build();

        // A SuperAdmin has no TenantId, so it can never match a tenant-scoped lookup — the
        // explicit role check in SetUserOtpEnabledAsync is unreachable via any real caller, but
        // this confirms the outcome (a 404, not a silent toggle) either way.
        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.SetUserOtpEnabledAsync(tenantId, superAdminId, false, restrictToStaff: false, default));
    }

    [Fact]
    public async Task TenantAdminScope_CanToggleOtpForOwnStaff()
    {
        var (_, service, tenantId, _, _, staffId, _) = Build();

        var result = await service.SetUserOtpEnabledAsync(tenantId, staffId, false, restrictToStaff: true, default);

        Assert.False(result.OtpEnabled);
    }

    [Fact]
    public async Task TenantAdminScope_RejectsNonStaffTarget()
    {
        var (_, service, tenantId, _, tenantAdminId, _, _) = Build();

        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.SetUserOtpEnabledAsync(tenantId, tenantAdminId, false, restrictToStaff: true, default));
    }

    [Fact]
    public async Task RejectsUserFromAnotherTenant()
    {
        var (_, service, _, otherTenantId, tenantAdminId, _, _) = Build();

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.SetUserOtpEnabledAsync(otherTenantId, tenantAdminId, false, restrictToStaff: false, default));
    }
}
