using Microsoft.EntityFrameworkCore;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Provider-native row/advisory locking used to serialize money-critical sections. The interface
/// exists so service logic stays testable on providers without FOR UPDATE (tests use the no-op
/// implementation; correctness there is still guarded by unique indexes and single transactions).
/// Lock ordering everywhere: settings row → payment row → due rows, to avoid deadlocks.
/// </summary>
public interface IRowLocker
{
    /// <summary>Locks the tenant's OrganizationSettings row (serializes receipt-number issuance).</summary>
    Task LockOrganizationSettingsAsync(AppDbContext db, Guid tenantId, CancellationToken ct);

    /// <summary>Locks fee due rows so balance checks against their allocations are race-free.</summary>
    Task LockFeeDuesAsync(AppDbContext db, IReadOnlyCollection<Guid> feeDueIds, CancellationToken ct);

    /// <summary>Locks a payment row (serializes the refundable-amount check).</summary>
    Task LockFeePaymentAsync(AppDbContext db, Guid feePaymentId, CancellationToken ct);

    /// <summary>
    /// Session-level advisory lock guarding a tenant's daily billing sweep against concurrent app
    /// instances. Returns false when another instance holds it. Must be released with
    /// <see cref="ReleaseTenantBillingLockAsync"/> on the same open connection.
    /// </summary>
    Task<bool> TryAcquireTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct);

    Task ReleaseTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct);
}

public sealed class PostgresRowLocker : IRowLocker
{
    public Task LockOrganizationSettingsAsync(AppDbContext db, Guid tenantId, CancellationToken ct) =>
        db.Database.ExecuteSqlAsync(
            $"""SELECT 1 FROM "OrganizationSettings" WHERE "TenantId" = {tenantId} FOR UPDATE""", ct);

    public Task LockFeeDuesAsync(AppDbContext db, IReadOnlyCollection<Guid> feeDueIds, CancellationToken ct) =>
        feeDueIds.Count == 0
            ? Task.CompletedTask
            : db.Database.ExecuteSqlAsync(
                $"""SELECT 1 FROM "FeeDues" WHERE "Id" = ANY({feeDueIds.ToArray()}) FOR UPDATE""", ct);

    public Task LockFeePaymentAsync(AppDbContext db, Guid feePaymentId, CancellationToken ct) =>
        db.Database.ExecuteSqlAsync(
            $"""SELECT 1 FROM "FeePayments" WHERE "Id" = {feePaymentId} FOR UPDATE""", ct);

    public async Task<bool> TryAcquireTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct)
    {
        var acquired = await db.Database.SqlQuery<bool>(
            $"SELECT pg_try_advisory_lock({BillingLockKey(tenantId)}) AS \"Value\"").SingleAsync(ct);
        return acquired;
    }

    public Task ReleaseTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct) =>
        db.Database.ExecuteSqlAsync($"SELECT pg_advisory_unlock({BillingLockKey(tenantId)})", ct);

    private static long BillingLockKey(Guid tenantId)
    {
        var bytes = tenantId.ToByteArray();
        return BitConverter.ToInt64(bytes, 0) ^ BitConverter.ToInt64(bytes, 8);
    }
}

/// <summary>Used by tests on providers without FOR UPDATE / advisory locks.</summary>
public sealed class NoOpRowLocker : IRowLocker
{
    public Task LockOrganizationSettingsAsync(AppDbContext db, Guid tenantId, CancellationToken ct) => Task.CompletedTask;
    public Task LockFeeDuesAsync(AppDbContext db, IReadOnlyCollection<Guid> feeDueIds, CancellationToken ct) => Task.CompletedTask;
    public Task LockFeePaymentAsync(AppDbContext db, Guid feePaymentId, CancellationToken ct) => Task.CompletedTask;
    public Task<bool> TryAcquireTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct) => Task.FromResult(true);
    public Task ReleaseTenantBillingLockAsync(AppDbContext db, Guid tenantId, CancellationToken ct) => Task.CompletedTask;
}
