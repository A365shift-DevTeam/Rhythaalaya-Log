using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public sealed record CreateCourseRequest(string Name, string? Description);
public sealed record UpdateCourseRequest(string Name, string? Description, bool IsActive);

public sealed record CreateStaffRequest(string Name, string? Phone, string? Email);
public sealed record UpdateStaffRequest(string Name, string? Phone, string? Email, bool IsActive);

public sealed record CreateBatchRequest(string Name, Guid CourseId, Guid StaffId, IReadOnlyList<DayOfWeek> Days,
    TimeOnly StartTime, TimeOnly EndTime, DateOnly StartDate, DateOnly? EndDate);
public sealed record UpdateBatchRequest(string Name, Guid CourseId, Guid StaffId, IReadOnlyList<DayOfWeek> Days,
    TimeOnly StartTime, TimeOnly EndTime, DateOnly StartDate, DateOnly? EndDate, bool IsActive);

public sealed record CreateStudentRequest(string Name, DateOnly? DateOfBirth, string? ParentName, string? Phone,
    string? Email, string? Address, DateOnly? JoinDate);
public sealed record UpdateStudentRequest(string Name, DateOnly? DateOfBirth, string? ParentName, string? Phone,
    string? Email, string? Address, DateOnly? JoinDate, bool IsActive);

public sealed record CreateAchievementRequest(string Title, AchievementCategory Category, string? Level,
    DateOnly EventDate, string? Note);

public sealed record CreateEnrollmentRequest(Guid StudentId, Guid BatchId, DateOnly? EnrolledOn);
public sealed record EndEnrollmentRequest(EnrollmentStatus Status, DateOnly? EndedOn);

public sealed record SubmitAttendanceRequest(DateOnly Date, Guid BatchId, IReadOnlyList<AttendanceEntryDto> Entries);

public sealed record CreateFeeStructureRequest(Guid CourseId, string Name, decimal Amount, FeeFrequency Frequency,
    DateOnly EffectiveFrom, DateOnly? EffectiveTo);
public sealed record UpdateFeeStructureRequest(string Name, DateOnly? EffectiveTo, bool IsActive);

public sealed record RecordFeePaymentRequest(Guid StudentId, Guid? FeeDueId, decimal Amount, PaymentMethod Method,
    string? ReferenceNumber, string? Remarks, DateTimeOffset? PaymentDate);
public sealed record RefundFeePaymentRequest(decimal? Amount, string? Remarks);

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
    bool AttendanceNotifications);
