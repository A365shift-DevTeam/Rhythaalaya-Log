using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class FinanceServiceTests
{
    private static readonly DateOnly Today = TestHarness.Today;
    private static readonly DateOnly Anchor = Today.AddMonths(-3);

    private static RecordFeePaymentRequest Payment(Guid studentId, decimal amount, Guid? feeDueId = null,
        string? idempotencyKey = null, string? remarks = null) =>
        new(studentId, feeDueId, amount, PaymentMethod.Cash, null, remarks, null, idempotencyKey);

    private static async Task<(TestHarness h, Enrollment enrollment, List<FeeDue> dues)> SeedBilledEnrollmentAsync(
        int leadDays = 7)
    {
        var h = new TestHarness(leadDays: leadDays);
        h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var enrollment = h.Enroll(Anchor);
        await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
        return (h, enrollment, h.DuesFor(enrollment.Id));
    }

    [Fact]
    public async Task AutoAllocation_PaysOldestDuesFirst()
    {
        var (h, enrollment, dues) = await SeedBilledEnrollmentAsync();
        using var _ = h;

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 2500m), default);

        var refreshed = h.DuesFor(enrollment.Id);
        Assert.Equal(FeeDueStatus.Paid, refreshed[0].Status);
        Assert.Equal(FeeDueStatus.Paid, refreshed[1].Status);
        var partiallyPaid = await h.Db.FeePaymentAllocations.Where(x => x.FeeDueId == refreshed[2].Id)
            .SumAsync(x => x.Amount);
        Assert.Equal(500m, partiallyPaid);
    }

    [Fact]
    public async Task SpecificDuePayment_CannotExceedRemainingBalance()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        await Assert.ThrowsAsync<AppValidationException>(() =>
            h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1500m, dues[0].Id), default));
    }

    [Fact]
    public async Task AdvancePaymentCredit_AutoAppliesToNewDues()
    {
        var (h, enrollment, dues) = await SeedBilledEnrollmentAsync();
        using var _ = h;
        var totalOutstanding = dues.Sum(x => x.NetAmount);

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, totalOutstanding + 500m), default);
        Assert.All(h.DuesFor(enrollment.Id), x => Assert.Equal(FeeDueStatus.Paid, x.Status));

        // a new due draws down the remaining 500 credit automatically
        var custom = await h.Finance.CreateCustomFeeDueAsync(
            new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume fee", 800m, Today), default);
        Assert.Equal(500m, custom.PaidAmount);
        Assert.Equal(300m, custom.BalanceAmount);
        Assert.Equal(FeeDueStatus.Partial, custom.Status);
    }

    [Fact]
    public async Task IdempotentReplay_ReturnsOriginalPayment()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        var first = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, dues[0].Id, "key-1"), default);
        var replay = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, dues[0].Id, "key-1"), default);

        Assert.Equal(first.Id, replay.Id);
        Assert.Equal(1, await h.Db.FeePayments.CountAsync());
    }

    [Fact]
    public async Task IdempotencyKeyReuse_WithDifferentPayload_Conflicts()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, dues[0].Id, "key-1"), default);

        await Assert.ThrowsAsync<ConflictException>(() =>
            h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 700m, dues[0].Id, "key-1"), default));
    }

    [Fact]
    public async Task Refund_ReversesAllocations_AndRestoresDueBalance()
    {
        var (h, enrollment, dues) = await SeedBilledEnrollmentAsync();
        using var _ = h;

        var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 1000m, dues[0].Id), default);
        Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status);

        var refund = await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(null, "test"), default);

        Assert.Equal(-1000m, refund.Amount);
        Assert.Equal(payment.Id, refund.RefundOfPaymentId);
        var netAllocated = await h.Db.FeePaymentAllocations.Where(x => x.FeeDueId == dues[0].Id).SumAsync(x => x.Amount);
        Assert.Equal(0m, netAllocated);
        Assert.Equal(FeeDueStatus.Overdue, h.DuesFor(enrollment.Id)[0].Status); // past-due again once money is pulled back
        var reversal = h.Db.FeePaymentAllocations.Single(x => x.Amount < 0);
        Assert.NotNull(reversal.ReversalOfAllocationId);

        // a second full refund must be rejected
        await Assert.ThrowsAsync<AppValidationException>(() =>
            h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(1000m, null), default));
    }

    [Fact]
    public async Task Discount_ReducesNetAmount_AndFullWaiverSettlesDue()
    {
        var (h, enrollment, dues) = await SeedBilledEnrollmentAsync();
        using var _ = h;
        var due = dues[^1];

        var afterDiscount = await h.Finance.AddFeeAdjustmentAsync(due.Id,
            new AddFeeAdjustmentRequest(FeeAdjustmentType.Discount, 200m, "Sibling discount"), default);
        Assert.Equal(800m, afterDiscount.NetAmount);
        Assert.Equal(200m, afterDiscount.DiscountAmount);

        var afterWaiver = await h.Finance.AddFeeAdjustmentAsync(due.Id,
            new AddFeeAdjustmentRequest(FeeAdjustmentType.Waiver, 800m, "Scholarship"), default);
        Assert.Equal(0m, afterWaiver.NetAmount);
        Assert.Equal(FeeDueStatus.Paid, afterWaiver.Status); // fully waived = settled

        var history = await h.Finance.GetFeeAdjustmentsAsync(due.Id, default);
        Assert.Equal(2, history.Count);
    }

    [Fact]
    public async Task Adjustment_BelowAlreadyPaidAmount_IsRejected()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, dues[0].Id), default);

        await Assert.ThrowsAsync<AppValidationException>(() => h.Finance.AddFeeAdjustmentAsync(dues[0].Id,
            new AddFeeAdjustmentRequest(FeeAdjustmentType.Discount, 600m, "Too deep"), default));
    }

    [Fact]
    public async Task Cancel_WithAllocatedMoney_IsRejected()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m, dues[0].Id), default);

        await Assert.ThrowsAsync<ConflictException>(() =>
            h.Finance.CancelFeeDueAsync(dues[0].Id, new CancelFeeDueRequest("mistake"), default));
    }

    [Fact]
    public async Task Cancel_UnpaidDue_Succeeds_AndIsSticky()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        var cancelled = await h.Finance.CancelFeeDueAsync(dues[0].Id, new CancelFeeDueRequest("student on leave"), default);

        Assert.Equal(FeeDueStatus.Cancelled, cancelled.Status);
        Assert.Equal("student on leave", cancelled.CancelReason);
        Assert.NotNull(cancelled.CancelledAt);

        // date-driven refresh must never resurrect a cancelled due
        await h.Generator.RefreshDateDrivenStatusesAsync(h.Student.Id, default);
        Assert.Equal(FeeDueStatus.Cancelled, h.Db.FeeDues.AsNoTracking().Single(x => x.Id == dues[0].Id).Status);
    }

    [Fact]
    public async Task CustomDue_HasTitleAndNoStructure_StatusByDate()
    {
        var (h, enrollment, _) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        var future = await h.Finance.CreateCustomFeeDueAsync(
            new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Exam fee", 400m, Today.AddDays(10)), default);

        Assert.Equal("Exam fee", future.Title);
        Assert.Null(future.FeeStructureId);
        Assert.Equal(FeeDueStatus.Upcoming, future.Status);
    }

    [Fact]
    public async Task CustomDue_DoubleSubmit_ReturnsExistingInsteadOfDuplicating()
    {
        var (h, enrollment, _) = await SeedBilledEnrollmentAsync();
        using var _1 = h;
        var request = new CreateCustomFeeDueRequest(h.Student.Id, enrollment.Id, "Costume fee", 750m, Today);

        var first = await h.Finance.CreateCustomFeeDueAsync(request, default);
        var second = await h.Finance.CreateCustomFeeDueAsync(request, default);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, h.Db.FeeDues.Count(x => x.FeeStructureId == null));
    }

    [Fact]
    public async Task BatchCharge_CreatesOneDuePerActiveStudent_AndIsSafeToRepeat()
    {
        var (h, _, _) = await SeedBilledEnrollmentAsync();
        using var _1 = h;
        var student2 = new Student { TenantId = h.TenantId, StudentNumber = "S-002", Name = "Anya", JoinDate = Anchor };
        var enrollment2 = new Enrollment
        {
            TenantId = h.TenantId, Student = student2, BatchId = h.Batch.Id, CourseId = h.Course.Id, EnrolledOn = Anchor
        };
        var withdrawnStudent = new Student { TenantId = h.TenantId, StudentNumber = "S-003", Name = "Left", JoinDate = Anchor };
        var withdrawnEnrollment = new Enrollment
        {
            TenantId = h.TenantId, Student = withdrawnStudent, BatchId = h.Batch.Id, CourseId = h.Course.Id,
            EnrolledOn = Anchor, Status = EnrollmentStatus.Withdrawn
        };
        h.Db.AddRange(enrollment2, withdrawnEnrollment);
        h.Db.SaveChanges();

        var request = new CreateBatchCustomFeeDueRequest(h.Batch.Id, "Annual day fee", 500m, Today);
        var created = await h.Finance.CreateCustomFeeDuesForBatchAsync(request, default);

        Assert.Equal(2, created.Count); // both active students, not the withdrawn one
        Assert.All(created, due =>
        {
            Assert.Equal("Annual day fee", due.Title);
            Assert.Equal(500m, due.Amount);
            Assert.Null(due.FeeStructureId);
        });

        var repeat = await h.Finance.CreateCustomFeeDuesForBatchAsync(request, default);
        Assert.Equal(2, repeat.Count);
        Assert.Equal(2, h.Db.FeeDues.Count(x => x.FeeStructureId == null)); // no duplicates on re-run
    }

    [Fact]
    public async Task FutureDatedFeeStructure_DoesNotDeactivateCurrentPlan()
    {
        using var h = new TestHarness();
        var current = h.AddStructure(1000m, FeeFrequency.Monthly, Anchor);
        var futureStart = Today.AddMonths(1);

        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(
            h.Course.Id, "New rate", 1500m, FeeFrequency.Monthly, futureStart, null), default);

        var reloaded = h.Db.FeeStructures.AsNoTracking().Single(x => x.Id == current.Id);
        Assert.True(reloaded.IsActive); // still the live plan until the new one starts
        Assert.Equal(futureStart.AddDays(-1), reloaded.EffectiveTo);
    }

    [Fact]
    public async Task ReceiptNumbers_IncrementSequentially()
    {
        var (h, _, dues) = await SeedBilledEnrollmentAsync();
        using var _1 = h;

        var p1 = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 100m, dues[0].Id), default);
        var p2 = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 100m, dues[0].Id), default);

        Assert.Equal("REC-000001", p1.ReceiptNumber);
        Assert.Equal("REC-000002", p2.ReceiptNumber);
    }
}
