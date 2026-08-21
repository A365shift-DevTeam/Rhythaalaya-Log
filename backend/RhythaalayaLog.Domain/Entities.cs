namespace RhythaalayaLog.Domain;

public enum AttendanceStatus { Present, Absent, Leave }
public enum TransactionType { Income, Expense }
public enum PaymentMethod { Cash, Card, Upi, BankTransfer }
public enum UserRole { SuperAdmin, TenantAdmin, Staff }
public enum SubscriptionStatus { Trial, Active, PastDue, Cancelled, Expired }

public interface ITenantOwned
{
    Guid TenantId { get; set; }
}

public sealed class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<UserAccount> Users { get; set; } = [];
    public ICollection<TenantSubscription> Subscriptions { get; set; } = [];
}

public sealed class SubscriptionPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Name { get; set; }
    public required string Code { get; set; }
    public decimal MonthlyPrice { get; set; }
    public int MaxUsers { get; set; }
    public int MaxStudents { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class TenantSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public Guid PlanId { get; set; }
    public SubscriptionPlan Plan { get; set; } = null!;
    public SubscriptionStatus Status { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
}

public sealed class UserAccount
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string FullName { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Batch : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public required string Course { get; set; }
    public required string Schedule { get; set; }
    public required string Instructor { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Student> Students { get; set; } = [];
}

public sealed class Student : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string StudentNumber { get; set; }
    public required string Name { get; set; }
    public Guid BatchId { get; set; }
    public Batch Batch { get; set; } = null!;
    public decimal MonthlyFee { get; set; }
    public decimal OutstandingBalance { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateOnly JoinDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}

public sealed class AttendanceRecord : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public DateOnly Date { get; set; }
    public Guid BatchId { get; set; }
    public Batch Batch { get; set; } = null!;
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public AttendanceStatus Status { get; set; }
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Payment : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public decimal Amount { get; set; }
    public PaymentMethod Method { get; set; }
    public string? Reference { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public FinancialTransaction Transaction { get; set; } = null!;
}

public sealed class FinancialTransaction : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Title { get; set; }
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public required string Category { get; set; }
    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid? PaymentId { get; set; }
    public Payment? Payment { get; set; }
}

public sealed class OrganizationSettings : ITenantOwned
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public required string Type { get; set; }
    public string? LogoUrl { get; set; }
    public string ThemeColor { get; set; } = "emerald";
    public bool DarkMode { get; set; }
    public decimal DefaultMonthlyFee { get; set; } = 1500;
    public int FeeDueDay { get; set; } = 5;
    public string Currency { get; set; } = "INR";
    public string Locale { get; set; } = "en-IN";
    public string TimeZone { get; set; } = "Asia/Kolkata";
}
