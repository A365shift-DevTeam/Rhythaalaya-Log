using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

/// <summary>
/// Regression suite for the 2026-09-04 finance/billing audit. Each test is labelled with its
/// audit id (FIN-xxx) and written as SETUP / ACTION / EXPECTED so the reproduced defect and the
/// fixed behaviour can be read off directly. Business timezone is Asia/Kolkata (IST).
/// </summary>
public sealed class FinanceAuditTests
{
    private static readonly DateOnly Today = TestHarness.Today;
    private static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);

    private static RecordFeePaymentRequest Payment(Guid studentId, decimal amount, Guid? feeDueId = null) =>
        new(studentId, feeDueId, amount, PaymentMethod.Cash, null, null, null, null);

    private static async Task<FeeBalanceCalculator.StudentFinancials> FinancialsAsync(TestHarness h) =>
        await new FeeBalanceCalculator(h.Db).StudentFinancialsAsync(h.Student.Id, default);

    private static decimal Allocated(TestHarness h, Guid dueId) =>
        h.Db.FeePaymentAllocations.AsNoTracking().Where(x => x.FeeDueId == dueId).Sum(x => x.Amount);

    private static void GrantSubscription(TestHarness h)
    {
        var plan = new SubscriptionPlan { Name = "Pro", Code = "PRO", MaxUsers = 10, MaxStudents = 100 };
        h.Db.Add(plan);
        h.Db.Add(new TenantSubscription
        {
            TenantId = h.TenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active,
            StartsAt = DateTimeOffset.UtcNow.AddDays(-1), EndsAt = DateTimeOffset.UtcNow.AddYears(1)
        });
        h.Db.SaveChanges();
    }

    // =====================================================================================
    // FIN-001  Refunded advance credit cannot be reused
    // =====================================================================================

    [Fact]
    public async Task FIN001_RefundedAdvance_IsNotReusedAsCredit()
    {
        // SETUP: student with no dues and no balance.
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        // ACTION: pay ₹5,000 advance, refund all of it, then a ₹2,000 fee falls due.
        var advance = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
        await h.Finance.RefundFeePaymentAsync(advance.Id, new RefundFeePaymentRequest(null, "left"), default);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        // EXPECTED: credit is ₹0 and the fee is unpaid — refunded money must never pay a bill.
        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(0m, Allocated(h, due.Id));
        Assert.Equal(FeeDueStatus.Pending, due.Status);
        var financials = await FinancialsAsync(h);
        Assert.Equal(0m, financials.AvailableCredit);
        Assert.Equal(2000m, financials.Pending);
    }

    [Fact]
    public async Task FIN001_PartialRefund_LeavesOnlyTheUnrefundedCredit()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var advance = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
        await h.Finance.RefundFeePaymentAsync(advance.Id, new RefundFeePaymentRequest(2000m, null), default);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(2000m, Allocated(h, due.Id));
        Assert.Equal(FeeDueStatus.Paid, due.Status);
        Assert.Equal(1000m, (await FinancialsAsync(h)).AvailableCredit); // 5000 - 2000 refunded - 2000 applied
    }

    [Fact]
    public async Task FIN001_PartiallyAllocatedPayment_ThenFullRefund_LeavesNoCredit()
    {
        using var h = new TestHarness();
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-20)); // one bill so far; the next is outside the 7-day notice
        var enrollment = h.Enroll(Today.AddDays(-20));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var first = h.DuesFor(enrollment.Id)[0];

        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default); // 1000 applied, 4000 credit
        Assert.Equal(4000m, (await FinancialsAsync(h)).AvailableCredit);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(null, null), default);

        var custom = await h.Finance.CreateCustomFeeDueAsync(
            new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume", 2000m, Today), default);
        Assert.Equal(0m, custom.PaidAmount);
        Assert.Equal(0m, Allocated(h, first.Id));
        Assert.Equal(0m, (await FinancialsAsync(h)).AvailableCredit);
    }

    [Fact]
    public async Task FIN001_MultipleRefunds_ReduceCreditCumulatively()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var advance = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
        await h.Finance.RefundFeePaymentAsync(advance.Id, new RefundFeePaymentRequest(2000m, null), default);
        await h.Finance.RefundFeePaymentAsync(advance.Id, new RefundFeePaymentRequest(2000m, null), default);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var due = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(1000m, Allocated(h, due.Id));
        Assert.Equal(FeeDueStatus.Partial, due.Status);
        Assert.Equal(0m, (await FinancialsAsync(h)).AvailableCredit);
    }

    [Fact]
    public async Task FIN021_Refund_DrawsFromUnappliedCreditBeforeUnpayingSettledBills()
    {
        // SETUP: ₹2,000 bill due today; ₹5,000 paid → ₹2,000 applied, ₹3,000 on account.
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today);
        var enrollment = h.Enroll(Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var due = Assert.Single(h.DuesFor(enrollment.Id));
        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status);

        // ACTION: refund ₹3,000. EXPECTED: it comes from the ₹3,000 on account; the bill stays Paid.
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(3000m, null), default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status);
        Assert.Equal(2000m, Allocated(h, due.Id));
        Assert.DoesNotContain(h.Db.FeePaymentAllocations, x => x.Amount < 0);
        var f = await FinancialsAsync(h);
        Assert.Equal(0m, f.AvailableCredit);
        Assert.Equal(0m, f.Pending);

        // Refunding beyond the credit pulls the rest back from the bill.
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(500m, null), default);
        Assert.Equal(1500m, Allocated(h, due.Id));
        Assert.Equal(FeeDueStatus.Partial, h.DuesFor(enrollment.Id)[0].Status);
        Assert.Equal(500m, (await FinancialsAsync(h)).Pending);
        // a refund can never exceed what is left
        await Assert.ThrowsAsync<AppValidationException>(() =>
            h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(1501m, null), default));
    }

    // =====================================================================================
    // FIN-002  Fee heads bill independently
    // =====================================================================================

    [Fact]
    public async Task FIN002_OneTimeRegistration_DoesNotEndMonthlyTuition()
    {
        // SETUP: monthly tuition anchored 60 days ago, 40-day upcoming window.
        using var h = new TestHarness(leadDays: 40);
        var tuitionHead = h.AddFeeHead("Tuition");
        var registrationHead = h.AddFeeHead("Registration");
        var anchor = Today.AddDays(-60);
        var tuition = await h.Finance.CreateFeeStructureAsync(
            new CreateFeeStructureRequest(h.Course.Id, "Tuition", 2000m, FeeFrequency.Monthly, anchor, null, tuitionHead.Id), default);
        // ACTION: add a one-time registration fee on a different head, dated 30 days ago.
        await h.Finance.CreateFeeStructureAsync(
            new CreateFeeStructureRequest(h.Course.Id, "Registration", 1000m, FeeFrequency.OneTime, Today.AddDays(-30), null, registrationHead.Id), default);
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        // EXPECTED: tuition plan still open; tuition keeps billing on its cadence; registration charged once on its own date.
        Assert.Null(h.Db.FeeStructures.AsNoTracking().Single(x => x.Id == tuition.Id).EffectiveTo);
        var dues = h.DuesFor(enrollment.Id);
        var tuitionDues = dues.Where(x => x.FeeHeadId == tuitionHead.Id).Select(x => x.DueDate).ToList();
        Assert.Equal(new[] { anchor, anchor.AddMonths(1), anchor.AddMonths(2), anchor.AddMonths(3) }
            .Where(d => d <= Today.AddDays(40)).ToList(), tuitionDues);
        var registration = Assert.Single(dues.Where(x => x.FeeHeadId == registrationHead.Id));
        Assert.Equal(Today.AddDays(-30), registration.DueDate);
        Assert.Equal(1000m, registration.NetAmount);
    }

    [Fact]
    public async Task FIN002_QuarterlyExamHead_RunsAlongsideMonthlyTuition()
    {
        using var h = new TestHarness(leadDays: 40);
        var tuitionHead = h.AddFeeHead("Tuition");
        var examHead = h.AddFeeHead("Exam");
        var anchor = Today.AddDays(-100);
        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Tuition", 2000m, FeeFrequency.Monthly, anchor, null, tuitionHead.Id), default);
        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Exam", 500m, FeeFrequency.Quarterly, anchor, null, examHead.Id), default);
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        int CyclesWithin(FeeFrequency f) => Enumerable.Range(0, 12).Count(k => BillingSchedule.Step(anchor, f, k) <= Today.AddDays(40));
        Assert.Equal(CyclesWithin(FeeFrequency.Monthly), dues.Count(x => x.FeeHeadId == tuitionHead.Id));
        Assert.Equal(CyclesWithin(FeeFrequency.Quarterly), dues.Count(x => x.FeeHeadId == examHead.Id));
        Assert.True(dues.Count(x => x.FeeHeadId == examHead.Id) >= 2);
    }

    [Fact]
    public async Task FIN002_SameHeadPriceChange_StillSupersedesThePreviousPlan()
    {
        using var h = new TestHarness();
        var head = h.AddFeeHead("Tuition");
        var old = await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Tuition", 2000m, FeeFrequency.Monthly, Today.AddMonths(-2), null, head.Id), default);
        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Tuition", 2500m, FeeFrequency.Monthly, Today.AddMonths(1), null, head.Id), default);
        Assert.Equal(Today.AddMonths(1).AddDays(-1), h.Db.FeeStructures.AsNoTracking().Single(x => x.Id == old.Id).EffectiveTo);
    }

    // =====================================================================================
    // FIN-003  Service before the plan date is billed; plan date is the cycle anchor
    // =====================================================================================

    [Fact]
    public async Task FIN003_JoinBeforeAnchor_FullPolicy_BillsFromBillingStart()
    {
        // SETUP: batch and student start 40 days ago; the plan is anchored 6 days from now.
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Full, leadDays: 7);
        var anchor = Today.AddDays(6);
        h.AddStructure(1000m, FeeFrequency.Monthly, anchor);
        var billingStart = Today.AddDays(-40);
        var enrollment = h.Enroll(billingStart);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        // EXPECTED: the 40 days already delivered are billed — first due on the billing start,
        // then the chain follows the anchor cadence with contiguous periods up to the horizon.
        var dues = h.DuesFor(enrollment.Id);
        Assert.NotEmpty(dues);
        Assert.Equal(billingStart, dues[0].DueDate);
        Assert.Equal(1000m, dues[0].NetAmount);
        Assert.Contains(dues, x => x.DueDate == anchor.AddMonths(-1));
        Assert.Contains(dues, x => x.DueDate == anchor);
        for (var i = 1; i < dues.Count; i++)
            Assert.Equal(dues[i - 1].PeriodEnd!.Value.AddDays(1), dues[i].PeriodStart);
    }

    [Fact]
    public async Task FIN003_JoinBeforeAnchor_SkipPolicy_StartsAtFirstCycleDateAfterBillingStart()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Skip, leadDays: 7);
        var anchor = Today.AddDays(6);
        h.AddStructure(1000m, FeeFrequency.Monthly, anchor);
        var enrollment = h.Enroll(Today.AddDays(-40));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(anchor.AddMonths(-1), dues[0].DueDate); // the partial period is skipped, not the whole pre-plan stretch
        Assert.Equal(anchor, dues[^1].DueDate);
    }

    [Fact]
    public async Task FIN003_JoinBeforeAnchor_ProratedPolicy_ChargesOnlyDaysReceived()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Prorated, leadDays: 7);
        var anchor = Today.AddDays(6);
        h.AddStructure(1000m, FeeFrequency.Monthly, anchor);
        var billingStart = Today.AddDays(-40);
        var enrollment = h.Enroll(billingStart);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var first = h.DuesFor(enrollment.Id)[0];
        var periodStart = anchor.AddMonths(-2);
        var expectedReduction = BillingSchedule.ProrationReduction(1000m, periodStart, billingStart, FeeFrequency.Monthly);
        Assert.Equal(billingStart, first.DueDate);
        Assert.Equal(periodStart, first.PeriodStart);
        Assert.Equal(1000m - expectedReduction, first.NetAmount);
        Assert.Equal(FeeAdjustmentType.Proration, Assert.Single(h.Db.FeeAdjustments.Where(x => x.FeeDueId == first.Id)).Type);
    }

    [Fact]
    public async Task FIN003_JoinOnAnchor_FirstDueIsTheAnchor()
    {
        using var h = new TestHarness(leadDays: 7);
        var anchor = Today.AddDays(-20);
        h.AddStructure(1000m, FeeFrequency.Monthly, anchor);
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        Assert.Equal(anchor, h.DuesFor(enrollment.Id)[0].DueDate);
    }

    [Fact]
    public async Task FIN003_BatchStartsAfterEnrollment_BillingStartsWithTheBatch()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Full, leadDays: 7);
        h.Batch.StartDate = Today.AddDays(-10);
        h.Db.SaveChanges();
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(6));
        var enrollment = h.Enroll(Today.AddDays(-40)); // registered a month before classes began
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(Today.AddDays(-10), dues[0].DueDate);
        Assert.DoesNotContain(dues, x => x.DueDate < Today.AddDays(-10));
    }

    // =====================================================================================
    // FIN-004  Batch / enrollment end stops billing
    // =====================================================================================

    [Fact]
    public async Task FIN004_BatchEndDate_StopsFutureDues()
    {
        using var h = new TestHarness(leadDays: 40);
        h.Batch.EndDate = Today.AddDays(-5);
        h.Db.SaveChanges();
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-100));
        var enrollment = h.Enroll(Today.AddDays(-100));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.NotEmpty(dues);
        Assert.All(dues, x => Assert.True(x.DueDate <= Today.AddDays(-5), $"due {x.DueDate} after batch end"));
    }

    [Fact]
    public async Task FIN004_EnrollmentEndDate_StopsFutureDues_EvenBeforeBatchEnd()
    {
        using var h = new TestHarness(leadDays: 40);
        h.Batch.EndDate = Today.AddDays(60);
        h.Db.SaveChanges();
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-100));
        var enrollment = h.Enroll(Today.AddDays(-100));
        enrollment.EndedOn = Today.AddDays(-5);
        h.Db.SaveChanges();
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        Assert.All(h.DuesFor(enrollment.Id), x => Assert.True(x.DueDate <= Today.AddDays(-5)));
    }

    // =====================================================================================
    // FIN-005  Withdrawal handles already-generated future dues
    // =====================================================================================

    private static async Task<(TestHarness h, Enrollment enrollment)> SeedWithUpcomingAsync(int leadDays = 40)
    {
        var h = new TestHarness(leadDays: leadDays);
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-100));
        var enrollment = h.Enroll(Today.AddDays(-100));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        Assert.Contains(h.DuesFor(enrollment.Id), x => x.Status == FeeDueStatus.Upcoming);
        return (h, enrollment);
    }

    [Fact]
    public async Task FIN005_WithdrawalBeforeUpcomingDue_CancelsIt_KeepsEarlierDues()
    {
        var (h, enrollment) = await SeedWithUpcomingAsync();
        using var _ = h;
        var before = h.DuesFor(enrollment.Id);

        await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, Today), default);

        var after = h.DuesFor(enrollment.Id);
        Assert.Equal(before.Count, after.Count); // nothing deleted — audit trail intact
        foreach (var due in after)
        {
            var periodStart = due.PeriodStart ?? due.DueDate;
            if (periodStart > Today) Assert.Equal(FeeDueStatus.Cancelled, due.Status);
            else Assert.NotEqual(FeeDueStatus.Cancelled, due.Status);
        }
        Assert.Contains(after, x => x.Status == FeeDueStatus.Cancelled && x.CancelReason!.Contains("ended", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task FIN005_WithdrawalOnOrAfterDueDate_LeavesThatDueOwed()
    {
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-20));
        var enrollment = h.Enroll(Today.AddDays(-20));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var due = Assert.Single(h.DuesFor(enrollment.Id));

        await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, due.DueDate), default);
        Assert.NotEqual(FeeDueStatus.Cancelled, h.DuesFor(enrollment.Id)[0].Status); // exit on the due date: period was started

        using var later = new TestHarness(leadDays: 7);
        later.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-20));
        var e2 = later.Enroll(Today.AddDays(-20));
        await later.Generator.EnsureForStudentAsync(later.Student.Id, default);
        await later.Academy.EndEnrollmentAsync(e2.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, Today), default);
        Assert.NotEqual(FeeDueStatus.Cancelled, later.DuesFor(e2.Id)[0].Status); // exit after the due date
    }

    [Fact]
    public async Task FIN005_PaidFutureDue_IsCancelled_AndMoneyReturnsToCredit()
    {
        var (h, enrollment) = await SeedWithUpcomingAsync();
        using var _ = h;
        var upcoming = h.DuesFor(enrollment.Id).First(x => x.Status == FeeDueStatus.Upcoming);
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1000m, upcoming.Id), default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id).Single(x => x.Id == upcoming.Id).Status);
        var pendingBefore = (await FinancialsAsync(h)).Pending;

        await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, Today), default);

        Assert.Equal(FeeDueStatus.Cancelled, h.DuesFor(enrollment.Id).Single(x => x.Id == upcoming.Id).Status);
        Assert.Equal(0m, Allocated(h, upcoming.Id));
        // Released, not refunded: the ₹1,000 goes back on account and pays the oldest overdue bill.
        Assert.DoesNotContain(h.Db.FeePayments, x => x.Amount < 0);
        var after = await FinancialsAsync(h);
        Assert.Equal(pendingBefore - 1000m, after.Pending + after.AvailableCredit);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id).First(x => x.Status != FeeDueStatus.Cancelled).Status);
    }

    [Fact]
    public async Task FIN005_PartiallyPaidFutureDue_IsCancelled_AndPartReturnsToCredit()
    {
        var (h, enrollment) = await SeedWithUpcomingAsync();
        using var _ = h;
        var upcoming = h.DuesFor(enrollment.Id).First(x => x.Status == FeeDueStatus.Upcoming);
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 400m, upcoming.Id), default);
        var pendingBefore = (await FinancialsAsync(h)).Pending;

        await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, Today), default);

        Assert.Equal(FeeDueStatus.Cancelled, h.DuesFor(enrollment.Id).Single(x => x.Id == upcoming.Id).Status);
        Assert.Equal(0m, Allocated(h, upcoming.Id));
        var after = await FinancialsAsync(h);
        Assert.Equal(pendingBefore - 400m, after.Pending + after.AvailableCredit); // the ₹400 came back and paid down the oldest bill
        Assert.Equal(400m, Allocated(h, h.DuesFor(enrollment.Id).First(x => x.Status != FeeDueStatus.Cancelled).Id));
    }

    [Fact]
    public async Task FIN005_ArchivingStudent_AlsoCancelsFutureDues()
    {
        var (h, enrollment) = await SeedWithUpcomingAsync();
        using var _ = h;
        await h.Academy.ArchiveStudentAsync(h.Student.Id, default);
        Assert.All(h.DuesFor(enrollment.Id).Where(x => (x.PeriodStart ?? x.DueDate) > Today),
            x => Assert.Equal(FeeDueStatus.Cancelled, x.Status));
    }

    // =====================================================================================
    // FIN-006  Archived students keep their receivables
    // =====================================================================================

    [Fact]
    public async Task FIN006_ArchivedStudentBalance_StaysInReceivables()
    {
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(5000m, FeeFrequency.Monthly, Today.AddDays(-20));
        h.Enroll(Today.AddDays(-20));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        Assert.Equal(5000m, (await h.Reporting.GetFinanceDashboardAsync(new FinanceDashboardQuery(), default)).TotalPending);

        await h.Academy.ArchiveStudentAsync(h.Student.Id, default);

        var dashboard = await h.Reporting.GetFinanceDashboardAsync(new FinanceDashboardQuery(), default);
        Assert.Equal(5000m, dashboard.TotalPending);
        Assert.Equal(5000m, dashboard.TotalOverdue);
        Assert.Equal(5000m, (await h.Academy.GetDashboardAsync(Today, default)).OutstandingFees);
        Assert.Equal(5000m, (await h.Reporting.GetBatchFinanceAsync(h.Batch.Id, default)).Pending);
    }

    // =====================================================================================
    // FIN-007  Refunds are contra-revenue, not expenses
    // =====================================================================================

    [Theory]
    [InlineData(2000, 2000)]
    [InlineData(2000, 500)]
    public async Task FIN007_Refund_ReducesNetRevenue_NeverExpenses(decimal paid, decimal refunded)
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, paid), default);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(refunded, null), default);

        var summary = await h.Finance.GetFinanceAsync(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1), default);
        Assert.Equal(paid, summary.Income);
        Assert.Equal(refunded, summary.Refunds);
        Assert.Equal(0m, summary.Expenses);
        Assert.Equal(paid - refunded, summary.Net);
        var refundRow = Assert.Single(summary.Transactions.Where(x => x.Category == "Refund"));
        Assert.Equal(TransactionType.Income, refundRow.Type);
        Assert.Equal(-refunded, refundRow.Amount);
    }

    [Fact]
    public async Task FIN007_MultipleRefunds_StayConsistent()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 3000m), default);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(1000m, null), default);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(500m, null), default);
        var summary = await h.Finance.GetFinanceAsync(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1), default);
        Assert.Equal(3000m, summary.Income);
        Assert.Equal(1500m, summary.Refunds);
        Assert.Equal(0m, summary.Expenses);
        Assert.Equal(1500m, summary.Net);
    }

    // =====================================================================================
    // FIN-008  "Collected today" nets refunds and uses the IST business day
    // =====================================================================================

    [Fact]
    public async Task FIN008_CollectedToday_IsNetOfSameDayRefund()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 2000m), default);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(null, null), default);
        Assert.Equal(0m, (await h.Academy.GetDashboardAsync(Today, default)).CollectedFees);
    }

    [Theory]
    [InlineData("2026-09-03T23:59:00", "2026-09-03")]
    [InlineData("2026-09-04T00:00:00", "2026-09-04")]
    [InlineData("2026-09-04T05:29:00", "2026-09-04")]
    [InlineData("2026-09-04T05:30:00", "2026-09-04")]
    [InlineData("2026-09-04T06:00:00", "2026-09-04")]
    public async Task FIN008_CollectedToday_UsesIstBusinessDay(string istLocal, string expectedDay)
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var instant = new DateTimeOffset(DateTime.Parse(istLocal), Ist);
        using (BusinessClock.Override(instant))
            await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 2000m), default);

        var day = DateOnly.Parse(expectedDay);
        Assert.Equal(2000m, (await h.Academy.GetDashboardAsync(day, default)).CollectedFees);
        Assert.Equal(0m, (await h.Academy.GetDashboardAsync(day.AddDays(-1), default)).CollectedFees);
        Assert.Equal(0m, (await h.Academy.GetDashboardAsync(day.AddDays(1), default)).CollectedFees);
    }

    // =====================================================================================
    // FIN-009  Grace period: Overdue only once today > due date + grace days
    // =====================================================================================

    [Theory]
    [InlineData(0, 0, "Pending")]
    [InlineData(0, 1, "Overdue")]   // current academy rule: overdue the day after the due date
    [InlineData(3, 3, "Pending")]   // grace 3: 13 Sept is still within grace for a 10 Sept due
    [InlineData(3, 4, "Overdue")]   // 14 Sept is overdue
    public async Task FIN009_GraceDays_DefineOverdue(int graceDays, int daysPastDue, string expected)
    {
        using var h = new TestHarness();
        h.Settings.FeeOverdueGraceDays = graceDays;
        h.Db.SaveChanges();
        var enrollment = h.Enroll(Today.AddDays(-30));
        await h.Finance.CreateCustomFeeDueAsync(
            new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Exam", 500m, Today.AddDays(-daysPastDue)), default);
        await h.Generator.RefreshDateDrivenStatusesAsync(h.Student.Id, default);
        Assert.Equal(Enum.Parse<FeeDueStatus>(expected), Assert.Single(h.DuesFor(enrollment.Id)).Status);
    }

    // =====================================================================================
    // FIN-010 / FIN-011  Credit and Upcoming bills
    // =====================================================================================

    [Fact]
    public async Task FIN010_ExistingCredit_StaysAvailable_UntilAFutureBillArrives()
    {
        // SETUP: ₹5,000 on account before any bill exists; then a future bill is generated.
        using var h = new TestHarness(leadDays: 20);
        var enrollment = h.Enroll(Today);
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
        var dueDate = Today.AddDays(10);
        h.AddStructure(2000m, FeeFrequency.Monthly, dueDate);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var upcoming = Assert.Single(h.DuesFor(enrollment.Id));
        Assert.Equal(FeeDueStatus.Upcoming, upcoming.Status);

        // Not yet due: nothing is drawn, all ₹5,000 is visible as available credit.
        Assert.Equal(0m, Allocated(h, upcoming.Id));
        var before = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
        Assert.Equal(5000m, before.Summary.AvailableCredit + before.Summary.ReservedCredit);
        Assert.Equal(5000m, before.Summary.AvailableCredit);

        // The day it falls due, credit pays it and the remainder stays available.
        using (BusinessClock.Override(new DateTimeOffset(dueDate.ToDateTime(new TimeOnly(9, 0)), Ist)))
            await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status);
        Assert.Equal(3000m, (await FinancialsAsync(h)).AvailableCredit);
    }

    [Fact]
    public async Task FIN010_PaymentWhileAFutureBillIsListed_SettlesItEarly_RemainderIsCredit()
    {
        // SETUP: current ₹2,000 (due today) and upcoming ₹2,000 (due in 10 days).
        using var h = new TestHarness(leadDays: 20);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(-20));
        var enrollment = h.Enroll(Today.AddDays(-20));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var dues = h.DuesFor(enrollment.Id);
        Assert.Equal(2, dues.Count);
        Assert.Equal(FeeDueStatus.Upcoming, dues[1].Status);

        // ACTION: the student pays ₹5,000 from the Record Fee screen (no specific bill chosen).
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);

        // EXPECTED: current bill paid, the listed upcoming bill paid early, ₹1,000 left on account.
        dues = h.DuesFor(enrollment.Id);
        Assert.All(dues, d => Assert.Equal(FeeDueStatus.Paid, d.Status));
        var f = await FinancialsAsync(h);
        Assert.Equal(1000m, f.AvailableCredit);
        Assert.Equal(0m, f.ReservedCredit);
        Assert.Equal(0m, (await h.Academy.GetStudentAsync(h.Student.Id, default)).UpcomingAmount);
    }

    [Fact]
    public async Task FIN010_ExplicitPrepaymentOfUpcomingDue_IsReportedAsReservedCredit()
    {
        using var h = new TestHarness(leadDays: 20);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(10));
        var enrollment = h.Enroll(Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var upcoming = Assert.Single(h.DuesFor(enrollment.Id));

        // Part-payment of a future bill: the bill stays Upcoming and the money is shown as reserved.
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1500m, upcoming.Id), default);

        var ledger = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
        Assert.Equal(FeeDueStatus.Upcoming, h.DuesFor(enrollment.Id)[0].Status);
        Assert.Equal(1500m, ledger.Summary.ReservedCredit);
        Assert.Equal(0m, ledger.Summary.AvailableCredit);
        Assert.Equal(0m, ledger.Summary.Pending);
        Assert.Equal(-1500m, ledger.Entries[^1].Balance); // the ledger's closing credit equals reserved + available

        // Paying the rest settles the bill early: it becomes Paid and the ledger shows the charge
        // against the payments — nothing is hidden, the money is consumed by a visible charge.
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, upcoming.Id), default);
        ledger = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status);
        Assert.Equal(0m, ledger.Summary.ReservedCredit);
        Assert.Equal(2000m, ledger.Summary.TotalPaid);
        Assert.Equal(2000m, ledger.Summary.TotalCharged);
        Assert.Equal(0m, ledger.Entries[^1].Balance);
    }

    [Fact]
    public async Task FIN011_CancellingUpcomingDue_ReleasesItsCredit_WithoutRefund()
    {
        using var h = new TestHarness(leadDays: 20);
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(10));
        var enrollment = h.Enroll(Today);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var upcoming = Assert.Single(h.DuesFor(enrollment.Id));
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 2000m, upcoming.Id), default);

        var cancelled = await h.Finance.CancelFeeDueAsync(upcoming.Id, new CancelFeeDueRequest("not running"), default);

        Assert.Equal(FeeDueStatus.Cancelled, cancelled.Status);
        Assert.Equal(0m, Allocated(h, upcoming.Id));
        Assert.Equal(2000m, (await FinancialsAsync(h)).AvailableCredit);
        Assert.DoesNotContain(h.Db.FeePayments, x => x.Amount < 0);
        Assert.Contains(h.Db.FeePaymentAllocations, x => x.Amount < 0 && x.ReversalOfAllocationId != null); // append-only release
    }

    // =====================================================================================
    // FIN-012  Every scheduled due names its billing period
    // =====================================================================================

    [Fact]
    public async Task FIN012_ScheduledDues_CarryContiguousPeriods_AndTheLedgerShowsThem()
    {
        using var h = new TestHarness(leadDays: 7);
        var anchor = Today.AddDays(-70);
        h.AddStructure(1000m, FeeFrequency.Monthly, anchor, name: "Tuition");
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        Assert.True(dues.Count >= 2);
        Assert.Equal(anchor, dues[0].PeriodStart);
        Assert.Equal(anchor.AddMonths(1).AddDays(-1), dues[0].PeriodEnd);
        Assert.Equal(dues[0].PeriodEnd!.Value.AddDays(1), dues[1].PeriodStart);

        var dto = (await h.Finance.GetStudentFeeDuesAsync(h.Student.Id, default)).Single(x => x.Id == dues[0].Id);
        Assert.Equal(anchor, dto.PeriodStart);

        var ledger = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
        var charge = ledger.Entries.First(x => x.FeeDueId == dues[0].Id);
        Assert.Contains("Tuition", charge.Description);
        Assert.Contains(anchor.ToString("d MMM", System.Globalization.CultureInfo.InvariantCulture), charge.Description);
    }

    // =====================================================================================
    // FIN-013  Join / enrollment / exit dates use the IST business date
    // =====================================================================================

    [Theory]
    [InlineData("2026-09-03T23:59:00", "2026-09-03")]
    [InlineData("2026-09-04T00:00:00", "2026-09-04")]
    [InlineData("2026-09-04T05:29:00", "2026-09-04")]
    [InlineData("2026-09-04T05:30:00", "2026-09-04")]
    [InlineData("2026-09-04T06:00:00", "2026-09-04")]
    public async Task FIN013_DefaultJoinEnrollAndExitDates_AreIstBusinessDates(string istLocal, string expectedDay)
    {
        using var h = new TestHarness();
        GrantSubscription(h);
        var expected = DateOnly.Parse(expectedDay);
        using var _ = BusinessClock.Override(new DateTimeOffset(DateTime.Parse(istLocal), Ist));

        var student = await h.Academy.CreateStudentAsync(new CreateStudentRequest("Arun", null, null, null, null, null, null), default);
        Assert.Equal(expected, student.JoinDate);

        var enrolled = await h.Academy.CreateEnrollmentAsync(new CreateEnrollmentRequest(student.Id, h.Batch.Id, null), default);
        var enrollment = enrolled.Enrollments.Single();
        Assert.Equal(expected, enrollment.EnrolledOn);

        var ended = await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, null), default);
        Assert.Equal(expected, ended.Enrollments.Single().EndedOn);
    }

    // =====================================================================================
    // FIN-014  A plan's effective date can be corrected while nothing has been billed from it
    // =====================================================================================

    [Fact]
    public async Task FIN014_EffectiveFrom_CanMoveEarlier_UntilDuesExist()
    {
        using var h = new TestHarness(leadDays: 7);
        var plan = h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddDays(6), name: "Tuition");

        var corrected = await h.Finance.UpdateFeeStructureAsync(plan.Id,
            new UpdateFeeStructureRequest("Tuition", null, true, null, Today.AddDays(-30)), default);
        Assert.Equal(Today.AddDays(-30), corrected.EffectiveFrom);

        h.Enroll(Today.AddDays(-30));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        await Assert.ThrowsAsync<ConflictException>(() => h.Finance.UpdateFeeStructureAsync(plan.Id,
            new UpdateFeeStructureRequest("Tuition", null, true, null, Today.AddDays(-60)), default));
    }

    [Fact]
    public async Task FIN014_EffectiveFrom_CannotOverlapAnEarlierPlanOfTheSameHead()
    {
        using var h = new TestHarness();
        var head = h.AddFeeHead("Tuition");
        h.AddStructure(2000m, FeeFrequency.Monthly, Today.AddMonths(-3), Today.AddMonths(1).AddDays(-1), feeHeadId: head.Id);
        var next = h.AddStructure(2500m, FeeFrequency.Monthly, Today.AddMonths(1), feeHeadId: head.Id);
        await Assert.ThrowsAsync<ConflictException>(() => h.Finance.UpdateFeeStructureAsync(next.Id,
            new UpdateFeeStructureRequest(next.Name, null, true, head.Id, Today.AddMonths(-1)), default));
    }

    // =====================================================================================
    // FIN-015  Frequency changes keep periods contiguous
    // =====================================================================================

    private static void AssertContiguous(IReadOnlyList<FeeDue> dues)
    {
        for (var i = 1; i < dues.Count; i++)
        {
            Assert.NotNull(dues[i - 1].PeriodEnd);
            Assert.Equal(dues[i - 1].PeriodEnd!.Value.AddDays(1), dues[i].PeriodStart);
        }
    }

    [Fact]
    public async Task FIN015_MonthlyToQuarterly_NoGapNoOverlap()
    {
        using var h = new TestHarness(leadDays: 7);
        var anchor = Today.AddDays(-100);
        var monthly = await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Monthly", 2000m, FeeFrequency.Monthly, anchor, null), default);
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var billed = h.DuesFor(enrollment.Id);
        var switchDate = billed[^1].PeriodEnd!.Value.AddDays(1);

        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Quarterly", 6000m, FeeFrequency.Quarterly, switchDate, null), default);
        h.Settings.FeeDueLeadDays = 200;
        h.Db.SaveChanges();
        await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        AssertContiguous(dues);
        var firstQuarterly = dues.First(x => x.FeeStructureId != monthly.Id);
        Assert.Equal(switchDate, firstQuarterly.DueDate);
        Assert.Equal(switchDate.AddMonths(3).AddDays(-1), firstQuarterly.PeriodEnd);
        Assert.Equal(6000m, firstQuarterly.NetAmount);
        Assert.DoesNotContain(dues, x => x.FeeStructureId == monthly.Id && x.DueDate >= switchDate);
    }

    [Fact]
    public async Task FIN015_QuarterlyToMonthly_NoGapNoOverlap()
    {
        using var h = new TestHarness(leadDays: 7);
        var anchor = Today.AddDays(-100);
        var quarterly = await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Quarterly", 6000m, FeeFrequency.Quarterly, anchor, null), default);
        var enrollment = h.Enroll(anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var switchDate = h.DuesFor(enrollment.Id)[^1].PeriodEnd!.Value.AddDays(1);

        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Monthly", 2000m, FeeFrequency.Monthly, switchDate, null), default);
        h.Settings.FeeDueLeadDays = 200;
        h.Db.SaveChanges();
        await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);

        var dues = h.DuesFor(enrollment.Id);
        AssertContiguous(dues);
        var monthlyDues = dues.Where(x => x.FeeStructureId != quarterly.Id).ToList();
        Assert.True(monthlyDues.Count >= 2);
        Assert.Equal(switchDate, monthlyDues[0].DueDate);
        Assert.Equal(switchDate.AddMonths(1), monthlyDues[1].DueDate);
    }

    // =====================================================================================
    // FIN-016  Identical custom charges keep separate identities
    // =====================================================================================

    [Fact]
    public async Task FIN016_TwoGenuineIdenticalCharges_StaySeparate()
    {
        using var h = new TestHarness();
        var enrollment = h.Enroll(Today);
        var request = new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume", 500m, Today);
        var first = await h.Finance.CreateCustomFeeDueAsync(request, default);
        // The first charge was raised ten minutes ago — a second identical charge is a new bill, not a double-click.
        var row = h.Db.FeeDues.Single(x => x.Id == first.Id);
        row.CreatedAt = DateTimeOffset.UtcNow.AddMinutes(-10);
        h.Db.SaveChanges();

        var second = await h.Finance.CreateCustomFeeDueAsync(request, default);

        Assert.NotEqual(first.Id, second.Id);
        Assert.Equal(2, h.DuesFor(enrollment.Id).Count);
        Assert.Equal(1000m, (await FinancialsAsync(h)).Pending);
    }

    // =====================================================================================
    // FIN-017  Refunds use their own credit-note series
    // =====================================================================================

    [Fact]
    public async Task FIN017_Refunds_AreNumberedFromTheCreditNoteSeries()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var p1 = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1000m), default);
        var refund = await h.Finance.RefundFeePaymentAsync(p1.Id, new RefundFeePaymentRequest(null, null), default);
        var p2 = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1000m), default);

        Assert.Equal("REC-000001", p1.ReceiptNumber);
        Assert.Equal("CN-000001", refund.ReceiptNumber);
        Assert.Equal("REC-000002", p2.ReceiptNumber); // the receipt series is not consumed by refunds
    }

    // =====================================================================================
    // FIN-020  Reconciliation invariants
    // =====================================================================================

    [Fact]
    public async Task FIN020_LedgerClosingBalance_ReconcilesWithPendingAndCredit()
    {
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-70), name: "Tuition");
        var enrollment = h.Enroll(Today.AddDays(-70));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var dues = h.DuesFor(enrollment.Id);
        await h.Finance.AddFeeAdjustmentAsync(dues[0].Id, new AddFeeAdjustmentRequest(FeeAdjustmentType.Discount, 200m, "sibling"), default);
        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1500m), default);
        await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(300m, null), default);
        await h.Finance.CreateCustomFeeDueAsync(new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume", 500m, Today), default);

        var ledger = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
        var f = await FinancialsAsync(h);
        var closing = ledger.Entries[^1].Balance;
        Assert.Equal(f.Pending - f.AvailableCredit - ledger.Summary.ReservedCredit, closing);
        Assert.Equal(ledger.Summary.NetCharged - ledger.Summary.TotalPaid + ledger.Summary.TotalRefunded, closing);
    }

    [Fact]
    public async Task FIN020_PaidDue_StaysPaid_AcrossUnrelatedOperations()
    {
        using var h = new TestHarness(leadDays: 40);
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(-40));
        var enrollment = h.Enroll(Today.AddDays(-40));
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        var first = h.DuesFor(enrollment.Id)[0];
        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1000m, first.Id), default);

        h.SetConcession(10m, "sibling");
        await h.Generator.ResyncConcessionAsync(h.Student.Id, default);
        await h.Finance.CreateCustomFeeDueAsync(new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume", 500m, Today), default);
        await h.Finance.CancelFeeDueAsync(h.DuesFor(enrollment.Id).Last(x => x.Status == FeeDueStatus.Upcoming).Id, new CancelFeeDueRequest("x"), default);
        await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);

        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id).Single(x => x.Id == first.Id).Status);
    }
}
