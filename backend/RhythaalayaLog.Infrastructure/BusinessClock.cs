namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// The one source of "now" for business-date decisions (join/exit dates, billing "today",
/// payment dates, dashboard days). Audit timestamps (CreatedAt etc.) keep using the system clock
/// directly. Tests pin the instant with <see cref="Override"/>; the override is AsyncLocal, so
/// parallel test classes never see each other's clock.
/// </summary>
public static class BusinessClock
{
    private static readonly AsyncLocal<DateTimeOffset?> Pinned = new();

    public static DateTimeOffset UtcNow => Pinned.Value ?? DateTimeOffset.UtcNow;

    /// <summary>Tenant-local calendar date for the current instant.</summary>
    public static DateOnly TodayIn(string timeZoneId) => BillingSchedule.ToLocalDate(timeZoneId, UtcNow);

    /// <summary>Pins the clock for the current async flow until the returned scope is disposed.</summary>
    public static IDisposable Override(DateTimeOffset instant)
    {
        var previous = Pinned.Value;
        Pinned.Value = instant;
        return new Scope(() => Pinned.Value = previous);
    }

    private sealed class Scope(Action restore) : IDisposable
    {
        public void Dispose() => restore();
    }
}
