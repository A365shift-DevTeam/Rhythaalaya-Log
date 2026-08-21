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
        services.AddScoped<IAcademyService, AcademyService>();
        services.AddScoped<PasswordHasher<UserAccount>>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ISaasAdminService, SaasAdminService>();
        services.AddScoped<DatabaseInitializer>();
        return services;
    }
}
