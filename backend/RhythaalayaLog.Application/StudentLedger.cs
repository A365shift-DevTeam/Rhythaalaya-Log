namespace RhythaalayaLog.Application;

/// <summary>
/// Why a Student Fee Ledger row exists. DEBIT rows raise what the student owes; CREDIT rows
/// reduce it. This is the student-fee-ledger reading of debit/credit, not double-entry
/// accounting (see the finance PRP, "Important Distinction").
/// </summary>
public enum LedgerEntryType
{
    /// <summary>A fee charged to the student — the gross <see cref="RhythaalayaLog.Domain.FeeDue.Amount"/>. DEBIT.</summary>
    FeeCharge,
    /// <summary>Cash received from (or on behalf of) the student. CREDIT.</summary>
    Payment,
    /// <summary>A discount adjustment against a charge (includes the standing student concession). CREDIT.</summary>
    Concession,
    /// <summary>A waiver adjustment against a charge. CREDIT.</summary>
    Waiver,
    /// <summary>A proration adjustment on a partial first billing period. CREDIT.</summary>
    Proration,
    /// <summary>A late fee / surcharge added to a charge. DEBIT.</summary>
    Fine,
    /// <summary>An uncollectable amount the academy has stopped pursuing. CREDIT — reported separately, never as collected.</summary>
    WriteOff,
    /// <summary>A refund paid back to the student — reverses an earlier payment. DEBIT.</summary>
    Refund
}

/// <summary>
/// One line of the derived Student Fee Ledger. Composed on read from FeeDue / FeeAdjustment /
/// FeePayment — there is no ledger table. <see cref="Balance"/> is the running balance after this
/// row: previous balance + <see cref="Debit"/> − <see cref="Credit"/>.
/// </summary>
public sealed record StudentLedgerEntryDto(
    DateOnly Date,
    LedgerEntryType Type,
    string Description,
    decimal Debit,
    decimal Credit,
    decimal Balance,
    Guid? FeeDueId,
    Guid? PaymentId,
    string? Reference,
    string? FeeHeadName = null);

/// <summary>
/// Roll-up of a student's finances. <see cref="Pending"/> and <see cref="AvailableCredit"/> come
/// from the same calculation the rest of the app uses (FeeBalanceCalculator), so the ledger's
/// closing balance and the figures shown elsewhere for the student agree. Upcoming and cancelled
/// dues are excluded on every line here, matching that cutoff.
/// </summary>
public sealed record StudentFinancialSummaryDto(
    decimal TotalCharged,
    decimal TotalFines,
    decimal TotalAdjustments,
    decimal TotalWrittenOff,
    decimal NetCharged,
    decimal TotalPaid,
    decimal Pending,
    decimal AvailableCredit,
    decimal Overdue,
    decimal TotalRefunded);

public sealed record StudentLedgerDto(
    Guid StudentId,
    string StudentName,
    StudentFinancialSummaryDto Summary,
    IReadOnlyList<StudentLedgerEntryDto> Entries);

public interface IStudentLedgerService
{
    /// <summary>
    /// Builds the derived fee ledger and financial summary for one student. Throws
    /// <see cref="NotFoundException"/> when the student does not exist in the caller's tenant —
    /// never returns an empty ledger for an unknown/cross-tenant id.
    /// </summary>
    Task<StudentLedgerDto> GetStudentLedgerAsync(Guid studentId, CancellationToken ct);
}
