using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddSingleton<IRowLocker, PostgresRowLocker>();
        services.AddScoped<FeeDueGenerator>();
        services.AddScoped<FeeBalanceCalculator>();
        services.AddScoped<IAcademyService, AcademyService>();
        services.AddScoped<IFinanceService, FinanceService>();
        services.AddScoped<IStudentLedgerService, StudentLedgerService>();
        services.AddScoped<IFinanceReportingService, FinanceReportingService>();
        services.AddScoped<PasswordHasher<UserAccount>>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        services.AddScoped<ISaasAdminService, SaasAdminService>();
        services.AddScoped<DatabaseInitializer>();
        services.AddHostedService<FeeBillingDailyService>();
        return services;
    }
}
