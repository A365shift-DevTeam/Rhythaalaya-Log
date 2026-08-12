using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public sealed record CreateBatchRequest(string Name, string Course, string Schedule, string Instructor);

public sealed record CreateStudentRequest(string Name, Guid BatchId, decimal MonthlyFee, decimal OpeningBalance,
    string? Phone, string? Email, DateOnly? JoinDate);

public sealed record UpdateStudentRequest(string Name, Guid BatchId, decimal MonthlyFee, decimal OutstandingBalance,
    string? Phone, string? Email, bool IsActive);

public sealed record SubmitAttendanceRequest(DateOnly Date, Guid BatchId, IReadOnlyList<AttendanceEntryDto> Entries);

public sealed record RecordPaymentRequest(Guid StudentId, decimal Amount, PaymentMethod Method,
    string? Reference, DateTimeOffset? OccurredAt);

public sealed record CreateTransactionRequest(string Title, TransactionType Type, decimal Amount,
    string Category, DateTimeOffset? OccurredAt);

public sealed record UpdateSettingsRequest(string Name, string Type, string? LogoUrl, string ThemeColor,
    bool DarkMode, decimal DefaultMonthlyFee, int FeeDueDay, string Currency, string Locale, string TimeZone);
