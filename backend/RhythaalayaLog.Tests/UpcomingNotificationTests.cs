using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

/// <summary>
/// Per-course "Upcoming fee notice": a due is generated as Upcoming once today is within the
/// course's notice window (1–30 days) before its due date; null falls back to the academy-wide
/// FeeDueLeadDays. UpcomingAmount is informational and never leaks into OutstandingBalance.
/// </summary>
public sealed class UpcomingNotificationTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db,
        new FixedTenantContext { TenantId = h.TenantId, UserId = h.UserId, Role = UserRole.TenantAdmin },
        h.Generator, new FeeBalanceCalculator(h.Db));

    /// <summary>A monthly plan whose next due lands exactly <paramref name="daysAhead"/> days from today.</summary>
    private static void PlanDueIn(TestHarness h, int daysAhead, Course? course = null) =>
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(daysAhead), course: course);

    // --- Generator: notice window resolution ---------------------------------------------------

    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    [InlineData(30)]
    public async Task DueInsideNoticeWindow_IsGeneratedAsUpcoming(int noticeDays)
    {
        using var h = new TestHarness(leadDays: 0, courseNoticeDays: noticeDays);
        PlanDueIn(h, noticeDays); // today = DueDate - noticeDays: first day of the window
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(Today.AddDays(noticeDays), due.DueDate);
        Assert.Equal(FeeDueStatus.Upcoming, due.Status);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(7)]
    [InlineData(30)]
    public async Task DueOneDayBeyondNoticeWindow_IsNotGeneratedYet(int noticeDays)
    {
        using var h = new TestHarness(leadDays: 90, courseNoticeDays: noticeDays); // academy window is wider: course must win
        PlanDueIn(h, noticeDays + 1);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Empty(h.DuesFor(enrollment.Id));
    }

    [Fact]
    public async Task DueToday_IsPendingNotUpcoming()
    {
        using var h = new TestHarness(courseNoticeDays: 7);
        PlanDueIn(h, 0);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Equal(FeeDueStatus.Pending, Assert.Single(h.DuesFor(enrollment.Id)).Status);
    }

    [Fact]
    public async Task NullCourseSetting_FallsBackToAcademyLeadDays()
    {
        using var h = new TestHarness(leadDays: 7, courseNoticeDays: null);
        PlanDueIn(h, 7);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Equal(FeeDueStatus.Upcoming, Assert.Single(h.DuesFor(enrollment.Id)).Status);

        using var wider = new TestHarness(leadDays: 7, courseNoticeDays: null);
        PlanDueIn(wider, 8);
        var later = wider.Enroll(Today);
        await wider.Generator.EnsureForStudentAsync(wider.Student.Id, default);
        Assert.Empty(wider.DuesFor(later.Id));
    }

    [Fact]
    public async Task CourseSetting_OverridesAcademyLeadDays()
    {
        using var h = new TestHarness(leadDays: 7, courseNoticeDays: 15);
        PlanDueIn(h, 12); // beyond the academy's 7, inside the course's 15
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Equal(FeeDueStatus.Upcoming, Assert.Single(h.DuesFor(enrollment.Id)).Status);
    }

    [Fact]
    public async Task TwoCourses_EachUseTheirOwnNoticeWindow_InOneRun()
    {
        using var h = new TestHarness(leadDays: 7, courseNoticeDays: 5);
        var courseB = h.AddCourse("Kathak", noticeDays: 20);
        PlanDueIn(h, 10);                    // course A (5 days): due in 10 → not yet
        PlanDueIn(h, 10, course: courseB);   // course B (20 days): due in 10 → Upcoming
        var enrollmentA = h.Enroll(Today);
        var enrollmentB = h.Enroll(Today, courseB);

        await h.Generator.EnsureForTenantAsync(default);

        Assert.Empty(h.DuesFor(enrollmentA.Id));
        Assert.Equal(FeeDueStatus.Upcoming, Assert.Single(h.DuesFor(enrollmentB.Id)).Status);
    }

    [Fact]
    public async Task ChangingCourseSetting_LeavesExistingDuesUntouched_AppliesToNextRun()
    {
        using var h = new TestHarness(leadDays: 7, courseNoticeDays: 7);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(5));
        var enrollment = h.Enroll(Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var before = Assert.Single(h.DuesFor(enrollment.Id));

        h.Course.UpcomingNotificationDays = 1; // narrower window than the already-generated due
        h.Db.SaveChanges();
        await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);

        var after = Assert.Single(h.DuesFor(enrollment.Id)); // nothing deleted or rewritten
        Assert.Equal(before.Id, after.Id);
        Assert.Equal(before.DueDate, after.DueDate);
        Assert.Equal(before.NetAmount, after.NetAmount);
        Assert.Equal(FeeDueStatus.Upcoming, after.Status);
    }

    // --- Validation / clamping -------------------------------------------------------------------

    [Theory]
    [InlineData(1, 1)]
    [InlineData(30, 30)]
    [InlineData(0, 1)]
    [InlineData(31, 30)]
    [InlineData(-1, 1)]
    public void ClampUpcomingNotificationDays_KeepsValuesWithin1To30(int input, int expected) =>
        Assert.Equal(expected, AcademyService.ClampUpcomingNotificationDays(input));

    [Fact]
    public void ClampUpcomingNotificationDays_NullStaysNull() =>
        Assert.Null(AcademyService.ClampUpcomingNotificationDays(null));

    [Fact]
    public async Task CreateAndUpdateCourse_PersistClampedNoticeDays()
    {
        using var h = new TestHarness();
        var service = Service(h);

        var created = await service.CreateCourseAsync(new CreateCourseRequest("Veena", null, 45), default);
        Assert.Equal(30, created.UpcomingNotificationDays);

        var updated = await service.UpdateCourseAsync(created.Id, new UpdateCourseRequest("Veena", null, true, 1), default);
        Assert.Equal(1, updated.UpcomingNotificationDays);
        Assert.Equal(1, h.Db.Courses.AsNoTracking().Single(x => x.Id == created.Id).UpcomingNotificationDays);

        var reset = await service.UpdateCourseAsync(created.Id, new UpdateCourseRequest("Veena", null, true, null), default);
        Assert.Null(reset.UpcomingNotificationDays);
    }

    // --- UpcomingAmount ------------------------------------------------------------------------

    private static FeeDue AddDue(TestHarness h, Guid enrollmentId, decimal amount, FeeDueStatus status, int daysFromToday)
    {
        var due = new FeeDue
        {
            TenantId = h.TenantId, StudentId = h.Student.Id, EnrollmentId = enrollmentId,
            DueDate = Today.AddDays(daysFromToday), Amount = amount, DiscountAmount = 0, NetAmount = amount, Status = status,
            Title = "Manual"
        };
        h.Db.FeeDues.Add(due);
        h.Db.SaveChanges();
        return due;
    }

    private static void Pay(TestHarness h, FeeDue due, decimal amount)
    {
        var payment = new FeePayment
        {
            TenantId = h.TenantId, StudentId = h.Student.Id, ReceiptNumber = Guid.NewGuid().ToString("N")[..8],
            Amount = amount, PaymentDate = DateTimeOffset.UtcNow, Method = PaymentMethod.Cash, CollectedByUserId = h.UserId
        };
        h.Db.FeePayments.Add(payment);
        h.Db.FeePaymentAllocations.Add(new FeePaymentAllocation
        {
            TenantId = h.TenantId, FeePayment = payment, FeeDueId = due.Id, Amount = amount
        });
        h.Db.SaveChanges();
    }

    [Fact]
    public async Task UpcomingAmount_ZeroWithoutUpcomingDues()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(0m, student.UpcomingAmount);
    }

    [Fact]
    public async Task UpcomingAmount_SumsUnpaidUpcomingDues()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        AddDue(h, enrollment.Id, 2000m, FeeDueStatus.Upcoming, 3);
        AddDue(h, enrollment.Id, 3000m, FeeDueStatus.Upcoming, 5);

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(5000m, student.UpcomingAmount);
        Assert.Equal(0m, student.OutstandingBalance);
    }

    [Fact]
    public async Task UpcomingAmount_CountsOnlyTheUnpaidRemainder()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var due = AddDue(h, enrollment.Id, 4000m, FeeDueStatus.Upcoming, 3);
        Pay(h, due, 1000m);

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(3000m, student.UpcomingAmount);
    }

    [Fact]
    public async Task UpcomingAmount_FullyPaidUpcomingDue_ContributesZero()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var due = AddDue(h, enrollment.Id, 4000m, FeeDueStatus.Upcoming, 3);
        Pay(h, due, 4000m);

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(0m, student.UpcomingAmount);
    }

    [Fact]
    public async Task MixedDues_OutstandingAndUpcomingStaySeparate()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        AddDue(h, enrollment.Id, 2000m, FeeDueStatus.Overdue, -20);
        AddDue(h, enrollment.Id, 4000m, FeeDueStatus.Upcoming, 5);

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(2000m, student.OutstandingBalance);
        Assert.Equal(4000m, student.UpcomingAmount);
        Assert.True(student.HasUpcomingDues);
    }
}
