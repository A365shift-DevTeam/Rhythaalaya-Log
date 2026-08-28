using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<LoginOtp> LoginOtps => Set<LoginOtp>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<TenantSubscription> TenantSubscriptions => Set<TenantSubscription>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<FeeStructure> FeeStructures => Set<FeeStructure>();
    public DbSet<FeeDue> FeeDues => Set<FeeDue>();
    public DbSet<FeeAdjustment> FeeAdjustments => Set<FeeAdjustment>();
    public DbSet<FeePayment> FeePayments => Set<FeePayment>();
    public DbSet<FeePaymentAllocation> FeePaymentAllocations => Set<FeePaymentAllocation>();
    public DbSet<StudentAchievement> StudentAchievements => Set<StudentAchievement>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<OrganizationSettings> OrganizationSettings => Set<OrganizationSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureSaas(modelBuilder);
        ConfigureCoursesAndStaff(modelBuilder);
        ConfigureBatches(modelBuilder);
        ConfigureStudentsAndEnrollments(modelBuilder);
        ConfigureAttendance(modelBuilder);
        ConfigureFees(modelBuilder);
        ConfigureAchievements(modelBuilder);
        ConfigureFinance(modelBuilder);
        ConfigureSettings(modelBuilder);
        ApplyTenantFilters(modelBuilder);
    }

    private static void ConfigureSaas(ModelBuilder modelBuilder)
    {
        var tenant = modelBuilder.Entity<Tenant>();
        tenant.HasIndex(x => x.Slug).IsUnique();
        tenant.Property(x => x.Name).HasMaxLength(160);
        tenant.Property(x => x.Slug).HasMaxLength(80);

        var user = modelBuilder.Entity<UserAccount>();
        user.HasIndex(x => x.Email).IsUnique();
        user.Property(x => x.Email).HasMaxLength(254);
        user.Property(x => x.FullName).HasMaxLength(160);
        user.Property(x => x.PasswordHash).HasMaxLength(500);
        user.Property(x => x.Role).HasConversion<string>().HasMaxLength(32);
        user.Property(x => x.OtpEnabled).HasDefaultValue(true);
        user.HasOne(x => x.Tenant).WithMany(x => x.Users).HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        // Not tenant-owned: users are unauthenticated (no tenant context) while a login OTP is
        // live, so this table is deliberately excluded from ApplyTenantFilters below.
        var loginOtp = modelBuilder.Entity<LoginOtp>();
        loginOtp.HasIndex(x => x.PendingToken).IsUnique();
        loginOtp.Property(x => x.PendingToken).HasMaxLength(64);
        loginOtp.Property(x => x.CodeHash).HasMaxLength(128);
        loginOtp.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        var plan = modelBuilder.Entity<SubscriptionPlan>();
        plan.HasIndex(x => x.Code).IsUnique();
        plan.Property(x => x.Name).HasMaxLength(120);
        plan.Property(x => x.Code).HasMaxLength(50);
        plan.Property(x => x.MonthlyPrice).HasPrecision(12, 2);

        var subscription = modelBuilder.Entity<TenantSubscription>();
        subscription.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
        subscription.HasIndex(x => new { x.TenantId, x.Status });
        subscription.HasOne(x => x.Tenant).WithMany(x => x.Subscriptions).HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
        subscription.HasOne(x => x.Plan).WithMany().HasForeignKey(x => x.PlanId).OnDelete(DeleteBehavior.Restrict);
    }

    private static void ConfigureCoursesAndStaff(ModelBuilder modelBuilder)
    {
        var course = modelBuilder.Entity<Course>();
        course.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();
        course.Property(x => x.Name).HasMaxLength(160);
        course.Property(x => x.Description).HasMaxLength(1000);
        course.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var staff = modelBuilder.Entity<Staff>();
        staff.Property(x => x.Name).HasMaxLength(160);
        staff.Property(x => x.Phone).HasMaxLength(32);
        staff.Property(x => x.Email).HasMaxLength(254);
        staff.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureBatches(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Batch>();
        entity.HasIndex(x => new { x.TenantId, x.CourseId, x.Name }).IsUnique();
        entity.Property(x => x.Name).HasMaxLength(160);
        entity.HasOne(x => x.Course).WithMany(x => x.Batches).HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Staff).WithMany(x => x.Batches).HasForeignKey(x => x.StaffId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureStudentsAndEnrollments(ModelBuilder modelBuilder)
    {
        var student = modelBuilder.Entity<Student>();
        student.HasIndex(x => new { x.TenantId, x.StudentNumber }).IsUnique();
        student.Property(x => x.StudentNumber).HasMaxLength(32);
        student.Property(x => x.Name).HasMaxLength(160);
        student.Property(x => x.ParentName).HasMaxLength(160);
        student.Property(x => x.Address).HasMaxLength(400);
        student.Property(x => x.Email).HasMaxLength(254);
        student.Property(x => x.Phone).HasMaxLength(32);
        student.Property(x => x.ConcessionPercent).HasPrecision(5, 2);
        student.Property(x => x.ConcessionReason).HasMaxLength(200);
        student.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var enrollment = modelBuilder.Entity<Enrollment>();
        enrollment.HasIndex(x => new { x.TenantId, x.StudentId, x.BatchId, x.Status });
        enrollment.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        enrollment.Property(x => x.LateBillingPolicy).HasConversion<string>().HasMaxLength(16);
        enrollment.HasOne(x => x.Student).WithMany(x => x.Enrollments).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        enrollment.HasOne(x => x.Batch).WithMany(x => x.Enrollments).HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
        enrollment.HasOne(x => x.Course).WithMany().HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
        enrollment.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureAttendance(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<AttendanceRecord>();
        entity.HasIndex(x => new { x.TenantId, x.Date, x.EnrollmentId }).IsUnique();
        entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        entity.HasOne(x => x.Enrollment).WithMany(x => x.AttendanceRecords).HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureFees(ModelBuilder modelBuilder)
    {
        var structure = modelBuilder.Entity<FeeStructure>();
        structure.Property(x => x.Name).HasMaxLength(160);
        structure.Property(x => x.Amount).HasPrecision(12, 2);
        structure.Property(x => x.Frequency).HasConversion<string>().HasMaxLength(16);
        structure.HasIndex(x => new { x.TenantId, x.CourseId, x.IsActive });
        structure.HasOne(x => x.Course).WithMany(x => x.FeeStructures).HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
        structure.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var due = modelBuilder.Entity<FeeDue>();
        due.HasIndex(x => new { x.TenantId, x.EnrollmentId, x.FeeStructureId, x.DueDate }).IsUnique();
        due.Property(x => x.Title).HasMaxLength(160);
        due.Property(x => x.Amount).HasPrecision(12, 2);
        due.Property(x => x.DiscountAmount).HasPrecision(12, 2);
        due.Property(x => x.NetAmount).HasPrecision(12, 2);
        due.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        due.Property(x => x.CancelReason).HasMaxLength(500);
        due.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        due.HasOne(x => x.Enrollment).WithMany(x => x.FeeDues).HasForeignKey(x => x.EnrollmentId).OnDelete(DeleteBehavior.Restrict);
        due.HasOne(x => x.FeeStructure).WithMany(x => x.FeeDues).HasForeignKey(x => x.FeeStructureId).OnDelete(DeleteBehavior.Restrict);
        due.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var adjustment = modelBuilder.Entity<FeeAdjustment>();
        adjustment.HasIndex(x => new { x.TenantId, x.FeeDueId });
        adjustment.Property(x => x.Type).HasConversion<string>().HasMaxLength(16);
        adjustment.Property(x => x.Amount).HasPrecision(12, 2);
        adjustment.Property(x => x.Reason).HasMaxLength(500);
        adjustment.HasOne(x => x.FeeDue).WithMany(x => x.Adjustments).HasForeignKey(x => x.FeeDueId).OnDelete(DeleteBehavior.Restrict);
        adjustment.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var payment = modelBuilder.Entity<FeePayment>();
        payment.HasIndex(x => new { x.TenantId, x.ReceiptNumber }).IsUnique();
        payment.HasIndex(x => new { x.TenantId, x.IdempotencyKey }).IsUnique()
            .HasFilter("\"IdempotencyKey\" IS NOT NULL");
        payment.Property(x => x.ReceiptNumber).HasMaxLength(32);
        payment.Property(x => x.IdempotencyKey).HasMaxLength(64);
        payment.Property(x => x.RequestHash).HasMaxLength(64);
        payment.Property(x => x.Amount).HasPrecision(12, 2);
        payment.Property(x => x.Method).HasConversion<string>().HasMaxLength(32);
        payment.Property(x => x.ReferenceNumber).HasMaxLength(120);
        payment.Property(x => x.Remarks).HasMaxLength(500);
        payment.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        payment.HasOne(x => x.RefundOfPayment).WithMany().HasForeignKey(x => x.RefundOfPaymentId).OnDelete(DeleteBehavior.Restrict);
        payment.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var allocation = modelBuilder.Entity<FeePaymentAllocation>();
        allocation.Property(x => x.Amount).HasPrecision(12, 2);
        allocation.HasIndex(x => new { x.TenantId, x.FeeDueId });
        allocation.HasOne(x => x.FeePayment).WithMany(x => x.Allocations).HasForeignKey(x => x.FeePaymentId).OnDelete(DeleteBehavior.Cascade);
        allocation.HasOne(x => x.FeeDue).WithMany(x => x.Allocations).HasForeignKey(x => x.FeeDueId).OnDelete(DeleteBehavior.Restrict);
        allocation.HasOne(x => x.ReversalOfAllocation).WithMany().HasForeignKey(x => x.ReversalOfAllocationId).OnDelete(DeleteBehavior.Restrict);
        allocation.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureAchievements(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<StudentAchievement>();
        entity.HasIndex(x => new { x.TenantId, x.StudentId });
        entity.Property(x => x.Title).HasMaxLength(200);
        entity.Property(x => x.Category).HasConversion<string>().HasMaxLength(16);
        entity.Property(x => x.Level).HasMaxLength(80);
        entity.Property(x => x.Note).HasMaxLength(1000);
        entity.Property(x => x.FileName).HasMaxLength(260);
        entity.Property(x => x.ContentType).HasMaxLength(100);
        entity.HasOne(x => x.Student).WithMany().HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureFinance(ModelBuilder modelBuilder)
    {
        var transaction = modelBuilder.Entity<FinancialTransaction>();
        transaction.Property(x => x.Title).HasMaxLength(200);
        transaction.Property(x => x.Category).HasMaxLength(80);
        transaction.Property(x => x.Type).HasConversion<string>().HasMaxLength(16);
        transaction.Property(x => x.Amount).HasPrecision(12, 2);
        transaction.HasIndex(x => x.OccurredAt);
        transaction.HasOne(x => x.FeePayment).WithOne(x => x.Transaction)
            .HasForeignKey<FinancialTransaction>(x => x.FeePaymentId).OnDelete(DeleteBehavior.Cascade);
        transaction.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureSettings(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<OrganizationSettings>();
        entity.Property(x => x.LateEnrollmentBillingPolicy).HasConversion<string>().HasMaxLength(16);
        entity.Property(x => x.ReceiptPrefix).HasMaxLength(16);
        entity.Property(x => x.ReceiptAddress).HasMaxLength(300);
        entity.Property(x => x.ReceiptPhone).HasMaxLength(32);
        entity.Property(x => x.ReceiptEmail).HasMaxLength(254);
        entity.Property(x => x.ReceiptFooter).HasMaxLength(300);
        entity.Property(x => x.IncomeCategoriesJson).HasColumnType("text");
        entity.Property(x => x.ExpenseCategoriesJson).HasColumnType("text");
        entity.HasIndex(x => x.TenantId).IsUnique();
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private void ApplyTenantFilters(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Course>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Staff>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Batch>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Student>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Enrollment>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<AttendanceRecord>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FeeStructure>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FeeDue>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FeeAdjustment>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FeePayment>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FeePaymentAllocation>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<StudentAchievement>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FinancialTransaction>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<OrganizationSettings>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
    }
}
