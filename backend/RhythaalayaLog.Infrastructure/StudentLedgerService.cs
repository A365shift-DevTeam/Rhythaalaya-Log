using System.Globalization;
using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Read-only builder for the derived Student Fee Ledger (finance PRP §27–28). Composes the
/// existing append-only FeeDue / FeeAdjustment / FeePayment rows into a single chronological
/// debit/credit statement with a running balance — there is no ledger table.
///
/// Debit = charged to the student (gross <see cref="FeeDue.Amount"/>); credit = payment or
/// adjustment. Balance after a row = previous balance + debit − credit. Cancelled and not-yet-due
/// (Upcoming) charges are excluded on every line, matching <see cref="FeeBalanceCalculator"/>, so
/// the closing balance agrees with the outstanding figure shown elsewhere for the student.
/// Tenant scoping is enforced by the DbContext's global query filters.
/// </summary>
public sealed class StudentLedgerService(
    AppDbContext db, FeeDueGenerator dueGenerator, FeeBalanceCalculator balanceCalculator)
    : IStudentLedgerService
{
    private static readonly FeeDueStatus[] LedgerVisibleDueStatuses =
        [FeeDueStatus.Pending, FeeDueStatus.Partial, FeeDueStatus.Paid, FeeDueStatus.Overdue];

    public async Task<StudentLedgerDto> GetStudentLedgerAsync(Guid studentId, CancellationToken ct)
    {
        // Cross-tenant / unknown ids must 404 — never leak an empty ledger (finance PRP §33).
        var student = await db.Students.AsNoTracking().SingleOrDefaultAsync(x => x.Id == studentId, ct)
            ?? throw new NotFoundException(nameof(Student));

        // Roll scheduled dues forward and refresh date-driven statuses first, like the sibling
        // fee-due endpoint does, so a freshly opened ledger is current.
        await dueGenerator.EnsureForStudentAsync(studentId, ct);

        var dues = await db.FeeDues.AsNoTracking().Include(x => x.FeeStructure)
            .Where(x => x.StudentId == studentId && LedgerVisibleDueStatuses.Contains(x.Status))
            .ToListAsync(ct);
        var dueById = dues.ToDictionary(x => x.Id);

        var adjustments = await db.FeeAdjustments.AsNoTracking()
            .Where(x => dueById.Keys.Contains(x.FeeDueId))
            .ToListAsync(ct);

        var payments = await db.FeePayments.AsNoTracking()
            .Where(x => x.StudentId == studentId)
            .ToListAsync(ct);

        var feeHeadIds = dues.Where(x => x.FeeHeadId != null).Select(x => x.FeeHeadId!.Value).Distinct().ToList();
        var feeHeadNames = feeHeadIds.Count == 0 ? new Dictionary<Guid, string>()
            : await db.FeeHeads.AsNoTracking().Where(x => feeHeadIds.Contains(x.Id))
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

        var timeZoneId = await db.OrganizationSettings.AsNoTracking()
            .Select(x => x.TimeZone).FirstOrDefaultAsync(ct) ?? "Asia/Kolkata";
        DateOnly LocalDate(DateTimeOffset instant) => BillingSchedule.ToLocalDate(timeZoneId, instant);

        var rows = new List<Row>();

        foreach (var due in dues)
        {
            var headName = due.FeeHeadId is { } hid ? feeHeadNames.GetValueOrDefault(hid) : null;
            rows.Add(new Row(due.DueDate, SortRank.Charge, due.CreatedAt, due.Id,
                LedgerEntryType.FeeCharge, DescribeCharge(due), due.Amount, 0m, due.Id, null, null, headName));
        }

        foreach (var adjustment in adjustments)
        {
            // A fine is the one adjustment that raises the bill, so its positive amount is a
            // DEBIT; every other type reduces the bill, so its positive amount is a CREDIT. A
            // negative correction row (the append-only "undo") flips that direction.
            var (type, label, isDebitType) = adjustment.Type switch
            {
                FeeAdjustmentType.Waiver => (LedgerEntryType.Waiver, "Waiver", false),
                FeeAdjustmentType.Proration => (LedgerEntryType.Proration, "Proration", false),
                FeeAdjustmentType.Fine => (LedgerEntryType.Fine, "Fine", true),
                FeeAdjustmentType.WriteOff => (LedgerEntryType.WriteOff, "Write-off", false),
                _ => (LedgerEntryType.Concession, "Concession", false)
            };
            var landsAsDebit = isDebitType ? adjustment.Amount >= 0 : adjustment.Amount < 0;
            var magnitude = Math.Abs(adjustment.Amount);
            var debit = landsAsDebit ? magnitude : 0m;
            var credit = landsAsDebit ? 0m : magnitude;
            rows.Add(new Row(LocalDate(adjustment.CreatedAt), SortRank.Adjustment, adjustment.CreatedAt, adjustment.Id,
                type, $"{label} — {adjustment.Reason}", debit, credit, adjustment.FeeDueId, null, null, null));
        }

        foreach (var payment in payments)
        {
            var date = LocalDate(payment.PaymentDate);
            rows.Add(payment.Amount >= 0
                ? new Row(date, SortRank.Payment, payment.CreatedAt, payment.Id, LedgerEntryType.Payment,
                    $"Payment received ({payment.Method})", 0m, payment.Amount, null, payment.Id, payment.ReceiptNumber, null)
                : new Row(date, SortRank.Payment, payment.CreatedAt, payment.Id, LedgerEntryType.Refund,
                    "Refund issued", -payment.Amount, 0m, null, payment.Id, payment.ReceiptNumber, null));
        }

        var ordered = rows
            .OrderBy(x => x.Date)
            .ThenBy(x => (int)x.Rank)
            .ThenBy(x => x.CreatedAt)
            .ThenBy(x => x.TieBreak)
            .ToList();

        var entries = new List<StudentLedgerEntryDto>(ordered.Count);
        var running = 0m;
        foreach (var row in ordered)
        {
            running += row.Debit - row.Credit;
            entries.Add(new StudentLedgerEntryDto(row.Date, row.Type, row.Description,
                row.Debit, row.Credit, running, row.FeeDueId, row.PaymentId, row.Reference, row.FeeHeadName));
        }

        var financials = await balanceCalculator.StudentFinancialsAsync(studentId, ct);
        var totalCharged = dues.Sum(x => x.Amount);
        var totalFines = adjustments.Where(x => x.Type == FeeAdjustmentType.Fine).Sum(x => x.Amount);
        var totalWrittenOff = adjustments.Where(x => x.Type == FeeAdjustmentType.WriteOff).Sum(x => x.Amount);
        var totalAdjustments = adjustments
            .Where(x => x.Type is FeeAdjustmentType.Discount or FeeAdjustmentType.Waiver or FeeAdjustmentType.Proration)
            .Sum(x => x.Amount);
        var totalPaid = payments.Where(x => x.Amount > 0).Sum(x => x.Amount);
        var totalRefunded = payments.Where(x => x.Amount < 0).Sum(x => -x.Amount);

        var summary = new StudentFinancialSummaryDto(
            TotalCharged: totalCharged,
            TotalFines: totalFines,
            TotalAdjustments: totalAdjustments,
            TotalWrittenOff: totalWrittenOff,
            // What the student was expected to pay, before any write-off. The write-off then shows
            // on its own line and brings Pending down — it is never folded in as "collected".
            NetCharged: totalCharged + totalFines - totalAdjustments,
            TotalPaid: totalPaid,
            Pending: financials.Pending,
            AvailableCredit: financials.AvailableCredit,
            Overdue: financials.Overdue,
            TotalRefunded: totalRefunded,
            ReservedCredit: financials.ReservedCredit);

        return new StudentLedgerDto(student.Id, student.Name, summary, entries);
    }

    /// <summary>"Tuition · 10 Sep – 9 Oct 2026": the plan name plus the service period the charge pays for.</summary>
    private static string DescribeCharge(FeeDue due)
    {
        var name = !string.IsNullOrWhiteSpace(due.Title) ? due.Title!.Trim()
            : due.FeeStructure?.Name is { Length: > 0 } planName ? planName : "Fee charge";
        if (due.PeriodStart is not { } start || due.PeriodEnd is not { } end) return name;
        var inv = CultureInfo.InvariantCulture; // stable "Sep", whatever the server culture
        var period = start == end ? start.ToString("d MMM yyyy", inv)
            : start.Year == end.Year ? $"{start.ToString("d MMM", inv)} – {end.ToString("d MMM yyyy", inv)}"
            : $"{start.ToString("d MMM yyyy", inv)} – {end.ToString("d MMM yyyy", inv)}";
        return $"{name} · {period}";
    }

    private enum SortRank { Charge = 0, Adjustment = 1, Payment = 2 }

    private readonly record struct Row(
        DateOnly Date, SortRank Rank, DateTimeOffset CreatedAt, Guid TieBreak,
        LedgerEntryType Type, string Description, decimal Debit, decimal Credit,
        Guid? FeeDueId, Guid? PaymentId, string? Reference, string? FeeHeadName);
}
