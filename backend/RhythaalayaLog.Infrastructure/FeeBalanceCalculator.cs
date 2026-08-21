using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>Computes outstanding-balance figures from FeeDue/FeePaymentAllocation, batched to avoid N+1 queries.</summary>
public sealed class FeeBalanceCalculator(AppDbContext db)
{
    public async Task<Dictionary<Guid, decimal>> ByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        var net = await db.FeeDues.Where(x => enrollmentIds.Contains(x.EnrollmentId) && x.Status != FeeDueStatus.Cancelled)
            .GroupBy(x => x.EnrollmentId)
            .Select(g => new { EnrollmentId = g.Key, Net = g.Sum(x => x.NetAmount) }).ToListAsync(ct);
        var paid = await db.FeePaymentAllocations.Where(x => enrollmentIds.Contains(x.FeeDue.EnrollmentId) && x.FeeDue.Status != FeeDueStatus.Cancelled)
            .GroupBy(x => x.FeeDue.EnrollmentId)
            .Select(g => new { EnrollmentId = g.Key, Paid = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var paidMap = paid.ToDictionary(x => x.EnrollmentId, x => x.Paid);
        return net.ToDictionary(x => x.EnrollmentId, x => Math.Max(0, x.Net - paidMap.GetValueOrDefault(x.EnrollmentId)));
    }

    public async Task<Dictionary<Guid, decimal>> ByStudentAsync(IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        if (studentIds.Count == 0) return [];
        var net = await db.FeeDues.Where(x => studentIds.Contains(x.StudentId) && x.Status != FeeDueStatus.Cancelled)
            .GroupBy(x => x.StudentId)
            .Select(g => new { StudentId = g.Key, Net = g.Sum(x => x.NetAmount) }).ToListAsync(ct);
        var paid = await db.FeePaymentAllocations.Where(x => studentIds.Contains(x.FeeDue.StudentId) && x.FeeDue.Status != FeeDueStatus.Cancelled)
            .GroupBy(x => x.FeeDue.StudentId)
            .Select(g => new { StudentId = g.Key, Paid = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var credit = await db.FeePayments.Where(x => studentIds.Contains(x.StudentId) && x.Amount > 0 && x.RefundOfPaymentId == null)
            .GroupBy(x => x.StudentId)
            .Select(g => new { StudentId = g.Key, Amount = g.Sum(x => x.Amount) }).ToListAsync(ct);
        var allocatedFromCredit = await db.FeePaymentAllocations.Where(x => studentIds.Contains(x.FeePayment.StudentId) && x.FeePayment.Amount > 0)
            .GroupBy(x => x.FeePayment.StudentId)
            .Select(g => new { StudentId = g.Key, Amount = g.Sum(x => x.Amount) }).ToListAsync(ct);

        var paidMap = paid.ToDictionary(x => x.StudentId, x => x.Paid);
        var creditMap = credit.ToDictionary(x => x.StudentId, x => x.Amount);
        var allocatedMap = allocatedFromCredit.ToDictionary(x => x.StudentId, x => x.Amount);
        return net.ToDictionary(x => x.StudentId, x =>
        {
            var unallocatedCredit = creditMap.GetValueOrDefault(x.StudentId) - allocatedMap.GetValueOrDefault(x.StudentId);
            return Math.Max(0, x.Net - paidMap.GetValueOrDefault(x.StudentId) - unallocatedCredit);
        });
    }

    public async Task<decimal> ForDueAsync(Guid feeDueId, CancellationToken ct) =>
        await db.FeePaymentAllocations.Where(x => x.FeeDueId == feeDueId).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
}
