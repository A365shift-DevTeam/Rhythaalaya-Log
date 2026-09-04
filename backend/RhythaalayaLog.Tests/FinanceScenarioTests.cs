using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;
using Xunit.Abstractions;

namespace RhythaalayaLog.Tests;

/// <summary>
/// Phase 11 of the 2026-09-04 finance audit: the "Bright Future Academy" walk-through, executed
/// against the real service layer with the business clock pinned to IST. Every step asserts the
/// figure the report quotes, and the output lists the actual values.
/// </summary>
public sealed class FinanceScenarioTests(ITestOutputHelper output)
{
    private static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);
    private static DateTimeOffset At(int year, int month, int day, int hour = 10, int minute = 0) =>
        new(new DateTime(year, month, day, hour, minute, 0), Ist);
    private static DateOnly D(int y, int m, int d) => new(y, m, d);

    private static RecordFeePaymentRequest Payment(Guid studentId, decimal amount, Guid? feeDueId = null) =>
        new(studentId, feeDueId, amount, PaymentMethod.Cash, null, null, null, null);

    [Fact]
    public async Task BrightFutureAcademy_EndToEnd()
    {
        // ---- Academy, course, batch, plan ---------------------------------------------------
        // Tuition ₹2,000 monthly, cycle anchored on the 10th, course notice 7 days, grace 0.
        // Batch 1 Jun – 30 Oct 2026. Arun joins 4 Sept 2026. Late-enrollment policy: Full.
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Full, leadDays: 7, courseNoticeDays: 7);
        h.Settings.Name = "Bright Future Academy";
        h.Course.Name = "Computer Science";
        h.Batch.StartDate = D(2026, 6, 1);
        h.Batch.EndDate = D(2026, 10, 30);
        h.Db.SaveChanges();
        var tuitionHead = h.AddFeeHead("Tuition");
        var registrationHead = h.AddFeeHead("Registration");
        await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Tuition", 2000m,
            FeeFrequency.Monthly, D(2026, 6, 10), null, tuitionHead.Id), default);

        using (BusinessClock.Override(At(2026, 9, 4)))
        {
            // 1–3. Enroll Arun on 4 Sept and generate fees.
            var enrollment = h.Enroll(D(2026, 9, 4));
            await h.Generator.EnsureForStudentAsync(h.Student.Id, default);
            var dues = h.DuesFor(enrollment.Id);
            Log("Dues after enrolment (4 Sept):", dues);

            // 4. First period: Full policy — 10 Aug–9 Sep charged in full, dated on the join date.
            Assert.Equal(D(2026, 9, 4), dues[0].DueDate);
            Assert.Equal(D(2026, 8, 10), dues[0].PeriodStart);
            Assert.Equal(D(2026, 9, 9), dues[0].PeriodEnd);
            Assert.Equal(2000m, dues[0].NetAmount);
            Assert.Equal(FeeDueStatus.Pending, dues[0].Status);
            // 10 Sept is within the 7-day notice (4 + 7 = 11 Sept): generated as Upcoming.
            Assert.Equal(D(2026, 9, 10), dues[1].DueDate);
            Assert.Equal(FeeDueStatus.Upcoming, dues[1].Status);
            Assert.Equal(2, dues.Count);

            // 5–6. Outstanding vs upcoming on the student card.
            var student = await h.Academy.GetStudentAsync(h.Student.Id, default);
            output.WriteLine($"Outstanding = {student.OutstandingBalance}, Upcoming = {student.UpcomingAmount}");
            Assert.Equal(2000m, student.OutstandingBalance);
            Assert.Equal(2000m, student.UpcomingAmount);

            // 7–8. ₹5,000 paid: current bill settled, the listed 10 Sept bill paid early, ₹1,000 on account.
            var advance = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 5000m), default);
            var f = await new FeeBalanceCalculator(h.Db).StudentFinancialsAsync(h.Student.Id, default);
            output.WriteLine($"After payment: Pending = {f.Pending}, Available credit = {f.AvailableCredit}, Reserved = {f.ReservedCredit}");
            Assert.Equal(0m, f.Pending);
            Assert.Equal(1000m, f.AvailableCredit);
            Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[1].Status);

            // 9. Refund ₹3,000 (credit note): ₹1,000 from credit, ₹2,000 pulled back from the early-paid bill.
            var refund = await h.Finance.RefundFeePaymentAsync(advance.Id, new RefundFeePaymentRequest(3000m, "left early"), default);
            output.WriteLine($"Refund number = {refund.ReceiptNumber}");
            Assert.StartsWith("CN-", refund.ReceiptNumber);
            f = await new FeeBalanceCalculator(h.Db).StudentFinancialsAsync(h.Student.Id, default);
            Assert.Equal(0m, f.AvailableCredit);
            Assert.Equal(FeeDueStatus.Upcoming, h.DuesFor(enrollment.Id)[1].Status);
            Assert.Equal(FeeDueStatus.Paid, h.DuesFor(enrollment.Id)[0].Status); // the settled current bill is untouched
        }

        using (BusinessClock.Override(At(2026, 9, 10)))
        {
            // 10–11. 10 Sept: the upcoming bill falls due. Refunded money must not pay it.
            await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);
            var enrollment = h.Db.Enrollments.AsNoTracking().Single(x => x.StudentId == h.Student.Id);
            var septDue = h.DuesFor(enrollment.Id).Single(x => x.DueDate == D(2026, 9, 10));
            output.WriteLine($"10 Sept bill: status = {septDue.Status}");
            Assert.Equal(FeeDueStatus.Pending, septDue.Status);
            var f = await new FeeBalanceCalculator(h.Db).StudentFinancialsAsync(h.Student.Id, default);
            Assert.Equal(2000m, f.Pending);
            Assert.Equal(0m, f.AvailableCredit);

            // 12–13. Registration ₹1,000 one-time on its own head; tuition continues.
            await h.Finance.CreateFeeStructureAsync(new CreateFeeStructureRequest(h.Course.Id, "Registration", 1000m,
                FeeFrequency.OneTime, D(2026, 9, 10), null, registrationHead.Id), default);
            await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);
            var dues = h.DuesFor(enrollment.Id);
            Log("Dues after registration plan (10 Sept):", dues);
            Assert.Contains(dues, x => x.FeeHeadId == registrationHead.Id && x.NetAmount == 1000m && x.DueDate == D(2026, 9, 10));
            Assert.Null(h.Db.FeeStructures.AsNoTracking().Single(x => x.FeeHeadId == tuitionHead.Id).EffectiveTo);
        }

        using (BusinessClock.Override(At(2026, 10, 5)))
        {
            // 23. Batch ends 30 Oct: 10 Oct is billed (period starts inside the batch), nothing after.
            await new FeeDueGenerator(h.Db).EnsureForStudentAsync(h.Student.Id, default);
            var enrollment = h.Db.Enrollments.AsNoTracking().Single(x => x.StudentId == h.Student.Id);
            var dues = h.DuesFor(enrollment.Id);
            Log("Dues on 5 Oct:", dues);
            Assert.Contains(dues, x => x.DueDate == D(2026, 10, 10));
            Assert.DoesNotContain(dues, x => x.DueDate > D(2026, 10, 30));

            // 14–15. Arun withdraws on 5 Oct: the 10 Oct bill (period 10 Oct–9 Nov) is cancelled, earlier bills stay.
            await h.Academy.EndEnrollmentAsync(enrollment.Id, new EndEnrollmentRequest(EnrollmentStatus.Withdrawn, D(2026, 10, 5)), default);
            dues = h.DuesFor(enrollment.Id);
            Log("Dues after withdrawal (5 Oct):", dues);
            Assert.Equal(FeeDueStatus.Cancelled, dues.Single(x => x.DueDate == D(2026, 10, 10)).Status);
            Assert.All(dues.Where(x => x.DueDate < D(2026, 10, 5)), x => Assert.NotEqual(FeeDueStatus.Cancelled, x.Status));

            // 16–17. Archive Arun: his ₹3,000 (Sept tuition + registration) stays in receivables.
            await h.Academy.ArchiveStudentAsync(h.Student.Id, default);
            var dashboard = await h.Reporting.GetFinanceDashboardAsync(new FinanceDashboardQuery(), default);
            var orgDashboard = await h.Academy.GetDashboardAsync(D(2026, 10, 5), default);
            output.WriteLine($"Receivables after archive: finance dashboard pending = {dashboard.TotalPending}, overdue = {dashboard.TotalOverdue}, home dashboard outstanding = {orgDashboard.OutstandingFees}");
            Assert.Equal(3000m, dashboard.TotalPending);
            Assert.Equal(3000m, dashboard.TotalOverdue);
            Assert.Equal(3000m, orgDashboard.OutstandingFees);

            // 18–21. Pay ₹3,000 at 10:00, refund ₹1,000 at 15:00 the same day.
            var payment = await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 3000m), default);
            using (BusinessClock.Override(At(2026, 10, 5, 15)))
                await h.Finance.RefundFeePaymentAsync(payment.Id, new RefundFeePaymentRequest(1000m, null), default);
            var summary = await h.Finance.GetFinanceAsync(At(2026, 10, 5, 0), At(2026, 10, 6, 0), default);
            var collectedToday = (await h.Academy.GetDashboardAsync(D(2026, 10, 5), default)).CollectedFees;
            output.WriteLine($"Finance 5 Oct: income = {summary.Income}, refunds = {summary.Refunds}, expenses = {summary.Expenses}, net = {summary.Net}; collected today = {collectedToday}");
            Assert.Equal(3000m, summary.Income);
            Assert.Equal(1000m, summary.Refunds);
            Assert.Equal(0m, summary.Expenses);
            Assert.Equal(2000m, summary.Net);
            Assert.Equal(2000m, collectedToday);

            // 24. Statement lines identify the billing period.
            var ledger = await h.Ledger.GetStudentLedgerAsync(h.Student.Id, default);
            foreach (var entry in ledger.Entries) output.WriteLine($"  {entry.Date:yyyy-MM-dd} {entry.Type,-10} {entry.Description,-40} Dr {entry.Debit,8} Cr {entry.Credit,8} Bal {entry.Balance,8}");
            Assert.Contains(ledger.Entries, x => x.Type == LedgerEntryType.FeeCharge && x.Description.Contains("10 Aug – 9 Sep 2026"));
            Assert.Contains(ledger.Entries, x => x.Type == LedgerEntryType.FeeCharge && x.Description.Contains("10 Sep – 9 Oct 2026"));
        }

        // 22. Midnight boundary: a receipt at 00:30 IST on 6 Oct belongs to 6 Oct, not 5 Oct (UTC still 5 Oct).
        using (BusinessClock.Override(At(2026, 10, 6, 0, 30)))
            await h.Finance.RecordFeePaymentAsync(Payment(h.Student.Id, 500m), default);
        var fifth = (await h.Academy.GetDashboardAsync(D(2026, 10, 5), default)).CollectedFees;
        var sixth = (await h.Academy.GetDashboardAsync(D(2026, 10, 6), default)).CollectedFees;
        output.WriteLine($"Collected 5 Oct = {fifth}, 6 Oct = {sixth}");
        Assert.Equal(2000m, fifth);
        Assert.Equal(500m, sixth);

        // 25. Notice window 1–30 days: the same course with a 1-day notice shows the bill only the day before.
        using var narrow = new TestHarness(courseNoticeDays: 1);
        narrow.AddStructure(2000m, FeeFrequency.Monthly, D(2026, 9, 10));
        var e2 = narrow.Enroll(D(2026, 9, 10));
        using (BusinessClock.Override(At(2026, 9, 8))) await new FeeDueGenerator(narrow.Db).EnsureForStudentAsync(narrow.Student.Id, default);
        Assert.Empty(narrow.DuesFor(e2.Id));
        using (BusinessClock.Override(At(2026, 9, 9))) await new FeeDueGenerator(narrow.Db).EnsureForStudentAsync(narrow.Student.Id, default);
        Assert.Equal(FeeDueStatus.Upcoming, Assert.Single(narrow.DuesFor(e2.Id)).Status);
    }

    private void Log(string title, IEnumerable<FeeDue> dues)
    {
        output.WriteLine(title);
        foreach (var d in dues)
            output.WriteLine($"  {d.DueDate:yyyy-MM-dd} {d.Status,-9} {d.NetAmount,8} period {d.PeriodStart:yyyy-MM-dd}..{d.PeriodEnd:yyyy-MM-dd}");
    }
}
