using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

/// <summary>
/// A fee plan says where its amount comes from. Fixed bills one price to everyone (the long-standing
/// behaviour). PerStudent bills each enrollment's own figure and raises nothing until one is agreed.
/// Unbilled raises nothing at all, so the academy collects by hand with no bill on record.
/// </summary>
public sealed class FeeBillingModeTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db, h.TenantContext,
        h.Generator, new FeeBalanceCalculator(h.Db));

    /// <summary>Creating a student is gated on a live subscription, so give the tenant one.</summary>
    private static void SeedSubscription(TestHarness h)
    {
        var plan = new SubscriptionPlan { Name = "Pro", Code = "PRO", MaxUsers = 10, MaxStudents = 100 };
        h.Db.Add(plan);
        h.Db.Add(new TenantSubscription
        {
            TenantId = h.TenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active,
            StartsAt = DateTimeOffset.UtcNow.AddDays(-1), EndsAt = DateTimeOffset.UtcNow.AddYears(1)
        });
        h.Db.SaveChanges();
    }

    [Fact]
    public async Task UnbilledPlan_RaisesNoDues()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.Unbilled);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Empty(h.DuesFor(enrollment.Id));
        Assert.Equal(0m, (await Service(h).GetStudentAsync(h.Student.Id, default)).OutstandingBalance);
    }

    [Fact]
    public async Task PerStudentPlan_WithoutAnAgreedPrice_RaisesNoDues()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Empty(h.DuesFor(enrollment.Id));
    }

    [Fact]
    public async Task PerStudentPlan_BillsTheEnrollmentsOwnAmount_NotThePlanAmount()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(Today);
        await Service(h).SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1500m), default);

        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(1500m, due.Amount);
        Assert.Equal(1500m, due.NetAmount);
    }

    /// <summary>
    /// The landmine this design exists to avoid: pricing a student months into their enrolment must
    /// bill from that day, not raise every unpriced month at once as an overdue pile.
    /// </summary>
    [Fact]
    public async Task PricingAnOldEnrollmentToday_BillsFromToday_NotEveryMissedMonth()
    {
        using var h = new TestHarness();
        var start = Today.AddMonths(-3);
        h.AddStructure(2000m, FeeFrequency.Monthly, start, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(start);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        Assert.Empty(h.DuesFor(enrollment.Id)); // three months of service, no agreed price, no bills

        await Service(h).SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1500m), default);

        // One bill, dated today. Without the floor the three unpriced cycles would be raised too,
        // every one of them already overdue.
        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(Today, due.DueDate);
        Assert.Equal(FeeDueStatus.Pending, due.Status);
    }

    /// <summary>
    /// The likely real-world route into per-student pricing: a course that already billed one fixed
    /// price is switched over, which supersedes the old plan rather than replacing it. The lineage
    /// then resumes from the last fixed-price due, so the price floor has to hold there too.
    /// </summary>
    [Fact]
    public async Task SwitchingAFixedCourseToPerStudent_DoesNotBackBillTheUnpricedMonths()
    {
        using var h = new TestHarness();
        var head = h.AddFeeHead("Tuition");
        var start = Today.AddMonths(-3);
        h.AddStructure(2000m, FeeFrequency.Monthly, start, effectiveTo: Today.AddMonths(-1).AddDays(-1),
            feeHeadId: head.Id, name: "Tuition (fixed)");
        var enrollment = h.Enroll(start);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var fixedDues = h.DuesFor(enrollment.Id).Count;
        Assert.True(fixedDues > 0, "The fixed plan should have billed before the switch.");

        // Same fee head, superseding from last month, now priced per student.
        h.AddStructure(0m, FeeFrequency.Monthly, Today.AddMonths(-1), feeHeadId: head.Id,
            name: "Tuition (per student)", billingMode: FeeBillingMode.PerStudent);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        Assert.Equal(fixedDues, h.DuesFor(enrollment.Id).Count); // unpriced, so still nothing new

        await Service(h).SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1500m), default);

        var added = h.DuesFor(enrollment.Id).Where(x => x.NetAmount == 1500m).ToList();
        Assert.NotEmpty(added); // billing does resume, so the assertion below is not vacuous
        Assert.All(added, due => Assert.True(due.DueDate >= Today,
            $"Back-billed {due.DueDate}, before the price was agreed on {Today}."));
    }

    [Fact]
    public async Task ChangingThePrice_LeavesBilledDuesAlone_AndAppliesToLaterOnes()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(Today);
        var service = Service(h);
        await service.SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1500m), default);
        var first = Assert.Single(h.DuesFor(enrollment.Id));

        await service.SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1800m), default);

        var after = h.DuesFor(enrollment.Id).Single(x => x.Id == first.Id);
        Assert.Equal(1500m, after.NetAmount); // history is never repriced
        Assert.Equal(1800m, h.Db.Enrollments.AsNoTracking().Single(x => x.Id == enrollment.Id).FeeAmountOverride);
    }

    [Fact]
    public async Task ClearingThePrice_StopsFutureBills_AndKeepsThoseAlreadyRaised()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(Today);
        var service = Service(h);
        await service.SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(1500m), default);
        var billed = h.DuesFor(enrollment.Id).Count;

        await service.SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(null), default);

        Assert.Equal(billed, h.DuesFor(enrollment.Id).Count);
        var stored = h.Db.Enrollments.AsNoTracking().Single(x => x.Id == enrollment.Id);
        Assert.Null(stored.FeeAmountOverride);
        Assert.Null(stored.FeeAmountSetOn);
    }

    [Fact]
    public async Task TwoStudentsOnTheSamePerStudentPlan_AreBilledTheirOwnAmounts()
    {
        using var h = new TestHarness();
        SeedSubscription(h);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var meera = h.Enroll(Today);
        var service = Service(h);
        var arun = await service.CreateStudentAsync(new CreateStudentRequest("Arun", null, null, null, null, null,
            Today, [h.Batch.Id], BatchFeeAmounts: [new BatchFeeAmountRequest(h.Batch.Id, 900m)]), default);

        await service.SetEnrollmentFeeAmountAsync(meera.Id, new SetEnrollmentFeeAmountRequest(1500m), default);

        Assert.Equal(1500m, Assert.Single(h.DuesFor(meera.Id)).NetAmount);
        var arunEnrollment = Assert.Single(arun.Enrollments);
        Assert.Equal(900m, arunEnrollment.FeeAmountOverride);
        Assert.Equal(900m, Assert.Single(h.DuesFor(arunEnrollment.Id)).NetAmount);
    }

    [Fact]
    public async Task FixedPlan_IsUnchanged_AndBillsThePlanAmount()
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today);
        var enrollment = h.Enroll(Today);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.Equal(2000m, Assert.Single(h.DuesFor(enrollment.Id)).NetAmount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    [InlineData(10.005)]
    public async Task AnImpossiblePrice_IsRejected(decimal amount)
    {
        using var h = new TestHarness();
        h.AddStructure(2000m, FeeFrequency.Monthly, Today, billingMode: FeeBillingMode.PerStudent);
        var enrollment = h.Enroll(Today);

        await Assert.ThrowsAsync<AppValidationException>(() => Service(h)
            .SetEnrollmentFeeAmountAsync(enrollment.Id, new SetEnrollmentFeeAmountRequest(amount), default));
    }

    [Fact]
    public async Task CreatingAPlan_WithoutAFixedPrice_IsAllowedOnlyOutsideFixedMode()
    {
        using var h = new TestHarness();
        var finance = h.Finance;

        var perStudent = await finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id,
            "Tuition", 0m, FeeFrequency.Monthly, Today, null, BillingMode: FeeBillingMode.PerStudent), default);
        Assert.Equal(FeeBillingMode.PerStudent, perStudent.BillingMode);
        Assert.Equal(0m, perStudent.Amount);

        await Assert.ThrowsAsync<AppValidationException>(() => finance.CreateFeeStructureAsync(
            new CreateFeeStructureRequest(h.Course.Id, "Materials", 0m, FeeFrequency.OneTime, Today, null), default));
    }
}
