using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class AcademyServiceTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db,
        new FixedTenantContext { TenantId = h.TenantId, UserId = h.UserId, Role = UserRole.TenantAdmin },
        h.Generator, new FeeBalanceCalculator(h.Db));

    [Fact]
    public async Task HasBillableDues_FalseWithoutPlan_TrueOnceBilled()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var service = Service(h);

        var before = await service.GetStudentAsync(h.Student.Id, default);
        Assert.False(before.HasBillableDues); // no fee plan: nothing billed, "Paid" would mislead

        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddMonths(-1));
        var after = await service.GetStudentAsync(h.Student.Id, default);
        Assert.True(after.HasBillableDues);
    }

    [Fact]
    public async Task CreateStudent_StampsLateBillingPolicyOnEnrollments()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Skip);
        var plan = new SubscriptionPlan { Name = "Pro", Code = "PRO", MaxUsers = 10, MaxStudents = 100 };
        h.Db.Add(plan);
        h.Db.Add(new TenantSubscription
        {
            TenantId = h.TenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active,
            StartsAt = DateTimeOffset.UtcNow.AddDays(-1), EndsAt = DateTimeOffset.UtcNow.AddYears(1)
        });
        h.Db.SaveChanges();

        var created = await Service(h).CreateStudentAsync(new CreateStudentRequest(
            "Kavi", null, null, null, null, null, Today, [h.Batch.Id],
            LateBillingPolicy: LateEnrollmentBillingPolicy.Full), default);

        var enrollment = h.Db.Enrollments.Single(x => x.StudentId == created.Id);
        Assert.Equal(LateEnrollmentBillingPolicy.Full, enrollment.LateBillingPolicy);
    }

    [Fact]
    public async Task HasBillableDues_IgnoresUpcomingDues()
    {
        using var h = new TestHarness(leadDays: TestHarness.DaysToMonthEnd + 3);
        // Next month's due: generated inside the lead window, but not billable until that month starts.
        h.AddStructure(1000m, FeeFrequency.Monthly, TestHarness.NotYetBilled(3));
        h.Enroll(TestHarness.NotYetBilled(3));

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.False(student.HasBillableDues); // not yet due = not yet billable
    }
}

/// <summary>QA pass 2026-09-07: lifecycle integrity (archiving with dependents) and attendance date rules.</summary>
public sealed class AcademyIntegrityTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db,
        new FixedTenantContext { TenantId = h.TenantId, UserId = h.UserId, Role = UserRole.TenantAdmin },
        h.Generator, new FeeBalanceCalculator(h.Db));

    /// <summary>The latest date on or before <paramref name="onOrBefore"/> that falls on <paramref name="day"/>.</summary>
    private static DateOnly LastWeekday(DayOfWeek day, DateOnly onOrBefore)
    {
        var d = onOrBefore;
        while (d.DayOfWeek != day) d = d.AddDays(-1);
        return d;
    }

    private static SubmitAttendanceRequest Attendance(TestHarness h, DateOnly date, Guid enrollmentId) =>
        new(date, h.Batch.Id, [new AttendanceEntryDto(enrollmentId, AttendanceStatus.Present)]);

    [Fact]
    public async Task ArchiveCourse_WithAnActiveBatch_IsRefused()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<ConflictException>(() => Service(h).ArchiveCourseAsync(h.Course.Id, default));
        Assert.True(h.Db.Courses.Single(x => x.Id == h.Course.Id).IsActive);
    }

    [Fact]
    public async Task ArchiveStaff_WithAnActiveBatch_IsRefused()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<ConflictException>(() => Service(h).ArchiveStaffAsync(h.Batch.StaffId, default));
        Assert.True(h.Db.Staff.Single(x => x.Id == h.Batch.StaffId).IsActive);
    }

    [Fact]
    public async Task ArchiveBatch_WithAnActiveEnrollment_IsRefused_UntilTheEnrollmentEnds()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var service = Service(h);
        await Assert.ThrowsAsync<ConflictException>(() => service.ArchiveBatchAsync(h.Batch.Id, default));
        Assert.True(h.Db.Batches.Single(x => x.Id == h.Batch.Id).IsActive);

        await service.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Completed, Today), default);
        await service.ArchiveBatchAsync(h.Batch.Id, default);
        Assert.False(h.Db.Batches.Single(x => x.Id == h.Batch.Id).IsActive);
    }

    [Fact]
    public async Task SubmitAttendance_ForAFutureDate_IsRejected()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today.AddMonths(-1));
        var nextMonday = LastWeekday(DayOfWeek.Monday, Today.AddDays(7));
        if (nextMonday <= Today) nextMonday = nextMonday.AddDays(7);

        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).SubmitAttendanceAsync(Attendance(h, nextMonday, enrollment.Id), default));
        Assert.Empty(h.Db.AttendanceRecords);
    }

    [Fact]
    public async Task SubmitAttendance_OnADayTheBatchDoesNotMeet_IsRejected_UnlessAClassWasMovedThere()
    {
        using var h = new TestHarness(); // batch meets on Mondays only
        var enrollment = h.Enroll(Today.AddMonths(-1));
        var service = Service(h);
        var tuesday = LastWeekday(DayOfWeek.Tuesday, Today);
        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.SubmitAttendanceAsync(Attendance(h, tuesday, enrollment.Id), default));

        // The Monday class was rescheduled onto that Tuesday: attendance is taken on the Tuesday.
        var monday = LastWeekday(DayOfWeek.Monday, tuesday);
        h.Db.BatchSessionOverrides.Add(new BatchSessionOverride
            { TenantId = h.TenantId, BatchId = h.Batch.Id, OriginalDate = monday, NewDate = tuesday });
        h.Db.SaveChanges();
        var log = await service.SubmitAttendanceAsync(Attendance(h, tuesday, enrollment.Id), default);
        Assert.Single(log.Entries, e => e.HasRecord);
        // ...and no longer on the Monday it moved away from.
        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.SubmitAttendanceAsync(Attendance(h, monday, enrollment.Id), default));
    }

    [Fact]
    public async Task SubmitAttendance_BeforeTheBatchStarted_IsRejected()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today.AddMonths(-1));
        var beforeStart = LastWeekday(DayOfWeek.Monday, h.Batch.StartDate.AddDays(-1));

        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).SubmitAttendanceAsync(Attendance(h, beforeStart, enrollment.Id), default));
    }

    [Fact]
    public async Task SubmitAttendance_OnAPastClassDay_IsAccepted()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today.AddMonths(-1));
        var lastMonday = LastWeekday(DayOfWeek.Monday, Today);
        var log = await Service(h).SubmitAttendanceAsync(Attendance(h, lastMonday, enrollment.Id), default);
        Assert.Single(log.Entries, e => e.HasRecord);
    }
}
