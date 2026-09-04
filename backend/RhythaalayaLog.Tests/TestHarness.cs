using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;

namespace RhythaalayaLog.Tests;

/// <summary>
/// EF InMemory-backed harness with one tenant, course, batch, and student seeded. Transactions
/// are no-ops on InMemory (warning suppressed) and locking uses NoOpRowLocker: the concurrency
/// protections themselves (FOR UPDATE, advisory locks, filtered unique index) only run on real
/// PostgreSQL and are intentionally out of scope here.
/// </summary>
public sealed class TestHarness : IDisposable
{
    public AppDbContext Db { get; }
    public FinanceService Finance { get; }
    public FeeDueGenerator Generator { get; }
    public Guid TenantId { get; } = Guid.NewGuid();
    public Guid UserId { get; } = Guid.NewGuid();
    public Course Course { get; }
    public Batch Batch { get; }
    public Student Student { get; }
    public OrganizationSettings Settings { get; }

    public static readonly DateOnly Today = BillingSchedule.TodayInTimeZone("Asia/Kolkata");

    public TestHarness(LateEnrollmentBillingPolicy policy = LateEnrollmentBillingPolicy.Skip, int leadDays = 7,
        int? courseNoticeDays = null)
    {
        var tenantContext = new FixedTenantContext { TenantId = TenantId, UserId = UserId, Role = UserRole.TenantAdmin };
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        Db = new AppDbContext(options, tenantContext);
        Generator = new FeeDueGenerator(Db);
        Finance = new FinanceService(Db, tenantContext, Generator, new NoOpRowLocker());

        Settings = new OrganizationSettings
        {
            Id = Guid.NewGuid(), TenantId = TenantId, Name = "Test Academy", Type = "Dance",
            FeeDueLeadDays = leadDays, LateEnrollmentBillingPolicy = policy
        };
        Course = new Course { TenantId = TenantId, Name = "Bharatanatyam", UpcomingNotificationDays = courseNoticeDays };
        var staff = new Staff { TenantId = TenantId, Name = "Guru" };
        _staff = staff;
        Batch = new Batch
        {
            TenantId = TenantId, Name = "Morning", Course = Course, Staff = staff,
            Days = BatchDays.Monday, StartTime = new TimeOnly(6, 0), EndTime = new TimeOnly(7, 0),
            StartDate = Today.AddYears(-1)
        };
        Student = new Student { TenantId = TenantId, StudentNumber = "S-001", Name = "Meera", JoinDate = Today.AddYears(-1) };
        Db.AddRange(Settings, Course, staff, Batch, Student);
        Db.SaveChanges();
    }

    private readonly Staff _staff;
    private readonly Dictionary<Guid, Batch> _batchByCourse = [];

    /// <summary>A second course (with its own batch) so tests can mix notice windows in one generator run.</summary>
    public Course AddCourse(string name, int? noticeDays)
    {
        var course = new Course { TenantId = TenantId, Name = name, UpcomingNotificationDays = noticeDays };
        var batch = new Batch
        {
            TenantId = TenantId, Name = $"{name} batch", Course = course, Staff = _staff,
            Days = BatchDays.Tuesday, StartTime = new TimeOnly(7, 0), EndTime = new TimeOnly(8, 0),
            StartDate = Today.AddYears(-1)
        };
        Db.AddRange(course, batch);
        Db.SaveChanges();
        _batchByCourse[course.Id] = batch;
        return course;
    }

    public FeeHead AddFeeHead(string name)
    {
        var head = new FeeHead { TenantId = TenantId, Name = name, DisplayOrder = 0 };
        Db.FeeHeads.Add(head);
        Db.SaveChanges();
        return head;
    }

    public FixedTenantContext TenantContext => new() { TenantId = TenantId, UserId = UserId, Role = UserRole.TenantAdmin };
    public AcademyService Academy => new(Db, TenantContext, Generator, new FeeBalanceCalculator(Db));
    public FinanceReportingService Reporting => new(Db, Generator, new FeeBalanceCalculator(Db));
    public StudentLedgerService Ledger => new(Db, Generator, new FeeBalanceCalculator(Db));

    public FeeStructure AddStructure(decimal amount, FeeFrequency frequency, DateOnly effectiveFrom, DateOnly? effectiveTo = null,
        Course? course = null, Guid? feeHeadId = null, string? name = null)
    {
        var structure = new FeeStructure
        {
            TenantId = TenantId, CourseId = (course ?? Course).Id, Name = name ?? $"Fee {amount}", Amount = amount,
            Frequency = frequency, EffectiveFrom = effectiveFrom, EffectiveTo = effectiveTo, FeeHeadId = feeHeadId
        };
        Db.FeeStructures.Add(structure);
        Db.SaveChanges();
        return structure;
    }

    public void SetConcession(decimal percent, string reason)
    {
        Student.ConcessionPercent = percent;
        Student.ConcessionReason = reason;
        Db.SaveChanges();
    }

    public Enrollment Enroll(DateOnly enrolledOn, Course? course = null)
    {
        var batch = course is null ? Batch : _batchByCourse[course.Id];
        var enrollment = new Enrollment
        {
            TenantId = TenantId, StudentId = Student.Id, BatchId = batch.Id, CourseId = batch.CourseId,
            EnrolledOn = enrolledOn
        };
        Db.Enrollments.Add(enrollment);
        Db.SaveChanges();
        return enrollment;
    }

    public List<FeeDue> DuesFor(Guid enrollmentId) =>
        Db.FeeDues.AsNoTracking().Where(x => x.EnrollmentId == enrollmentId).OrderBy(x => x.DueDate).ToList();

    public void Dispose() => Db.Dispose();
}
