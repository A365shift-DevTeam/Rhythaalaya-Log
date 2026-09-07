using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

/// <summary>
/// Regression suite for the 2026-09-07 academy-admin QA pass (money items). Same FIN-xxx
/// convention as <see cref="FinanceAuditTests"/>: SETUP / ACTION / EXPECTED.
/// </summary>
public sealed class FinanceQaTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static RecordFeePaymentRequest Payment(Guid studentId, decimal amount, DateTimeOffset? paidOn = null) =>
        new(studentId, null, amount, PaymentMethod.Cash, null, null, paidOn, null);

    // =====================================================================================
    // FIN-022  Payment amounts must be whole paise (a ₹0.001 payment became a ₹0.00 receipt)
    // =====================================================================================

    [Theory]
    [InlineData(0.001)]
    [InlineData(100.005)]
    public async Task FIN022_PaymentWithFractionalPaise_IsRejected(double raw)
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var amount = (decimal)raw;

        await Assert.ThrowsAsync<AppValidationException>(() =>
            h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, amount), default));
        Assert.Empty(h.Db.FeePayments);
    }

    [Fact]
    public async Task FIN022_ManualTransactionWithFractionalPaise_IsRejected()
    {
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() => h.Finance.CreateTransactionAsync(
            new CreateTransactionRequest("Hall rent", TransactionType.Income, 0.001m, "Other Income", null), default));
        Assert.Empty(h.Db.Transactions);
    }

    // =====================================================================================
    // FIN-023  Future-dated payments are rejected (a 2030 receipt was accepted)
    // =====================================================================================

    [Fact]
    public async Task FIN023_PaymentDatedAfterBusinessToday_IsRejected()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var tomorrowIst = new DateTimeOffset(Today.AddDays(1).ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(5.5));

        await Assert.ThrowsAsync<AppValidationException>(() =>
            h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, tomorrowIst), default));
        Assert.Empty(h.Db.FeePayments);
    }

    [Fact]
    public async Task FIN023_PaymentDatedLaterTodayOrInThePast_IsAccepted()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var laterToday = new DateTimeOffset(Today.ToDateTime(new TimeOnly(23, 30)), TimeSpan.FromHours(5.5));
        var lastWeek = new DateTimeOffset(Today.AddDays(-7).ToDateTime(new TimeOnly(10, 0)), TimeSpan.FromHours(5.5));

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, laterToday), default);
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, lastWeek), default);
        Assert.Equal(2, h.Db.FeePayments.Count());
    }

    // =====================================================================================
    // FIN-024  "Fees collected today" counts only fee receipts, never manual income entries
    // =====================================================================================

    [Fact]
    public async Task FIN024_DashboardCollectedToday_ExcludesManualIncome()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 2000m), default);
        await h.Finance.CreateTransactionAsync(
            new CreateTransactionRequest("Hall rent received", TransactionType.Income, 9000m, "Other Income", null), default);

        var dashboard = await h.Academy.GetDashboardAsync(Today, default);
        Assert.Equal(2000m, dashboard.CollectedFees);
    }

    [Fact]
    public async Task FIN024_ManualIncomeUnderStudentFees_IsRejected()
    {
        // Fee receipts are the only source of "Student Fees" income; a manual entry would double count.
        using var h = new TestHarness();
        await Assert.ThrowsAsync<AppValidationException>(() => h.Finance.CreateTransactionAsync(
            new CreateTransactionRequest("Cash from Arun", TransactionType.Income, 1000m, "student fees", null), default));

        var other = await h.Finance.CreateTransactionAsync(
            new CreateTransactionRequest("Hall rent", TransactionType.Income, 1000m, "Other Income", null), default);
        await Assert.ThrowsAsync<AppValidationException>(() => h.Finance.UpdateTransactionAsync(other.Id,
            new UpdateTransactionRequest("Hall rent", TransactionType.Income, 1000m, "Student Fees", null), default));
    }
}
