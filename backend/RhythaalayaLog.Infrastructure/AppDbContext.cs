using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<AttendanceRecord> AttendanceRecords => Set<AttendanceRecord>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<OrganizationSettings> OrganizationSettings => Set<OrganizationSettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ConfigureBatches(modelBuilder);
        ConfigureStudents(modelBuilder);
        ConfigureAttendance(modelBuilder);
        ConfigureFinance(modelBuilder);
        ConfigureSettings(modelBuilder);
    }

    private static void ConfigureBatches(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Batch>();
        entity.HasIndex(x => x.Name).IsUnique();
        entity.Property(x => x.Name).HasMaxLength(160);
        entity.Property(x => x.Course).HasMaxLength(120);
        entity.Property(x => x.Schedule).HasMaxLength(160);
        entity.Property(x => x.Instructor).HasMaxLength(120);
    }

    private static void ConfigureStudents(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Student>();
        entity.HasIndex(x => x.StudentNumber).IsUnique();
        entity.Property(x => x.StudentNumber).HasMaxLength(32);
        entity.Property(x => x.Name).HasMaxLength(160);
        entity.Property(x => x.Email).HasMaxLength(254);
        entity.Property(x => x.Phone).HasMaxLength(32);
        entity.Property(x => x.MonthlyFee).HasPrecision(12, 2);
        entity.Property(x => x.OutstandingBalance).HasPrecision(12, 2);
        entity.HasOne(x => x.Batch).WithMany(x => x.Students).HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
    }
}
