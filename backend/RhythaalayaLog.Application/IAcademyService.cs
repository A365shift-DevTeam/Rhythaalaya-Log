namespace RhythaalayaLog.Application;

public interface IAcademyService
{
    Task<IReadOnlyList<CourseDto>> GetCoursesAsync(CancellationToken ct);
    Task<CourseDto> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct);
    Task<CourseDto> UpdateCourseAsync(Guid id, UpdateCourseRequest request, CancellationToken ct);
    Task ArchiveCourseAsync(Guid id, CancellationToken ct);

    Task<IReadOnlyList<StaffDto>> GetStaffAsync(CancellationToken ct);
    Task<StaffDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct);
    Task<StaffDto> UpdateStaffAsync(Guid id, UpdateStaffRequest request, CancellationToken ct);
    Task ArchiveStaffAsync(Guid id, CancellationToken ct);

    Task<IReadOnlyList<BatchDto>> GetBatchesAsync(CancellationToken ct);
    Task<BatchDto> CreateBatchAsync(CreateBatchRequest request, CancellationToken ct);
    Task<BatchDto> UpdateBatchAsync(Guid id, UpdateBatchRequest request, CancellationToken ct);
    Task ArchiveBatchAsync(Guid id, CancellationToken ct);

    Task<IReadOnlyList<StudentDto>> GetStudentsAsync(string? search, Guid? batchId, bool includeInactive, CancellationToken ct);
    Task<StudentDto> GetStudentAsync(Guid id, CancellationToken ct);
    Task<StudentDto> CreateStudentAsync(CreateStudentRequest request, CancellationToken ct);
    Task<StudentDto> UpdateStudentAsync(Guid id, UpdateStudentRequest request, CancellationToken ct);
    Task ArchiveStudentAsync(Guid id, CancellationToken ct);

    Task<StudentDto> CreateEnrollmentAsync(CreateEnrollmentRequest request, CancellationToken ct);
    Task<StudentDto> EndEnrollmentAsync(Guid enrollmentId, EndEnrollmentRequest request, CancellationToken ct);

    Task<AttendanceLogDto> GetAttendanceAsync(DateOnly date, Guid batchId, CancellationToken ct);
    Task<AttendanceLogDto> SubmitAttendanceAsync(SubmitAttendanceRequest request, CancellationToken ct);

    Task<DashboardDto> GetDashboardAsync(DateOnly date, CancellationToken ct);
    Task<SettingsDto> GetSettingsAsync(CancellationToken ct);
    Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken ct);
}

public interface IFinanceService
{
    Task<IReadOnlyList<FeeStructureDto>> GetFeeStructuresAsync(Guid? courseId, CancellationToken ct);
    Task<FeeStructureDto> CreateFeeStructureAsync(CreateFeeStructureRequest request, CancellationToken ct);
    Task<FeeStructureDto> UpdateFeeStructureAsync(Guid id, UpdateFeeStructureRequest request, CancellationToken ct);

    Task<IReadOnlyList<FeeDueDto>> GetStudentFeeDuesAsync(Guid studentId, CancellationToken ct);
    Task<IReadOnlyList<FeeDueDto>> GetFeeDuesAsync(Domain.FeeDueStatus? status, CancellationToken ct);

    Task<FeePaymentDto> RecordFeePaymentAsync(RecordFeePaymentRequest request, CancellationToken ct);
    Task<FeePaymentDto> RefundFeePaymentAsync(Guid paymentId, RefundFeePaymentRequest request, CancellationToken ct);
    Task<IReadOnlyList<FeePaymentDto>> GetStudentPaymentsAsync(Guid studentId, CancellationToken ct);
    Task<ReceiptDto> GetReceiptAsync(Guid paymentId, CancellationToken ct);

    Task<FinanceSummaryDto> GetFinanceAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct);
    Task<TransactionDto> CreateTransactionAsync(CreateTransactionRequest request, CancellationToken ct);
    Task<TransactionDto> UpdateTransactionAsync(Guid id, UpdateTransactionRequest request, CancellationToken ct);
    Task DeleteTransactionAsync(Guid id, CancellationToken ct);
}

public sealed class AppValidationException(string message) : Exception(message);
public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);
public sealed class InvalidCredentialsException(string message) : Exception(message);
