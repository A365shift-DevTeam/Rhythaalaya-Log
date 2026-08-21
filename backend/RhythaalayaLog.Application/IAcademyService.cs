namespace RhythaalayaLog.Application;

public interface IAcademyService
{
    Task<IReadOnlyList<BatchDto>> GetBatchesAsync(CancellationToken cancellationToken);
    Task<BatchDto> CreateBatchAsync(CreateBatchRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<StudentDto>> GetStudentsAsync(string? search, Guid? batchId, bool includeInactive, CancellationToken cancellationToken);
    Task<StudentDto> GetStudentAsync(Guid id, CancellationToken cancellationToken);
    Task<StudentDto> CreateStudentAsync(CreateStudentRequest request, CancellationToken cancellationToken);
    Task<StudentDto> UpdateStudentAsync(Guid id, UpdateStudentRequest request, CancellationToken cancellationToken);
    Task ArchiveStudentAsync(Guid id, CancellationToken cancellationToken);
    Task<AttendanceLogDto> GetAttendanceAsync(DateOnly date, Guid batchId, CancellationToken cancellationToken);
    Task<AttendanceLogDto> SubmitAttendanceAsync(SubmitAttendanceRequest request, CancellationToken cancellationToken);
    Task<PaymentDto> RecordPaymentAsync(RecordPaymentRequest request, CancellationToken cancellationToken);
    Task<FinanceSummaryDto> GetFinanceAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken);
    Task<TransactionDto> CreateTransactionAsync(CreateTransactionRequest request, CancellationToken cancellationToken);
    Task<DashboardDto> GetDashboardAsync(DateOnly date, CancellationToken cancellationToken);
    Task<SettingsDto> GetSettingsAsync(CancellationToken cancellationToken);
    Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken cancellationToken);
}

public sealed class AppValidationException(string message) : Exception(message);
public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);
public sealed class InvalidCredentialsException(string message) : Exception(message);
