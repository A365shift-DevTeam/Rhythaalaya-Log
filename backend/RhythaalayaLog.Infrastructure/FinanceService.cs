using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using RhythaalayaLog.Application;
using RhythaalayaLog.Domain;

namespace RhythaalayaLog.Infrastructure;

public sealed class FinanceService(AppDbContext db, ITenantContext tenantContext, FeeDueGenerator dueGenerator,
    IRowLocker rowLocker) : IFinanceService
{
    private static readonly string[] DefaultFeeHeads =
        ["Tuition Fee", "Registration Fee", "Material Fee", "Exam Fee", "Transport Fee", "Other Fee"];

    public async Task<IReadOnlyList<FeeHeadDto>> GetFeeHeadsAsync(CancellationToken ct)
    {
        await EnsureFeeHeadsExistAsync(ct);
        var heads = await db.FeeHeads.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name).ToListAsync(ct);
        var counts = await db.FeeStructures.AsNoTracking().Where(x => x.FeeHeadId != null)
            .GroupBy(x => x.FeeHeadId!.Value).Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);
        return heads.Select(x => new FeeHeadDto(x.Id, x.Name, x.DisplayOrder, x.IsActive, counts.GetValueOrDefault(x.Id))).ToList();
    }

    public async Task<FeeHeadDto> CreateFeeHeadAsync(CreateFeeHeadRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var name = request.Name.Trim();
        var tenantId = RequireTenant();
        if (await db.FeeHeads.AnyAsync(x => x.Name == name, ct))
            throw new ConflictException("A fee head with that name already exists.");
        var head = new FeeHead { TenantId = tenantId, Name = name, DisplayOrder = request.DisplayOrder };
        db.FeeHeads.Add(head);
        await db.SaveChangesAsync(ct);
        return new FeeHeadDto(head.Id, head.Name, head.DisplayOrder, head.IsActive, 0);
    }

    public async Task<FeeHeadDto> UpdateFeeHeadAsync(Guid id, UpdateFeeHeadRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var name = request.Name.Trim();
        var head = await db.FeeHeads.FindAsync([id], ct) ?? throw new NotFoundException(nameof(FeeHead));
        if (await db.FeeHeads.AnyAsync(x => x.Name == name && x.Id != id, ct))
            throw new ConflictException("A fee head with that name already exists.");
        head.Name = name;
        head.DisplayOrder = request.DisplayOrder;
        head.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        var count = await db.FeeStructures.CountAsync(x => x.FeeHeadId == id, ct);
        return new FeeHeadDto(head.Id, head.Name, head.DisplayOrder, head.IsActive, count);
    }

    /// <summary>Seeds the default fee-head set the first time a tenant looks at its heads (existing tenants pre-date the feature).</summary>
    private async Task EnsureFeeHeadsExistAsync(CancellationToken ct)
    {
        if (await db.FeeHeads.AnyAsync(ct)) return;
        var tenantId = RequireTenant();
        for (var i = 0; i < DefaultFeeHeads.Length; i++)
            db.FeeHeads.Add(new FeeHead { TenantId = tenantId, Name = DefaultFeeHeads[i], DisplayOrder = i });
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException) { db.ChangeTracker.Clear(); } // a concurrent request seeded them first
    }

    public async Task<IReadOnlyList<FeeStructureDto>> GetFeeStructuresAsync(Guid? courseId, CancellationToken ct)
    {
        var query = db.FeeStructures.AsNoTracking().Include(x => x.Course).Include(x => x.FeeHead).AsQueryable();
        if (courseId.HasValue) query = query.Where(x => x.CourseId == courseId.Value);
        var items = await query.OrderByDescending(x => x.EffectiveFrom).ToListAsync(ct);
        return items.Select(MapStructure).ToList();
    }

    public async Task<FeeStructureDto> CreateFeeStructureAsync(CreateFeeStructureRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        if (request.EffectiveTo.HasValue && request.EffectiveTo.Value < request.EffectiveFrom)
            throw new AppValidationException(nameof(request.EffectiveTo));
        if (!await db.Courses.AnyAsync(x => x.Id == request.CourseId && x.IsActive, ct))
            throw new AppValidationException(nameof(request.CourseId));
        if (request.FeeHeadId is { } headId && !await db.FeeHeads.AnyAsync(x => x.Id == headId, ct))
            throw new AppValidationException(nameof(request.FeeHeadId));

        // Plans are resolved by effective-date window, so a future-dated plan must only trim the
        // current plan's window — never deactivate it early (that used to open a billing gap).
        var overlapping = await db.FeeStructures.Where(x => x.CourseId == request.CourseId
            && (x.EffectiveTo == null || x.EffectiveTo >= request.EffectiveFrom)).ToListAsync(ct);
        if (overlapping.Any(x => x.EffectiveFrom >= request.EffectiveFrom))
            throw new ConflictException("A new fee structure must start after the course's existing structures.");
        foreach (var previous in overlapping)
            previous.EffectiveTo = request.EffectiveFrom.AddDays(-1);

        var structure = new FeeStructure
        {
            TenantId = RequireTenant(), CourseId = request.CourseId, FeeHeadId = request.FeeHeadId,
            Name = request.Name.Trim(), Amount = request.Amount,
            Frequency = request.Frequency, EffectiveFrom = request.EffectiveFrom, EffectiveTo = request.EffectiveTo
        };
        db.FeeStructures.Add(structure);
        await db.SaveChangesAsync(ct);
        return MapStructure(await db.FeeStructures.AsNoTracking().Include(x => x.Course).Include(x => x.FeeHead)
            .SingleAsync(x => x.Id == structure.Id, ct));
    }

    public async Task<FeeStructureDto> UpdateFeeStructureAsync(Guid id, UpdateFeeStructureRequest request, CancellationToken ct)
    {
        RequireText(request.Name, nameof(request.Name));
        var structure = await db.FeeStructures.FindAsync([id], ct) ?? throw new NotFoundException(nameof(FeeStructure));
        if (request.EffectiveTo.HasValue && request.EffectiveTo.Value < structure.EffectiveFrom)
            throw new AppValidationException(nameof(request.EffectiveTo));
        if (request.FeeHeadId is { } headId && !await db.FeeHeads.AnyAsync(x => x.Id == headId, ct))
            throw new AppValidationException(nameof(request.FeeHeadId));
        structure.Name = request.Name.Trim();
        structure.EffectiveTo = request.EffectiveTo;
        structure.IsActive = request.IsActive;
        structure.FeeHeadId = request.FeeHeadId;
        await db.SaveChangesAsync(ct);
        return MapStructure(await db.FeeStructures.AsNoTracking().Include(x => x.Course).Include(x => x.FeeHead)
            .SingleAsync(x => x.Id == id, ct));
    }

    public async Task<IReadOnlyList<FeeDueDto>> GetStudentFeeDuesAsync(Guid studentId, CancellationToken ct)
    {
        await dueGenerator.EnsureForStudentAsync(studentId, ct);
        var dues = await DueQuery().Where(x => x.StudentId == studentId).OrderByDescending(x => x.DueDate).ToListAsync(ct);
        return await MapDuesAsync(dues, ct);
    }

    public async Task<IReadOnlyList<FeeDueDto>> GetFeeDuesAsync(FeeDueStatus? status, CancellationToken ct)
    {
        await dueGenerator.EnsureForTenantAsync(ct);
        var query = DueQuery();
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var dues = await query.OrderBy(x => x.DueDate).ToListAsync(ct);
        return await MapDuesAsync(dues, ct);
    }

    public async Task<FeePaymentDto> RecordFeePaymentAsync(RecordFeePaymentRequest request, CancellationToken ct)
    {
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var tenantId = RequireTenant();
        var userId = RequireUser();
        var idempotencyKey = Clean(request.IdempotencyKey);
        if (idempotencyKey is { Length: > 64 }) throw new AppValidationException(nameof(request.IdempotencyKey));
        var requestHash = idempotencyKey is null ? null : ComputeRequestHash(request);
        if (idempotencyKey is not null)
        {
            var replay = await FindIdempotentReplayAsync(idempotencyKey, requestHash!, ct);
            if (replay is not null) return replay;
        }

        var student = await db.Students.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.StudentId && x.IsActive, ct)
            ?? throw new NotFoundException(nameof(Student));
        var paymentDate = (request.PaymentDate ?? DateTimeOffset.UtcNow).ToUniversalTime();
        await EnsureSettingsExistAsync(ct);

        // One atomic unit: receipt number, payment, allocations, ledger entry, and status updates
        // commit together or not at all. Lock order everywhere: settings → payment → dues.
        Guid paymentId;
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            try
            {
                await rowLocker.LockOrganizationSettingsAsync(db, tenantId, ct);
                var payment = new FeePayment
                {
                    TenantId = tenantId, StudentId = student.Id, ReceiptNumber = await NextReceiptNumberAsync(ct),
                    IdempotencyKey = idempotencyKey, RequestHash = requestHash,
                    Amount = request.Amount, PaymentDate = paymentDate, Method = request.Method,
                    ReferenceNumber = Clean(request.ReferenceNumber), CollectedByUserId = userId, Remarks = Clean(request.Remarks)
                };
                db.FeePayments.Add(payment);

                var touchedDueIds = new List<Guid>();
                if (request.FeeDueId.HasValue)
                {
                    await rowLocker.LockFeeDuesAsync(db, [request.FeeDueId.Value], ct);
                    var due = await db.FeeDues.SingleOrDefaultAsync(x => x.Id == request.FeeDueId.Value && x.StudentId == student.Id, ct)
                        ?? throw new AppValidationException(nameof(request.FeeDueId));
                    if (due.Status is FeeDueStatus.Paid or FeeDueStatus.Cancelled)
                        throw new ConflictException("This fee due is already settled or cancelled.");
                    var paidSoFar = await db.FeePaymentAllocations.Where(x => x.FeeDueId == due.Id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
                    var balance = due.NetAmount - paidSoFar;
                    if (request.Amount > balance) throw new AppValidationException("Payment cannot exceed the fee due's remaining balance.");
                    db.FeePaymentAllocations.Add(new FeePaymentAllocation { TenantId = tenantId, FeePayment = payment, FeeDueId = due.Id, Amount = request.Amount });
                    touchedDueIds.Add(due.Id);
                }
                else
                {
                    var outstanding = await db.FeeDues.Where(x => x.StudentId == student.Id
                        && (x.Status == FeeDueStatus.Pending || x.Status == FeeDueStatus.Partial
                            || x.Status == FeeDueStatus.Overdue || x.Status == FeeDueStatus.Upcoming))
                        .OrderBy(x => x.DueDate).ToListAsync(ct);
                    await rowLocker.LockFeeDuesAsync(db, outstanding.Select(x => x.Id).ToList(), ct);
                    var remaining = request.Amount;
                    foreach (var due in outstanding)
                    {
                        if (remaining <= 0) break;
                        var paidSoFar = await db.FeePaymentAllocations.Where(x => x.FeeDueId == due.Id).SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
                        var balance = due.NetAmount - paidSoFar;
                        if (balance <= 0) continue;
                        var take = Math.Min(balance, remaining);
                        db.FeePaymentAllocations.Add(new FeePaymentAllocation { TenantId = tenantId, FeePayment = payment, FeeDueId = due.Id, Amount = take });
                        touchedDueIds.Add(due.Id);
                        remaining -= take;
                    }
                    // any remainder stays unallocated as credit, auto-applied to future dues as they're generated
                }

                payment.Transaction = new FinancialTransaction
                {
                    TenantId = tenantId, Title = string.Concat("Fee payment - ", student.Name), Type = TransactionType.Income,
                    Amount = request.Amount, Category = "Student Fees", OccurredAt = paymentDate, FeePayment = payment
                };
                await db.SaveChangesAsync(ct);

                foreach (var dueId in touchedDueIds.Distinct()) await dueGenerator.RefreshDueStatusAsync(dueId, ct);
                await tx.CommitAsync(ct);
                paymentId = payment.Id;
            }
            catch (DbUpdateException) when (idempotencyKey is not null)
            {
                // A concurrent request with the same key won the unique-index race; answer with its result.
                await tx.RollbackAsync(ct);
                db.ChangeTracker.Clear();
                return await FindIdempotentReplayAsync(idempotencyKey, requestHash!, ct)
                    ?? throw new ConflictException("The payment could not be recorded; please retry.");
            }
        }
        return await MapPaymentAsync(paymentId, ct);
    }

    public async Task<FeePaymentDto> RefundFeePaymentAsync(Guid paymentId, RefundFeePaymentRequest request, CancellationToken ct)
    {
        var tenantId = RequireTenant();
        var userId = RequireUser();
        await EnsureSettingsExistAsync(ct);

        Guid refundId;
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            await rowLocker.LockOrganizationSettingsAsync(db, tenantId, ct);
            await rowLocker.LockFeePaymentAsync(db, paymentId, ct);
            var original = await db.FeePayments.Include(x => x.Student).SingleOrDefaultAsync(x => x.Id == paymentId, ct)
                ?? throw new NotFoundException(nameof(FeePayment));
            if (original.Amount <= 0) throw new AppValidationException("Only original payments can be refunded.");
            var alreadyRefunded = await db.FeePayments.Where(x => x.RefundOfPaymentId == paymentId)
                .SumAsync(x => (decimal?)-x.Amount, ct) ?? 0;
            var refundable = original.Amount - alreadyRefunded;
            var amount = request.Amount ?? refundable;
            if (amount <= 0 || amount > refundable) throw new AppValidationException(nameof(request.Amount));

            var refund = new FeePayment
            {
                TenantId = tenantId, StudentId = original.StudentId, ReceiptNumber = await NextReceiptNumberAsync(ct),
                Amount = -amount, PaymentDate = DateTimeOffset.UtcNow, Method = original.Method,
                CollectedByUserId = userId, Remarks = Clean(request.Remarks), RefundOfPaymentId = original.Id
            };
            db.FeePayments.Add(refund);

            var originalAllocations = await db.FeePaymentAllocations.Where(x => x.FeePaymentId == paymentId)
                .OrderByDescending(x => x.AllocatedAt).ToListAsync(ct);
            await rowLocker.LockFeeDuesAsync(db, originalAllocations.Select(x => x.FeeDueId).Distinct().ToList(), ct);
            var originalAllocationIds = originalAllocations.Select(x => x.Id).ToList();
            var alreadyReversedByAllocation = originalAllocationIds.Count == 0 ? [] : await db.FeePaymentAllocations
                .Where(x => x.ReversalOfAllocationId != null && originalAllocationIds.Contains(x.ReversalOfAllocationId!.Value))
                .GroupBy(x => x.ReversalOfAllocationId!.Value)
                .Select(g => new { AllocationId = g.Key, Reversed = -g.Sum(x => x.Amount) })
                .ToDictionaryAsync(x => x.AllocationId, x => x.Reversed, ct);
            var remaining = amount;
            var touchedDueIds = new List<Guid>();
            foreach (var allocation in originalAllocations)
            {
                if (remaining <= 0) break;
                var reversible = allocation.Amount - alreadyReversedByAllocation.GetValueOrDefault(allocation.Id);
                if (reversible <= 0) continue;
                var take = Math.Min(reversible, remaining);
                db.FeePaymentAllocations.Add(new FeePaymentAllocation
                {
                    TenantId = tenantId, FeePayment = refund, FeeDueId = allocation.FeeDueId,
                    Amount = -take, ReversalOfAllocationId = allocation.Id
                });
                touchedDueIds.Add(allocation.FeeDueId);
                remaining -= take;
            }
            // any remainder was unconsumed credit on the original payment; nothing more to reverse against a due

            refund.Transaction = new FinancialTransaction
            {
                TenantId = tenantId, Title = string.Concat("Refund - ", original.Student.Name), Type = TransactionType.Expense,
                Amount = amount, Category = "Refund", OccurredAt = refund.PaymentDate, FeePayment = refund
            };
            await db.SaveChangesAsync(ct);

            foreach (var dueId in touchedDueIds.Distinct()) await dueGenerator.RefreshDueStatusAsync(dueId, ct);
            await tx.CommitAsync(ct);
            refundId = refund.Id;
        }
        return await MapPaymentAsync(refundId, ct);
    }

    public async Task<FeeDueDto> AddFeeAdjustmentAsync(Guid dueId, AddFeeAdjustmentRequest request, CancellationToken ct)
    {
        var tenantId = RequireTenant();
        var userId = RequireUser();
        RequireText(request.Reason, nameof(request.Reason));
        // Proration is system-only (enrollment maths); everything else can be applied by hand.
        if (request.Type is not (FeeAdjustmentType.Discount or FeeAdjustmentType.Waiver
            or FeeAdjustmentType.Fine or FeeAdjustmentType.WriteOff))
            throw new AppValidationException(nameof(request.Type));
        // A manual fine or write-off is always a positive amount; only Discount/Waiver keep the
        // legacy "negative amount = correction of an earlier row" affordance.
        if (request.Amount == 0
            || (request.Amount < 0 && request.Type is FeeAdjustmentType.Fine or FeeAdjustmentType.WriteOff))
            throw new AppValidationException(nameof(request.Amount));

        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            await rowLocker.LockFeeDuesAsync(db, [dueId], ct);
            var due = await db.FeeDues.SingleOrDefaultAsync(x => x.Id == dueId, ct)
                ?? throw new NotFoundException(nameof(FeeDue));
            if (due.Status == FeeDueStatus.Cancelled)
                throw new ConflictException("A cancelled fee due cannot be adjusted.");

            var adjustmentsAfter = await db.FeeAdjustments.Where(x => x.FeeDueId == dueId).ToListAsync(ct);
            adjustmentsAfter.Add(new FeeAdjustment { Type = request.Type, Amount = request.Amount, Reason = "" });
            var newNet = FeeDueMath.NetAmount(due.Amount, adjustmentsAfter);
            var allocated = await db.FeePaymentAllocations.Where(x => x.FeeDueId == dueId)
                .SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
            if (newNet < 0 || newNet < allocated)
                throw new AppValidationException("The adjustment would reduce the due below zero or below its already-paid amount.");

            db.FeeAdjustments.Add(new FeeAdjustment
            {
                TenantId = tenantId, FeeDueId = dueId, Type = request.Type, Amount = request.Amount,
                Reason = request.Reason.Trim(), PerformedByUserId = userId
            });
            due.DiscountAmount = FeeDueMath.DiscountAndWaiverTotal(adjustmentsAfter);
            due.NetAmount = newNet;
            await db.SaveChangesAsync(ct);
            await dueGenerator.RefreshDueStatusAsync(dueId, ct);
            await tx.CommitAsync(ct);
        }
        return await GetDueAsync(dueId, ct);
    }

    public async Task<IReadOnlyList<FeeAdjustmentDto>> GetFeeAdjustmentsAsync(Guid dueId, CancellationToken ct)
    {
        if (!await db.FeeDues.AnyAsync(x => x.Id == dueId, ct)) throw new NotFoundException(nameof(FeeDue));
        var adjustments = await db.FeeAdjustments.AsNoTracking().Where(x => x.FeeDueId == dueId)
            .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        var performerIds = adjustments.Where(x => x.PerformedByUserId != null)
            .Select(x => x.PerformedByUserId!.Value).Distinct().ToList();
        var names = performerIds.Count == 0 ? [] : await db.Users.AsNoTracking()
            .Where(x => performerIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.FullName, ct);
        return adjustments.Select(x => new FeeAdjustmentDto(x.Id, x.Type, x.Amount, x.Reason,
            x.PerformedByUserId is null ? "System" : names.GetValueOrDefault(x.PerformedByUserId.Value, "Staff"),
            x.CreatedAt)).ToList();
    }

    public async Task<FeeDueDto> CancelFeeDueAsync(Guid dueId, CancelFeeDueRequest request, CancellationToken ct)
    {
        var userId = RequireUser();
        RequireText(request.Reason, nameof(request.Reason));

        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            await rowLocker.LockFeeDuesAsync(db, [dueId], ct);
            var due = await db.FeeDues.SingleOrDefaultAsync(x => x.Id == dueId, ct)
                ?? throw new NotFoundException(nameof(FeeDue));
            if (due.Status != FeeDueStatus.Cancelled)
            {
                var allocated = await db.FeePaymentAllocations.Where(x => x.FeeDueId == dueId)
                    .SumAsync(x => (decimal?)x.Amount, ct) ?? 0;
                if (allocated > 0)
                    throw new ConflictException("Money is already allocated to this due. Refund or reallocate it before cancelling.");
                due.Status = FeeDueStatus.Cancelled;
                due.CancelledAt = DateTimeOffset.UtcNow;
                due.CancelledByUserId = userId;
                due.CancelReason = request.Reason.Trim();
                await db.SaveChangesAsync(ct);
            }
            await tx.CommitAsync(ct);
        }
        return await GetDueAsync(dueId, ct);
    }

    public async Task<FeeDueDto> CreateCustomFeeDueAsync(CreateCustomFeeDueRequest request, CancellationToken ct)
    {
        RequireTenant();
        RequireText(request.Title, nameof(request.Title));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var enrollment = await db.Enrollments.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.EnrollmentId && x.StudentId == request.StudentId, ct)
            ?? throw new AppValidationException(nameof(request.EnrollmentId));

        var today = await dueGenerator.TodayForTenantAsync(ct);
        Guid dueId;
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            dueId = await CreateCustomDueCoreAsync(enrollment, request.Title.Trim(), request.Amount, request.DueDate, today, ct);
            await tx.CommitAsync(ct);
        }
        return await GetDueAsync(dueId, ct);
    }

    public async Task<IReadOnlyList<FeeDueDto>> CreateCustomFeeDuesForBatchAsync(CreateBatchCustomFeeDueRequest request, CancellationToken ct)
    {
        RequireTenant();
        RequireText(request.Title, nameof(request.Title));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        if (!await db.Batches.AnyAsync(x => x.Id == request.BatchId, ct))
            throw new AppValidationException(nameof(request.BatchId));
        var enrollments = await db.Enrollments.AsNoTracking()
            .Where(x => x.BatchId == request.BatchId && x.Status == EnrollmentStatus.Active)
            .ToListAsync(ct);
        if (enrollments.Count == 0)
            throw new AppValidationException("The batch has no active students to charge.");

        var today = await dueGenerator.TodayForTenantAsync(ct);
        var title = request.Title.Trim();
        var dueIds = new List<Guid>();
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            foreach (var enrollment in enrollments)
                dueIds.Add(await CreateCustomDueCoreAsync(enrollment, title, request.Amount, request.DueDate, today, ct));
            await tx.CommitAsync(ct);
        }
        var dues = await DueQuery().Where(x => dueIds.Contains(x.Id)).OrderBy(x => x.Student.Name).ToListAsync(ct);
        return await MapDuesAsync(dues, ct);
    }

    /// <summary>
    /// Creates one custom (structure-less) due and applies advance credit. Custom dues aren't
    /// covered by the schedule's unique index (null FeeStructureId), so an identical live charge
    /// on the enrollment is treated as the same submission and returned instead of billed twice.
    /// </summary>
    private async Task<Guid> CreateCustomDueCoreAsync(Enrollment enrollment, string title, decimal amount,
        DateOnly dueDate, DateOnly today, CancellationToken ct)
    {
        var existing = await db.FeeDues.AsNoTracking()
            .Where(x => x.EnrollmentId == enrollment.Id && x.FeeStructureId == null && x.Title == title
                && x.Amount == amount && x.DueDate == dueDate && x.Status != FeeDueStatus.Cancelled)
            .Select(x => (Guid?)x.Id).FirstOrDefaultAsync(ct);
        if (existing is not null) return existing.Value;

        var due = new FeeDue
        {
            TenantId = enrollment.TenantId, StudentId = enrollment.StudentId, EnrollmentId = enrollment.Id,
            FeeStructureId = null, Title = title, DueDate = dueDate,
            Amount = amount, DiscountAmount = 0, NetAmount = amount,
            Status = dueDate > today ? FeeDueStatus.Upcoming : FeeDueStatus.Pending
        };
        db.FeeDues.Add(due);
        await db.SaveChangesAsync(ct);
        await dueGenerator.AllocateCreditAsync(due, ct);
        await dueGenerator.RefreshDueStatusAsync(due.Id, ct);
        return due.Id;
    }

    public async Task<IReadOnlyList<FeePaymentDto>> GetStudentPaymentsAsync(Guid studentId, CancellationToken ct)
    {
        var payments = await db.FeePayments.AsNoTracking().Include(x => x.Student)
            .Where(x => x.StudentId == studentId).OrderByDescending(x => x.PaymentDate).ToListAsync(ct);
        return await MapPaymentsAsync(payments, ct);
    }

    public async Task<ReceiptDto> GetReceiptAsync(Guid paymentId, CancellationToken ct)
    {
        var payment = await db.FeePayments.AsNoTracking().Include(x => x.Student)
            .SingleOrDefaultAsync(x => x.Id == paymentId, ct) ?? throw new NotFoundException(nameof(FeePayment));
        var settings = await db.OrganizationSettings.AsNoTracking().SingleOrDefaultAsync(ct) ?? OrganizationSettingsDefaults.Create(RequireTenant());
        var collectedByName = await db.Users.AsNoTracking().Where(x => x.Id == payment.CollectedByUserId)
            .Select(x => x.FullName).FirstOrDefaultAsync(ct) ?? "Staff";
        var allocations = await db.FeePaymentAllocations.AsNoTracking()
            .Include(x => x.FeeDue).ThenInclude(x => x.Enrollment).ThenInclude(x => x.Batch).ThenInclude(x => x.Course)
            .Where(x => x.FeePaymentId == paymentId).ToListAsync(ct);

        var (courseName, batchName) = allocations.Count switch
        {
            0 => ("Advance payment", "-"),
            1 => (allocations[0].FeeDue.Enrollment.Batch.Course.Name, allocations[0].FeeDue.Enrollment.Batch.Name),
            _ => ("Multiple courses", "Multiple batches")
        };

        return new ReceiptDto(payment.Id, payment.ReceiptNumber, settings.Name, settings.ReceiptAddress, settings.ReceiptPhone,
            settings.ReceiptEmail, settings.LogoUrl, settings.ReceiptShowLogo, settings.ReceiptShowSignature,
            settings.ReceiptFooter, payment.Student.Name, payment.Student.StudentNumber, courseName, batchName,
            payment.Amount, payment.PaymentDate, payment.Method, collectedByName, payment.Student.Phone);
    }

    public async Task<FinanceSummaryDto> GetFinanceAsync(DateTimeOffset from, DateTimeOffset to, CancellationToken ct)
    {
        if (from >= to) throw new AppValidationException(nameof(from));
        from = from.ToUniversalTime();
        to = to.ToUniversalTime();
        var items = await db.Transactions.AsNoTracking()
            .Where(x => x.OccurredAt >= from && x.OccurredAt < to)
            .OrderByDescending(x => x.OccurredAt).ToListAsync(ct);
        var income = items.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount);
        var expenses = items.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount);
        return new FinanceSummaryDto(from, to, income, expenses, income - expenses, items.Select(MapTransaction).ToList());
    }

    public async Task<TransactionDto> CreateTransactionAsync(CreateTransactionRequest request, CancellationToken ct)
    {
        RequireText(request.Title, nameof(request.Title));
        RequireText(request.Category, nameof(request.Category));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var item = new FinancialTransaction
        {
            TenantId = RequireTenant(), Title = request.Title.Trim(), Type = request.Type, Amount = request.Amount,
            Category = request.Category.Trim(), OccurredAt = (request.OccurredAt ?? DateTimeOffset.UtcNow).ToUniversalTime()
        };
        db.Transactions.Add(item);
        await db.SaveChangesAsync(ct);
        return MapTransaction(item);
    }

    public async Task<TransactionDto> UpdateTransactionAsync(Guid id, UpdateTransactionRequest request, CancellationToken ct)
    {
        RequireText(request.Title, nameof(request.Title));
        RequireText(request.Category, nameof(request.Category));
        if (request.Amount <= 0) throw new AppValidationException(nameof(request.Amount));
        var item = await db.Transactions.FindAsync([id], ct) ?? throw new NotFoundException(nameof(FinancialTransaction));
        if (item.FeePaymentId is not null)
            throw new ConflictException("This entry was generated from a fee payment — refund the payment instead of editing it directly.");
        item.Title = request.Title.Trim();
        item.Type = request.Type;
        item.Amount = request.Amount;
        item.Category = request.Category.Trim();
        item.OccurredAt = (request.OccurredAt ?? item.OccurredAt).ToUniversalTime();
        await db.SaveChangesAsync(ct);
        return MapTransaction(item);
    }

    public async Task DeleteTransactionAsync(Guid id, CancellationToken ct)
    {
        var item = await db.Transactions.FindAsync([id], ct) ?? throw new NotFoundException(nameof(FinancialTransaction));
        if (item.FeePaymentId is not null)
            throw new ConflictException("This entry was generated from a fee payment — refund the payment instead of deleting it directly.");
        db.Transactions.Remove(item);
        await db.SaveChangesAsync(ct);
    }

    private IQueryable<FeeDue> DueQuery() => db.FeeDues.AsNoTracking().Include(x => x.Student)
        .Include(x => x.Enrollment).ThenInclude(x => x.Batch).ThenInclude(x => x.Course);

    private async Task<FeeDueDto> GetDueAsync(Guid dueId, CancellationToken ct)
    {
        var due = await DueQuery().SingleAsync(x => x.Id == dueId, ct);
        return (await MapDuesAsync([due], ct))[0];
    }

    private async Task<IReadOnlyList<FeeDueDto>> MapDuesAsync(IReadOnlyList<FeeDue> dues, CancellationToken ct)
    {
        var ids = dues.Select(x => x.Id).ToList();
        var paidMap = ids.Count == 0 ? new Dictionary<Guid, decimal>() : await db.FeePaymentAllocations
            .Where(x => ids.Contains(x.FeeDueId)).GroupBy(x => x.FeeDueId)
            .Select(g => new { FeeDueId = g.Key, Paid = g.Sum(x => x.Amount) })
            .ToDictionaryAsync(x => x.FeeDueId, x => x.Paid, ct);
        return dues.Select(x =>
        {
            var paid = paidMap.GetValueOrDefault(x.Id);
            return new FeeDueDto(x.Id, x.StudentId, x.Student.Name, x.EnrollmentId, x.Enrollment.BatchId,
                x.Enrollment.Batch.Name, x.Enrollment.Batch.Course.Name, x.FeeStructureId, x.DueDate, x.Amount,
                x.DiscountAmount, x.NetAmount, paid, x.NetAmount - paid, x.Status, x.Title, x.CancelledAt, x.CancelReason);
        }).ToList();
    }

    private async Task<FeePaymentDto> MapPaymentAsync(Guid paymentId, CancellationToken ct)
    {
        var payment = await db.FeePayments.AsNoTracking().Include(x => x.Student).SingleAsync(x => x.Id == paymentId, ct);
        return (await MapPaymentsAsync([payment], ct))[0];
    }

    /// <summary>Batched to avoid one users/allocations round trip per payment.</summary>
    private async Task<IReadOnlyList<FeePaymentDto>> MapPaymentsAsync(IReadOnlyList<FeePayment> payments, CancellationToken ct)
    {
        if (payments.Count == 0) return [];
        var paymentIds = payments.Select(x => x.Id).ToList();
        var collectorIds = payments.Select(x => x.CollectedByUserId).Distinct().ToList();
        var collectorNames = await db.Users.AsNoTracking().Where(x => collectorIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.FullName, ct);
        var allocations = await db.FeePaymentAllocations.AsNoTracking()
            .Include(x => x.FeeDue).ThenInclude(x => x.Enrollment).ThenInclude(x => x.Batch).ThenInclude(x => x.Course)
            .Where(x => paymentIds.Contains(x.FeePaymentId)).ToListAsync(ct);
        var allocationsByPayment = allocations.ToLookup(x => x.FeePaymentId);
        return payments.Select(payment => new FeePaymentDto(payment.Id, payment.StudentId, payment.Student.Name,
            payment.ReceiptNumber, payment.Amount, payment.PaymentDate, payment.Method, payment.ReferenceNumber,
            collectorNames.GetValueOrDefault(payment.CollectedByUserId, "Staff"), payment.Remarks, payment.RefundOfPaymentId,
            allocationsByPayment[payment.Id].Select(a => new FeePaymentAllocationDto(a.FeeDueId, a.FeeDue.DueDate,
                a.FeeDue.Enrollment.Batch.Course.Name, a.FeeDue.Enrollment.Batch.Name, a.Amount)).ToList())).ToList();
    }

    /// <summary>
    /// Returns the payment previously recorded under this idempotency key, or null when the key is
    /// unused. A key reused with a different payload is a client bug and gets a conflict.
    /// </summary>
    private async Task<FeePaymentDto?> FindIdempotentReplayAsync(string idempotencyKey, string requestHash, CancellationToken ct)
    {
        var existing = await db.FeePayments.AsNoTracking()
            .SingleOrDefaultAsync(x => x.IdempotencyKey == idempotencyKey, ct);
        if (existing is null) return null;
        if (!string.Equals(existing.RequestHash, requestHash, StringComparison.OrdinalIgnoreCase))
            throw new ConflictException("This idempotency key was already used with a different payload.");
        return await MapPaymentAsync(existing.Id, ct);
    }

    /// <summary>Canonical fingerprint of the payment request, so replays are distinguishable from key reuse.</summary>
    private static string ComputeRequestHash(RecordFeePaymentRequest request)
    {
        var canonical = string.Join('|',
            request.StudentId,
            request.FeeDueId?.ToString() ?? "",
            request.Amount.ToString("F2", CultureInfo.InvariantCulture),
            request.Method,
            request.ReferenceNumber?.Trim() ?? "",
            request.Remarks?.Trim() ?? "",
            request.PaymentDate?.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) ?? "");
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }

    /// <summary>The settings row must exist before a payment transaction can lock it.</summary>
    private async Task EnsureSettingsExistAsync(CancellationToken ct)
    {
        if (await db.OrganizationSettings.AnyAsync(ct)) return;
        db.OrganizationSettings.Add(OrganizationSettingsDefaults.Create(RequireTenant()));
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // a concurrent request created it first — the unique TenantId index caught the race
            db.ChangeTracker.Clear();
        }
    }

    private async Task<string> NextReceiptNumberAsync(CancellationToken ct)
    {
        var settings = await db.OrganizationSettings.SingleAsync(ct);
        var number = settings.NextReceiptNumber;
        settings.NextReceiptNumber++;
        return $"{settings.ReceiptPrefix}-{number:D6}";
    }

    private static FeeStructureDto MapStructure(FeeStructure x) =>
        new(x.Id, x.CourseId, x.Course.Name, x.Name, x.Amount, x.Frequency, x.EffectiveFrom, x.EffectiveTo, x.IsActive,
            x.FeeHeadId, x.FeeHead?.Name);

    private static TransactionDto MapTransaction(FinancialTransaction item) =>
        new(item.Id, item.Title, item.Type, item.Amount, item.Category, item.OccurredAt, item.FeePaymentId);

    private static void RequireText(string? value, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new AppValidationException(field);
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private Guid RequireTenant() => tenantContext.TenantId ?? throw new AppValidationException("A tenant context is required.");
    private Guid RequireUser() => tenantContext.UserId ?? throw new AppValidationException("A user context is required.");
}
