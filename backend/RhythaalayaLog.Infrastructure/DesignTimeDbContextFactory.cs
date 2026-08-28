using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Lets `dotnet ef` run with Infrastructure as both target and startup project, so migrations can
/// be generated while the API is running (its output DLLs are locked). The connection string only
/// matters for commands that actually touch the database (e.g. `database update`).
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=rhythaalaya_log;Username=postgres;Password=postgres")
            .Options;
        return new AppDbContext(options, new FixedTenantContext());
    }
}
