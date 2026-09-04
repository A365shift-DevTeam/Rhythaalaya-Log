using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Generates rolling fee dues from each enrollment's billing schedule and keeps FeeDue.Status
/// current. Rules:
/// <list type="bullet">
/// <item>Billing starts at the later of the batch start and the enrollment date, and stops at the
/// earlier of the batch end and the enrollment end. A plan's EffectiveFrom is the cycle anchor
/// (which day the bill falls on); a lineage's first plan also prices service delivered before it,
/// subject to the late-enrollment policy for a partial first period.</item>
/// <item>Every recurring plan lineage (one per fee head) bills independently, so tuition and a
/// material fee run side by side. A one-time plan is charged once, on its own date.</item>
/// <item>Each scheduled due records the service period it pays for. Cadence is anchor-relative
/// (no month-end drift); a frequency change re-anchors where the last billed period ended, so
/// periods stay contiguous with neither gap nor overlap.</item>
/// <item>A due dated inside the course's Upcoming notice window (or the academy lead days) is
/// generated as Upcoming. Advance credit is applied only when a due arrives, never to Upcoming
/// dues, so credit stays visible until it is actually consumed.</item>
/// <item>Unpaid dues become Overdue only once the academy's grace days after the due date have passed.</item>
/// </list>
/// All calendar arithmetic uses the tenant's local business date via <see cref="BusinessClock"/>.
/// Runs lazily from every fee entry point and from the daily sweep; both paths are idempotent
/// thanks to the unique due index.
/// </summary>
public sealed class FeeDueGenerator(AppDbContext db)
{
    private OrganizationSettings? _settings;
    private (Guid StudentId, decimal Percent, string? Reason)? _concession;
    private readonly Dictionary<Guid, int?> _courseNoticeDays = [];

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

    public async Task EnsureForEnrollmentAsync(Guid enrollmentId, CancellationToken ct)
    {
        var enrollment = await db.Enrollments.AsNoTracking().SingleAsync(x => x.Id == enrollmentId, ct);
        if (enrollment.Status != EnrollmentStatus.Active) return;
        var batch = await db.Batches.AsNoTracking().Where(x => x.Id == enrollment.BatchId)
            .Select(x => new { x.StartDate, x.EndDate }).SingleAsync(ct);
        // Billing can never start before classes do: a pre-registered student (enrolled before
        // the batch's start date) is billed from the batch start, not the enrollment date.
        var billingStart = enrollment.EnrolledOn > batch.StartDate ? enrollment.EnrolledOn : batch.StartDate;
        // ...and never continues past the batch's or the enrollment's end: no due is dated after it.
        var billingEnd = batch.EndDate;
        if (enrollment.EndedOn is { } endedOn && (billingEnd is null || endedOn < billingEnd)) billingEnd = endedOn;

        if (_concession?.StudentId != enrollment.StudentId)
        {
            var concession = await db.Students.AsNoTracking().Where(x => x.Id == enrollment.StudentId)
                .Select(x => new { x.ConcessionPercent, x.ConcessionReason }).SingleAsync(ct);
            _concession = (enrollment.StudentId, concession.ConcessionPercent, concession.ConcessionReason);
        }
        var settings = await GetSettingsAsync(ct);
        var today = BusinessClock.TodayIn(settings.TimeZone);
        // "Upcoming" horizon: a due is generated (as Upcoming) once today is within the course's
        // notice window before its due date; the academy-wide lead days are the fallback.
        var horizon = today.AddDays(await UpcomingNotificationDaysAsync(enrollment.CourseId, settings, ct));
        if (billingEnd is { } end && end < horizon) horizon = end;
        if (horizon < billingStart) return;

        var structures = await db.FeeStructures.AsNoTracking()
            .Where(x => x.CourseId == enrollment.CourseId)
            .OrderBy(x => x.EffectiveFrom).ThenBy(x => x.CreatedAt).ToListAsync(ct);
        if (structures.Count == 0) return;

        var policy = enrollment.LateBillingPolicy ?? settings.LateEnrollmentBillingPolicy;
        foreach (var oneTime in structures.Where(x => x.Frequency == FeeFrequency.OneTime))
            await EnsureOneTimeAsync(enrollment, oneTime, billingStart, today, horizon, ct);
        foreach (var lineage in structures.Where(x => x.Frequency != FeeFrequency.OneTime).GroupBy(x => x.FeeHeadId))
            await EnsureLineageAsync(enrollment, lineage.ToList(), billingStart, today, horizon, policy, ct);
    }

    /// <summary>A one-time plan is charged once, dated on its own effective date (or the billing start, if later).</summary>
    private async Task EnsureOneTimeAsync(Enrollment enrollment, FeeStructure structure, DateOnly billingStart,
        DateOnly today, DateOnly horizon, CancellationToken ct)
    {
        var dueDate = structure.EffectiveFrom > billingStart ? structure.EffectiveFrom : billingStart;
        if (dueDate > horizon) return;
        if (structure.EffectiveTo is { } to && dueDate > to) return; // plan closed before this student could be charged
        if (await db.FeeDues.AnyAsync(x => x.EnrollmentId == enrollment.Id && x.FeeStructureId == structure.Id, ct)) return;
        await CreateDueAsync(enrollment, structure, dueDate, today, dueDate, dueDate, null, ct);
    }

    /// <summary>
    /// One recurring lineage = the price history of a single fee head. Plans in it never overlap,
    /// and dates before the first plan resolve to that plan so service delivered before the plan
    /// was set up is still billed at the opening price.
    /// </summary>
    private async Task EnsureLineageAsync(Enrollment enrollment, List<FeeStructure> plans, DateOnly billingStart,
        DateOnly today, DateOnly horizon, LateEnrollmentBillingPolicy policy, CancellationToken ct)
    {
        var planIds = plans.Select(x => x.Id).ToList();
        var existing = await db.FeeDues.AsNoTracking()
            .Where(x => x.EnrollmentId == enrollment.Id && x.FeeStructureId != null && planIds.Contains(x.FeeStructureId!.Value))
            .OrderBy(x => x.DueDate).ThenBy(x => x.CreatedAt)
            .Select(x => new { x.FeeStructureId, x.DueDate, x.PeriodStart, x.PeriodEnd }).ToListAsync(ct);
        var latest = existing.LastOrDefault();

        DateOnly nextDueDate;
        DateOnly anchor;
        FeeFrequency stepFrequency;
        if (latest is null)
        {
            var first = ComputeFirstDue(plans, billingStart, policy);
            if (first is null) return;
            anchor = first.Anchor;
            stepFrequency = first.Frequency;
            if (first.PartialPeriodStart is { } partialStart)
            {
                // Off-anchor partial first period (Full or Prorated policy): due dated on the
                // billing start day; the chain then resumes on the plan's anchor cadence.
                if (first.DueDate > horizon) return;
                var structure = ResolvePlan(plans, partialStart) ?? ResolvePlan(plans, billingStart)!;
                var periodEnd = BillingSchedule.FirstOnOrAfter(anchor, partialStart.AddDays(1), structure.Frequency).AddDays(-1);
                await CreateDueAsync(enrollment, structure, first.DueDate, today, partialStart, periodEnd,
                    first.Prorate ? billingStart : null, ct);
                nextDueDate = periodEnd.AddDays(1);
            }
            else
            {
                nextDueDate = first.DueDate;
            }
        }
        else
        {
            var current = ResolvePlan(plans, latest.DueDate)
                ?? plans.FirstOrDefault(x => x.Id == latest.FeeStructureId) ?? plans[0];
            stepFrequency = current.Frequency;
            // The anchor is the cadence origin of the run of dues billed at the current frequency:
            // the first such due's period start (on-anchor even for a partial first period). Dues
            // generated before periods were recorded fall back to their plan's start date.
            FeeFrequency FrequencyOf(Guid? structureId) =>
                plans.FirstOrDefault(p => p.Id == structureId)?.Frequency ?? current.Frequency;
            var origin = existing.First(x => FrequencyOf(x.FeeStructureId) == current.Frequency);
            anchor = origin.PeriodStart
                ?? plans.FirstOrDefault(p => p.Id == origin.FeeStructureId)?.EffectiveFrom
                ?? origin.DueDate;
            nextDueDate = latest.PeriodEnd is { } lastEnd
                ? lastEnd.AddDays(1)
                : BillingSchedule.FirstOnOrAfter(anchor, latest.DueDate.AddDays(1), current.Frequency);
        }

        while (nextDueDate <= horizon)
        {
            var structure = ResolvePlan(plans, nextDueDate);
            if (structure is null)
            {
                // Gap between plans: no charge for this period; jump forward on the cadence to
                // the next plan if one starts later, otherwise stop.
                var upcomingPlan = plans.Where(x => x.EffectiveFrom > nextDueDate).OrderBy(x => x.EffectiveFrom).FirstOrDefault();
                if (upcomingPlan is null) break;
                nextDueDate = BillingSchedule.FirstOnOrAfter(anchor, upcomingPlan.EffectiveFrom, stepFrequency);
                continue;
            }
            if (structure.Frequency != stepFrequency)
            {
                // Frequency change: the new cadence starts exactly where the last period ended.
                anchor = nextDueDate;
                stepFrequency = structure.Frequency;
            }
            var periodEnd = BillingSchedule.FirstOnOrAfter(anchor, nextDueDate.AddDays(1), structure.Frequency).AddDays(-1);
            await CreateDueAsync(enrollment, structure, nextDueDate, today, nextDueDate, periodEnd, null, ct);
            nextDueDate = periodEnd.AddDays(1);
        }
    }

    /// <summary>
    /// The plan in force on <paramref name="date"/>. Dates before the lineage's first plan resolve
    /// to that plan: the opening price applies to service delivered before it was configured.
    /// </summary>
    private static FeeStructure? ResolvePlan(IReadOnlyList<FeeStructure> plans, DateOnly date)
    {
        var resolved = BillingSchedule.ResolveStructure(plans, date);
        if (resolved is not null) return resolved;
        var first = plans.OrderBy(x => x.EffectiveFrom).First();
        return date < first.EffectiveFrom ? first : null;
    }

    private sealed record FirstDue(DateOnly DueDate, DateOnly? PartialPeriodStart, bool Prorate, DateOnly Anchor, FeeFrequency Frequency);

    /// <summary>
    /// First scheduled due for a fresh enrollment. Returns null when no plan ever applies.
    /// PartialPeriodStart is set when the billing start sits inside a period (Full or Prorated
    /// policy); Prorate additionally asks for a proration adjustment. Anchor is the cadence origin.
    /// </summary>
    private static FirstDue? ComputeFirstDue(IReadOnlyList<FeeStructure> plans, DateOnly billingStart, LateEnrollmentBillingPolicy policy)
    {
        var structure = ResolvePlan(plans, billingStart)
            ?? plans.Where(x => x.EffectiveFrom > billingStart).OrderBy(x => x.EffectiveFrom).FirstOrDefault();
        if (structure is null) return null;
        var anchor = structure.EffectiveFrom;

        var periodStart = BillingSchedule.PeriodStartOnOrBefore(anchor, billingStart, structure.Frequency);
        if (periodStart == billingStart) return new(periodStart, null, false, anchor, structure.Frequency);

        return policy switch
        {
            LateEnrollmentBillingPolicy.Full => new(billingStart, periodStart, false, anchor, structure.Frequency),
            LateEnrollmentBillingPolicy.Prorated => new(billingStart, periodStart, true, anchor, structure.Frequency),
            _ => new(BillingSchedule.FirstOnOrAfter(anchor, periodStart.AddDays(1), structure.Frequency), null, false, anchor, structure.Frequency)
        };
    }

    /// <summary>
    /// Inserts one due (idempotently — the unique index owns the race), applies any proration
    /// adjustment and standing concession, draws down advance credit when the due has arrived,
    /// and refreshes the status.
    /// </summary>
    private async Task CreateDueAsync(Enrollment enrollment, FeeStructure structure, DateOnly dueDate, DateOnly today,
        DateOnly periodStart, DateOnly periodEnd, DateOnly? prorateFrom, CancellationToken ct)
    {
        var exists = await db.FeeDues.AnyAsync(x => x.EnrollmentId == enrollment.Id
            && x.FeeStructureId == structure.Id && x.DueDate == dueDate, ct);
        if (exists) return;

        var due = new FeeDue
        {
            TenantId = enrollment.TenantId, StudentId = enrollment.StudentId, EnrollmentId = enrollment.Id,
            FeeStructureId = structure.Id, FeeHeadId = structure.FeeHeadId, DueDate = dueDate,
            PeriodStart = periodStart, PeriodEnd = periodEnd,
            Amount = structure.Amount, DiscountAmount = 0, NetAmount = structure.Amount,
            Status = dueDate > today ? FeeDueStatus.Upcoming : FeeDueStatus.Pending
        };

        if (prorateFrom is { } enrolledOn)
        {
            var reduction = BillingSchedule.ProrationReduction(structure.Amount, periodStart, enrolledOn, structure.Frequency);
            if (reduction > 0)
            {
                var periodDays = BillingSchedule.PeriodDays(periodStart, structure.Frequency);
                var billedDays = periodDays - (enrolledOn.DayNumber - periodStart.DayNumber);
                due.NetAmount = structure.Amount - reduction;
                due.Adjustments.Add(new FeeAdjustment
                {
                    TenantId = enrollment.TenantId, Type = FeeAdjustmentType.Proration, Amount = reduction,
                    Reason = $"Prorated first period ({billedDays}/{periodDays} days from {enrolledOn:yyyy-MM-dd})"
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
        // Money on account pays bills as they fall due, never bills that have not arrived yet.
        if (due.Status != FeeDueStatus.Upcoming) await AllocateCreditAsync(due, ct);
        await RefreshDueStatusAsync(due.Id, ct);
    }

    /// <summary>
    /// Draws down the student's unconsumed advance credit against a due. A payment's spare credit
    /// is what was received, less what is allocated, less any part of it refunded straight out of
    /// credit — refunded money is never re-applied.
    /// </summary>
    public async Task AllocateCreditAsync(FeeDue due, CancellationToken ct)
    {
        var remaining = due.NetAmount
            - (await db.FeePaymentAllocations.Where(x => x.FeeDueId == due.Id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0);
        if (remaining <= 0) return;
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
        var refundedByPayment = await db.FeePayments
            .Where(x => x.RefundOfPaymentId != null && candidateIds.Contains(x.RefundOfPaymentId!.Value))
            .GroupBy(x => x.RefundOfPaymentId!.Value)
            .Select(g => new { PaymentId = g.Key, Refunded = g.Sum(x => -x.Amount) })
            .ToDictionaryAsync(x => x.PaymentId, x => x.Refunded, ct);
        var reversedByPayment = await db.FeePaymentAllocations
            .Where(x => x.FeePayment.RefundOfPaymentId != null && candidateIds.Contains(x.FeePayment.RefundOfPaymentId!.Value))
            .GroupBy(x => x.FeePayment.RefundOfPaymentId!.Value)
            .Select(g => new { PaymentId = g.Key, Reversed = g.Sum(x => -x.Amount) })
            .ToDictionaryAsync(x => x.PaymentId, x => x.Reversed, ct);
        foreach (var candidate in candidates)
        {
            if (remaining <= 0) break;
            var refundedOutOfCredit = refundedByPayment.GetValueOrDefault(candidate.Id) - reversedByPayment.GetValueOrDefault(candidate.Id);
            var available = candidate.Amount - allocatedByPayment.GetValueOrDefault(candidate.Id) - refundedOutOfCredit;
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
    /// Returns every rupee allocated to a due back to the paying student's credit, as append-only
    /// reversal rows on the same payments. Releasing an allocation is not a refund: no money
    /// leaves the academy. Used when a due is cancelled or an enrollment ends.
    /// </summary>
    public async Task DeallocateAsync(Guid dueId, CancellationToken ct)
    {
        var allocations = await db.FeePaymentAllocations.AsNoTracking()
            .Where(x => x.FeeDueId == dueId).ToListAsync(ct);
        var alreadyReversed = allocations.Where(x => x.ReversalOfAllocationId != null)
            .GroupBy(x => x.ReversalOfAllocationId!.Value).ToDictionary(g => g.Key, g => -g.Sum(x => x.Amount));
        var added = false;
        foreach (var allocation in allocations.Where(x => x.Amount > 0 && x.ReversalOfAllocationId == null))
        {
            var reversible = allocation.Amount - alreadyReversed.GetValueOrDefault(allocation.Id);
            if (reversible <= 0) continue;
            db.FeePaymentAllocations.Add(new FeePaymentAllocation
            {
                TenantId = allocation.TenantId, FeePaymentId = allocation.FeePaymentId, FeeDueId = dueId,
                Amount = -reversible, ReversalOfAllocationId = allocation.Id
            });
            added = true;
        }
        if (added) await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Cancels every live scheduled due of an enrollment whose service period starts after
    /// <paramref name="endedOn"/>, releasing any money allocated to them back to credit first.
    /// Dues for periods already started stay owed; nothing is deleted, so the ledger stays auditable.
    /// </summary>
    public async Task CancelDuesAfterAsync(Guid enrollmentId, DateOnly endedOn, Guid? userId, string reason, CancellationToken ct)
    {
        var dues = await db.FeeDues.Where(x => x.EnrollmentId == enrollmentId && x.FeeStructureId != null
                && x.Status != FeeDueStatus.Cancelled && (x.PeriodStart ?? x.DueDate) > endedOn)
            .ToListAsync(ct);
        foreach (var due in dues)
        {
            await DeallocateAsync(due.Id, ct);
            due.Status = FeeDueStatus.Cancelled;
            due.CancelledAt = DateTimeOffset.UtcNow;
            due.CancelledByUserId = userId;
            due.CancelReason = reason;
        }
        if (dues.Count == 0) return;
        await db.SaveChangesAsync(ct);
        await ApplyCreditToArrivedDuesAsync(dues[0].StudentId, ct);
    }

    /// <summary>
    /// Applies whatever credit the student has on account to bills that have already fallen due,
    /// oldest first. Called after credit is released so money on account never sits idle beside
    /// an unpaid current bill.
    /// </summary>
    public async Task ApplyCreditToArrivedDuesAsync(Guid studentId, CancellationToken ct)
    {
        var arrived = await db.FeeDues.AsNoTracking()
            .Where(x => x.StudentId == studentId && (x.Status == FeeDueStatus.Pending
                || x.Status == FeeDueStatus.Partial || x.Status == FeeDueStatus.Overdue))
            .OrderBy(x => x.DueDate).ToListAsync(ct);
        foreach (var due in arrived)
        {
            await AllocateCreditAsync(due, ct);
            await RefreshDueStatusAsync(due.Id, ct);
        }
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
        var today = BusinessClock.TodayIn(settings.TimeZone);
        due.Status = ComputeStatus(due, paid, today, settings.FeeOverdueGraceDays);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Full coverage always wins as Paid. A future-dated due stays Upcoming even when partly covered
    /// (the upcoming view keeps meaning "not yet due"). Overdue rule: an unpaid due is Overdue when
    /// today is later than DueDate + FeeOverdueGraceDays; with the default of 0 grace days that is
    /// the day after the due date (the academy's rule before grace days existed).
    /// </summary>
    internal static FeeDueStatus ComputeStatus(FeeDue due, decimal paid, DateOnly today, int graceDays) =>
        paid >= due.NetAmount ? FeeDueStatus.Paid
        : due.DueDate > today ? FeeDueStatus.Upcoming
        : due.DueDate.AddDays(graceDays) < today ? FeeDueStatus.Overdue
        : paid > 0 ? FeeDueStatus.Partial
        : FeeDueStatus.Pending;

    /// <summary>
    /// Applies date-driven transitions in bulk: Upcoming rows whose due date has arrived draw down
    /// advance credit and become Pending/Partial/Paid, and rows past their grace period become Overdue.
    /// </summary>
    public async Task RefreshDateDrivenStatusesAsync(Guid? studentId, CancellationToken ct)
    {
        var settings = await GetSettingsAsync(ct);
        var today = BusinessClock.TodayIn(settings.TimeZone);
        var overdueBefore = today.AddDays(-settings.FeeOverdueGraceDays);
        var query = db.FeeDues.Where(x =>
            (x.DueDate < overdueBefore && (x.Status == FeeDueStatus.Pending || x.Status == FeeDueStatus.Partial))
            || (x.DueDate <= today && x.Status == FeeDueStatus.Upcoming));
        if (studentId.HasValue) query = query.Where(x => x.StudentId == studentId.Value);
        var dues = await query.ToListAsync(ct);
        if (dues.Count == 0) return;

        foreach (var due in dues.Where(x => x.Status == FeeDueStatus.Upcoming)) await AllocateCreditAsync(due, ct);

        var dueIds = dues.Select(x => x.Id).ToList();
        var paidMap = await db.FeePaymentAllocations
            .Where(x => dueIds.Contains(x.FeeDueId)).GroupBy(x => x.FeeDueId)
            .Select(g => new { FeeDueId = g.Key, Paid = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.FeeDueId, x => x.Paid, ct);
        foreach (var due in dues)
            due.Status = ComputeStatus(due, paidMap.GetValueOrDefault(due.Id), today, settings.FeeOverdueGraceDays);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>The tenant's local business date right now.</summary>
    public async Task<DateOnly> TodayForTenantAsync(CancellationToken ct)
    {
        var settings = await GetSettingsAsync(ct);
        return BusinessClock.TodayIn(settings.TimeZone);
    }

    /// <summary>Course override (1–30) when set, otherwise <see cref="OrganizationSettings.FeeDueLeadDays"/>.</summary>
    private async Task<int> UpcomingNotificationDaysAsync(Guid courseId, OrganizationSettings settings, CancellationToken ct)
    {
        if (!_courseNoticeDays.TryGetValue(courseId, out var courseDays))
        {
            courseDays = await db.Courses.AsNoTracking().Where(x => x.Id == courseId)
                .Select(x => x.UpcomingNotificationDays).SingleOrDefaultAsync(ct);
            _courseNoticeDays[courseId] = courseDays;
        }
        return courseDays ?? settings.FeeDueLeadDays;
    }

    private async Task<OrganizationSettings> GetSettingsAsync(CancellationToken ct) =>
        _settings ??= await db.OrganizationSettings.AsNoTracking().SingleOrDefaultAsync(ct)
            ?? OrganizationSettingsDefaults.Create(Guid.Empty);
}
