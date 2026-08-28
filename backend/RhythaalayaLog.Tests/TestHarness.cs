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

    public TestHarness(LateEnrollmentBillingPolicy policy = LateEnrollmentBillingPolicy.Skip, int leadDays = 7)
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
        Course = new Course { TenantId = TenantId, Name = "Bharatanatyam" };
        var staff = new Staff { TenantId = TenantId, Name = "Guru" };
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

    public FeeStructure AddStructure(decimal amount, FeeFrequency frequency, DateOnly effectiveFrom, DateOnly? effectiveTo = null)
    {
        var structure = new FeeStructure
        {
            TenantId = TenantId, CourseId = Course.Id, Name = $"Fee {amount}", Amount = amount,
            Frequency = frequency, EffectiveFrom = effectiveFrom, EffectiveTo = effectiveTo
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

    public Enrollment Enroll(DateOnly enrolledOn)
    {
        var enrollment = new Enrollment
        {
            TenantId = TenantId, StudentId = Student.Id, BatchId = Batch.Id, CourseId = Course.Id,
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
