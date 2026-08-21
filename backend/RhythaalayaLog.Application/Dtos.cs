using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Application;

public sealed record BatchDto(Guid Id, string Name, string Course, string Schedule, string Instructor,
    decimal MonthlyFee, bool IsActive, int EnrolledCount);
public sealed record StudentDto(Guid Id, string StudentNumber, string Name, Guid BatchId, string BatchName, string Course,
    decimal MonthlyFee, decimal DiscountAmount, decimal OutstandingBalance, string FeeStatus, decimal AttendancePercentage,
    string? Phone, string? Email, DateOnly JoinDate, bool IsActive);
public sealed record AttendanceEntryDto(Guid StudentId, AttendanceStatus Status);
public sealed record AttendanceRecordDto(Guid StudentId, string StudentName, AttendanceStatus Status);
public sealed record AttendanceLogDto(DateOnly Date, Guid BatchId, string BatchName, IReadOnlyList<AttendanceRecordDto> Entries);
public sealed record PaymentDto(Guid Id, Guid StudentId, decimal Amount, PaymentMethod Method, string? Reference, DateTimeOffset OccurredAt);
public sealed record TransactionDto(Guid Id, string Title, TransactionType Type, decimal Amount, string Category, DateTimeOffset OccurredAt, Guid? PaymentId);
public sealed record FinanceSummaryDto(DateTimeOffset From, DateTimeOffset To, decimal Income, decimal Expenses, decimal Net, IReadOnlyList<TransactionDto> Transactions);
public sealed record DashboardDto(int ActiveStudents, int ActiveBatches, decimal OutstandingFees, decimal CollectedFees, decimal AttendancePercentage);
public sealed record SettingsDto(Guid Id, string Name, string Type, string? LogoUrl, string ThemeColor, bool DarkMode,
    decimal DefaultMonthlyFee, int FeeDueDay, string Currency, string Locale, string TimeZone);
