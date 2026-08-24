using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AcademyService(AppDbContext db, ITenantContext tenantContext,
    FeeDueGenerator dueGenerator, FeeBalanceCalculator balances) : IAcademyService
{
    public async Task<IReadOnlyList<CourseDto>> GetCoursesAsync(CancellationToken ct) =>
        await db.Courses.AsNoTracking().OrderBy(x => x.Name)
            .Select(x => new CourseDto(x.Id, x.Name, x.Description, x.IsActive, x.Batches.Count(b => b.IsActive)))
            .ToListAsync(ct);

    public async Task<CourseDto> CreateCourseAsync(CreateCourseRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var course = new Course { TenantId = RequireTenant(), Name = request.Name.Trim(), Description = Clean(request.Description) };
        db.Courses.Add(course);
        await db.SaveChangesAsync(ct);
        return new CourseDto(course.Id, course.Name, course.Description, true, 0);
    }

    public async Task<CourseDto> UpdateCourseAsync(Guid id, UpdateCourseRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var course = await db.Courses.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Course));
        course.Name = request.Name.Trim();
        course.Description = Clean(request.Description);
        course.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        var batchCount = await db.Batches.CountAsync(x => x.CourseId == id && x.IsActive, ct);
        return new CourseDto(course.Id, course.Name, course.Description, course.IsActive, batchCount);
    }

    public async Task ArchiveCourseAsync(Guid id, CancellationToken ct)
    {
        var course = await db.Courses.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Course));
        course.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<StaffDto>> GetStaffAsync(CancellationToken ct) =>
        await db.Staff.AsNoTracking().OrderBy(x => x.Name)
            .Select(x => new StaffDto(x.Id, x.Name, x.Phone, x.Email, x.IsActive, x.Batches.Count(b => b.IsActive)))
            .ToListAsync(ct);

    public async Task<StaffDto> CreateStaffAsync(CreateStaffRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var staff = new Staff { TenantId = RequireTenant(), Name = request.Name.Trim(), Phone = Clean(request.Phone), Email = Clean(request.Email) };
        db.Staff.Add(staff);
        await db.SaveChangesAsync(ct);
        return new StaffDto(staff.Id, staff.Name, staff.Phone, staff.Email, true, 0);
    }

    public async Task<StaffDto> UpdateStaffAsync(Guid id, UpdateStaffRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var staff = await db.Staff.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Staff));
        staff.Name = request.Name.Trim();
        staff.Phone = Clean(request.Phone);
        staff.Email = Clean(request.Email);
        staff.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        var batchCount = await db.Batches.CountAsync(x => x.StaffId == id && x.IsActive, ct);
        return new StaffDto(staff.Id, staff.Name, staff.Phone, staff.Email, staff.IsActive, batchCount);
    }

    public async Task ArchiveStaffAsync(Guid id, CancellationToken ct)
    {
        var staff = await db.Staff.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Staff));
        staff.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<BatchDto>> GetBatchesAsync(CancellationToken ct)
    {
        var batches = await BatchQuery().OrderBy(x => x.Name).ToListAsync(ct);
        return batches.Select(MapBatch).ToList();
    }

    public async Task<BatchDto> CreateBatchAsync(CreateBatchRequest request, CancellationToken ct)
    {
        await ValidateBatchAsync(request.Name, request.CourseId, request.StaffId, request.Days,
            request.StartTime, request.EndTime, request.StartDate, request.EndDate, ct);
        var batch = new Batch
        {
            TenantId = RequireTenant(), Name = request.Name.Trim(), CourseId = request.CourseId, StaffId = request.StaffId,
            Days = ToBatchDays(request.Days), StartTime = request.StartTime, EndTime = request.EndTime,
            StartDate = request.StartDate, EndDate = request.EndDate
        };
        db.Batches.Add(batch);
        await db.SaveChangesAsync(ct);
        return await GetBatchAsync(batch.Id, ct);
    }

    public async Task<BatchDto> UpdateBatchAsync(Guid id, UpdateBatchRequest request, CancellationToken ct)
    {
        await ValidateBatchAsync(request.Name, request.CourseId, request.StaffId, request.Days,
            request.StartTime, request.EndTime, request.StartDate, request.EndDate, ct, id);
        var batch = await db.Batches.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Batch));
        batch.Name = request.Name.Trim();
        batch.CourseId = request.CourseId;
        batch.StaffId = request.StaffId;
        batch.Days = ToBatchDays(request.Days);
        batch.StartTime = request.StartTime;
        batch.EndTime = request.EndTime;
        batch.StartDate = request.StartDate;
        batch.EndDate = request.EndDate;
        batch.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return await GetBatchAsync(id, ct);
    }

    public async Task ArchiveBatchAsync(Guid id, CancellationToken ct)
    {
        var batch = await db.Batches.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Batch));
        batch.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<StudentDto>> GetStudentsAsync(string? search, Guid? batchId,
        bool includeInactive, CancellationToken ct)
    {
        await dueGenerator.EnsureForTenantAsync(ct);
        var query = StudentQuery();
        if (!includeInactive) query = query.Where(x => x.IsActive);
        if (batchId.HasValue) query = query.Where(x => x.Enrollments.Any(e => e.BatchId == batchId.Value && e.Status == EnrollmentStatus.Active));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term) || x.StudentNumber.ToLower().Contains(term));
        }
        var students = await query.OrderBy(x => x.Name).ToListAsync(ct);
        return await MapStudentsAsync(students, ct);
    }

    public async Task<StudentDto> GetStudentAsync(Guid id, CancellationToken ct)
    {
        await dueGenerator.EnsureForStudentAsync(id, ct);
        var student = await StudentQuery().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException(nameof(Student));
        return (await MapStudentsAsync([student], ct))[0];
    }

    public async Task<StudentDto> CreateStudentAsync(CreateStudentRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var tenantId = RequireTenant();
        var now = DateTimeOffset.UtcNow;
        var subscription = await db.TenantSubscriptions.AsNoTracking().Include(x => x.Plan)
            .Where(x => x.TenantId == tenantId
                && (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)
                && x.StartsAt <= now && x.EndsAt > now)
            .OrderByDescending(x => x.EndsAt).FirstOrDefaultAsync(ct)
            ?? throw new ConflictException("The academy has no active subscription.");
        var activeStudents = await db.Students.CountAsync(x => x.IsActive, ct);
        if (activeStudents >= subscription.Plan.MaxStudents)
            throw new ConflictException("Subscription student limit reached.");
        var student = new Student
        {
            TenantId = tenantId,
            StudentNumber = string.Concat("STU", DateTime.UtcNow.Year, Guid.NewGuid().ToString()[..8]).ToUpperInvariant(),
            Name = request.Name.Trim(), DateOfBirth = request.DateOfBirth, ParentName = Clean(request.ParentName),
            Phone = Clean(request.Phone), Email = Clean(request.Email), Address = Clean(request.Address),
            JoinDate = request.JoinDate ?? DateOnly.FromDateTime(DateTime.UtcNow)
        };
        db.Students.Add(student);
        await db.SaveChangesAsync(ct);
        return await GetStudentAsync(student.Id, ct);
    }

    public async Task<StudentDto> UpdateStudentAsync(Guid id, UpdateStudentRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var student = await db.Students.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Student));
        student.Name = request.Name.Trim();
        student.DateOfBirth = request.DateOfBirth;
        student.ParentName = Clean(request.ParentName);
        student.Phone = Clean(request.Phone);
        student.Email = Clean(request.Email);
        student.Address = Clean(request.Address);
        student.JoinDate = request.JoinDate ?? student.JoinDate;
        student.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return await GetStudentAsync(id, ct);
    }

    public async Task ArchiveStudentAsync(Guid id, CancellationToken ct)
    {
        var student = await db.Students.FindAsync([id], ct) ?? throw new NotFoundException(nameof(Student));
        student.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<StudentDto> CreateEnrollmentAsync(CreateEnrollmentRequest request, CancellationToken ct)
    {
        var student = await db.Students.SingleOrDefaultAsync(x => x.Id == request.StudentId && x.IsActive, ct)
            ?? throw new AppValidationException(nameof(request.StudentId));
        var batch = await db.Batches.SingleOrDefaultAsync(x => x.Id == request.BatchId && x.IsActive, ct)
            ?? throw new AppValidationException(nameof(request.BatchId));
        var alreadyEnrolled = await db.Enrollments.AnyAsync(x => x.StudentId == request.StudentId
            && x.BatchId == request.BatchId && x.Status == EnrollmentStatus.Active, ct);
        if (alreadyEnrolled) throw new ConflictException("The student is already actively enrolled in this batch.");
        var enrollment = new Enrollment
        {
            TenantId = RequireTenant(), StudentId = student.Id, BatchId = batch.Id, CourseId = batch.CourseId,
            EnrolledOn = request.EnrolledOn ?? DateOnly.FromDateTime(DateTime.UtcNow)
        };
        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync(ct);
        await dueGenerator.EnsureForEnrollmentAsync(enrollment.Id, ct);
        return await GetStudentAsync(student.Id, ct);
    }

    public async Task<StudentDto> EndEnrollmentAsync(Guid enrollmentId, EndEnrollmentRequest request, CancellationToken ct)
    {
        if (request.Status == EnrollmentStatus.Active) throw new AppValidationException(nameof(request.Status));
        var enrollment = await db.Enrollments.SingleOrDefaultAsync(x => x.Id == enrollmentId, ct)
            ?? throw new NotFoundException(nameof(Enrollment));
        enrollment.Status = request.Status;
        enrollment.EndedOn = request.EndedOn ?? DateOnly.FromDateTime(DateTime.UtcNow);
        await db.SaveChangesAsync(ct);
        return await GetStudentAsync(enrollment.StudentId, ct);
    }

    public async Task<IReadOnlyList<StudentAchievementDto>> GetAchievementsAsync(Guid studentId, CancellationToken ct)
    {
        if (!await db.Students.AnyAsync(x => x.Id == studentId, ct)) throw new NotFoundException(nameof(Student));
        return await db.StudentAchievements.AsNoTracking().Where(x => x.StudentId == studentId)
            .OrderByDescending(x => x.EventDate)
            .Select(x => new StudentAchievementDto(x.Id, x.StudentId, x.Title, x.Category, x.Level, x.EventDate,
                x.Note, x.FileName, x.ContentType, x.FileSizeBytes, x.CreatedAt))
            .ToListAsync(ct);
    }

    public async Task<StudentAchievementDto> CreateAchievementAsync(Guid studentId, CreateAchievementRequest request,
        Stream fileStream, string fileName, string contentType, long fileLength, CancellationToken ct)
    {
        RequireText(request.Title, nameof(request.Title));
        var tenantId = RequireTenant();
        if (!await db.Students.AnyAsync(x => x.Id == studentId, ct)) throw new NotFoundException(nameof(Student));
        if (fileLength <= 0) throw new AppValidationException("A certificate file is required.");
        const long hardCapBytes = 20 * 1024 * 1024;
        if (fileLength > hardCapBytes) throw new AppValidationException("That file is too large.");

        using var buffer = new MemoryStream();
        await fileStream.CopyToAsync(buffer, ct);
        var (data, storedContentType) = AchievementFileProcessor.Process(buffer.ToArray(), contentType, fileLength);

        var cleanedFileName = string.IsNullOrWhiteSpace(fileName) ? "certificate" : fileName.Trim();
        // Images are always re-encoded as JPEG, so swap the extension to match the stored bytes.
        if (storedContentType == "image/jpeg")
            cleanedFileName = Path.ChangeExtension(cleanedFileName, ".jpg");

        var achievement = new StudentAchievement
        {
            TenantId = tenantId, StudentId = studentId, Title = request.Title.Trim(), Category = request.Category,
            Level = Clean(request.Level), EventDate = request.EventDate, Note = Clean(request.Note),
            FileName = cleanedFileName, ContentType = storedContentType, FileData = data, FileSizeBytes = data.Length
        };
        db.StudentAchievements.Add(achievement);
        await db.SaveChangesAsync(ct);
        return new StudentAchievementDto(achievement.Id, achievement.StudentId, achievement.Title,
            achievement.Category, achievement.Level, achievement.EventDate, achievement.Note, achievement.FileName,
            achievement.ContentType, achievement.FileSizeBytes, achievement.CreatedAt);
    }

    public async Task DeleteAchievementAsync(Guid studentId, Guid achievementId, CancellationToken ct)
    {
        var achievement = await db.StudentAchievements.SingleOrDefaultAsync(x => x.Id == achievementId && x.StudentId == studentId, ct)
            ?? throw new NotFoundException(nameof(StudentAchievement));
        db.StudentAchievements.Remove(achievement);
        await db.SaveChangesAsync(ct);
    }

    public async Task<(byte[] Data, string ContentType, string FileName)> GetAchievementFileAsync(Guid studentId, Guid achievementId, CancellationToken ct)
    {
        var achievement = await db.StudentAchievements.AsNoTracking()
            .Where(x => x.Id == achievementId && x.StudentId == studentId)
            .Select(x => new { x.FileData, x.ContentType, x.FileName })
            .SingleOrDefaultAsync(ct) ?? throw new NotFoundException(nameof(StudentAchievement));
        return (achievement.FileData, achievement.ContentType, achievement.FileName);
    }

    public async Task<AttendanceLogDto> GetAttendanceAsync(DateOnly date, Guid batchId, CancellationToken ct)
    {
        var batch = await db.Batches.AsNoTracking().SingleOrDefaultAsync(x => x.Id == batchId, ct)
            ?? throw new NotFoundException(nameof(Batch));
        var roster = await db.Enrollments.AsNoTracking().Include(x => x.Student)
            .Where(x => x.BatchId == batchId && x.Status == EnrollmentStatus.Active)
            .OrderBy(x => x.Student.Name).ToListAsync(ct);
        var records = await db.AttendanceRecords.AsNoTracking()
            .Where(x => x.Date == date && x.Enrollment.BatchId == batchId).ToDictionaryAsync(x => x.EnrollmentId, ct);
        var entries = roster.Select(x => new AttendanceRecordDto(x.Id, x.StudentId, x.Student.Name,
            records.TryGetValue(x.Id, out var record) ? record.Status : AttendanceStatus.Present)).ToList();
        return new AttendanceLogDto(date, batchId, batch.Name, entries);
    }

    public async Task<AttendanceLogDto> SubmitAttendanceAsync(SubmitAttendanceRequest request, CancellationToken ct)
    {
        if (request.Entries.Count == 0) throw new AppValidationException(nameof(request.Entries));
        var ids = request.Entries.Select(x => x.EnrollmentId).ToList();
        if (ids.Distinct().Count() != ids.Count) throw new AppValidationException(nameof(request.Entries));
        var validCount = await db.Enrollments.CountAsync(x => ids.Contains(x.Id)
            && x.BatchId == request.BatchId && x.Status == EnrollmentStatus.Active, ct);
        if (validCount != ids.Count) throw new AppValidationException(nameof(request.BatchId));
        var existing = await db.AttendanceRecords.Where(x => x.Date == request.Date
            && ids.Contains(x.EnrollmentId)).ToDictionaryAsync(x => x.EnrollmentId, ct);
        foreach (var entry in request.Entries)
        {
            if (existing.TryGetValue(entry.EnrollmentId, out var record))
            {
                record.Status = entry.Status;
                record.SubmittedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                db.AttendanceRecords.Add(new AttendanceRecord
                {
                    TenantId = RequireTenant(), Date = request.Date, EnrollmentId = entry.EnrollmentId, Status = entry.Status
                });
            }
        }
        await db.SaveChangesAsync(ct);
        return await GetAttendanceAsync(request.Date, request.BatchId, ct);
    }

    public async Task<DashboardDto> GetDashboardAsync(DateOnly date, CancellationToken ct)
    {
        await dueGenerator.EnsureForTenantAsync(ct);
        var from = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var to = from.AddDays(1);
        var students = await db.Students.CountAsync(x => x.IsActive, ct);
        var batchCount = await db.Batches.CountAsync(x => x.IsActive, ct);
        var activeStudentIds = await db.Students.Where(x => x.IsActive).Select(x => x.Id).ToListAsync(ct);
        var outstanding = (await balances.ByStudentAsync(activeStudentIds, ct)).Values.Sum();
        var collected = await db.Transactions.Where(x => x.Type == TransactionType.Income
            && x.OccurredAt >= from && x.OccurredAt < to).SumAsync(x => x.Amount, ct);
        var attendance = await db.AttendanceRecords.Where(x => x.Date == date).ToListAsync(ct);
        var percentage = attendance.Count == 0 ? 0 : Math.Round((decimal)attendance.Count(x =>
            x.Status == AttendanceStatus.Present) / attendance.Count * 100, 1);
        return new DashboardDto(students, batchCount, outstanding, collected, percentage);
    }

    public async Task<SettingsDto> GetSettingsAsync(CancellationToken ct)
    {
        var settings = await db.OrganizationSettings.SingleOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = OrganizationSettingsDefaults.Create(RequireTenant());
            db.OrganizationSettings.Add(settings);
            await db.SaveChangesAsync(ct);
        }
        return MapSettings(settings);
    }

    public async Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken ct)
    {
        ValidateSettings(request);
        var settings = await db.OrganizationSettings.SingleOrDefaultAsync(ct) ?? OrganizationSettingsDefaults.Create(RequireTenant());
        if (db.Entry(settings).State == EntityState.Detached) db.OrganizationSettings.Add(settings);
        ApplySettings(settings, request);
        await db.SaveChangesAsync(ct);
        return MapSettings(settings);
    }

    private async Task<BatchDto> GetBatchAsync(Guid id, CancellationToken ct)
    {
        var batch = await BatchQuery().SingleAsync(x => x.Id == id, ct);
        return MapBatch(batch);
    }

    private IQueryable<Batch> BatchQuery() => db.Batches.AsNoTracking()
        .Include(x => x.Course).Include(x => x.Staff).Include(x => x.Enrollments);

    private static BatchDto MapBatch(Batch x) => new(x.Id, x.Name, x.CourseId, x.Course.Name, x.StaffId, x.Staff.Name,
        FromBatchDays(x.Days), x.StartTime, x.EndTime, x.StartDate, x.EndDate, x.IsActive,
        x.Enrollments.Count(e => e.Status == EnrollmentStatus.Active));

    private static IReadOnlyList<DayOfWeek> FromBatchDays(BatchDays days)
    {
        var list = new List<DayOfWeek>();
        if (days.HasFlag(BatchDays.Monday)) list.Add(DayOfWeek.Monday);
        if (days.HasFlag(BatchDays.Tuesday)) list.Add(DayOfWeek.Tuesday);
        if (days.HasFlag(BatchDays.Wednesday)) list.Add(DayOfWeek.Wednesday);
        if (days.HasFlag(BatchDays.Thursday)) list.Add(DayOfWeek.Thursday);
        if (days.HasFlag(BatchDays.Friday)) list.Add(DayOfWeek.Friday);
        if (days.HasFlag(BatchDays.Saturday)) list.Add(DayOfWeek.Saturday);
        if (days.HasFlag(BatchDays.Sunday)) list.Add(DayOfWeek.Sunday);
        return list;
    }

    private IQueryable<Student> StudentQuery() => db.Students.AsNoTracking()
        .Include(x => x.Enrollments).ThenInclude(x => x.Batch).ThenInclude(x => x.Course)
        .Include(x => x.Enrollments).ThenInclude(x => x.AttendanceRecords);

    private async Task<IReadOnlyList<StudentDto>> MapStudentsAsync(IReadOnlyList<Student> students, CancellationToken ct)
    {
        var studentIds = students.Select(x => x.Id).ToList();
        var enrollmentIds = students.SelectMany(x => x.Enrollments).Select(x => x.Id).ToList();
        var studentBalances = await balances.ByStudentAsync(studentIds, ct);
        var enrollmentBalances = await balances.ByEnrollmentAsync(enrollmentIds, ct);
        var achievementCounts = await AchievementCountsAsync(studentIds, ct);
        return students.Select(student =>
        {
            var records = student.Enrollments.SelectMany(x => x.AttendanceRecords).ToList();
            var attendancePercentage = records.Count == 0 ? 0
                : Math.Round((decimal)records.Count(x => x.Status == AttendanceStatus.Present) / records.Count * 100, 1);
            var enrollments = student.Enrollments.OrderByDescending(x => x.EnrolledOn)
                .Select(enrollment => new EnrollmentSummaryDto(enrollment.Id, enrollment.BatchId, enrollment.Batch.Name,
                    enrollment.CourseId, enrollment.Batch.Course.Name, enrollment.EnrolledOn, enrollment.EndedOn,
                    enrollment.Status, enrollmentBalances.GetValueOrDefault(enrollment.Id)))
                .ToList();
            var (wonCount, participatedCount) = achievementCounts.GetValueOrDefault(student.Id);
            return new StudentDto(student.Id, student.StudentNumber, student.Name, student.DateOfBirth,
                student.ParentName, student.Address, student.Phone, student.Email, student.JoinDate, student.IsActive,
                studentBalances.GetValueOrDefault(student.Id), attendancePercentage, wonCount, participatedCount, enrollments);
        }).ToList();
    }

    private async Task<Dictionary<Guid, (int Won, int Participated)>> AchievementCountsAsync(
        IReadOnlyCollection<Guid> studentIds, CancellationToken ct)
    {
        if (studentIds.Count == 0) return [];
        var rows = await db.StudentAchievements.Where(x => studentIds.Contains(x.StudentId))
            .GroupBy(x => new { x.StudentId, x.Category })
            .Select(g => new { g.Key.StudentId, g.Key.Category, Count = g.Count() })
            .ToListAsync(ct);
        var result = new Dictionary<Guid, (int Won, int Participated)>();
        foreach (var row in rows)
        {
            var current = result.GetValueOrDefault(row.StudentId);
            result[row.StudentId] = row.Category switch
            {
                AchievementCategory.Won => (current.Won + row.Count, current.Participated),
                AchievementCategory.Participated => (current.Won, current.Participated + row.Count),
                _ => current
            };
        }
        return result;
    }

    private static SettingsDto MapSettings(OrganizationSettings x) =>
        new(x.Id, x.Name, x.Type, x.LogoUrl, x.ThemeColor, x.DarkMode, x.Currency, x.Locale, x.TimeZone,
            x.ReceiptPrefix, x.ReceiptAddress, x.ReceiptPhone, x.ReceiptEmail, x.ReceiptFooter,
            x.ReceiptShowLogo, x.ReceiptShowSignature, x.ReceiptAutoOpen,
            ParseCategories(x.IncomeCategoriesJson, ["Student Fees", "Registration", "Events", "Other Income"]),
            ParseCategories(x.ExpenseCategoriesJson, ["Rent & Operations", "Instructor Salary", "Equipment", "Utilities", "Marketing", "Other Expense", "Refund"]),
            x.NotificationsEnabled, x.FeeReminderNotifications, x.PaymentNotifications, x.AttendanceNotifications);

    private static void ApplySettings(OrganizationSettings x, UpdateSettingsRequest request)
    {
        x.Name = request.Name.Trim();
        x.Type = request.Type.Trim();
        x.LogoUrl = Clean(request.LogoUrl);
        x.ThemeColor = request.ThemeColor.Trim().ToLowerInvariant();
        x.DarkMode = request.DarkMode;
        x.Currency = request.Currency.Trim().ToUpperInvariant();
        x.Locale = request.Locale.Trim();
        x.TimeZone = request.TimeZone.Trim();
        x.ReceiptPrefix = request.ReceiptPrefix.Trim().ToUpperInvariant();
        x.ReceiptAddress = Clean(request.ReceiptAddress);
        x.ReceiptPhone = Clean(request.ReceiptPhone);
        x.ReceiptEmail = Clean(request.ReceiptEmail);
        x.ReceiptFooter = request.ReceiptFooter.Trim();
        x.ReceiptShowLogo = request.ReceiptShowLogo;
        x.ReceiptShowSignature = request.ReceiptShowSignature;
        x.ReceiptAutoOpen = request.ReceiptAutoOpen;
        x.IncomeCategoriesJson = SerializeCategories(request.IncomeCategories);
        x.ExpenseCategoriesJson = SerializeCategories(request.ExpenseCategories);
        x.NotificationsEnabled = request.NotificationsEnabled;
        x.FeeReminderNotifications = request.FeeReminderNotifications;
        x.PaymentNotifications = request.PaymentNotifications;
        x.AttendanceNotifications = request.AttendanceNotifications;
    }

    private async Task ValidateBatchAsync(string name, Guid courseId, Guid staffId, IReadOnlyList<DayOfWeek> days,
        TimeOnly startTime, TimeOnly endTime, DateOnly startDate, DateOnly? endDate, CancellationToken ct, Guid? excludingId = null)
    {
        RequireText(name, nameof(name));
        if (days.Count == 0) throw new AppValidationException(nameof(days));
        if (startTime >= endTime) throw new AppValidationException(nameof(endTime));
        if (endDate.HasValue && endDate.Value < startDate) throw new AppValidationException(nameof(endDate));
        if (!await db.Courses.AnyAsync(x => x.Id == courseId && x.IsActive, ct)) throw new AppValidationException(nameof(courseId));
        if (!await db.Staff.AnyAsync(x => x.Id == staffId && x.IsActive, ct)) throw new AppValidationException(nameof(staffId));
        var duplicate = await db.Batches.AnyAsync(x => x.CourseId == courseId
            && x.Name.ToLower() == name.Trim().ToLower() && x.Id != (excludingId ?? Guid.Empty), ct);
        if (duplicate) throw new ConflictException("A batch with this name already exists for the course.");
    }

    private static BatchDays ToBatchDays(IReadOnlyList<DayOfWeek> days)
    {
        var result = BatchDays.None;
        foreach (var day in days)
            result |= day switch
            {
                DayOfWeek.Monday => BatchDays.Monday, DayOfWeek.Tuesday => BatchDays.Tuesday,
                DayOfWeek.Wednesday => BatchDays.Wednesday, DayOfWeek.Thursday => BatchDays.Thursday,
                DayOfWeek.Friday => BatchDays.Friday, DayOfWeek.Saturday => BatchDays.Saturday,
                DayOfWeek.Sunday => BatchDays.Sunday, _ => BatchDays.None
            };
        return result;
    }

    private static void ValidateSettings(UpdateSettingsRequest request)
    {
        RequireText(request.Name, nameof(request.Name));
        RequireText(request.Type, nameof(request.Type));
        RequireText(request.ThemeColor, nameof(request.ThemeColor));
        RequireText(request.Currency, nameof(request.Currency));
        RequireText(request.Locale, nameof(request.Locale));
        RequireText(request.TimeZone, nameof(request.TimeZone));
        RequireText(request.ReceiptPrefix, nameof(request.ReceiptPrefix));
        RequireText(request.ReceiptFooter, nameof(request.ReceiptFooter));
        if (request.Currency.Trim().Length != 3) throw new AppValidationException(nameof(request.Currency));
        if (request.ReceiptPrefix.Trim().Length > 16) throw new AppValidationException(nameof(request.ReceiptPrefix));
        ValidateCategories(request.IncomeCategories, nameof(request.IncomeCategories));
        ValidateCategories(request.ExpenseCategories, nameof(request.ExpenseCategories));
    }

    private static void RequireText(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new AppValidationException(field);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static IReadOnlyList<string> ParseCategories(string json, IReadOnlyList<string> fallback)
    {
        try
        {
            var values = JsonSerializer.Deserialize<List<string>>(json);
            return values is { Count: > 0 } ? values : fallback;
        }
        catch (JsonException) { return fallback; }
    }

    private static string SerializeCategories(IReadOnlyList<string> categories) =>
        JsonSerializer.Serialize(categories.Select(x => x.Trim()).Where(x => x.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase).ToList());

    private static void ValidateCategories(IReadOnlyList<string> categories, string field)
    {
        if (categories.Count is < 1 or > 20 || categories.Any(x => string.IsNullOrWhiteSpace(x) || x.Trim().Length > 80))
            throw new AppValidationException(field);
    }

    private Guid RequireTenant() => tenantContext.TenantId ?? throw new AppValidationException("A tenant context is required.");
}
