using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Generates rolling fee dues from each enrollment's billing schedule (never more than the
/// current period ahead), auto-applies any unconsumed advance-payment credit to newly created
/// dues, and keeps FeeDue.Status current. There is no background job: every entry point that
/// reads or acts on fee dues calls this first, so results are always up to date on demand.
/// </summary>
public sealed class FeeDueGenerator(AppDbContext db)
{
    public async Task EnsureForStudentAsync(Guid studentId, CancellationToken ct)
    {
        var enrollmentIds = await db.Enrollments.AsNoTracking()
            .Where(x => x.StudentId == studentId && x.Status == EnrollmentStatus.Active)
            .Select(x => x.Id).ToListAsync(ct);
        foreach (var id in enrollmentIds) await EnsureForEnrollmentAsync(id, ct);
        await RefreshOverdueAsync(studentId, ct);
    }

    public async Task EnsureForTenantAsync(CancellationToken ct)
    {
        var enrollmentIds = await db.Enrollments.AsNoTracking()
            .Where(x => x.Status == EnrollmentStatus.Active)
            .Select(x => x.Id).ToListAsync(ct);
        foreach (var id in enrollmentIds) await EnsureForEnrollmentAsync(id, ct);
        await RefreshOverdueAsync(null, ct);
    }

    public async Task EnsureForEnrollmentAsync(Guid enrollmentId, CancellationToken ct)
    {
        var enrollment = await db.Enrollments.AsNoTracking().SingleAsync(x => x.Id == enrollmentId, ct);
        var today = Today();
        var structure = await db.FeeStructures.AsNoTracking()
            .Where(x => x.CourseId == enrollment.CourseId && x.IsActive
                && x.EffectiveFrom <= today && (x.EffectiveTo == null || x.EffectiveTo >= today))
            .OrderByDescending(x => x.EffectiveFrom).FirstOrDefaultAsync(ct);
        if (structure is null) return;

        var latest = await db.FeeDues.AsNoTracking()
            .Where(x => x.EnrollmentId == enrollmentId && x.FeeStructureId == structure.Id)
            .OrderByDescending(x => x.DueDate).FirstOrDefaultAsync(ct);
        if (latest is not null && structure.Frequency == FeeFrequency.OneTime) return;

        // Recurring fees share one calendar due date across every student (anchored on the structure's
        // EffectiveFrom, e.g. "the 5th of every month"); a student who joins later just starts at the
        // first occurrence on/after they enrolled. OneTime fees (e.g. a registration fee) still anchor
        // on the individual enrollment date, since there is no recurring cycle to align to.
        var nextDueDate = latest is not null
            ? AddPeriod(latest.DueDate, structure.Frequency)
            : structure.Frequency == FeeFrequency.OneTime
                ? enrollment.EnrolledOn
                : FirstDueOnOrAfter(structure.EffectiveFrom, enrollment.EnrolledOn, structure.Frequency);
        while (nextDueDate <= today && (structure.EffectiveTo is null || nextDueDate <= structure.EffectiveTo))
        {
            var exists = await db.FeeDues.AnyAsync(x => x.EnrollmentId == enrollmentId
                && x.FeeStructureId == structure.Id && x.DueDate == nextDueDate, ct);
            if (!exists)
            {
                var due = new FeeDue
                {
                    TenantId = enrollment.TenantId, StudentId = enrollment.StudentId, EnrollmentId = enrollmentId,
                    FeeStructureId = structure.Id, DueDate = nextDueDate, Amount = structure.Amount,
                    DiscountAmount = 0, NetAmount = structure.Amount, Status = FeeDueStatus.Pending
                };
                db.FeeDues.Add(due);
                try
                {
                    await db.SaveChangesAsync(ct);
                }
                catch (DbUpdateException)
                {
                    // A concurrent request generated the same due first (unique index caught it) -- that
                    // request owns its credit allocation and status; just move on to the next period.
                    db.Entry(due).State = EntityState.Detached;
                    if (structure.Frequency == FeeFrequency.OneTime) break;
                    nextDueDate = AddPeriod(nextDueDate, structure.Frequency);
                    continue;
                }
                await AllocateCreditAsync(due, ct);
                await RefreshDueStatusAsync(due.Id, ct);
            }
            if (structure.Frequency == FeeFrequency.OneTime) break;
            nextDueDate = AddPeriod(nextDueDate, structure.Frequency);
        }
    }

    /// <summary>Draws down any of the student's unconsumed advance-payment credit against a freshly created due.</summary>
    private async Task AllocateCreditAsync(FeeDue due, CancellationToken ct)
    {
        var remaining = due.NetAmount;
        var candidates = await db.FeePayments.AsNoTracking()
            .Where(x => x.StudentId == due.StudentId && x.Amount > 0 && x.RefundOfPaymentId == null)
            .OrderBy(x => x.PaymentDate)
            .Select(x => new { x.Id, x.Amount }).ToListAsync(ct);
        if (candidates.Count == 0) return;

        var candidateIds = candidates.Select(x => x.Id).ToList();
        var allocatedByPayment = await db.FeePaymentAllocations.Where(x => candidateIds.Contains(x.FeePaymentId))
            .GroupBy(x => x.FeePaymentId)
            .Select(g => new { PaymentId = g.Key, Allocated = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.PaymentId, x => x.Allocated, ct);
        foreach (var candidate in candidates)
        {
            if (remaining <= 0) break;
            var available = candidate.Amount - allocatedByPayment.GetValueOrDefault(candidate.Id);
            if (available <= 0) continue;
            var take = Math.Min(available, remaining);
            db.FeePaymentAllocations.Add(new FeePaymentAllocation
            {
                TenantId = due.TenantId, FeePaymentId = candidate.Id, FeeDueId = due.Id, Amount = take
            });
            remaining -= take;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task RefreshDueStatusAsync(Guid dueId, CancellationToken ct)
    {
        var due = await db.FeeDues.SingleAsync(x => x.Id == dueId, ct);
        if (due.Status == FeeDueStatus.Cancelled) return;
        var paid = await db.FeePaymentAllocations.Where(x => x.FeeDueId == dueId)
            .SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        due.Status = paid >= due.NetAmount ? FeeDueStatus.Paid
            : due.DueDate < Today() ? FeeDueStatus.Overdue
            : paid > 0 ? FeeDueStatus.Partial
            : FeeDueStatus.Pending;
        await db.SaveChangesAsync(ct);
    }

    public async Task RefreshOverdueAsync(Guid? studentId, CancellationToken ct)
    {
        var today = Today();
        var query = db.FeeDues.Where(x => x.DueDate < today
            && (x.Status == FeeDueStatus.Pending || x.Status == FeeDueStatus.Partial));
        if (studentId.HasValue) query = query.Where(x => x.StudentId == studentId.Value);
        var dues = await query.ToListAsync(ct);
        foreach (var due in dues) due.Status = FeeDueStatus.Overdue;
        if (dues.Count > 0) await db.SaveChangesAsync(ct);
    }

    /// <summary>Walks forward from <paramref name="anchor"/> in steps of <paramref name="frequency"/> to the first date on or after <paramref name="minDate"/>.</summary>
    private static DateOnly FirstDueOnOrAfter(DateOnly anchor, DateOnly minDate, FeeFrequency frequency)
    {
        var date = anchor;
        while (date < minDate) date = AddPeriod(date, frequency);
        return date;
    }

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow.Date);

    private static DateOnly AddPeriod(DateOnly date, FeeFrequency frequency) => frequency switch
    {
        FeeFrequency.Monthly => date.AddMonths(1),
        FeeFrequency.Quarterly => date.AddMonths(3),
        FeeFrequency.HalfYearly => date.AddMonths(6),
        FeeFrequency.Yearly => date.AddYears(1),
        FeeFrequency.OneTime => date,
        _ => throw new ArgumentOutOfRangeException(nameof(frequency))
    };
}
