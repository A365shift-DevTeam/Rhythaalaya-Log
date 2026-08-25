using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class FeeDueGeneratorTests
{
    private static readonly DateOnly Today = TestHarness.Today;
    private static readonly DateOnly Anchor = Today.AddMonths(-3);

    private static List<DateOnly> ExpectedAnchorDates(DateOnly anchor, DateOnly horizon)
    {
        var dates = new List<DateOnly>();
        for (var k = 0; ; k++)
        {
            var date = BillingSchedule.Step(anchor, FeeFrequency.Monthly, k);
            if (date > horizon) return dates;
            dates.Add(date);
        }
    }

    [Fact]
    public async Task OnAnchorEnrollment_GeneratesDuesThroughLeadWindow_WithDateDrivenStatuses()
    {
        using var h = new TestHarness(leadDays: 40);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(ExpectedAnchorDates(Anchor, Today.AddDays(40)), dues.Select(x => x.DueDate).ToList());
        Assert.All(dues, due =>
        {
            Assert.Equal(1000m, due.NetAmount);
            if (due.DueDate < Today) Assert.Equal(FeeDueStatus.Overdue, due.Status);
            else if (due.DueDate == Today) Assert.Equal(FeeDueStatus.Pending, due.Status);
            else Assert.Equal(FeeDueStatus.Upcoming, due.Status);
        });
        // a 40-day lead window over a monthly cadence always contains at least one future due
        Assert.Contains(dues, x => x.Status == FeeDueStatus.Upcoming);
    }

    [Fact]
    public async Task NoDueGeneratedBeyondLeadWindow()
    {
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.All(h.DuesFor(enrollment.Id), x => Assert.True(x.DueDate <= Today.AddDays(7)));
    }

    [Fact]
    public async Task SkipPolicy_MidPeriodEnrollment_StartsAtNextAnchor()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Skip);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrolledOn = Anchor.AddDays(10);
        var enrollment = h.Enroll(enrolledOn);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.DoesNotContain(dues, x => x.DueDate == enrolledOn || x.DueDate == Anchor);
        Assert.Equal(BillingSchedule.Step(Anchor, FeeFrequency.Monthly, 1), dues[0].DueDate);
    }

    [Fact]
    public async Task FullPolicy_ChargesPartialPeriodInFull_ThenResumesAnchorCadence()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Full);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrolledOn = Anchor.AddDays(10);
        var enrollment = h.Enroll(enrolledOn);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(enrolledOn, dues[0].DueDate);
        Assert.Equal(1000m, dues[0].NetAmount);
        // the chain must resume on the plan's anchor, not re-anchor on the enrollment date
        Assert.Equal(BillingSchedule.Step(Anchor, FeeFrequency.Monthly, 1), dues[1].DueDate);
    }

    [Fact]
    public async Task ProratedPolicy_AddsSystemProrationAdjustment()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Prorated);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrolledOn = Anchor.AddDays(10);
        var enrollment = h.Enroll(enrolledOn);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var first = h.DuesFor(enrollment.Id)[0];
        var expectedReduction = BillingSchedule.ProrationReduction(1000m, Anchor, enrolledOn, FeeFrequency.Monthly);
        Assert.Equal(enrolledOn, first.DueDate);
        Assert.Equal(1000m, first.Amount);
        Assert.Equal(1000m - expectedReduction, first.NetAmount);
        Assert.Equal(0m, first.DiscountAmount); // proration is not a discount

        var adjustment = Assert.Single(h.Db.FeeAdjustments.Where(x => x.FeeDueId == first.Id));
        Assert.Equal(FeeAdjustmentType.Proration, adjustment.Type);
        Assert.Equal(expectedReduction, adjustment.Amount);
        Assert.Null(adjustment.PerformedByUserId);
    }

    [Fact]
    public async Task FuturePlanChange_SwitchesAmountAtEffectiveDate_WithoutGapOrReanchor()
    {
        using var h = new TestHarness(leadDays: 7);
        var switchDate = BillingSchedule.Step(Anchor, FeeFrequency.Monthly, 2);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor, switchDate.AddDays(-1));
        h.AddStructure(1500m, FeeFrequency.Monthly, switchDate);
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(ExpectedAnchorDates(Anchor, Today.AddDays(7)), dues.Select(x => x.DueDate).ToList());
        Assert.All(dues, due => Assert.Equal(due.DueDate < switchDate ? 1000m : 1500m, due.Amount));
    }

    [Fact]
    public async Task PlanGap_ProducesNoDueForUncoveredPeriod_AndResumesOnAnchor()
    {
        using var h = new TestHarness(leadDays: 7);
        var k1 = BillingSchedule.Step(Anchor, FeeFrequency.Monthly, 1);
        var k2 = BillingSchedule.Step(Anchor, FeeFrequency.Monthly, 2);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor, k1.AddDays(-1)); // covers only the first period
        h.AddStructure(1500m, FeeFrequency.Monthly, k2);                      // resumes two periods later
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Contains(dues, x => x.DueDate == Anchor && x.Amount == 1000m);
        Assert.DoesNotContain(dues, x => x.DueDate == k1);
        Assert.Contains(dues, x => x.DueDate == k2 && x.Amount == 1500m);
    }

    [Fact]
    public async Task OneTimeFee_ChargedOnceOnEnrollment()
    {
        using var h = new TestHarness();
        h.AddStructure(500m, FeeFrequency.OneTime, Anchor);
        var enrolledOn = Anchor.AddDays(10);
        var enrollment = h.Enroll(enrolledOn);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default); // idempotent

        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(enrolledOn, due.DueDate);
        Assert.Equal(500m, due.Amount);
    }

    [Fact]
    public async Task StandingConcession_ReducesEveryScheduledDue()
    {
        using var h = new TestHarness();
        h.SetConcession(50m, "Semi-orphan");
        h.AddStructure(1500m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.NotEmpty(dues);
        Assert.All(dues, due =>
        {
            Assert.Equal(1500m, due.Amount);
            Assert.Equal(750m, due.DiscountAmount);
            Assert.Equal(750m, due.NetAmount);
        });
        var adjustment = h.Db.FeeAdjustments.First(x => x.FeeDueId == dues[0].Id);
        Assert.Equal(FeeAdjustmentType.Discount, adjustment.Type);
        Assert.Null(adjustment.PerformedByUserId); // system-applied
        Assert.Contains("Semi-orphan", adjustment.Reason);
    }

    [Fact]
    public async Task FullConcession_SettlesDuesAsPaid()
    {
        using var h = new TestHarness();
        h.SetConcession(100m, "Orphan");
        h.AddStructure(1500m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.All(h.DuesFor(enrollment.Id), due =>
        {
            Assert.Equal(0m, due.NetAmount);
            Assert.Equal(FeeDueStatus.Paid, due.Status); // nothing to collect
        });
    }

    [Fact]
    public async Task ConcessionChange_ResyncsExistingUnpaidDues_ButNeverBelowPaid()
    {
        using var h = new TestHarness();
        h.AddStructure(1500m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var dues = h.DuesFor(enrollment.Id);
        Assert.All(dues, due => Assert.Equal(1500m, due.NetAmount)); // generated before any concession

        // one due is already fully paid; it must not be re-discounted below the money received
        await h.Finance.RecordFeePaymentAsync(new RecordFeePaymentRequest(
            h.Student.Id, dues[0].Id, 1500m, PaymentMethod.Cash, null, null, null), default);

        h.SetConcession(50m, "Semi-orphan");
        await h.Generator.ResyncConcessionAsync(h.Student.Id, default);

        var refreshed = h.DuesFor(enrollment.Id);
        Assert.Equal(1500m, refreshed[0].NetAmount); // paid due untouched
        Assert.Equal(FeeDueStatus.Paid, refreshed[0].Status);
        Assert.All(refreshed.Skip(1), due =>
        {
            Assert.Equal(750m, due.NetAmount);
            Assert.Equal(750m, due.DiscountAmount);
        });
    }

    [Fact]
    public async Task Concession_StacksOnProratedFirstPeriod()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Prorated);
        h.SetConcession(50m, "Semi-orphan");
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrolledOn = Anchor.AddDays(10);
        var enrollment = h.Enroll(enrolledOn);

        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var first = h.DuesFor(enrollment.Id)[0];
        var afterProration = 1000m - BillingSchedule.ProrationReduction(1000m, Anchor, enrolledOn, FeeFrequency.Monthly);
        var expectedConcession = Math.Round(afterProration * 0.5m, 2, MidpointRounding.AwayFromZero);
        Assert.Equal(afterProration - expectedConcession, first.NetAmount);
        Assert.Equal(2, h.Db.FeeAdjustments.Count(x => x.FeeDueId == first.Id)); // proration + concession
    }

    [Fact]
    public async Task ArrivedUpcomingDues_FlipToPendingOrOverdue()
    {
        using var h = new TestHarness();
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        // simulate dues generated ahead of time whose dates have now arrived
        var structureId = h.Db.FeeStructures.First().Id;
        var past = new FeeDue
        {
            TenantId = h.TenantId, StudentId = h.Student.Id, EnrollmentId = enrollment.Id,
            FeeStructureId = structureId, DueDate = Today.AddDays(-1),
            Amount = 1000m, NetAmount = 1000m, Status = FeeDueStatus.Upcoming
        };
        var arrivedToday = new FeeDue
        {
            TenantId = h.TenantId, StudentId = h.Student.Id, EnrollmentId = enrollment.Id,
            FeeStructureId = null, Title = "Arrived", DueDate = Today,
            Amount = 800m, NetAmount = 800m, Status = FeeDueStatus.Upcoming
        };
        h.Db.FeeDues.AddRange(past, arrivedToday);
        h.Db.SaveChanges();

        await h.Generator.RefreshDateDrivenStatusesAsync(h.Student.Id, default);

        Assert.Equal(FeeDueStatus.Overdue, h.Db.FeeDues.AsNoTracking().Single(x => x.Id == past.Id).Status);
        Assert.Equal(FeeDueStatus.Pending, h.Db.FeeDues.AsNoTracking().Single(x => x.Id == arrivedToday.Id).Status);
    }
}
