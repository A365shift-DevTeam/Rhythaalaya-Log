using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;
using RhythaalayaLog.Infrastructure;
using Xunit;

namespace RhythaalayaLog.Tests;

public sealed class AcademyServiceTests
{
    private static readonly DateOnly Today = TestHarness.Today;

    private static AcademyService Service(TestHarness h) => new(h.Db,
        new FixedTenantContext { TenantId = h.TenantId, UserId = h.UserId, Role = UserRole.TenantAdmin },
        h.Generator, new FeeBalanceCalculator(h.Db));

    [Fact]
    public async Task HasBillableDues_FalseWithoutPlan_TrueOnceBilled()
    {
        using var h = new TestHarness();
        h.Enroll(Today);
        var service = Service(h);

        var before = await service.GetStudentAsync(h.Student.Id, default);
        Assert.False(before.HasBillableDues); // no fee plan: nothing billed, "Paid" would mislead

        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddMonths(-1));
        var after = await service.GetStudentAsync(h.Student.Id, default);
        Assert.True(after.HasBillableDues);
    }

    [Fact]
    public async Task CreateStudent_StampsLateBillingPolicyOnEnrollments()
    {
        using var h = new TestHarness(LateEnrollmentBillingPolicy.Skip);
        var plan = new SubscriptionPlan { Name = "Pro", Code = "PRO", MaxUsers = 10, MaxStudents = 100 };
        h.Db.Add(plan);
        h.Db.Add(new TenantSubscription
        {
            TenantId = h.TenantId, PlanId = plan.Id, Status = SubscriptionStatus.Active,
            StartsAt = DateTimeOffset.UtcNow.AddDays(-1), EndsAt = DateTimeOffset.UtcNow.AddYears(1)
        });
        h.Db.SaveChanges();

        var created = await Service(h).CreateStudentAsync(new CreateStudentRequest(
            "Kavi", null, null, null, null, null, Today, [h.Batch.Id],
            LateBillingPolicy: LateEnrollmentBillingPolicy.Full), default);

        var enrollment = h.Db.Enrollments.Single(x => x.StudentId == created.Id);
        Assert.Equal(LateEnrollmentBillingPolicy.Full, enrollment.LateBillingPolicy);
    }

    [Fact]
    public async Task HasBillableDues_IgnoresUpcomingDues()
    {
        using var h = new TestHarness(leadDays: 7);
        h.AddStructure(1000m, FeeFrequency.Monthly, Today.AddDays(3)); // first due inside lead window, still Upcoming
        h.Enroll(Today);

        var student = await Service(h).GetStudentAsync(h.Student.Id, default);
        Assert.False(student.HasBillableDues); // not yet due = not yet billable
    }
}
