namespace RhythaalayaLog.Application;

/// <summary>
/// Where a student/enrollment sits financially, for the batch payment-status buckets (finance PRP §29).
/// </summary>
public enum FeePayerStatus
{
    NoDues,        // nothing billable yet
    Paid,          // billed and fully settled
    PartiallyPaid, // some paid, some still owed, nothing overdue
    Pending,       // owed, due date not yet passed
    Overdue,       // owed and past the due date
    Credit         // nothing owed and carrying advance credit
}

public sealed record BatchFinanceStudentDto(
    Guid StudentId,
    string StudentName,
    Guid EnrollmentId,
    decimal NetCharged,
    decimal Collected,
    decimal Pending,
    decimal Overdue,
    decimal AvailableCredit,
    FeePayerStatus Status);

/// <summary>Full finance picture for one batch, with a row per active enrollment for drill-down.</summary>
public sealed record BatchFinanceDto(
    Guid BatchId,
    string BatchName,
    string CourseName,
    decimal TotalCharged,
    decimal TotalFines,
    decimal TotalAdjustments,
    decimal TotalWrittenOff,
    decimal NetCharged,
    decimal Collected,
    decimal Pending,
    decimal Overdue,
    decimal AvailableCredit,
    int PaidCount,
    int PartiallyPaidCount,
    int PendingCount,
    int OverdueCount,
    int WithCreditCount,
    int NoDuesCount,
    IReadOnlyList<BatchFinanceStudentDto> Students);

/// <summary>One line of the batch-finance overview list (no per-student drill-down).</summary>
public sealed record BatchFinanceRowDto(
    Guid BatchId,
    string BatchName,
    string CourseName,
    int StudentCount,
    decimal NetCharged,
    decimal Collected,
    decimal Pending,
    decimal Overdue,
    decimal AvailableCredit);

/// <summary>
/// Optional narrowing for the finance dashboard. <see cref="From"/>/<see cref="To"/> bound the
/// time-based collection figures; <see cref="BatchId"/>/<see cref="CourseId"/> scope every figure
/// to students enrolled in that batch/course. No academic-year filter — the app is date-ranged.
/// </summary>
public sealed record FinanceDashboardQuery(
    DateOnly? From = null,
    DateOnly? To = null,
    Guid? BatchId = null,
    Guid? CourseId = null,
    Guid? FeeHeadId = null);

public sealed record FinanceDashboardDto(
    decimal TotalCharged,
    decimal TotalFines,
    decimal TotalAdjustments,
    decimal TotalWrittenOff,
    decimal NetCharged,
    decimal TotalCollected,
    decimal TotalPending,
    decimal TotalOverdue,
    decimal TotalStudentCredit,
    decimal CollectionToday,
    decimal CollectionThisMonth,
    decimal CollectionInRange,
    decimal RefundsInRange,
    decimal WriteOffsInRange,
    DateOnly? RangeFrom,
    DateOnly? RangeTo);

public enum CollectionGranularity { Day, Month }

/// <summary>One time bucket of net fee collection (payments received minus refunds paid).</summary>
public sealed record CollectionPointDto(string Period, decimal Collected, decimal Refunded, decimal Net);

public sealed record CollectionReportDto(
    DateOnly From,
    DateOnly To,
    CollectionGranularity Granularity,
    decimal TotalCollected,
    decimal TotalRefunded,
    decimal TotalNet,
    IReadOnlyList<CollectionPointDto> Points);

public interface IFinanceReportingService
{
    Task<IReadOnlyList<BatchFinanceRowDto>> GetBatchFinanceListAsync(CancellationToken ct);
    Task<BatchFinanceDto> GetBatchFinanceAsync(Guid batchId, CancellationToken ct);
    Task<FinanceDashboardDto> GetFinanceDashboardAsync(FinanceDashboardQuery query, CancellationToken ct);
    Task<CollectionReportDto> GetCollectionReportAsync(
        DateOnly from, DateOnly to, CollectionGranularity granularity, CancellationToken ct);
}
