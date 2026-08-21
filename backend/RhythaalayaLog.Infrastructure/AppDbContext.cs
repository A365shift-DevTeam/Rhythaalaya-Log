using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<TenantSubscription> TenantSubscriptions => Set<TenantSubscription>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<OrganizationSettings> OrganizationSettings => Set<OrganizationSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureSaas(modelBuilder);
        ConfigureBatches(modelBuilder);
        ConfigureStudents(modelBuilder);
        ConfigureAttendance(modelBuilder);
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
        user.HasOne(x => x.Tenant).WithMany(x => x.Users).HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

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

    private static void ConfigureBatches(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Batch>();
        entity.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();
        entity.Property(x => x.Name).HasMaxLength(160);
        entity.Property(x => x.Course).HasMaxLength(120);
        entity.Property(x => x.Schedule).HasMaxLength(160);
        entity.Property(x => x.Instructor).HasMaxLength(120);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureStudents(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Student>();
        entity.HasIndex(x => new { x.TenantId, x.StudentNumber }).IsUnique();
        entity.Property(x => x.StudentNumber).HasMaxLength(32);
        entity.Property(x => x.Name).HasMaxLength(160);
        entity.Property(x => x.Email).HasMaxLength(254);
        entity.Property(x => x.Phone).HasMaxLength(32);
        entity.Property(x => x.MonthlyFee).HasPrecision(12, 2);
        entity.Property(x => x.OutstandingBalance).HasPrecision(12, 2);
        entity.HasOne(x => x.Batch).WithMany(x => x.Students).HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureAttendance(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<AttendanceRecord>();
        entity.HasIndex(x => new { x.TenantId, x.Date, x.BatchId, x.StudentId }).IsUnique();
        entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        entity.HasOne(x => x.Batch).WithMany().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
        entity.HasOne(x => x.Student).WithMany(x => x.AttendanceRecords).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureFinance(ModelBuilder modelBuilder)
    {
        var payment = modelBuilder.Entity<Payment>();
        payment.Property(x => x.Amount).HasPrecision(12, 2);
        payment.Property(x => x.Method).HasConversion<string>().HasMaxLength(32);
        payment.Property(x => x.Reference).HasMaxLength(120);
        payment.HasOne(x => x.Student).WithMany(x => x.Payments).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
        payment.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);

        var transaction = modelBuilder.Entity<FinancialTransaction>();
        transaction.Property(x => x.Title).HasMaxLength(200);
        transaction.Property(x => x.Category).HasMaxLength(80);
        transaction.Property(x => x.Type).HasConversion<string>().HasMaxLength(16);
        transaction.Property(x => x.Amount).HasPrecision(12, 2);
        transaction.HasIndex(x => x.OccurredAt);
        transaction.HasOne(x => x.Payment).WithOne(x => x.Transaction)
            .HasForeignKey<FinancialTransaction>(x => x.PaymentId).OnDelete(DeleteBehavior.Cascade);
        transaction.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }
    private static void ConfigureSettings(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<OrganizationSettings>();
        entity.Property(x => x.DefaultMonthlyFee).HasPrecision(12, 2);
        entity.HasIndex(x => x.TenantId).IsUnique();
        entity.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Cascade);
    }

    private void ApplyTenantFilters(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Batch>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Student>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<AttendanceRecord>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<Payment>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<FinancialTransaction>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
        modelBuilder.Entity<OrganizationSettings>().HasQueryFilter(x => tenantContext.TenantId.HasValue && x.TenantId == tenantContext.TenantId.Value);
    }
}
