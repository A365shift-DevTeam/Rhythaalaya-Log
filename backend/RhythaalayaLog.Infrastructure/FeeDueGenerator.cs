using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Generates rolling fee dues from each enrollment's billing schedule, up to the tenant's
/// lead-days horizon (future dues carry the Upcoming status), auto-applies any unconsumed
/// advance-payment credit to newly created dues, and keeps FeeDue.Status current. All calendar
/// arithmetic uses the tenant's local date (OrganizationSettings.TimeZone, default Asia/Kolkata).
/// Runs both lazily from every fee entry point and from the daily billing sweep; both paths are
/// idempotent thanks to the unique due index.
/// </summary>
public sealed class FeeDueGenerator(AppDbContext db)
{
    private OrganizationSettings? _settings;

    public async Task EnsureForStudentAsync(Guid studentId, CancellationToken ct)
    {
        var enrollmentIds = await db.Enrollments.AsNoTracking()
            .Where(x => x.StudentId == studentId && x.Status == EnrollmentStatus.Active)
            .Select(x => x.Id).ToListAsync(ct);
        foreach (var id in enrollmentIds) await EnsureForEnrollmentAsync(id, ct);
        await RefreshDateDrivenStatusesAsync(studentId, ct);
    }

    public async Task EnsureForTenantAsync(CancellationToken ct)
    {
        var enrollmentIds = await db.Enrollments.AsNoTracking()
            .Where(x => x.Status == EnrollmentStatus.Active)
            .Select(x => x.Id).ToListAsync(ct);
        foreach (var id in enrollmentIds) await EnsureForEnrollmentAsync(id, ct);
        await RefreshDateDrivenStatusesAsync(null, ct);
    }

    private (Guid StudentId, decimal Percent, string? Reason)? _concession;

    public async Task EnsureForEnrollmentAsync(Guid enrollmentId, CancellationToken ct)
    {
        var enrollment = await db.Enrollments.AsNoTracking().SingleAsync(x => x.Id == enrollmentId, ct);
        // Billing can never start before classes do: a pre-registered student (enrolled before
        // the batch's start date) is billed from the batch start, not the enrollment date.
        var batchStart = await db.Batches.AsNoTracking().Where(x => x.Id == enrollment.BatchId)
            .Select(x => x.StartDate).SingleAsync(ct);
        var billingStart = enrollment.EnrolledOn > batchStart ? enrollment.EnrolledOn : batchStart;
        if (_concession?.StudentId != enrollment.StudentId)
        {
            var concession = await db.Students.AsNoTracking().Where(x => x.Id == enrollment.StudentId)
                .Select(x => new { x.ConcessionPercent, x.ConcessionReason }).SingleAsync(ct);
            _concession = (enrollment.StudentId, concession.ConcessionPercent, concession.ConcessionReason);
        }
        var settings = await GetSettingsAsync(ct);
        var today = BillingSchedule.TodayInTimeZone(settings.TimeZone);
        var horizon = today.AddDays(settings.FeeDueLeadDays);

        // All plans for the course, resolved per due date by effective window — IsActive is a UI
        // flag only, so a future-dated plan never opens a billing gap.
        var structures = await db.FeeStructures.AsNoTracking()
            .Where(x => x.CourseId == enrollment.CourseId)
            .OrderBy(x => x.EffectiveFrom).ToListAsync(ct);
        if (structures.Count == 0) return;

        // Custom charges (null FeeStructureId) live outside the schedule and must not move its anchor.
        var latest = await db.FeeDues.AsNoTracking()
            .Where(x => x.EnrollmentId == enrollmentId && x.FeeStructureId != null)
            .OrderByDescending(x => x.DueDate).FirstOrDefaultAsync(ct);

        // The chain anchor is set once, by the plan that STARTED the chain, and survives every
        // later plan change. Anchoring on the current plan's EffectiveFrom instead caused a
        // second due in the same month when a new price plan started mid-period (e.g. dues on
        // the 10th, a new plan effective the 11th produced an extra due on the 11th).
        DateOnly nextDueDate;
        DateOnly chainAnchor;
        if (latest is null)
        {
            var first = ComputeFirstDue(structures, billingStart, settings.LateEnrollmentBillingPolicy);
            if (first is null) return;
            chainAnchor = first.ChainAnchor;
            if (first.PartialPeriodStart is DateOnly partialStart)
            {
                // Off-anchor partial first period (Full or Prorated policy): due dated on the
                // billing start day; the chain then resumes on the plan's anchor cadence.
                if (first.DueDate > horizon) return;
                var structure = BillingSchedule.ResolveStructure(structures, first.DueDate)!;
                await CreateDueAsync(enrollment, structure, first.DueDate, today,
                    first.Prorate ? partialStart : null, first.Prorate ? billingStart : null, ct);
                nextDueDate = BillingSchedule.FirstOnOrAfter(chainAnchor, first.DueDate.AddDays(1), structure.Frequency);
            }
            else
            {
                nextDueDate = first.DueDate;
            }
        }
        else
        {
            // Recover the original anchor from the earliest recurring due's own plan.
            var oneTimeStructureIds = structures.Where(x => x.Frequency == FeeFrequency.OneTime)
                .Select(x => x.Id).ToList();
            var chainOrigin = await db.FeeDues.AsNoTracking()
                .Where(x => x.EnrollmentId == enrollmentId && x.FeeStructureId != null
                    && !oneTimeStructureIds.Contains(x.FeeStructureId!.Value))
                .OrderBy(x => x.DueDate).FirstOrDefaultAsync(ct);
            var originStructure = chainOrigin is null ? null
                : structures.FirstOrDefault(x => x.Id == chainOrigin.FeeStructureId);
            var current = BillingSchedule.ResolveStructure(structures, latest.DueDate)
                ?? structures.FirstOrDefault(x => x.Id == latest.FeeStructureId)
                ?? structures[0];
            if (chainOrigin is null || current.Frequency == FeeFrequency.OneTime)
            {
                // No recurring cadence yet (only one-time charges so far): the first recurring
                // plan starting after them begins a fresh chain on its own anchor.
                var next = structures.Where(x => x.EffectiveFrom > latest.DueDate && x.Frequency != FeeFrequency.OneTime)
                    .OrderBy(x => x.EffectiveFrom).FirstOrDefault();
                if (next is null) return;
                chainAnchor = next.EffectiveFrom;
                nextDueDate = next.EffectiveFrom;
            }
            else
            {
                chainAnchor = originStructure?.EffectiveFrom ?? chainOrigin.DueDate;
                nextDueDate = BillingSchedule.FirstOnOrAfter(chainAnchor, latest.DueDate.AddDays(1), current.Frequency);
            }
        }

        var stepFrequency = FeeFrequency.Monthly;
        while (nextDueDate <= horizon)
        {
            var structure = BillingSchedule.ResolveStructure(structures, nextDueDate);
            if (structure is null)
            {
                // Gap between plans: no charge for this date; jump forward on the chain cadence
                // to the next plan if one starts later, otherwise stop at the horizon.
                var upcomingPlan = structures.Where(x => x.EffectiveFrom > nextDueDate)
                    .OrderBy(x => x.EffectiveFrom).FirstOrDefault();
                if (upcomingPlan is null) break;
                nextDueDate = BillingSchedule.FirstOnOrAfter(chainAnchor, upcomingPlan.EffectiveFrom, stepFrequency);
                continue;
            }
            stepFrequency = structure.Frequency == FeeFrequency.OneTime ? stepFrequency : structure.Frequency;

            if (structure.Frequency == FeeFrequency.OneTime)
            {
                var alreadyCharged = await db.FeeDues.AnyAsync(x => x.EnrollmentId == enrollmentId
                    && x.FeeStructureId == structure.Id, ct);
                if (!alreadyCharged) await CreateDueAsync(enrollment, structure, nextDueDate, today, null, null, ct);
                var nextPlan = structures.Where(x => x.EffectiveFrom > nextDueDate && x.Frequency != FeeFrequency.OneTime)
                    .OrderBy(x => x.EffectiveFrom).FirstOrDefault();
                if (nextPlan is null) break;
                chainAnchor = nextPlan.EffectiveFrom;
                nextDueDate = nextPlan.EffectiveFrom;
                continue;
            }

            await CreateDueAsync(enrollment, structure, nextDueDate, today, null, null, ct);
            nextDueDate = BillingSchedule.FirstOnOrAfter(chainAnchor, nextDueDate.AddDays(1), structure.Frequency);
        }
    }

    private sealed record FirstDue(DateOnly DueDate, DateOnly? PartialPeriodStart, bool Prorate, DateOnly ChainAnchor);

    /// <summary>
    /// First scheduled due for a fresh enrollment. Returns null when no plan ever applies.
    /// PartialPeriodStart is set when the due sits off-anchor inside a partial period
    /// (Full or Prorated policy); Prorate additionally asks for a proration adjustment.
    /// ChainAnchor is the cadence origin the whole chain keeps forever.
    /// </summary>
    private static FirstDue? ComputeFirstDue(
        IReadOnlyList<FeeStructure> structures, DateOnly enrolledOn, LateEnrollmentBillingPolicy policy)
    {
        var structure = BillingSchedule.ResolveStructure(structures, enrolledOn)
            ?? structures.Where(x => x.EffectiveFrom > enrolledOn).OrderBy(x => x.EffectiveFrom).FirstOrDefault();
        if (structure is null) return null;

        if (structure.Frequency == FeeFrequency.OneTime)
            return new(structure.EffectiveFrom > enrolledOn ? structure.EffectiveFrom : enrolledOn, null, false, structure.EffectiveFrom);

        if (structure.EffectiveFrom >= enrolledOn) return new(structure.EffectiveFrom, null, false, structure.EffectiveFrom);

        var periodStart = BillingSchedule.LastOnOrBefore(structure.EffectiveFrom, enrolledOn, structure.Frequency);
        if (periodStart == enrolledOn) return new(periodStart, null, false, structure.EffectiveFrom);

        return policy switch
        {
            LateEnrollmentBillingPolicy.Full => new(enrolledOn, periodStart, false, structure.EffectiveFrom),
            LateEnrollmentBillingPolicy.Prorated => new(enrolledOn, periodStart, true, structure.EffectiveFrom),
            _ => new(BillingSchedule.AddPeriod(periodStart, structure.Frequency), null, false, structure.EffectiveFrom)
        };
    }

    /// <summary>
    /// Inserts one due (idempotently — the unique index owns the race), applies any proration
    /// adjustment, draws down advance credit, and refreshes the status.
    /// </summary>
    private async Task CreateDueAsync(Enrollment enrollment, FeeStructure structure, DateOnly dueDate,
        DateOnly today, DateOnly? prorationPeriodStart, DateOnly? enrolledOn, CancellationToken ct)
    {
        var exists = await db.FeeDues.AnyAsync(x => x.EnrollmentId == enrollment.Id
            && x.FeeStructureId == structure.Id && x.DueDate == dueDate, ct);
        if (exists) return;

        var due = new FeeDue
        {
            TenantId = enrollment.TenantId, StudentId = enrollment.StudentId, EnrollmentId = enrollment.Id,
            FeeStructureId = structure.Id, DueDate = dueDate, Amount = structure.Amount,
            DiscountAmount = 0, NetAmount = structure.Amount,
            Status = dueDate > today ? FeeDueStatus.Upcoming : FeeDueStatus.Pending
        };

        if (prorationPeriodStart is not null && enrolledOn is not null)
        {
            var reduction = BillingSchedule.ProrationReduction(structure.Amount, prorationPeriodStart.Value,
                enrolledOn.Value, structure.Frequency);
            if (reduction > 0)
            {
                var periodDays = BillingSchedule.PeriodDays(prorationPeriodStart.Value, structure.Frequency);
                var billedDays = periodDays - (enrolledOn.Value.DayNumber - prorationPeriodStart.Value.DayNumber);
                due.NetAmount = structure.Amount - reduction;
                due.Adjustments.Add(new FeeAdjustment
                {
                    TenantId = enrollment.TenantId, Type = FeeAdjustmentType.Proration, Amount = reduction,
                    Reason = $"Prorated first period ({billedDays}/{periodDays} days from {enrolledOn.Value:yyyy-MM-dd})"
                });
            }
        }

        // Standing student concession (e.g. orphan/semi-orphan): a system Discount adjustment on
        // every scheduled due, computed on the amount left after proration.
        if (_concession is { Percent: > 0 } concessionInfo && concessionInfo.StudentId == enrollment.StudentId)
        {
            var concession = Math.Round(due.NetAmount * concessionInfo.Percent / 100m, 2, MidpointRounding.AwayFromZero);
            if (concession > 0)
            {
                due.DiscountAmount += concession;
                due.NetAmount -= concession;
                due.Adjustments.Add(new FeeAdjustment
                {
                    TenantId = enrollment.TenantId, Type = FeeAdjustmentType.Discount, Amount = concession,
                    Reason = string.IsNullOrWhiteSpace(concessionInfo.Reason)
                        ? $"Standing concession {concessionInfo.Percent:0.##}%"
                        : $"Standing concession {concessionInfo.Percent:0.##}% — {concessionInfo.Reason}"
                });
            }
        }

        db.FeeDues.Add(due);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // A concurrent request generated the same due first (unique index caught it) -- that
            // request owns its credit allocation and status; just move on.
            db.Entry(due).State = EntityState.Detached;
            foreach (var adjustment in due.Adjustments) db.Entry(adjustment).State = EntityState.Detached;
            return;
        }
        await AllocateCreditAsync(due, ct);
        await RefreshDueStatusAsync(due.Id, ct);
    }

    /// <summary>Draws down any of the student's unconsumed advance-payment credit against a freshly created due.</summary>
    public async Task AllocateCreditAsync(FeeDue due, CancellationToken ct)
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

    /// <summary>
    /// Re-aligns the standing-concession discount on every live scheduled due of a student after
    /// their concession percent changes. Corrections are appended as delta adjustment rows (the
    /// ledger stays append-only); a due is never cut below what's already been paid, and manual
    /// admin discounts (PerformedByUserId set) are left untouched.
    /// </summary>
    public async Task ResyncConcessionAsync(Guid studentId, CancellationToken ct)
    {
        var student = await db.Students.AsNoTracking().SingleAsync(x => x.Id == studentId, ct);
        var dues = await db.FeeDues.Where(x => x.StudentId == studentId
            && x.FeeStructureId != null && x.Status != FeeDueStatus.Cancelled).ToListAsync(ct);
        if (dues.Count == 0) return;

        var dueIds = dues.Select(x => x.Id).ToList();
        var adjustments = await db.FeeAdjustments.AsNoTracking()
            .Where(x => dueIds.Contains(x.FeeDueId)).ToListAsync(ct);
        var paidByDue = await db.FeePaymentAllocations.Where(x => dueIds.Contains(x.FeeDueId))
            .GroupBy(x => x.FeeDueId)
            .Select(g => new { FeeDueId = g.Key, Paid = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.FeeDueId, x => x.Paid, ct);

        var changedDueIds = new List<Guid>();
        foreach (var due in dues)
        {
            var dueAdjustments = adjustments.Where(x => x.FeeDueId == due.Id).ToList();
            var proration = dueAdjustments.Where(x => x.Type == FeeAdjustmentType.Proration).Sum(x => x.Amount);
            var systemConcession = dueAdjustments
                .Where(x => x.Type == FeeAdjustmentType.Discount && x.PerformedByUserId == null)
                .Sum(x => x.Amount);
            var target = Math.Round((due.Amount - proration) * student.ConcessionPercent / 100m, 2, MidpointRounding.AwayFromZero);
            var delta = target - systemConcession;
            if (delta == 0) continue;
            var paid = paidByDue.GetValueOrDefault(due.Id);
            var newNet = due.NetAmount - delta;
            if (newNet < 0 || newNet < paid) continue;
            db.FeeAdjustments.Add(new FeeAdjustment
            {
                TenantId = due.TenantId, FeeDueId = due.Id, Type = FeeAdjustmentType.Discount, Amount = delta,
                Reason = $"Standing concession updated to {student.ConcessionPercent:0.##}%"
            });
            due.DiscountAmount += delta;
            due.NetAmount = newNet;
            changedDueIds.Add(due.Id);
        }
        if (changedDueIds.Count == 0) return;
        await db.SaveChangesAsync(ct);
        foreach (var dueId in changedDueIds) await RefreshDueStatusAsync(dueId, ct);
    }

    public async Task RefreshDueStatusAsync(Guid dueId, CancellationToken ct)
    {
        var due = await db.FeeDues.SingleAsync(x => x.Id == dueId, ct);
        if (due.Status == FeeDueStatus.Cancelled) return;
        var paid = await db.FeePaymentAllocations.Where(x => x.FeeDueId == dueId)
            .SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
        var settings = await GetSettingsAsync(ct);
        var today = BillingSchedule.TodayInTimeZone(settings.TimeZone);
        // A future-dated due stays Upcoming even when partially covered by credit, so the
        // upcoming view keeps meaning "not yet due"; full coverage always wins as Paid.
        due.Status = paid >= due.NetAmount ? FeeDueStatus.Paid
            : due.DueDate > today ? FeeDueStatus.Upcoming
            : due.DueDate < today ? FeeDueStatus.Overdue
            : paid > 0 ? FeeDueStatus.Partial
            : FeeDueStatus.Pending;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Applies date-driven transitions in bulk: past-due rows become Overdue, and Upcoming rows
    /// whose due date has arrived become Pending/Partial.
    /// </summary>
    public async Task RefreshDateDrivenStatusesAsync(Guid? studentId, CancellationToken ct)
    {
        var settings = await GetSettingsAsync(ct);
        var today = BillingSchedule.TodayInTimeZone(settings.TimeZone);
        var query = db.FeeDues.Where(x =>
            (x.DueDate < today && (x.Status == FeeDueStatus.Pending || x.Status == FeeDueStatus.Partial
                || x.Status == FeeDueStatus.Upcoming))
            || (x.DueDate == today && x.Status == FeeDueStatus.Upcoming));
        if (studentId.HasValue) query = query.Where(x => x.StudentId == studentId.Value);
        var dues = await query.ToListAsync(ct);
        if (dues.Count == 0) return;

        var arrivedIds = dues.Where(x => x.Status == FeeDueStatus.Upcoming).Select(x => x.Id).ToList();
        var paidMap = arrivedIds.Count == 0 ? [] : await db.FeePaymentAllocations
            .Where(x => arrivedIds.Contains(x.FeeDueId)).GroupBy(x => x.FeeDueId)
            .Select(g => new { FeeDueId = g.Key, Paid = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.FeeDueId, x => x.Paid, ct);
        foreach (var due in dues)
        {
            var paid = paidMap.GetValueOrDefault(due.Id);
            due.Status = paid >= due.NetAmount ? FeeDueStatus.Paid
                : due.DueDate < today ? FeeDueStatus.Overdue
                : paid > 0 ? FeeDueStatus.Partial
                : FeeDueStatus.Pending;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<DateOnly> TodayForTenantAsync(CancellationToken ct)
    {
        var settings = await GetSettingsAsync(ct);
        return BillingSchedule.TodayInTimeZone(settings.TimeZone);
    }

    private async Task<OrganizationSettings> GetSettingsAsync(CancellationToken ct) =>
        _settings ??= await db.OrganizationSettings.AsNoTracking().SingleOrDefaultAsync(ct)
            ?? OrganizationSettingsDefaults.Create(Guid.Empty);
}
