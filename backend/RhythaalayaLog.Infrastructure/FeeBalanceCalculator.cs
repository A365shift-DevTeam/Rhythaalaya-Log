using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Computes outstanding-balance figures from FeeDue/FeePaymentAllocation, batched to avoid N+1
/// queries. Upcoming dues are excluded on both sides (their net and any credit already set aside
/// against them): money not yet due is neither owed nor available. Advance credit is the money a
/// student has handed over and not had refunded, less what is applied to dues.
/// </summary>
public sealed class FeeBalanceCalculator(AppDbContext db)
{
    /// <summary>
    /// Pending owed, spare credit, overdue balance, and credit reserved against not-yet-due bills
    /// for one student — the figures behind the fee ledger summary. Total unconsumed credit is
    /// AvailableCredit + ReservedCredit.
    /// </summary>
    public sealed record StudentFinancials(decimal Pending, decimal AvailableCredit, decimal Overdue, decimal ReservedCredit = 0);

    public async Task<Dictionary<Guid, decimal>> ByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        var net = await db.FeeDues.Where(x => enrollmentIds.Contains(x.EnrollmentId)
                && x.Status != FeeDueStatus.Cancelled && x.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.EnrollmentId)
            .Select(g => new { EnrollmentId = g.Key, Net = g.Sum(x => x.NetAmount) }).ToListAsync(ct);
        var paid = await db.FeePaymentAllocations.Where(x => enrollmentIds.Contains(x.FeeDue.EnrollmentId)
                && x.FeeDue.Status != FeeDueStatus.Cancelled && x.FeeDue.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.FeeDue.EnrollmentId)
            .Select(g => new { EnrollmentId = g.Key, Paid = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var paidMap = paid.ToDictionary(x => x.EnrollmentId, x => x.Paid);
        return net.ToDictionary(x => x.EnrollmentId, x => Math.Max(0, x.Net - paidMap.GetValueOrDefault(x.EnrollmentId)));
    }

    public async Task<Dictionary<Guid, decimal>> ByStudentAsync(IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        if (studentIds.Count == 0) return [];
        var net = await db.FeeDues.Where(x => studentIds.Contains(x.StudentId)
                && x.Status != FeeDueStatus.Cancelled && x.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.StudentId)
            .Select(g => new { StudentId = g.Key, Net = g.Sum(x => x.NetAmount) }).ToListAsync(ct);
        var paid = await db.FeePaymentAllocations.Where(x => studentIds.Contains(x.FeeDue.StudentId)
                && x.FeeDue.Status != FeeDueStatus.Cancelled && x.FeeDue.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.FeeDue.StudentId)
            .Select(g => new { StudentId = g.Key, Paid = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var creditMap = await UnallocatedCreditByStudentAsync(studentIds, ct);

        var paidMap = paid.ToDictionary(x => x.StudentId, x => x.Paid);
        return net.ToDictionary(x => x.StudentId, x =>
            Math.Max(0, x.Net - paidMap.GetValueOrDefault(x.StudentId) - creditMap.GetValueOrDefault(x.StudentId)));
    }

    /// <summary>Pending / available-credit / overdue for one student. See <see cref="StudentFinancialsBatchAsync"/>.</summary>
    public async Task<StudentFinancials> StudentFinancialsAsync(Guid studentId, CancellationToken ct) =>
        (await StudentFinancialsBatchAsync([studentId], ct))
            .GetValueOrDefault(studentId, new StudentFinancials(0m, 0m, 0m, 0m));

    /// <summary>
    /// <see cref="StudentFinancials.Pending"/> matches <see cref="ByStudentAsync"/> exactly (same
    /// net/paid/credit math, same zero clamp), so the fee-ledger summary, the batch-finance rows,
    /// and the student header all agree. <see cref="StudentFinancials.AvailableCredit"/> mirrors
    /// that clamp. Money explicitly paid against a not-yet-due (Upcoming) bill is neither owed nor
    /// spare: it is reported separately as <see cref="StudentFinancials.ReservedCredit"/>.
    /// </summary>
    public async Task<Dictionary<Guid, StudentFinancials>> StudentFinancialsBatchAsync(
        IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        if (studentIds.Count == 0) return [];
        var net = (await db.FeeDues.Where(x => studentIds.Contains(x.StudentId)
                && x.Status != FeeDueStatus.Cancelled && x.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => x.NetAmount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);
        var paid = (await db.FeePaymentAllocations.Where(x => studentIds.Contains(x.FeeDue.StudentId)
                && x.FeeDue.Status != FeeDueStatus.Cancelled && x.FeeDue.Status != FeeDueStatus.Upcoming)
            .GroupBy(x => x.FeeDue.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);
        var credit = await UnallocatedCreditByStudentAsync(studentIds, ct);

        var overdueRows = await db.FeeDues.Where(x => studentIds.Contains(x.StudentId) && x.Status == FeeDueStatus.Overdue)
            .Select(x => new { x.StudentId, x.Id, x.NetAmount }).ToListAsync(ct);
        var overdueDueIds = overdueRows.Select(x => x.Id).ToList();
        var overdueAllocated = overdueDueIds.Count == 0 ? new Dictionary<Guid, decimal>() : await db.FeePaymentAllocations
            .Where(x => overdueDueIds.Contains(x.FeeDueId))
            .GroupBy(x => x.FeeDueId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        var overdueByStudent = overdueRows.GroupBy(x => x.StudentId).ToDictionary(g => g.Key,
            g => g.Sum(d => Math.Max(0m, d.NetAmount - overdueAllocated.GetValueOrDefault(d.Id))));
        var reserved = (await db.FeePaymentAllocations
            .Where(x => studentIds.Contains(x.FeeDue.StudentId) && x.FeeDue.Status == FeeDueStatus.Upcoming)
            .GroupBy(x => x.FeeDue.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);

        return studentIds.ToDictionary(id => id, id =>
        {
            var signed = net.GetValueOrDefault(id) - paid.GetValueOrDefault(id) - credit.GetValueOrDefault(id);
            return new StudentFinancials(
                Pending: Math.Max(0m, signed),
                AvailableCredit: Math.Max(0m, -signed),
                Overdue: overdueByStudent.GetValueOrDefault(id),
                ReservedCredit: Math.Max(0m, reserved.GetValueOrDefault(id)));
        });
    }

    public async Task<decimal> ForDueAsync(Guid feeDueId, CancellationToken ct) =>
        await db.FeePaymentAllocations.Where(x => x.FeeDueId == feeDueId).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;

    /// <summary>
    /// Advance credit still on the student's account: positive payments received, minus what is
    /// applied to dues, minus the part of any refund that was <em>not</em> a reversal of a due
    /// allocation (i.e. money refunded straight out of unapplied credit). Never negative.
    /// </summary>
    private async Task<Dictionary<Guid, decimal>> UnallocatedCreditByStudentAsync(
        IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        var positivePayments = await db.FeePayments
            .Where(x => studentIds.Contains(x.StudentId) && x.Amount > 0 && x.RefundOfPaymentId == null)
            .GroupBy(x => x.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var allocatedFromPositive = await db.FeePaymentAllocations
            .Where(x => studentIds.Contains(x.FeePayment.StudentId) && x.FeePayment.Amount > 0)
            .GroupBy(x => x.FeePayment.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var refunded = await db.FeePayments
            .Where(x => studentIds.Contains(x.StudentId) && x.Amount < 0)
            .GroupBy(x => x.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => -x.Amount) }).ToListAsync(ct);
        // Only reversals carried by a refund payment are money leaving; a released allocation
        // (negative row on the original payment) merely returns money to credit.
        var refundReversals = await db.FeePaymentAllocations
            .Where(x => studentIds.Contains(x.FeePayment.StudentId) && x.Amount < 0 && x.FeePayment.Amount < 0)
            .GroupBy(x => x.FeePayment.StudentId).Select(g => new { g.Key, Sum = g.Sum(x => -x.Amount) }).ToListAsync(ct);

        var positiveMap = positivePayments.ToDictionary(x => x.Key, x => x.Sum);
        var allocatedMap = allocatedFromPositive.ToDictionary(x => x.Key, x => x.Sum);
        var refundedMap = refunded.ToDictionary(x => x.Key, x => x.Sum);
        var reversalMap = refundReversals.ToDictionary(x => x.Key, x => x.Sum);

        return studentIds.ToDictionary(id => id, id =>
        {
            var refundOutOfCredit = refundedMap.GetValueOrDefault(id) - reversalMap.GetValueOrDefault(id);
            var unallocated = positiveMap.GetValueOrDefault(id) - allocatedMap.GetValueOrDefault(id) - refundOutOfCredit;
            return Math.Max(0m, unallocated);
        });
    }
}
