using System.Net;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MimeKit;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Sends the OTP email over SMTP (e.g. Gmail). Host/Port/FromName/EnableSsl/TimeoutSeconds have
/// real defaults in appsettings; only Username/Password (and optionally FromAddress) are meant
/// to be filled in per-environment. When Smtp:Username is blank in Development, the code is
/// logged instead of emailed so a missing credential never locks every user out of a dev
/// environment; outside Development a blank username is a hard configuration error.
/// </summary>
public sealed class SmtpEmailSender(IConfiguration configuration, IHostEnvironment environment,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendOtpAsync(string toEmail, string toName, string code, CancellationToken ct)
    {
        var host = configuration["Smtp:Host"];
        var username = configuration["Smtp:Username"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username))
        {
            if (!environment.IsDevelopment())
                throw new InvalidOperationException(
                    "Smtp:Host/Username/Password are not configured, so OTP emails can't be sent.");
            logger.LogWarning(
                "SMTP credentials are not configured — this only works in Development. OTP for {Email} is {Code} (not emailed).",
                toEmail, code);
            return;
        }

        var message = new MimeMessage();
        var fromName = configuration["Smtp:FromName"] ?? "Batchly";
        var fromAddress = configuration["Smtp:FromAddress"] ?? configuration["Smtp:Username"]
            ?? throw new InvalidOperationException("Smtp:FromAddress (or Smtp:Username) is not configured.");
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Your Batchly sign-in code";
        message.Body = new BodyBuilder
        {
            HtmlBody = BuildHtmlBody(toName, code),
            TextBody = BuildTextBody(toName, code)
        }.ToMessageBody();

        var port = int.TryParse(configuration["Smtp:Port"], out var configuredPort) ? configuredPort : 587;
        var enableSsl = !bool.TryParse(configuration["Smtp:EnableSsl"], out var configuredSsl) || configuredSsl;
        var timeoutSeconds = int.TryParse(configuration["Smtp:TimeoutSeconds"], out var configuredTimeout)
            ? configuredTimeout : 15;

        using var client = new SmtpClient { Timeout = timeoutSeconds * 1000 };
        await client.ConnectAsync(host, port, enableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None, ct);
        await client.AuthenticateAsync(username, configuration["Smtp:Password"] ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }

    // toName comes from a user-editable FullName field, so it's HTML-encoded before going into
    // the template — the code itself is always 6 digits (GenerateCode), never user input.
    //
    // The code is rendered as a single unspaced run of digits ("648232", not "6 4 8 2 3 2") —
    // the visual gap between digits comes entirely from CSS letter-spacing. An earlier version
    // joined the digits with literal space characters, which looked identical but meant
    // selecting/copying the code copied the spaces too, and most OTP inputs reject that.
    private static string BuildHtmlBody(string toName, string code)
    {
        var name = WebUtility.HtmlEncode(toName);
        return $$"""
            <!DOCTYPE html>
            <html>
              <body style="margin:0;padding:24px;background-color:#1a1a1a;font-family:'Segoe UI',Arial,sans-serif;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
                  <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                    style="max-width:480px;width:100%;background-color:#2b2b2e;border-radius:16px;">
                    <tr><td style="padding:32px;">
                      <div style="font-size:22px;font-weight:700;color:#f1f1f6;margin:0 0 16px;">Your login code</div>
                      <div style="font-size:14px;line-height:22px;color:#c7c9d9;margin:0 0 24px;">
                        Hi {{name}}, use this code to complete your
                        <strong style="color:#e3e4ef;">Batchly</strong> sign-in.
                        It expires in <strong style="color:#e3e4ef;">5 minutes</strong>.
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                        style="border:1px solid #52546b;border-radius:12px;background-color:#232330;">
                        <tr><td align="center" style="padding:22px 12px;">
                          <span style="-webkit-user-select:all;user-select:all;font-size:32px;font-weight:800;letter-spacing:8px;color:#8b8bf5;font-family:'Courier New',monospace;">{{code}}</span>
                        </td></tr>
                      </table>
                      <div style="font-size:12px;line-height:18px;color:#8b8d9e;margin-top:14px;">
                        Tap the code to select it, then copy.
                      </div>
                      <div style="font-size:12px;line-height:18px;color:#8b8d9e;margin-top:16px;">
                        If you did not request this, you can safely ignore this email.
                      </div>
                    </td></tr>
                  </table>
                </td></tr></table>
              </body>
            </html>
            """;
    }

    private static string BuildTextBody(string toName, string code) =>
        $"""
        Your login code

        Hi {toName}, use this code to complete your Batchly sign-in. It expires in 5 minutes.

        {code}

        If you did not request this, you can safely ignore this email.
        """;
}
