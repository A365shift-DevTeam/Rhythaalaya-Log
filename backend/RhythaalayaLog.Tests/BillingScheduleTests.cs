using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class BillingScheduleTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    [Fact]
    public void Step_FromMonthEndAnchor_DoesNotDrift()
    {
        var anchor = D(2026, 1, 31);
        Assert.Equal(D(2026, 2, 28), BillingSchedule.Step(anchor, FeeFrequency.Monthly, 1));
        Assert.Equal(D(2026, 3, 31), BillingSchedule.Step(anchor, FeeFrequency.Monthly, 2));
        Assert.Equal(D(2026, 4, 30), BillingSchedule.Step(anchor, FeeFrequency.Monthly, 3));
    }

    [Fact]
    public void Step_LeapYearFebruary()
    {
        Assert.Equal(D(2028, 2, 29), BillingSchedule.Step(D(2028, 1, 31), FeeFrequency.Monthly, 1));
    }

    [Theory]
    [InlineData(FeeFrequency.Quarterly, 3)]
    [InlineData(FeeFrequency.HalfYearly, 6)]
    public void Step_MultiMonthFrequencies(FeeFrequency frequency, int months)
    {
        Assert.Equal(D(2026, 1, 5).AddMonths(months), BillingSchedule.Step(D(2026, 1, 5), frequency, 1));
    }

    [Fact]
    public void FirstOnOrAfter_ReturnsAnchorWhenAnchorIsLater()
    {
        Assert.Equal(D(2026, 5, 5), BillingSchedule.FirstOnOrAfter(D(2026, 5, 5), D(2026, 1, 1), FeeFrequency.Monthly));
    }

    [Fact]
    public void FirstOnOrAfter_MonthEndAnchor_LandsOnRealAnchorDate()
    {
        // Jan 31 anchor stepping past Feb 28 must land on Mar 31, not Mar 28
        Assert.Equal(D(2026, 3, 31), BillingSchedule.FirstOnOrAfter(D(2026, 1, 31), D(2026, 3, 1), FeeFrequency.Monthly));
    }

    [Fact]
    public void LastOnOrBefore_ReturnsPeriodStartContainingDate()
    {
        Assert.Equal(D(2026, 3, 5), BillingSchedule.LastOnOrBefore(D(2026, 1, 5), D(2026, 3, 20), FeeFrequency.Monthly));
        Assert.Equal(D(2026, 3, 5), BillingSchedule.LastOnOrBefore(D(2026, 1, 5), D(2026, 3, 5), FeeFrequency.Monthly));
    }

    [Fact]
    public void ProrationReduction_MidPeriodEnrollment()
    {
        // period Jan 5 -> Feb 5 (31 days); enrolled Jan 20 => 15 elapsed days are not billed
        var reduction = BillingSchedule.ProrationReduction(3000m, D(2026, 1, 5), D(2026, 1, 20), FeeFrequency.Monthly);
        Assert.Equal(1451.61m, reduction);
    }

    [Fact]
    public void ProrationReduction_OnPeriodStart_IsZero()
    {
        Assert.Equal(0m, BillingSchedule.ProrationReduction(3000m, D(2026, 1, 5), D(2026, 1, 5), FeeFrequency.Monthly));
    }

    [Fact]
    public void ProrationReduction_OneTime_IsZero()
    {
        Assert.Equal(0m, BillingSchedule.ProrationReduction(3000m, D(2026, 1, 5), D(2026, 1, 20), FeeFrequency.OneTime));
    }

    [Fact]
    public void PeriodDays_MonthLengthAware()
    {
        Assert.Equal(31, BillingSchedule.PeriodDays(D(2026, 1, 5), FeeFrequency.Monthly));
        Assert.Equal(28, BillingSchedule.PeriodDays(D(2026, 2, 5), FeeFrequency.Monthly));
    }

    [Fact]
    public void ResolveStructure_PicksByEffectiveWindow_IgnoringIsActive()
    {
        var course = Guid.NewGuid();
        var old = new FeeStructure
        {
            TenantId = Guid.NewGuid(), CourseId = course, Name = "Old", Amount = 1000,
            Frequency = FeeFrequency.Monthly, EffectiveFrom = D(2026, 1, 1), EffectiveTo = D(2026, 5, 31),
            IsActive = false // soft-disabled in the UI must not hide it from schedule resolution
        };
        var current = new FeeStructure
        {
            TenantId = old.TenantId, CourseId = course, Name = "New", Amount = 1500,
            Frequency = FeeFrequency.Monthly, EffectiveFrom = D(2026, 6, 1), EffectiveTo = null
        };
        var structures = new[] { old, current };

        Assert.Same(old, BillingSchedule.ResolveStructure(structures, D(2026, 3, 15)));
        Assert.Same(current, BillingSchedule.ResolveStructure(structures, D(2026, 6, 1)));
        Assert.Null(BillingSchedule.ResolveStructure(structures, D(2025, 12, 31)));
    }

    [Fact]
    public void ResolveStructure_GapBetweenPlans_ReturnsNull()
    {
        var s = new FeeStructure
        {
            TenantId = Guid.NewGuid(), CourseId = Guid.NewGuid(), Name = "S", Amount = 1000,
            Frequency = FeeFrequency.Monthly, EffectiveFrom = D(2026, 1, 1), EffectiveTo = D(2026, 3, 31)
        };
        Assert.Null(BillingSchedule.ResolveStructure([s], D(2026, 4, 15)));
    }

    [Fact]
    public void TodayInTimeZone_KolkataRollsOverBeforeUtc()
    {
        // 19:30 UTC is already 01:00 the next day in IST (+05:30)
        Assert.Equal(D(2026, 8, 26), BillingSchedule.TodayInTimeZone("Asia/Kolkata",
            new DateTimeOffset(2026, 8, 25, 19, 30, 0, TimeSpan.Zero)));
        Assert.Equal(D(2026, 8, 25), BillingSchedule.TodayInTimeZone("Asia/Kolkata",
            new DateTimeOffset(2026, 8, 25, 12, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public void TodayInTimeZone_InvalidId_FallsBackToKolkata()
    {
        Assert.Equal(D(2026, 8, 26), BillingSchedule.TodayInTimeZone("Not/AZone",
            new DateTimeOffset(2026, 8, 25, 19, 30, 0, TimeSpan.Zero)));
    }
}
