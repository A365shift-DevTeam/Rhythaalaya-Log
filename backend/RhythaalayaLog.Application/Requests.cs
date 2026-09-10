using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public sealed record CreateCourseRequest(string Name, string? Description, int? UpcomingNotificationDays = null);
public sealed record UpdateCourseRequest(string Name, string? Description, bool IsActive, int? UpcomingNotificationDays = null);

public sealed record CreateStaffRequest(string Name, string? Phone, string? Email);
public sealed record UpdateStaffRequest(string Name, string? Phone, string? Email, bool IsActive);

public sealed record CreateBatchRequest(string Name, Guid CourseId, Guid StaffId, IReadOnlyList<DayOfWeek> Days,
    TimeOnly StartTime, TimeOnly EndTime, DateOnly StartDate, DateOnly? EndDate);
public sealed record UpdateBatchRequest(string Name, Guid CourseId, Guid StaffId, IReadOnlyList<DayOfWeek> Days,
    TimeOnly StartTime, TimeOnly EndTime, DateOnly StartDate, DateOnly? EndDate, bool IsActive);

// A one-off schedule change for a single batch. NewDate null = the class is cancelled outright.
public sealed record CreateBatchSessionOverrideRequest(DateOnly OriginalDate, DateOnly? NewDate, string? Reason);

// The agreed price for one of the batches in BatchIds, for courses whose fee plan bills a price
// per student. Batches with no entry enroll unpriced and raise no bill until one is set.
public sealed record BatchFeeAmountRequest(Guid BatchId, decimal Amount);

// BatchIds lets the student and their enrollments be written in one transaction. Creating the
// student first and then enrolling in a loop meant a failure halfway left a half-saved student,
// and retrying the save created a duplicate.

public sealed record CreateStudentRequest(string Name, DateOnly? DateOfBirth, string? ParentName, string? Phone,
    string? Email, string? Address, DateOnly? JoinDate, IReadOnlyList<Guid>? BatchIds = null,
    decimal ConcessionPercent = 0, string? ConcessionReason = null,
    // Per-student late-enrollment billing choice for the created enrollments; null = org default.
    LateEnrollmentBillingPolicy? LateBillingPolicy = null,
    IReadOnlyList<BatchFeeAmountRequest>? BatchFeeAmounts = null);
public sealed record UpdateStudentRequest(string Name, DateOnly? DateOfBirth, string? ParentName, string? Phone,
    string? Email, string? Address, DateOnly? JoinDate, bool IsActive,
    decimal ConcessionPercent = 0, string? ConcessionReason = null);

public sealed record CreateAchievementRequest(string Title, AchievementCategory Category, string? Level,
    DateOnly EventDate, string? Note);

public sealed record CreateEnrollmentRequest(Guid StudentId, Guid BatchId, DateOnly? EnrolledOn,
    // Agreed price when the course bills a price per student; null leaves the enrollment unpriced.
    decimal? FeeAmount = null);
// Sets or clears one student's own price on a per-student fee plan. Clearing it stops future
// bills; bills already raised keep the amount they were raised at.
public sealed record SetEnrollmentFeeAmountRequest(decimal? Amount);
public sealed record EndEnrollmentRequest(EnrollmentStatus Status, DateOnly? EndedOn);

public sealed record SubmitAttendanceRequest(DateOnly Date, Guid BatchId, IReadOnlyList<AttendanceEntryDto> Entries);

public sealed record CreateFeeHeadRequest(string Name, int DisplayOrder = 0);
public sealed record UpdateFeeHeadRequest(string Name, int DisplayOrder, bool IsActive);

public sealed record CreateFeeStructureRequest(Guid CourseId, string Name, decimal Amount, FeeFrequency Frequency,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo, Guid? FeeHeadId = null,
    // Fixed bills Amount to everyone; PerStudent bills each enrollment's own figure; Unbilled
    // raises no dues at all and leaves collection entirely manual.
    FeeBillingMode BillingMode = FeeBillingMode.Fixed);
// EffectiveFrom may only be changed while no due has been generated from the plan.
public sealed record UpdateFeeStructureRequest(string Name, DateOnly? EffectiveTo, bool IsActive, Guid? FeeHeadId = null,
    DateOnly? EffectiveFrom = null);

public sealed record RecordFeePaymentRequest(Guid StudentId, Guid? FeeDueId, decimal Amount, PaymentMethod Method,
    string? ReferenceNumber, string? Remarks, DateTimeOffset? PaymentDate, string? IdempotencyKey = null);
public sealed record RefundFeePaymentRequest(decimal? Amount, string? Remarks);

public sealed record AddFeeAdjustmentRequest(FeeAdjustmentType Type, decimal Amount, string Reason);
public sealed record CancelFeeDueRequest(string Reason);
public sealed record CreateCustomFeeDueRequest(Guid StudentId, Guid EnrollmentId, string Title, decimal Amount, DateOnly DueDate);
public sealed record CreateBatchCustomFeeDueRequest(Guid BatchId, string Title, decimal Amount, DateOnly DueDate);

public sealed record CreateTransactionRequest(string Title, TransactionType Type, decimal Amount,
    string Category, DateTimeOffset? OccurredAt);
public sealed record UpdateTransactionRequest(string Title, TransactionType Type, decimal Amount,
    string Category, DateTimeOffset? OccurredAt);

public sealed record UpdateSettingsRequest(string Name, string Type, string? LogoUrl, string ThemeColor,
    bool DarkMode, string Currency, string Locale, string TimeZone,
    string ReceiptPrefix, string? ReceiptAddress, string? ReceiptPhone, string? ReceiptEmail,
    string ReceiptFooter, bool ReceiptShowLogo, bool ReceiptShowSignature, bool ReceiptAutoOpen,
    IReadOnlyList<string> IncomeCategories, IReadOnlyList<string> ExpenseCategories,
    bool NotificationsEnabled, bool FeeReminderNotifications, bool PaymentNotifications,
    bool AttendanceNotifications, int FeeDueLeadDays = 7,
    LateEnrollmentBillingPolicy LateEnrollmentBillingPolicy = LateEnrollmentBillingPolicy.Skip,
    string? WhatsappTemplate = null, int FeeOverdueGraceDays = 0, string? CreditNotePrefix = null);
