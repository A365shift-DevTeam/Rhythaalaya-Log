namespace RhythaalayaLog.Domain;

public enum AttendanceStatus { Present, Absent, Leave }
public enum TransactionType { Income, Expense }
public enum PaymentMethod { Cash, Upi, Card, BankTransfer, Cheque, Other }
public enum UserRole { SuperAdmin, TenantAdmin, Staff }
public enum SubscriptionStatus { Trial, Active, PastDue, Cancelled, Expired }
public enum EnrollmentStatus { Active, Completed, Withdrawn }
public enum FeeFrequency { Monthly, Quarterly, HalfYearly, Yearly, OneTime }
public enum FeeDueStatus { Pending, Partial, Paid, Overdue, Cancelled, Upcoming }
public enum FeeAdjustmentType { Discount, Waiver, Proration }
public enum LateEnrollmentBillingPolicy { Skip, Full, Prorated }
public enum AchievementCategory { Won, Participated, Other }

[Flags]
public enum BatchDays
{
    None = 0,
    Monday = 1 << 0,
    Tuesday = 1 << 1,
    Wednesday = 1 << 2,
    Thursday = 1 << 3,
    Friday = 1 << 4,
    Saturday = 1 << 5,
    Sunday = 1 << 6
}

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

public sealed class Course : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Batch> Batches { get; set; } = [];
    public ICollection<FeeStructure> FeeStructures { get; set; } = [];
}

public sealed class Staff : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Batch> Batches { get; set; } = [];
}

public sealed class Batch : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Name { get; set; }
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public Guid StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public BatchDays Days { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Enrollment> Enrollments { get; set; } = [];
}

public sealed class Student : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string StudentNumber { get; set; }
    public required string Name { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? ParentName { get; set; }
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateOnly JoinDate { get; set; }
    /// <summary>Standing fee concession (0-100%), auto-applied as a Discount adjustment to every scheduled due.</summary>
    public decimal ConcessionPercent { get; set; }
    /// <summary>Why the concession exists, e.g. "Orphan", "Semi-orphan", "Staff child".</summary>
    public string? ConcessionReason { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Enrollment> Enrollments { get; set; } = [];
}

public sealed class Enrollment : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid BatchId { get; set; }
    public Batch Batch { get; set; } = null!;
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public DateOnly EnrolledOn { get; set; }
    public DateOnly? EndedOn { get; set; }
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Active;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<AttendanceRecord> AttendanceRecords { get; set; } = [];
    public ICollection<FeeDue> FeeDues { get; set; } = [];
}

public sealed class AttendanceRecord : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public DateOnly Date { get; set; }
    public Guid EnrollmentId { get; set; }
    public Enrollment Enrollment { get; set; } = null!;
    public AttendanceStatus Status { get; set; }
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class FeeStructure : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public required string Name { get; set; }
    public decimal Amount { get; set; }
    public FeeFrequency Frequency { get; set; }
    public DateOnly EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<FeeDue> FeeDues { get; set; } = [];
}

public sealed class FeeDue : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public Guid EnrollmentId { get; set; }
    public Enrollment Enrollment { get; set; } = null!;
    /// <summary>Null for custom one-off charges, which have no billing schedule.</summary>
    public Guid? FeeStructureId { get; set; }
    public FeeStructure? FeeStructure { get; set; }
    /// <summary>Display name for custom charges; scheduled dues use the fee structure's name.</summary>
    public string? Title { get; set; }
    public DateOnly DueDate { get; set; }
    public decimal Amount { get; set; }
    /// <summary>Cached sum of Discount/Waiver adjustments (kept for backward compatibility).</summary>
    public decimal DiscountAmount { get; set; }
    /// <summary>Billable amount: Amount minus the sum of all adjustments.</summary>
    public decimal NetAmount { get; set; }
    public FeeDueStatus Status { get; set; } = FeeDueStatus.Pending;
    public DateTimeOffset? CancelledAt { get; set; }
    public Guid? CancelledByUserId { get; set; }
    public string? CancelReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<FeePaymentAllocation> Allocations { get; set; } = [];
    public ICollection<FeeAdjustment> Adjustments { get; set; } = [];
}

/// <summary>
/// An immutable, append-only reduction of a fee due's billable amount. The adjustment rows are
/// themselves the audit history: corrections are new compensating rows (negative Amount), never edits.
/// </summary>
public sealed class FeeAdjustment : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid FeeDueId { get; set; }
    public FeeDue FeeDue { get; set; } = null!;
    public FeeAdjustmentType Type { get; set; }
    /// <summary>Positive values reduce NetAmount; negative values correct an earlier adjustment.</summary>
    public decimal Amount { get; set; }
    public required string Reason { get; set; }
    /// <summary>Null when applied by the system (e.g. enrollment proration).</summary>
    public Guid? PerformedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class FeePayment : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public required string ReceiptNumber { get; set; }
    /// <summary>Client-supplied key that makes payment submission retry-safe.</summary>
    public string? IdempotencyKey { get; set; }
    /// <summary>SHA-256 of the canonical request payload; detects key reuse with a different payload.</summary>
    public string? RequestHash { get; set; }
    public decimal Amount { get; set; }
    public DateTimeOffset PaymentDate { get; set; } = DateTimeOffset.UtcNow;
    public PaymentMethod Method { get; set; }
    public string? ReferenceNumber { get; set; }
    public Guid CollectedByUserId { get; set; }
    public string? Remarks { get; set; }
    public Guid? RefundOfPaymentId { get; set; }
    public FeePayment? RefundOfPayment { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<FeePaymentAllocation> Allocations { get; set; } = [];
    public FinancialTransaction Transaction { get; set; } = null!;
}

public sealed class FeePaymentAllocation : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid FeePaymentId { get; set; }
    public FeePayment FeePayment { get; set; } = null!;
    public Guid FeeDueId { get; set; }
    public FeeDue FeeDue { get; set; } = null!;
    public decimal Amount { get; set; }
    /// <summary>Set on a refund's negative allocation row: the specific original allocation it reverses.</summary>
    public Guid? ReversalOfAllocationId { get; set; }
    public FeePaymentAllocation? ReversalOfAllocation { get; set; }
    public DateTimeOffset AllocatedAt { get; set; } = DateTimeOffset.UtcNow;
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
    public Guid? FeePaymentId { get; set; }
    public FeePayment? FeePayment { get; set; }
}

public sealed class StudentAchievement : ITenantOwned
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public Student Student { get; set; } = null!;
    public required string Title { get; set; }
    public AchievementCategory Category { get; set; }
    public string? Level { get; set; }
    public DateOnly EventDate { get; set; }
    public string? Note { get; set; }
    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public required byte[] FileData { get; set; }
    public int FileSizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
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
    public string Currency { get; set; } = "INR";
    public string Locale { get; set; } = "en-IN";
    public string TimeZone { get; set; } = "Asia/Kolkata";
    /// <summary>How many days before its due date a fee due is generated and shown as Upcoming.</summary>
    public int FeeDueLeadDays { get; set; } = 7;
    public LateEnrollmentBillingPolicy LateEnrollmentBillingPolicy { get; set; } = LateEnrollmentBillingPolicy.Skip;
    /// <summary>Last tenant-local date the daily billing sweep completed for this tenant.</summary>
    public DateOnly? LastBillingRunDate { get; set; }
    public string ReceiptPrefix { get; set; } = "REC";
    public int NextReceiptNumber { get; set; } = 1;
    public string? ReceiptAddress { get; set; }
    public string? ReceiptPhone { get; set; }
    public string? ReceiptEmail { get; set; }
    public string ReceiptFooter { get; set; } = "Thank you for your payment.";
    public bool ReceiptShowLogo { get; set; } = true;
    public bool ReceiptShowSignature { get; set; }
    public bool ReceiptAutoOpen { get; set; } = true;
    public string IncomeCategoriesJson { get; set; } = "[\"Student Fees\",\"Registration\",\"Events\",\"Other Income\"]";
    public string ExpenseCategoriesJson { get; set; } = "[\"Rent & Operations\",\"Instructor Salary\",\"Equipment\",\"Utilities\",\"Marketing\",\"Other Expense\",\"Refund\"]";
    public bool NotificationsEnabled { get; set; } = true;
    public bool FeeReminderNotifications { get; set; } = true;
    public bool PaymentNotifications { get; set; } = true;
    public bool AttendanceNotifications { get; set; } = true;
}
