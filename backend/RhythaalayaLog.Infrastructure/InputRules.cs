using System.Net.Mail;
using System.Text.RegularExpressions;
using RhythaalayaLog.Application;

namespace RhythaalayaLog.Infrastructure;

/// <summary>
/// Shared data-entry rules so a bad value is refused with a readable message before it reaches
/// the database (where it would surface as an opaque "error saving entity changes").
/// Column widths mirror <see cref="AppDbContext"/>.
/// </summary>
internal static partial class InputRules
{
    public const int NameLength = 160;
    public const int DescriptionLength = 1000;
    public const int AddressLength = 400;
    public const int ReasonLength = 200;
    public const int PhoneLength = 32;
    public const int EmailLength = 254;

    /// <summary>Upper bound for any single rupee amount the app accepts (₹100 crore).</summary>
    public const decimal MaxAmount = 1_000_000_000m;

    public static string RequireText(string? value, string field, int maxLength = NameLength)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new AppValidationException(field);
        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new AppValidationException($"{Label(field)} can be at most {maxLength} characters.");
        return trimmed;
    }

    public static string? OptionalText(string? value, string field, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        if (trimmed.Length > maxLength)
            throw new AppValidationException($"{Label(field)} can be at most {maxLength} characters.");
        return trimmed;
    }

    /// <summary>Digits with optional +, spaces, dashes and brackets; 7–15 digits in total.</summary>
    public static string? Phone(string? value)
    {
        var trimmed = OptionalText(value, "Phone", PhoneLength);
        if (trimmed is null) return null;
        var digits = trimmed.Count(char.IsDigit);
        if (!PhonePattern().IsMatch(trimmed) || digits is < 7 or > 15)
            throw new AppValidationException("Enter a valid phone number (7–15 digits; +, spaces and dashes are fine).");
        return trimmed;
    }

    public static string? Email(string? value)
    {
        var trimmed = OptionalText(value, "Email", EmailLength);
        if (trimmed is null) return null;
        if (!MailAddress.TryCreate(trimmed, out var parsed) || parsed.Address != trimmed || !trimmed.Contains('.'))
            throw new AppValidationException("Enter a valid email address (like name@example.com).");
        return trimmed;
    }

    /// <summary>Money must be positive, in whole paise, and below <see cref="MaxAmount"/>.</summary>
    public static void Money(decimal amount, string field)
    {
        if (amount <= 0) throw new AppValidationException(field);
        if (decimal.Round(amount, 2) != amount) throw new AppValidationException("Amount can have at most two decimal places.");
        if (amount > MaxAmount) throw new AppValidationException("Amount is too large.");
    }

    private static string Label(string field) => field.Length == 0 ? field : char.ToUpperInvariant(field[0]) + field[1..];

    [GeneratedRegex(@"^\+?[0-9][0-9\s\-().]*$")]
    private static partial Regex PhonePattern();
}
