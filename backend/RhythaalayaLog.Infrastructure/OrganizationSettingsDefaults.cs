using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

internal static class OrganizationSettingsDefaults
{
    public static OrganizationSettings Create(Guid tenantId) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Name = "Rhythaalaya Academy",
        Type = "Dance and Arts Academy",
        ThemeColor = "emerald",
        Currency = "INR",
        Locale = "en-IN",
        TimeZone = "Asia/Kolkata"
    };
}
