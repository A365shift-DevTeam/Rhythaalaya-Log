using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AcademyService(AppDbContext db, ITenantContext tenantContext) : IAcademyService
{
    public async Task<IReadOnlyList<BatchDto>> GetBatchesAsync(CancellationToken ct) =>
        await db.Batches.AsNoTracking().OrderBy(x => x.Name)
            .Select(x => new BatchDto(x.Id, x.Name, x.Course, x.Schedule, x.Instructor,
                x.MonthlyFee, x.IsActive, x.Students.Count(s => s.IsActive)))
            .ToListAsync(ct);

    public async Task<BatchDto> CreateBatchAsync(CreateBatchRequest request, CancellationToken ct)
    {
        ValidateBatch(request);
        var batch = new Batch
        {
            TenantId = RequireTenant(),
            Name = request.Name.Trim(),
            Course = request.Course.Trim(),
            Schedule = request.Schedule.Trim(),
            Instructor = request.Instructor.Trim(),
            MonthlyFee = request.MonthlyFee
        };
        db.Batches.Add(batch);
        await db.SaveChangesAsync(ct);
        return new BatchDto(batch.Id, batch.Name, batch.Course, batch.Schedule, batch.Instructor,
            batch.MonthlyFee, true, 0);
    }

    public async Task<IReadOnlyList<StudentDto>> GetStudentsAsync(string? search, Guid? batchId,
        bool includeInactive, CancellationToken ct)
    {
        var query = StudentQuery();
        if (!includeInactive) query = query.Where(x => x.IsActive);
        if (batchId.HasValue) query = query.Where(x => x.BatchId == batchId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(term)
                || x.StudentNumber.ToLower().Contains(term));
        }
        var students = await query.OrderBy(x => x.Name).ToListAsync(ct);
        return students.Select(MapStudent).ToList();
    }

    public async Task<StudentDto> GetStudentAsync(Guid id, CancellationToken ct)
    {
        var student = await StudentQuery().SingleOrDefaultAsync(x => x.Id == id, ct);
        if (student is null) throw new NotFoundException(nameof(Student));
        return MapStudent(student);
    }

    public async Task<StudentDto> CreateStudentAsync(CreateStudentRequest request, CancellationToken ct)
    {
        ValidateStudent(request.Name, request.MonthlyFee, request.DiscountAmount, request.OpeningBalance);
        var tenantId = RequireTenant();
        var now = DateTimeOffset.UtcNow;
        var subscription = await db.TenantSubscriptions.AsNoTracking().Include(x => x.Plan)
            .Where(x => x.TenantId == tenantId
                && (x.Status == SubscriptionStatus.Active || x.Status == SubscriptionStatus.Trial)
                && x.StartsAt <= now && x.EndsAt > now)
            .OrderByDescending(x => x.EndsAt)
            .FirstOrDefaultAsync(ct)
            ?? throw new ConflictException("The academy has no active subscription.");
        var activeStudents = await db.Students.CountAsync(x => x.IsActive, ct);
        if (activeStudents >= subscription.Plan.MaxStudents)
            throw new ConflictException("Subscription student limit reached.");
        var batch = await db.Batches.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.BatchId && x.IsActive, ct);
        if (batch is null)
            throw new AppValidationException(nameof(request.BatchId));
        if (request.MonthlyFee + request.DiscountAmount != batch.MonthlyFee)
            throw new AppValidationException("The student fee and discount must match the selected batch fee.");
        var student = NewStudent(request);
        db.Students.Add(student);
        await db.SaveChangesAsync(ct);
        return await GetStudentAsync(student.Id, ct);
    }

    public async Task<StudentDto> UpdateStudentAsync(Guid id, UpdateStudentRequest request, CancellationToken ct)
    {
        ValidateStudent(request.Name, request.MonthlyFee, request.DiscountAmount, request.OutstandingBalance);
        var student = await db.Students.FindAsync([id], ct);
        if (student is null) throw new NotFoundException(nameof(Student));
        if (!await db.Batches.AnyAsync(x => x.Id == request.BatchId && x.IsActive, ct))
            throw new AppValidationException(nameof(request.BatchId));
        student.Name = request.Name.Trim();
        student.BatchId = request.BatchId;
        student.MonthlyFee = request.MonthlyFee;
        student.DiscountAmount = request.DiscountAmount;
        student.OutstandingBalance = request.OutstandingBalance;
        student.Phone = Clean(request.Phone);
        student.Email = Clean(request.Email);
        student.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return await GetStudentAsync(id, ct);
    }

    public async Task ArchiveStudentAsync(Guid id, CancellationToken ct)
    {
        var student = await db.Students.FindAsync([id], ct);
        if (student is null) throw new NotFoundException(nameof(Student));
        student.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task<AttendanceLogDto> GetAttendanceAsync(DateOnly date, Guid batchId, CancellationToken ct)
    {
        var batch = await db.Batches.AsNoTracking().SingleOrDefaultAsync(x => x.Id == batchId, ct);
        if (batch is null) throw new NotFoundException(nameof(Batch));
        var students = await db.Students.AsNoTracking()
            .Where(x => x.BatchId == batchId && x.IsActive).OrderBy(x => x.Name).ToListAsync(ct);
        var records = await db.AttendanceRecords.AsNoTracking()
            .Where(x => x.BatchId == batchId && x.Date == date).ToDictionaryAsync(x => x.StudentId, ct);
        var entries = students.Select(x => new AttendanceRecordDto(x.Id, x.Name,
            records.TryGetValue(x.Id, out var record) ? record.Status : AttendanceStatus.Present)).ToList();
        return new AttendanceLogDto(date, batchId, batch.Name, entries);
    }

    public async Task<AttendanceLogDto> SubmitAttendanceAsync(SubmitAttendanceRequest request, CancellationToken ct)
    {
        if (request.Entries.Count == 0) throw new AppValidationException(nameof(request.Entries));
        var ids = request.Entries.Select(x => x.StudentId).ToList();
        if (ids.Distinct().Count() != ids.Count) throw new AppValidationException(nameof(request.Entries));
        var validCount = await db.Students.CountAsync(x => ids.Contains(x.Id)
            && x.BatchId == request.BatchId && x.IsActive, ct);
        if (validCount != ids.Count) throw new AppValidationException(nameof(request.BatchId));
        var existing = await db.AttendanceRecords.Where(x => x.Date == request.Date
            && x.BatchId == request.BatchId && ids.Contains(x.StudentId)).ToDictionaryAsync(x => x.StudentId, ct);
        foreach (var entry in request.Entries)
        {
            if (existing.TryGetValue(entry.StudentId, out var record))
            {
                record.Status = entry.Status;
                record.SubmittedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                db.AttendanceRecords.Add(new AttendanceRecord
                {
                    TenantId = RequireTenant(),
                    Date = request.Date, BatchId = request.BatchId,
                    StudentId = entry.StudentId, Status = entry.Status
                });
            }
        }
        await db.SaveChangesAsync(ct);
        return await GetAttendanceAsync(request.Date, request.BatchId, ct);
    }

    public async Task<PaymentDto> RecordPaymentAsync(RecordPaymentRequest request, CancellationToken ct)
    {
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var student = await db.Students.SingleOrDefaultAsync(x => x.Id == request.StudentId && x.IsActive, ct);
        if (student is null) throw new NotFoundException(nameof(Student));
        if (student.OutstandingBalance <= 0)
            throw new ConflictException("The student has no outstanding fee balance.");
        if (request.Amount > student.OutstandingBalance)
            throw new AppValidationException("Payment cannot exceed the outstanding balance.");
        var occurredAt = (request.OccurredAt ?? DateTimeOffset.UtcNow).ToUniversalTime();
        var payment = new Payment
        {
            TenantId = RequireTenant(),
            StudentId = student.Id, Amount = request.Amount, Method = request.Method,
            Reference = Clean(request.Reference), OccurredAt = occurredAt
        };
        payment.Transaction = new FinancialTransaction
        {
            TenantId = RequireTenant(),
            Title = string.Concat(nameof(Payment), ' ', student.Name), Type = TransactionType.Income,
            Amount = request.Amount, Category = nameof(Payment), OccurredAt = payment.OccurredAt,
            Payment = payment
        };
        student.OutstandingBalance -= request.Amount;
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);
        return new PaymentDto(payment.Id, payment.StudentId, payment.Amount, payment.Method,
            payment.Reference, payment.OccurredAt);
    }

    public async Task<FinanceSummaryDto> GetFinanceAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct)
    {
        if (from >= to) throw new AppValidationException(nameof(from));
        from = from.ToUniversalTime();
        to = to.ToUniversalTime();
        var items = await db.Transactions.AsNoTracking()
            .Where(x => x.OccurredAt >= from && x.OccurredAt < to)
            .OrderByDescending(x => x.OccurredAt).ToListAsync(ct);
        var income = items.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount);
        var expenses = items.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount);
        return new FinanceSummaryDto(from, to, income, expenses, income - expenses,
            items.Select(MapTransaction).ToList());
    }

    public async Task<TransactionDto> CreateTransactionAsync(CreateTransactionRequest request, CancellationToken ct)
    {
        RequireText(request.Title, nameof(request.Title));
        RequireText(request.Category, nameof(request.Category));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var item = new FinancialTransaction
        {
            TenantId = RequireTenant(),
            Title = request.Title.Trim(), Type = request.Type, Amount = request.Amount,
            Category = request.Category.Trim(),
            OccurredAt = (request.OccurredAt ?? DateTimeOffset.UtcNow).ToUniversalTime()
        };
        db.Transactions.Add(item);
        await db.SaveChangesAsync(ct);
        return MapTransaction(item);
    }

    public async Task<DashboardDto> GetDashboardAsync(DateOnly date, CancellationToken ct)
    {
        var from = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
        var to = from.AddDays(1);
        var students = await db.Students.CountAsync(x => x.IsActive, ct);
        var batches = await db.Batches.CountAsync(x => x.IsActive, ct);
        var outstanding = await db.Students.Where(x => x.IsActive).SumAsync(x => x.OutstandingBalance, ct);
        var collected = await db.Transactions.Where(x => x.Type == TransactionType.Income
            && x.OccurredAt >= from && x.OccurredAt < to).SumAsync(x => x.Amount, ct);
        var attendance = await db.AttendanceRecords.Where(x => x.Date == date).ToListAsync(ct);
        var percentage = attendance.Count == 0 ? 0 : Math.Round((decimal)attendance.Count(x =>
            x.Status == AttendanceStatus.Present) / attendance.Count * 100, 1);
        return new DashboardDto(students, batches, outstanding, collected, percentage);
    }

    public async Task<SettingsDto> GetSettingsAsync(CancellationToken ct)
    {
        var settings = await db.OrganizationSettings.SingleOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = DefaultSettings(RequireTenant());
            db.OrganizationSettings.Add(settings);
            await db.SaveChangesAsync(ct);
        }
        return MapSettings(settings);
    }

    public async Task<SettingsDto> UpdateSettingsAsync(UpdateSettingsRequest request, CancellationToken ct)
    {
        ValidateSettings(request);
        var settings = await db.OrganizationSettings.SingleOrDefaultAsync(ct) ?? DefaultSettings(RequireTenant());
        if (db.Entry(settings).State == EntityState.Detached) db.OrganizationSettings.Add(settings);
        ApplySettings(settings, request);
        await db.SaveChangesAsync(ct);
        return MapSettings(settings);
    }

    private IQueryable<Student> StudentQuery() => db.Students.AsNoTracking()
        .Include(x => x.Batch).Include(x => x.AttendanceRecords);

    private static StudentDto MapStudent(Student student)
    {
        var total = student.AttendanceRecords.Count;
        var present = student.AttendanceRecords.Count(x => x.Status == AttendanceStatus.Present);
        var percentage = total == 0 ? 0 : Math.Round((decimal)present / total * 100, 1);
        return new StudentDto(student.Id, student.StudentNumber, student.Name, student.BatchId,
            student.Batch.Name, student.Batch.Course, student.MonthlyFee, student.DiscountAmount, student.OutstandingBalance,
            student.OutstandingBalance > 0 ? "Pending" : "Paid", percentage, student.Phone,
            student.Email, student.JoinDate, student.IsActive);
    }

    private Student NewStudent(CreateStudentRequest request) => new()
    {
        TenantId = RequireTenant(),
        StudentNumber = string.Concat(nameof(Student)[..3].ToUpperInvariant(), DateTime.UtcNow.Year,
            Guid.NewGuid().ToString()[..8]),
        Name = request.Name.Trim(),
        BatchId = request.BatchId,
        MonthlyFee = request.MonthlyFee,
        DiscountAmount = request.DiscountAmount,
        OutstandingBalance = request.OpeningBalance,
        Phone = Clean(request.Phone),
        Email = Clean(request.Email),
        JoinDate = request.JoinDate ?? DateOnly.FromDateTime(DateTime.UtcNow)
    };

    private static TransactionDto MapTransaction(FinancialTransaction item) =>
        new(item.Id, item.Title, item.Type, item.Amount, item.Category, item.OccurredAt, item.PaymentId);

    private static OrganizationSettings DefaultSettings(Guid tenantId) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Name = "Rhythaalaya Academy",
        Type = "Dance and Arts Academy",
        ThemeColor = "emerald",
        DefaultMonthlyFee = 1500,
        FeeDueDay = 5,
        Currency = "INR",
        Locale = "en-IN",
        TimeZone = "Asia/Kolkata"
    };

    private static SettingsDto MapSettings(OrganizationSettings x) =>
        new(x.Id, x.Name, x.Type, x.LogoUrl, x.ThemeColor, x.DarkMode, x.DefaultMonthlyFee,
            x.FeeDueDay, x.Currency, x.Locale, x.TimeZone);

    private static void ApplySettings(OrganizationSettings x, UpdateSettingsRequest request)
    {
        x.Name = request.Name.Trim();
        x.Type = request.Type.Trim();
        x.LogoUrl = Clean(request.LogoUrl);
        x.ThemeColor = request.ThemeColor.Trim().ToLowerInvariant();
        x.DarkMode = request.DarkMode;
        x.DefaultMonthlyFee = request.DefaultMonthlyFee;
        x.FeeDueDay = request.FeeDueDay;
        x.Currency = request.Currency.Trim().ToUpperInvariant();
        x.Locale = request.Locale.Trim();
        x.TimeZone = request.TimeZone.Trim();
    }

    private static void ValidateBatch(CreateBatchRequest request)
    {
        RequireText(request.Name, nameof(request.Name));
        RequireText(request.Course, nameof(request.Course));
        RequireText(request.Schedule, nameof(request.Schedule));
        RequireText(request.Instructor, nameof(request.Instructor));
        if (request.MonthlyFee <= 0) throw new AppValidationException(nameof(request.MonthlyFee));
    }

    private static void ValidateStudent(string name, decimal monthlyFee, decimal discountAmount, decimal balance)
    {
        RequireText(name, nameof(name));
        if (monthlyFee < 0) throw new AppValidationException(nameof(monthlyFee));
        if (discountAmount < 0) throw new AppValidationException(nameof(discountAmount));
        if (balance < 0) throw new AppValidationException(nameof(balance));
    }

    private static void ValidateSettings(UpdateSettingsRequest request)
    {
        RequireText(request.Name, nameof(request.Name));
        RequireText(request.Type, nameof(request.Type));
        RequireText(request.ThemeColor, nameof(request.ThemeColor));
        RequireText(request.Currency, nameof(request.Currency));
        RequireText(request.Locale, nameof(request.Locale));
        RequireText(request.TimeZone, nameof(request.TimeZone));
        if (request.DefaultMonthlyFee <= 0) throw new AppValidationException(nameof(request.DefaultMonthlyFee));
        if (request.FeeDueDay is < 1 or > 28) throw new AppValidationException(nameof(request.FeeDueDay));
        if (request.Currency.Trim().Length != 3) throw new AppValidationException(nameof(request.Currency));
    }

    private static void RequireText(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new AppValidationException(field);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private Guid RequireTenant() => tenantContext.TenantId
        ?? throw new AppValidationException("A tenant context is required.");
}
