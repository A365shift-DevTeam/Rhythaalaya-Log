using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace RhythaalayaLog.API;

/// <summary>
/// Appends unhandled API errors to a daily file under logs/ (errors-yyyyMMdd.log) with the
/// request, caller identity, and full stack trace — so production failures are inspectable
/// after the fact without console access. Writing is best-effort: a logging failure must
/// never take the request down with it.
/// </summary>
public sealed class FileErrorLog(IHostEnvironment environment)
{
    private readonly object _gate = new();
    private readonly string _directory = Path.Combine(environment.ContentRootPath, "logs");

    public void Write(HttpContext context, Exception exception)
    {
        try
        {
            var user = context.User?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? "-";
            var tenant = context.User?.FindFirstValue("tenant_id") ?? "-";
            var entry =
                $"----------------------------------------------------------------------{Environment.NewLine}" +
                $"[{DateTimeOffset.UtcNow:yyyy-MM-dd HH:mm:ss.fff} UTC] {context.Request.Method} {context.Request.Path}{context.Request.QueryString}{Environment.NewLine}" +
                $"TraceId: {context.TraceIdentifier} | User: {user} | Tenant: {tenant}{Environment.NewLine}" +
                $"{exception}{Environment.NewLine}";
            lock (_gate)
            {
                Directory.CreateDirectory(_directory);
                File.AppendAllText(Path.Combine(_directory, $"errors-{DateTime.UtcNow:yyyyMMdd}.log"), entry);
            }
        }
        catch
        {
            // best-effort only
        }
    }
}
