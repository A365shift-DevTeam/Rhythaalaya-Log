using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Batch-level finance rollups and the org finance dashboard (finance PRP §29–30). Read-only;
/// every figure reuses the same net/paid/credit maths as <see cref="FeeBalanceCalculator"/> and
/// the same Cancelled/Upcoming cutoff as the student ledger. Tenant scoping is the DbContext's.
/// Batch rollups cover <see cref="EnrollmentStatus.Active"/> enrollments only.
/// </summary>
public sealed class FinanceReportingService(
    AppDbContext db, FeeDueGenerator dueGenerator, FeeBalanceCalculator balanceCalculator)
    : IFinanceReportingService
{
    private static readonly FeeDueStatus[] Visible =
        [FeeDueStatus.Pending, FeeDueStatus.Partial, FeeDueStatus.Paid, FeeDueStatus.Overdue];

    public async Task<IReadOnlyList<BatchFinanceRowDto>> GetBatchFinanceListAsync(CancellationToken ct)
    {
        await dueGenerator.EnsureForTenantAsync(ct);
        var batches = await db.Batches.AsNoTracking().Include(x => x.Course)
            .OrderBy(x => x.Course.Name).ThenBy(x => x.Name).ToListAsync(ct);

        var enrollments = await db.Enrollments.AsNoTracking()
            .Where(x => x.Status == EnrollmentStatus.Active)
            .Select(x => new { x.Id, x.BatchId, x.StudentId }).ToListAsync(ct);
        var byBatch = enrollments.ToLookup(x => x.BatchId);
        var enrollmentIds = enrollments.Select(x => x.Id).ToList();

        var netByEnrollment = await NetChargedByEnrollmentAsync(enrollmentIds, ct);
        var collectedByEnrollment = await CollectedByEnrollmentAsync(enrollmentIds, ct);
        var pendingByEnrollment = await balanceCalculator.ByEnrollmentAsync(enrollmentIds, ct);
        var overdueByEnrollment = await OverdueByEnrollmentAsync(enrollmentIds, ct);
        var creditByStudent = await CreditByStudentAsync(enrollments.Select(x => x.StudentId).Distinct().ToList(), ct);

        return batches.Select(batch =>
        {
            var rows = byBatch[batch.Id].ToList();
            return new BatchFinanceRowDto(
                batch.Id, batch.Name, batch.Course.Name, rows.Count,
                NetCharged: rows.Sum(r => netByEnrollment.GetValueOrDefault(r.Id)),
                Collected: rows.Sum(r => collectedByEnrollment.GetValueOrDefault(r.Id)),
                Pending: rows.Sum(r => pendingByEnrollment.GetValueOrDefault(r.Id)),
                Overdue: rows.Sum(r => overdueByEnrollment.GetValueOrDefault(r.Id)),
                // Advance credit is a per-student pool, not per-batch: a student in two batches is
                // counted in both here. Treat this column as indicative, not additive across rows.
                AvailableCredit: rows.Select(r => r.StudentId).Distinct().Sum(s => creditByStudent.GetValueOrDefault(s)));
        }).ToList();
    }

    public async Task<BatchFinanceDto> GetBatchFinanceAsync(Guid batchId, CancellationToken ct)
    {
        var batch = await db.Batches.AsNoTracking().Include(x => x.Course).SingleOrDefaultAsync(x => x.Id == batchId, ct)
            ?? throw new NotFoundException(nameof(Batch));
        await dueGenerator.EnsureForTenantAsync(ct);

        var enrollments = await db.Enrollments.AsNoTracking()
            .Where(x => x.BatchId == batchId && x.Status == EnrollmentStatus.Active)
            .Select(x => new { x.Id, x.StudentId, StudentName = x.Student.Name })
            .OrderBy(x => x.StudentName).ToListAsync(ct);
        var enrollmentIds = enrollments.Select(x => x.Id).ToList();
        var studentIds = enrollments.Select(x => x.StudentId).Distinct().ToList();

        var grossByEnrollment = await GrossChargedByEnrollmentAsync(enrollmentIds, ct);
        var netByEnrollment = await NetChargedByEnrollmentAsync(enrollmentIds, ct);
        var collectedByEnrollment = await CollectedByEnrollmentAsync(enrollmentIds, ct);
        var pendingByEnrollment = await balanceCalculator.ByEnrollmentAsync(enrollmentIds, ct);
        var overdueByEnrollment = await OverdueByEnrollmentAsync(enrollmentIds, ct);
        var financialsByStudent = await balanceCalculator.StudentFinancialsBatchAsync(studentIds, ct);

        var adjBreakdown = await AdjustmentBreakdownByEnrollmentAsync(enrollmentIds, ct);
        var fines = adjBreakdown.Values.Sum(x => x.Fines);
        var concessions = adjBreakdown.Values.Sum(x => x.Concessions);
        var writeOffs = adjBreakdown.Values.Sum(x => x.WriteOffs);

        var students = enrollments.Select(e =>
        {
            var net = netByEnrollment.GetValueOrDefault(e.Id);
            var collected = collectedByEnrollment.GetValueOrDefault(e.Id);
            var pending = pendingByEnrollment.GetValueOrDefault(e.Id);
            var overdue = overdueByEnrollment.GetValueOrDefault(e.Id);
            var credit = financialsByStudent.GetValueOrDefault(e.StudentId,
                new FeeBalanceCalculator.StudentFinancials(0m, 0m, 0m)).AvailableCredit;
            return new BatchFinanceStudentDto(e.StudentId, e.StudentName, e.Id, net, collected, pending, overdue, credit,
                Classify(hasDues: grossByEnrollment.ContainsKey(e.Id) || net != 0m,
                    pending: pending, overdue: overdue, collected: collected, credit: credit));
        }).ToList();

        return new BatchFinanceDto(
            batch.Id, batch.Name, batch.Course.Name,
            TotalCharged: grossByEnrollment.Values.Sum(),
            TotalFines: fines,
            TotalAdjustments: concessions,
            TotalWrittenOff: writeOffs,
            NetCharged: netByEnrollment.Values.Sum(),
            Collected: collectedByEnrollment.Values.Sum(),
            Pending: pendingByEnrollment.Values.Sum(),
            Overdue: overdueByEnrollment.Values.Sum(),
            AvailableCredit: studentIds.Sum(s => financialsByStudent.GetValueOrDefault(s,
                new FeeBalanceCalculator.StudentFinancials(0m, 0m, 0m)).AvailableCredit),
            PaidCount: students.Count(x => x.Status == FeePayerStatus.Paid),
            PartiallyPaidCount: students.Count(x => x.Status == FeePayerStatus.PartiallyPaid),
            PendingCount: students.Count(x => x.Status == FeePayerStatus.Pending),
            OverdueCount: students.Count(x => x.Status == FeePayerStatus.Overdue),
            WithCreditCount: students.Count(x => x.Status == FeePayerStatus.Credit),
            NoDuesCount: students.Count(x => x.Status == FeePayerStatus.NoDues),
            Students: students);
    }

    public async Task<FinanceDashboardDto> GetFinanceDashboardAsync(FinanceDashboardQuery query, CancellationToken ct)
    {
        await dueGenerator.EnsureForTenantAsync(ct);
        var timeZoneId = await db.OrganizationSettings.AsNoTracking().Select(x => x.TimeZone).FirstOrDefaultAsync(ct) ?? "Asia/Kolkata";
        var today = BillingSchedule.TodayInTimeZone(timeZoneId);

        var studentIds = await ScopedStudentIdsAsync(query, ct);

        // A fee-head filter narrows the charge/adjustment/collection figures. Pending, overdue and
        // credit stay whole-student (they aren't partitioned by head) — noted on the DTO.
        var headId = query.FeeHeadId;
        var visibleDues = db.FeeDues.AsNoTracking()
            .Where(x => studentIds.Contains(x.StudentId) && Visible.Contains(x.Status)
                && (headId == null || x.FeeHeadId == headId));

        var dueFields = await visibleDues
            .GroupBy(x => 1)
            .Select(g => new { Gross = g.Sum(x => x.Amount), Net = g.Sum(x => x.NetAmount) })
            .FirstOrDefaultAsync(ct);
        var gross = dueFields?.Gross ?? 0m;
        var netCharged = dueFields?.Net ?? 0m;

        var visibleDueIds = await visibleDues.Select(x => x.Id).ToListAsync(ct);
        var adjRows = await db.FeeAdjustments.AsNoTracking()
            .Where(x => visibleDueIds.Contains(x.FeeDueId))
            .Select(x => new { x.Type, x.Amount, x.CreatedAt }).ToListAsync(ct);
        decimal AdjSum(params FeeAdjustmentType[] types) => adjRows.Where(a => types.Contains(a.Type)).Sum(a => a.Amount);
        var fines = AdjSum(FeeAdjustmentType.Fine);
        var concessions = AdjSum(FeeAdjustmentType.Discount, FeeAdjustmentType.Waiver, FeeAdjustmentType.Proration);
        var writtenOff = AdjSum(FeeAdjustmentType.WriteOff);

        var financials = await balanceCalculator.StudentFinancialsBatchAsync(studentIds, ct);
        var pending = financials.Values.Sum(x => x.Pending);
        var overdue = financials.Values.Sum(x => x.Overdue);
        var credit = financials.Values.Sum(x => x.AvailableCredit);

        var paymentsQuery = db.FeePayments.AsNoTracking().Where(x => studentIds.Contains(x.StudentId));
        if (headId is { } h)
            paymentsQuery = paymentsQuery.Where(x => x.Allocations.Any(a => a.FeeDue.FeeHeadId == h));
        var payments = await paymentsQuery.Select(x => new { x.Amount, x.PaymentDate }).ToListAsync(ct);
        decimal NetCollectedBetween(DateOnly from, DateOnly toExclusive) => payments
            .Where(p => { var d = BillingSchedule.ToLocalDate(timeZoneId, p.PaymentDate); return d >= from && d < toExclusive; })
            .Sum(p => p.Amount);

        var totalCollected = payments.Sum(p => p.Amount);
        var collectionToday = NetCollectedBetween(today, today.AddDays(1));
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var collectionThisMonth = NetCollectedBetween(monthStart, monthStart.AddMonths(1));

        var rangeFrom = query.From;
        var rangeTo = query.To;
        decimal collectionInRange, refundsInRange, writeOffsInRange;
        if (rangeFrom is { } f && rangeTo is { } t)
        {
            var toExclusive = t.AddDays(1);
            collectionInRange = NetCollectedBetween(f, toExclusive);
            refundsInRange = payments
                .Where(p => { var d = BillingSchedule.ToLocalDate(timeZoneId, p.PaymentDate); return d >= f && d < toExclusive && p.Amount < 0; })
                .Sum(p => -p.Amount);
            writeOffsInRange = adjRows
                .Where(a => a.Type == FeeAdjustmentType.WriteOff
                    && BillingSchedule.ToLocalDate(timeZoneId, a.CreatedAt) is var d && d >= f && d < toExclusive)
                .Sum(a => a.Amount);
        }
        else
        {
            collectionInRange = totalCollected;
            refundsInRange = payments.Where(p => p.Amount < 0).Sum(p => -p.Amount);
            writeOffsInRange = writtenOff;
        }

        return new FinanceDashboardDto(
            TotalCharged: gross,
            TotalFines: fines,
            TotalAdjustments: concessions,
            TotalWrittenOff: writtenOff,
            NetCharged: gross + fines - concessions,
            TotalCollected: totalCollected,
            TotalPending: pending,
            TotalOverdue: overdue,
            TotalStudentCredit: credit,
            CollectionToday: collectionToday,
            CollectionThisMonth: collectionThisMonth,
            CollectionInRange: collectionInRange,
            RefundsInRange: refundsInRange,
            WriteOffsInRange: writeOffsInRange,
            RangeFrom: rangeFrom,
            RangeTo: rangeTo);
    }

    public async Task<CollectionReportDto> GetCollectionReportAsync(
        DateOnly from, DateOnly to, CollectionGranularity granularity, CancellationToken ct)
    {
        if (to < from) throw new AppValidationException(nameof(to));
        var timeZoneId = await db.OrganizationSettings.AsNoTracking().Select(x => x.TimeZone).FirstOrDefaultAsync(ct) ?? "Asia/Kolkata";
        var toExclusive = to.AddDays(1);

        var payments = await db.FeePayments.AsNoTracking()
            .Select(x => new { x.Amount, x.PaymentDate }).ToListAsync(ct);
        var inRange = payments
            .Select(p => new { p.Amount, Date = BillingSchedule.ToLocalDate(timeZoneId, p.PaymentDate) })
            .Where(p => p.Date >= from && p.Date < toExclusive)
            .ToList();

        string Bucket(DateOnly d) => granularity == CollectionGranularity.Month
            ? d.ToString("yyyy-MM") : d.ToString("yyyy-MM-dd");

        var points = inRange
            .GroupBy(p => Bucket(p.Date))
            .OrderBy(g => g.Key)
            .Select(g => new CollectionPointDto(
                g.Key,
                Collected: g.Where(x => x.Amount > 0).Sum(x => x.Amount),
                Refunded: g.Where(x => x.Amount < 0).Sum(x => -x.Amount),
                Net: g.Sum(x => x.Amount)))
            .ToList();

        return new CollectionReportDto(from, to, granularity,
            TotalCollected: inRange.Where(x => x.Amount > 0).Sum(x => x.Amount),
            TotalRefunded: inRange.Where(x => x.Amount < 0).Sum(x => -x.Amount),
            TotalNet: inRange.Sum(x => x.Amount),
            Points: points);
    }

    // --- helpers ----------------------------------------------------------

    private async Task<List<Guid>> ScopedStudentIdsAsync(FinanceDashboardQuery query, CancellationToken ct)
    {
        // Active students only, matching AcademyService.GetDashboardAsync so the two dashboards'
        // outstanding figures agree. (An archived student who still owes is therefore excluded
        // here — surface those through the per-student ledger, not the org rollup.)
        if (query.BatchId is null && query.CourseId is null)
            return await db.Students.AsNoTracking().Where(x => x.IsActive).Select(x => x.Id).ToListAsync(ct);
        var enrollments = db.Enrollments.AsNoTracking().Where(x => x.Status == EnrollmentStatus.Active);
        if (query.BatchId is { } b) enrollments = enrollments.Where(x => x.BatchId == b);
        if (query.CourseId is { } c) enrollments = enrollments.Where(x => x.CourseId == c);
        return await enrollments.Select(x => x.StudentId).Distinct().ToListAsync(ct);
    }

    private async Task<Dictionary<Guid, decimal>> GrossChargedByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        return (await db.FeeDues.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.EnrollmentId) && Visible.Contains(x.Status))
            .GroupBy(x => x.EnrollmentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);
    }

    private async Task<Dictionary<Guid, decimal>> NetChargedByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        return (await db.FeeDues.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.EnrollmentId) && Visible.Contains(x.Status))
            .GroupBy(x => x.EnrollmentId).Select(g => new { g.Key, Sum = g.Sum(x => x.NetAmount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);
    }

    private async Task<Dictionary<Guid, decimal>> CollectedByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        return (await db.FeePaymentAllocations.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.FeeDue.EnrollmentId) && Visible.Contains(x.FeeDue.Status))
            .GroupBy(x => x.FeeDue.EnrollmentId).Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToListAsync(ct))
            .ToDictionary(x => x.Key, x => x.Sum);
    }

    private async Task<Dictionary<Guid, decimal>> OverdueByEnrollmentAsync(IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        var rows = await db.FeeDues.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.EnrollmentId) && x.Status == FeeDueStatus.Overdue)
            .Select(x => new { x.EnrollmentId, x.Id, x.NetAmount }).ToListAsync(ct);
        var dueIds = rows.Select(x => x.Id).ToList();
        var alloc = dueIds.Count == 0 ? new Dictionary<Guid, decimal>() : await db.FeePaymentAllocations.AsNoTracking()
            .Where(x => dueIds.Contains(x.FeeDueId)).GroupBy(x => x.FeeDueId)
            .Select(g => new { g.Key, Sum = g.Sum(x => x.Amount) }).ToDictionaryAsync(x => x.Key, x => x.Sum, ct);
        return rows.GroupBy(x => x.EnrollmentId).ToDictionary(g => g.Key,
            g => g.Sum(d => Math.Max(0m, d.NetAmount - alloc.GetValueOrDefault(d.Id))));
    }

    private sealed record AdjBreakdown(decimal Fines, decimal Concessions, decimal WriteOffs);

    private async Task<Dictionary<Guid, AdjBreakdown>> AdjustmentBreakdownByEnrollmentAsync(
        IReadOnlyCollection<Guid> enrollmentIds, CancellationToken ct)
    {
        if (enrollmentIds.Count == 0) return [];
        var rows = await db.FeeAdjustments.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.FeeDue.EnrollmentId) && Visible.Contains(x.FeeDue.Status))
            .Select(x => new { x.FeeDue.EnrollmentId, x.Type, x.Amount }).ToListAsync(ct);
        return rows.GroupBy(x => x.EnrollmentId).ToDictionary(g => g.Key, g => new AdjBreakdown(
            Fines: g.Where(x => x.Type == FeeAdjustmentType.Fine).Sum(x => x.Amount),
            Concessions: g.Where(x => x.Type is FeeAdjustmentType.Discount or FeeAdjustmentType.Waiver or FeeAdjustmentType.Proration).Sum(x => x.Amount),
            WriteOffs: g.Where(x => x.Type == FeeAdjustmentType.WriteOff).Sum(x => x.Amount)));
    }

    private async Task<Dictionary<Guid, decimal>> CreditByStudentAsync(IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        var financials = await balanceCalculator.StudentFinancialsBatchAsync(studentIds, ct);
        return financials.ToDictionary(x => x.Key, x => x.Value.AvailableCredit);
    }

    private static FeePayerStatus Classify(bool hasDues, decimal pending, decimal overdue, decimal collected, decimal credit)
    {
        if (!hasDues) return credit > 0 ? FeePayerStatus.Credit : FeePayerStatus.NoDues;
        if (overdue > 0) return FeePayerStatus.Overdue;
        if (pending > 0) return collected > 0 ? FeePayerStatus.PartiallyPaid : FeePayerStatus.Pending;
        return credit > 0 ? FeePayerStatus.Credit : FeePayerStatus.Paid;
    }
}
