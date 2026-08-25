using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>Tenant context with explicit values, for work that runs outside an HTTP request.</summary>
public sealed class FixedTenantContext : ITenantContext
{
    public Guid? TenantId { get; init; }
    public Guid? UserId { get; init; }
    public UserRole? Role { get; init; }
}

/// <summary>
/// Daily billing sweep: once per tenant-local day (checked hourly, so each tenant rolls over just
/// after its own midnight) it generates dues through the lead-days horizon, flips Upcoming dues
/// whose date has arrived, marks Overdue, and applies advance credit — the same idempotent logic
/// the lazy on-read path uses, so a missed run self-heals and a stopped job degrades gracefully.
/// A per-tenant advisory lock keeps overlapping app instances from sweeping the same tenant twice.
/// </summary>
public sealed class FeeBillingDailyService(IServiceProvider services, ILogger<FeeBillingDailyService> logger)
    : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunSweepAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception e)
            {
                logger.LogError(e, "Fee billing sweep failed.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunSweepAsync(CancellationToken ct)
    {
        var options = services.GetRequiredService<DbContextOptions<AppDbContext>>();
        List<Guid> tenantIds;
        await using (var db = new AppDbContext(options, new FixedTenantContext()))
        {
            tenantIds = await db.Tenants.AsNoTracking().Where(x => x.IsActive)
                .Select(x => x.Id).ToListAsync(ct);
        }

        foreach (var tenantId in tenantIds)
        {
            ct.ThrowIfCancellationRequested();
            try
            {
                await ProcessTenantAsync(options, tenantId, ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                // one tenant's failure must not block the rest of the sweep
                logger.LogError(e, "Fee billing sweep failed for tenant {TenantId}.", tenantId);
            }
        }
    }

    private async Task ProcessTenantAsync(DbContextOptions<AppDbContext> options, Guid tenantId, CancellationToken ct)
    {
        var rowLocker = services.GetRequiredService<IRowLocker>();
        await using var db = new AppDbContext(options, new FixedTenantContext { TenantId = tenantId });

        var settings = await db.OrganizationSettings.SingleOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = OrganizationSettingsDefaults.Create(tenantId);
            db.OrganizationSettings.Add(settings);
            await db.SaveChangesAsync(ct);
        }
        var today = BillingSchedule.TodayInTimeZone(settings.TimeZone);
        if (settings.LastBillingRunDate >= today) return;

        // Session advisory locks live on the connection, so pin it open for lock + work + unlock.
        await db.Database.OpenConnectionAsync(ct);
        if (!await rowLocker.TryAcquireTenantBillingLockAsync(db, tenantId, ct)) return;
        try
        {
            var generator = new FeeDueGenerator(db);
            await generator.EnsureForTenantAsync(ct);
            settings.LastBillingRunDate = today;
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Fee billing sweep completed for tenant {TenantId} ({Date}).", tenantId, today);
        }
        finally
        {
            await rowLocker.ReleaseTenantBillingLockAsync(db, tenantId, ct);
        }
    }
}
