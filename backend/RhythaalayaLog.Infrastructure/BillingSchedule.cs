using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Pure, side-effect-free schedule math for fee billing: cadence stepping, anchor computation,
/// plan resolution by due date, and first-period proration. Kept database-free so it is
/// unit-testable in isolation.
/// </summary>
public static class BillingSchedule
{
    public static DateOnly AddPeriod(DateOnly date, FeeFrequency frequency) => frequency switch
    {
        FeeFrequency.Monthly => date.AddMonths(1),
        FeeFrequency.Quarterly => date.AddMonths(3),
        FeeFrequency.HalfYearly => date.AddMonths(6),
        FeeFrequency.Yearly => date.AddYears(1),
        FeeFrequency.OneTime => date,
        _ => throw new ArgumentOutOfRangeException(nameof(frequency))
    };

    /// <summary>
    /// The k-th cadence date from <paramref name="anchor"/>. Always computed from the anchor
    /// (never cumulatively), so a month-end anchor doesn't drift: Jan 31 → Feb 28 → Mar 31,
    /// not Jan 31 → Feb 28 → Mar 28.
    /// </summary>
    public static DateOnly Step(DateOnly anchor, FeeFrequency frequency, int k) => frequency switch
    {
        FeeFrequency.Monthly => anchor.AddMonths(k),
        FeeFrequency.Quarterly => anchor.AddMonths(3 * k),
        FeeFrequency.HalfYearly => anchor.AddMonths(6 * k),
        FeeFrequency.Yearly => anchor.AddYears(k),
        FeeFrequency.OneTime => anchor,
        _ => throw new ArgumentOutOfRangeException(nameof(frequency))
    };

    /// <summary>
    /// First cadence date (relative to <paramref name="anchor"/>) on or after <paramref name="minDate"/>.
    /// The cadence extends backwards as well as forwards: for a plan anchored on 10 Oct, the first
    /// cycle date on or after 15 Aug is 10 Sep, not 10 Oct.
    /// </summary>
    public static DateOnly FirstOnOrAfter(DateOnly anchor, DateOnly minDate, FeeFrequency frequency)
    {
        if (frequency == FeeFrequency.OneTime) return anchor >= minDate ? anchor : minDate;
        var k = 0;
        while (Step(anchor, frequency, k) < minDate) k++;
        while (Step(anchor, frequency, k - 1) >= minDate) k--;
        return Step(anchor, frequency, k);
    }

    /// <summary>
    /// Start of the cadence period containing <paramref name="date"/>, stepping backwards from the
    /// anchor when the date precedes it (a plan anchored on the 10th of next month still defines
    /// the 10th-to-9th periods before it). OneTime plans have a single period at the anchor.
    /// </summary>
    public static DateOnly PeriodStartOnOrBefore(DateOnly anchor, DateOnly date, FeeFrequency frequency)
    {
        if (frequency == FeeFrequency.OneTime) return anchor;
        if (anchor <= date) return LastOnOrBefore(anchor, date, frequency);
        var k = -1;
        while (Step(anchor, frequency, k) > date) k--;
        return Step(anchor, frequency, k);
    }

    /// <summary>UTC instants [from, to) covering one tenant-local calendar day.</summary>
    public static (DateTimeOffset From, DateTimeOffset To) LocalDayRangeUtc(string timeZoneId, DateOnly day)
    {
        var zone = FindZone(timeZoneId);
        var start = TimeZoneInfo.ConvertTimeToUtc(day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), zone);
        var end = TimeZoneInfo.ConvertTimeToUtc(day.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified), zone);
        return (new DateTimeOffset(start, TimeSpan.Zero), new DateTimeOffset(end, TimeSpan.Zero));
    }

    /// <summary>Last cadence date (relative to <paramref name="anchor"/>) on or before <paramref name="maxDate"/> (or the anchor itself when it is later).</summary>
    public static DateOnly LastOnOrBefore(DateOnly anchor, DateOnly maxDate, FeeFrequency frequency)
    {
        if (frequency == FeeFrequency.OneTime || anchor >= maxDate) return anchor;
        var k = 1;
        while (Step(anchor, frequency, k) <= maxDate) k++;
        return Step(anchor, frequency, k - 1);
    }

    /// <summary>
    /// Resolves which fee structure applies on <paramref name="date"/> by effective-date window.
    /// IsActive deliberately does not participate: it is a UI soft-disable flag, and using it for
    /// schedule resolution caused billing gaps when a future-dated plan deactivated the current one.
    /// </summary>
    public static FeeStructure? ResolveStructure(IReadOnlyList<FeeStructure> structures, DateOnly date) =>
        structures.Where(x => x.EffectiveFrom <= date && (x.EffectiveTo is null || x.EffectiveTo >= date))
            .OrderByDescending(x => x.EffectiveFrom).FirstOrDefault();

    /// <summary>
    /// Amount by which a full-period fee is reduced when the student was only enrolled for part of
    /// the period: full × elapsed days ÷ period days, rounded to 2 decimals away from zero.
    /// The remainder (what the student actually owes) is full × remaining days ÷ period days.
    /// </summary>
    public static decimal ProrationReduction(decimal fullAmount, DateOnly periodStart, DateOnly enrolledOn, FeeFrequency frequency)
    {
        if (frequency == FeeFrequency.OneTime) return 0;
        var periodEnd = AddPeriod(periodStart, frequency);
        if (enrolledOn <= periodStart || enrolledOn >= periodEnd) return 0;
        var periodDays = periodEnd.DayNumber - periodStart.DayNumber;
        var elapsedDays = enrolledOn.DayNumber - periodStart.DayNumber;
        return Math.Round(fullAmount * elapsedDays / periodDays, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>Days in the period starting at <paramref name="periodStart"/> — used for audit text.</summary>
    public static int PeriodDays(DateOnly periodStart, FeeFrequency frequency) =>
        AddPeriod(periodStart, frequency).DayNumber - periodStart.DayNumber;

    /// <summary>
    /// Converts the current instant to the tenant's local calendar date. Falls back to
    /// Asia/Kolkata when the stored id is unknown, and to UTC as a last resort, so billing
    /// never crashes on a bad timezone value.
    /// </summary>
    public static DateOnly TodayInTimeZone(string timeZoneId, DateTimeOffset? nowUtc = null) =>
        ToLocalDate(timeZoneId, nowUtc ?? DateTimeOffset.UtcNow);

    /// <summary>
    /// Converts an arbitrary instant (e.g. a payment timestamp) to the tenant's local calendar
    /// date, with the same timezone fallbacks as <see cref="TodayInTimeZone"/>.
    /// </summary>
    public static DateOnly ToLocalDate(string timeZoneId, DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, FindZone(timeZoneId)).Date);

    private static TimeZoneInfo FindZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
            }
            catch (Exception inner) when (inner is TimeZoneNotFoundException or InvalidTimeZoneException)
            {
                return TimeZoneInfo.Utc;
            }
        }
    }
}
