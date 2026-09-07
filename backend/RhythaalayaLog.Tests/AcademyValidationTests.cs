using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

/// <summary>QA pass 2026-09-07: data-entry validation and list/DTO gaps found as academy admin.</summary>
public sealed class AcademyValidationTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db,
        new FixedTenantContext { TenantId = h.TenantId, UserId = h.UserId, Role = UserRole.TenantAdmin },
        h.Generator, new FeeBalanceCalculator(h.Db));

    private static UpdateStudentRequest StudentUpdate(TestHarness h, string? phone = null, string? email = null,
        DateOnly? dob = null, DateOnly? joinDate = null, string? name = null) =>
        new(name ?? h.Student.Name, dob, null, phone, email, null, joinDate, true);

    // ---- Item 10: phone / email are validated server-side ----------------------------------

    [Theory]
    [InlineData("abc")]
    [InlineData("12")]
    public async Task Staff_WithAnInvalidPhone_IsRejected(string phone)
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).CreateStaffAsync(new CreateStaffRequest("Guru", phone, null), default));
    }

    [Fact]
    public async Task Staff_WithAnInvalidEmail_IsRejected_AndValidContactIsKept()
    {
        using var h = new TestHarness();
        var service = Service(h);
        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.CreateStaffAsync(new CreateStaffRequest("Guru", null, "bad-email"), default));
        var ok = await service.CreateStaffAsync(new CreateStaffRequest("Guru", "+91 98765 43210", "guru@example.com"), default);
        Assert.Equal("+91 98765 43210", ok.Phone);
    }

    [Fact]
    public async Task Student_WithAnInvalidPhoneOrEmail_IsRejected()
    {
        using var h = new TestHarness();
        var service = Service(h);
        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.UpdateStudentAsync(h.Student.Id, StudentUpdate(h, phone: "abc"), default));
        await Assert.ThrowsAsync<AppValidationException>(() =>
            service.UpdateStudentAsync(h.Student.Id, StudentUpdate(h, email: "bad-email"), default));
    }

    // ---- Item 12: a date of birth in the future is rejected ----------------------------------

    [Fact]
    public async Task Student_WithADateOfBirthInTheFuture_IsRejected()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).UpdateStudentAsync(h.Student.Id, StudentUpdate(h, dob: Today.AddDays(1)), default));
    }

    // ---- Item 8: join date cannot move past an existing enrolment -----------------------------

    [Fact]
    public async Task Student_JoinDateAfterAnEnrollmentDate_IsRejected()
    {
        using var h = new TestHarness();
        h.Enroll(Today.AddDays(-3));
        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).UpdateStudentAsync(h.Student.Id, StudentUpdate(h, joinDate: Today), default));
        var earlier = await Service(h).UpdateStudentAsync(h.Student.Id, StudentUpdate(h, joinDate: Today.AddDays(-10)), default);
        Assert.Equal(Today.AddDays(-10), earlier.JoinDate);
    }

    // ---- Item 13: course names are unique regardless of case; batch dates are sane ------------

    [Fact]
    public async Task Course_WithTheSameNameInDifferentCase_IsRejected()
    {
        using var h = new TestHarness(); // "Bharatanatyam" exists
        await Assert.ThrowsAsync<ConflictException>(() =>
            Service(h).CreateCourseAsync(new CreateCourseRequest("bharatanatyam", null), default));
    }

    [Theory]
    [InlineData(1900)]
    [InlineData(2099)]
    public async Task Batch_WithAnImplausibleStartYear_IsRejected(int year)
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() => Service(h).CreateBatchAsync(new CreateBatchRequest(
            "Evening", h.Course.Id, h.Batch.StaffId, [DayOfWeek.Monday], new TimeOnly(18, 0), new TimeOnly(19, 0),
            new DateOnly(year, 1, 1), null), default));
    }

    // ---- Item 14: over-long text and huge amounts get a validation error, not a database error --

    [Fact]
    public async Task Course_WithAnOverlongName_IsRejectedWithAValidationError()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() =>
            Service(h).CreateCourseAsync(new CreateCourseRequest(new string('x', 300), null), default));
    }

    [Fact]
    public async Task FeePlan_WithAnAbsurdAmount_IsRejected()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() => h.Finance.CreateFeeStructureAsync(
            new CreateFeeStructureRequest(h.Course.Id, "Tuition", 99_999_999_999m, FeeFrequency.Monthly, Today, null), default));
    }

    // ---- Item 9: a scheduled bill carries its plan name ----------------------------------------

    [Fact]
    public async Task ScheduledDue_IsTitledWithItsPlanName()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddMonths(-1), name: "Tuition");
        h.Enroll(Today.AddMonths(-1));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var dues = await h.Finance.GetStudentFeeDuesAsync(h.Student.Id, default);
        Assert.All(dues, d => Assert.Equal("Tuition", d.Title));
    }

    // ---- Item 22: the student list knows how much is overdue -----------------------------------

    [Fact]
    public async Task StudentDto_ReportsTheOverdueAmount()
    {
        using var h = new TestHarness();
        h.AddStructure(1500m, FeeFrequency.Monthly, Today.AddDays(-20));
        h.Enroll(Today.AddDays(-20));
        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.Equal(1500m, student.OverdueAmount);           // the one bill that fell due 20 days ago
        Assert.True(student.OutstandingBalance >= student.OverdueAmount);
    }
}
