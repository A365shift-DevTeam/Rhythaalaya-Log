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
        var fromName = configuration["Smtp:FromName"] ?? "A365 CRM";
        var fromAddress = configuration["Smtp:FromAddress"] ?? configuration["Smtp:Username"]
            ?? throw new InvalidOperationException("Smtp:FromAddress (or Smtp:Username) is not configured.");
        message.From.Add(new MailboxAddress(fromName, fromAddress));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = $"Your {fromName} sign-in code";
        message.Body = new BodyBuilder
        {
            HtmlBody = BuildHtmlBody(toName, code, fromName),
            TextBody = BuildTextBody(toName, code, fromName)
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
    private static string BuildHtmlBody(string displayName, string code, string appName = "A365 CRM", int expiryMinutes = 5)
    {
        var name = WebUtility.HtmlEncode(displayName);
        var app = WebUtility.HtmlEncode(appName);
        return $$"""
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your login code</title>
              </head>
              <body style="margin:0;padding:24px 0;background-color:#f1f5f9;font-family:'DM Sans',Arial,sans-serif;">
                <div style="font-family:'DM Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:16px;">
                  <h2 style="color:#1e293b;margin-top:0;margin-bottom:8px;font-size:24px;font-weight:700;">Your login code</h2>
                  <p style="color:#64748b;margin-bottom:24px;font-size:15px;line-height:22px;">Hi {{name}}, use this code to complete your {{app}} sign-in. It expires in <strong style="color:#1e293b;">{{expiryMinutes}} minutes</strong>.</p>
                  <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#4361EE;text-align:center;padding:20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:24px;-webkit-user-select:all;user-select:all;">{{code}}</div>
                  <p style="color:#94a3b8;font-size:12px;line-height:18px;margin:0;">If you did not request this, you can safely ignore this email.</p>
                </div>
              </body>
            </html>
            """;
    }

    private static string BuildTextBody(string displayName, string code, string appName = "A365 CRM", int expiryMinutes = 5) =>
        $"""
        Your login code

        Hi {displayName}, use this code to complete your {appName} sign-in. It expires in {expiryMinutes} minutes.

        {code}

        If you did not request this, you can safely ignore this email.
        """;
}
