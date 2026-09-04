using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public sealed record CourseDto(Guid Id, string Name, string? Description, bool IsActive, int BatchCount,
    // Days before the due date a fee shows as Upcoming (1–30); null = academy default.
    int? UpcomingNotificationDays = null);
public sealed record StaffDto(Guid Id, string Name, string? Phone, string? Email, bool IsActive, int BatchCount);
public sealed record BatchDto(Guid Id, string Name, Guid CourseId, string CourseName, Guid StaffId, string StaffName,
    IReadOnlyList<DayOfWeek> Days, TimeOnly StartTime, TimeOnly EndTime, DateOnly StartDate, DateOnly? EndDate,
    bool IsActive, int EnrolledCount, IReadOnlyList<BatchSessionOverrideDto> SessionOverrides);

public sealed record BatchSessionOverrideDto(Guid Id, DateOnly OriginalDate, DateOnly? NewDate, string? Reason);

public sealed record EnrollmentSummaryDto(Guid Id, Guid BatchId, string BatchName, Guid CourseId, string CourseName,
    DateOnly EnrolledOn, DateOnly? EndedOn, EnrollmentStatus Status, decimal OutstandingBalance);

public sealed record StudentDto(Guid Id, string StudentNumber, string Name, DateOnly? DateOfBirth,
    string? ParentName, string? Address, string? Phone, string? Email, DateOnly JoinDate, bool IsActive,
    decimal OutstandingBalance, decimal AttendancePercentage, int WonCount, int ParticipatedCount,
    IReadOnlyList<EnrollmentSummaryDto> Enrollments,
    decimal ConcessionPercent = 0, string? ConcessionReason = null,
    // True when at least one non-cancelled, non-upcoming due exists: lets the UI say
    // "No dues" (never billed) instead of "Paid" for a zero balance.
    bool HasBillableDues = false,
    // True when at least one not-yet-due (Upcoming) due exists: lets the UI show
    // "Payment upcoming" instead of "No dues" for a student with a scheduled bill.
    bool HasUpcomingDues = false,
    // Unpaid balance of not-yet-due (Upcoming) dues. Informational only: it is never part of
    // OutstandingBalance, finance totals, or Record Fee eligibility.
    decimal UpcomingAmount = 0);

public sealed record StudentAchievementDto(Guid Id, Guid StudentId, string Title, AchievementCategory Category,
    string? Level, DateOnly EventDate, string? Note, string FileName, string ContentType, int FileSizeBytes,
    DateTimeOffset CreatedAt);

public sealed record AttendanceEntryDto(Guid EnrollmentId, AttendanceStatus Status);
public sealed record AttendanceRecordDto(Guid EnrollmentId, Guid StudentId, string StudentName, AttendanceStatus Status,
    bool StudentIsActive = true, int AttendedDays = 0, bool HasRecord = true);
public sealed record AttendanceLogDto(DateOnly Date, Guid BatchId, string BatchName, IReadOnlyList<AttendanceRecordDto> Entries);

public sealed record FeeHeadDto(Guid Id, string Name, int DisplayOrder, bool IsActive, int StructureCount);

public sealed record FeeStructureDto(Guid Id, Guid CourseId, string CourseName, string Name, decimal Amount,
    FeeFrequency Frequency, DateOnly EffectiveFrom, DateOnly? EffectiveTo, bool IsActive,
    Guid? FeeHeadId = null, string? FeeHeadName = null);

public sealed record FeeDueDto(Guid Id, Guid StudentId, string StudentName, Guid EnrollmentId, Guid BatchId,
    string BatchName, string CourseName, Guid? FeeStructureId, DateOnly DueDate, decimal Amount,
    decimal DiscountAmount, decimal NetAmount, decimal PaidAmount, decimal BalanceAmount, FeeDueStatus Status,
    string? Title = null, DateTimeOffset? CancelledAt = null, string? CancelReason = null,
    DateOnly? PeriodStart = null, DateOnly? PeriodEnd = null);

public sealed record FeeAdjustmentDto(Guid Id, FeeAdjustmentType Type, decimal Amount, string Reason,
    string PerformedByName, DateTimeOffset CreatedAt);

public sealed record FeePaymentAllocationDto(Guid FeeDueId, DateOnly DueDate, string CourseName, string BatchName, decimal Amount);

public sealed record FeePaymentDto(Guid Id, Guid StudentId, string StudentName, string ReceiptNumber, decimal Amount,
    DateTimeOffset PaymentDate, PaymentMethod Method, string? ReferenceNumber, string CollectedByName,
    string? Remarks, Guid? RefundOfPaymentId, IReadOnlyList<FeePaymentAllocationDto> Allocations);

public sealed record ReceiptDto(Guid PaymentId, string ReceiptNumber, string OrganizationName,
    string? OrganizationAddress, string? OrganizationPhone, string? OrganizationEmail, string? OrganizationLogoUrl,
    bool ShowLogo, bool ShowSignature, string ReceiptFooter, string StudentName, string StudentNumber,
    string CourseName, string BatchName, decimal Amount, DateTimeOffset PaymentDate, PaymentMethod Method,
    string CollectedByName, string? StudentPhone = null);

public sealed record TransactionDto(Guid Id, string Title, TransactionType Type, decimal Amount, string Category,
    DateTimeOffset OccurredAt, Guid? FeePaymentId);
// Income is gross receipts, Refunds the money returned (contra-revenue, never an expense),
// Expenses operating spend; Net = Income - Refunds - Expenses.
public sealed record FinanceSummaryDto(DateTimeOffset From, DateTimeOffset To, decimal Income, decimal Expenses,
    decimal Net, IReadOnlyList<TransactionDto> Transactions, decimal Refunds = 0);
public sealed record DashboardDto(int ActiveStudents, int ActiveBatches, decimal OutstandingFees,
    decimal CollectedFees, decimal AttendancePercentage);

public sealed record SettingsDto(Guid Id, string Name, string Type, string? LogoUrl, string ThemeColor, bool DarkMode,
    string Currency, string Locale, string TimeZone,
    string ReceiptPrefix, string? ReceiptAddress, string? ReceiptPhone, string? ReceiptEmail,
    string ReceiptFooter, bool ReceiptShowLogo, bool ReceiptShowSignature, bool ReceiptAutoOpen,
    IReadOnlyList<string> IncomeCategories, IReadOnlyList<string> ExpenseCategories,
    bool NotificationsEnabled, bool FeeReminderNotifications, bool PaymentNotifications,
    bool AttendanceNotifications, int FeeDueLeadDays = 7,
    LateEnrollmentBillingPolicy LateEnrollmentBillingPolicy = LateEnrollmentBillingPolicy.Skip,
    string? WhatsappTemplate = null, int FeeOverdueGraceDays = 0, string CreditNotePrefix = "CN");
