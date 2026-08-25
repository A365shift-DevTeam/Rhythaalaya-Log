# Fee Management Completion — Design

Date: 2026-08-25
Branch: `Fees`
Status: Approved design, pending spec review

## Goal

Complete the existing partial fee-management implementation in RhythaalayaLog:
upcoming dues with configurable lead days, late-enrollment billing policy with
daily proration, future fee plans, first-class adjustments, timezone-safe
billing (per-tenant IANA timezone, default `Asia/Kolkata`), a daily billing
processor, and production-safe payments (idempotency, PostgreSQL concurrency
protection, atomic receipts/ledger/status updates). Preserve the existing
domain model and services — evolve, don't rewrite.

## What already exists and is preserved

- `FeePayment` → `FeePaymentAllocation` → `FeeDue` with partial payments,
  refunds tracking `ReversalOfAllocationId`, and advance-payment credit
  auto-applied to newly generated dues.
- Unique index `(TenantId, EnrollmentId, FeeStructureId, DueDate)` on FeeDues
  with a `DbUpdateException` catch for concurrent generation.
- `decimal` money with `HasPrecision(12, 2)` everywhere; per-tenant query
  filters on every fee table; per-tenant receipt numbering with unique index.
- Lazy on-read due generation (`FeeDueGenerator.EnsureFor*`) — kept as-is and
  supplemented (not replaced) by the daily processor.
- Two existing migrations (`InitialCreate`, `AddStudentAchievements`); model
  and snapshot are in sync (verified with `dotnet ef migrations
  has-pending-model-changes`).

Verified absent (searched all branches, stashes, history, and
`backend/database/full_schema.sql`): there is no existing `FeeAdjustment`
model, no `LateEnrollmentBillingPolicy`, and `RhythaalayaLog.Tests/` is an
empty directory not referenced by the solution. These are built new.

## Defects being fixed

1. **Future fee plans**: `CreateFeeStructureAsync` deactivates the current
   structure immediately even when the new one starts in the future, and the
   generator filters by `IsActive && EffectiveFrom <= today` — leaving a gap
   where no dues generate at all.
2. **Timezone**: billing "today" is `DateTime.UtcNow.Date`; the stored tenant
   timezone is never used, so dues appear/go overdue 5.5 h late for IST.
3. **Receipt-number race**: concurrent payments read the same
   `NextReceiptNumber` and one fails with an unretried 409.
4. **Over-allocation race**: the remaining-balance check reads the allocation
   sum without locking, so two concurrent payments can overpay a due.
5. **No idempotency**: a double-submitted payment POST creates two payments.
6. **Non-atomic payment flow**: payment insert and due-status refresh commit in
   separate `SaveChanges` calls with no wrapping transaction.

## Schema changes (one migration, backward compatible)

### FeeDue
- `FeeStructureId` becomes nullable — custom one-off charges have no
  structure. PostgreSQL treats NULLs as distinct in the existing unique index,
  so custom dues never collide with scheduled ones.
- New nullable `Title` (max 160) — display name for custom charges.
- New `CancelledAt` (timestamptz?), `CancelledByUserId` (uuid?),
  `CancelReason` (max 500?) — set when status → Cancelled.
- New enum value `FeeDueStatus.Upcoming` (statuses stored as strings; existing
  rows untouched).
- `DiscountAmount` is retained for backward compatibility as a stored cache of
  the sum of Discount/Waiver adjustments; `NetAmount` remains the stored
  billable amount = `Amount − sum(all adjustment amounts)`.

### FeeAdjustment (new table)
Immutable, append-only rows; the adjustment ledger is itself the audit history.

| Column | Type | Notes |
|---|---|---|
| Id | uuid PK | |
| TenantId | uuid | tenant filter + FK, cascade |
| FeeDueId | uuid FK → FeeDues | restrict delete |
| Type | string(16) | `Discount` \| `Waiver` \| `Proration` |
| Amount | numeric(12,2) | positive = reduction of NetAmount |
| Reason | string(500) | required for Discount/Waiver; system text for Proration |
| PerformedByUserId | uuid? | null = system (proration) |
| CreatedAt | timestamptz | |

Index: `(TenantId, FeeDueId)`. Corrections are new compensating rows (negative
`Amount`), never edits or deletes.

### FeePayment
- New nullable `IdempotencyKey` (string 64) and `RequestHash` (string 64,
  SHA-256 hex of the canonical request payload).
- Filtered unique index `(TenantId, IdempotencyKey) WHERE IdempotencyKey IS NOT NULL`.

### OrganizationSettings
- `FeeDueLeadDays` int, default **7** — how many days before the due date an
  Upcoming due is generated/visible.
- `LateEnrollmentBillingPolicy` string(16), default **`Skip`**
  (`Skip` | `Full` | `Prorated`).
- `LastBillingRunDate` DateOnly? — last tenant-local date the daily processor
  completed for this tenant.

## Billing engine (`FeeDueGenerator` evolution)

### Timezone-safe "today"
`TodayForTenant` = `DateOnly` of now converted via
`TimeZoneInfo.FindSystemTimeZoneById(settings.TimeZone)` (IANA IDs work on
.NET 8+ with ICU). Fallback to `Asia/Kolkata` if the stored ID is invalid.
Every date comparison in generation, overdue marking, and Upcoming→Pending
flipping uses tenant-local today.

### Recurrence anchor and plan resolution (fixes future-plans gap)
- The due chain for an enrollment is anchored **once**: the first recurring due
  is the first occurrence of the *original* structure's cadence (stepping from
  that structure's `EffectiveFrom`) on/after the enrollment date, then
  advances by the frequency period forever. Changing plans never re-anchors
  the schedule.
- For each candidate due date, the applicable structure is resolved **by date
  window**: the structure for the course with `EffectiveFrom ≤ dueDate` and
  (`EffectiveTo` null or `≥ dueDate`), newest `EffectiveFrom` first.
  `IsActive` no longer participates in schedule resolution (it remains a UI
  soft-disable flag).
- If no structure covers a due date (a genuine gap), no due is created for that
  date; generation continues at the next period.
- The existing "latest due" lookup changes from per-(enrollment, structure) to
  **per-enrollment**, so the chain continues across plan boundaries.
- `CreateFeeStructureAsync` change: when the new structure starts in the
  future, existing structures keep `IsActive = true`; only `EffectiveTo` is
  trimmed to `newEffectiveFrom − 1 day`. Overlap validation stays (new plan
  must start after existing plans' `EffectiveFrom`).
- Frequency changes across plans: the cadence of the structure effective at
  the last generated due's date determines the step to the next due.

### Lead days / Upcoming
Generation runs through `todayLocal + FeeDueLeadDays`. A due with
`DueDate > todayLocal` is created as `Upcoming`; on/after its due date it
flips to `Pending` (or `Partial`/`Paid` per allocations). Status rules in
`RefreshDueStatusAsync` (tenant-local dates): `Cancelled` is sticky;
fully-covered → `Paid`; otherwise a future-dated due is `Upcoming` (even when
partially covered by credit, so the upcoming view stays intact); otherwise
past-due → `Overdue`, partially covered → `Partial`, else `Pending`.
Advance credit auto-applies to Upcoming dues the same as Pending ones.

### Late enrollment policy (first partial period only)
Applies when the enrollment date falls strictly inside a recurring period
(anchor date < enrolledOn < next period start):
- **Skip** (default): no due for the partial period; billing starts at the next
  full period.
- **Full**: due for the partial period at full amount (current behavior).
- **Prorated**: due created with base `Amount` = full price and a system
  `Proration` adjustment of `full × elapsedDays ÷ periodDays` (2-decimal
  `MidpointRounding.AwayFromZero`), so `NetAmount` = full × remainingDays ÷
  periodDays, where `remainingDays` counts enrolledOn through the day before
  the next period start and `periodDays` is the actual length of that period.
- OneTime fees are never prorated or skipped.

### Pure schedule math
Cadence stepping, anchor computation, proration arithmetic, and plan-window
resolution are extracted into a static, side-effect-free `BillingSchedule`
class (Infrastructure) that is unit-testable without a database.

## Daily processor

`FeeBillingDailyService : BackgroundService`, registered in the API host.
- Wakes every hour (and once at startup).
- Loads all tenants' settings **bypassing the tenant filter**
  (`IgnoreQueryFilters`), computes each tenant's local date, and processes
  tenants where `LastBillingRunDate` is null or < local today.
- Per tenant, inside a PostgreSQL advisory lock
  (`pg_try_advisory_xact_lock(hash(tenantId))`) so overlapping app instances
  never run the same tenant's sweep twice concurrently (concurrent lazy
  passes don't take the lock — they are already safe via the unique due index
  and idempotent status refresh): generate dues (lead window), flip
  Upcoming→Pending, mark Overdue, apply advance credit, then set
  `LastBillingRunDate = localToday`.
- Each tenant runs in its own scope/transaction; one tenant's failure is
  logged and doesn't block the rest. Missed days self-heal (generation walks
  forward from the last due, and status refresh is idempotent).
- Lazy on-read `EnsureFor*` calls remain untouched, so a stopped job degrades
  gracefully.

## Production-safe payments

`RecordFeePaymentAsync` becomes a single atomic PostgreSQL transaction:

1. If `IdempotencyKey` present: compute `RequestHash` = SHA-256 over a
   canonical string of `(StudentId, FeeDueId, Amount, Method,
   ReferenceNumber, Remarks, PaymentDate)`. Look up
   `(TenantId, IdempotencyKey)`:
   - found + same hash → return the existing payment (no-op replay);
   - found + different hash → 409 Conflict ("key reused with different
     payload").
2. `BeginTransaction` (no retry strategy is configured, so a plain explicit
   transaction is safe):
   - `SELECT … FOR UPDATE` the tenant's `OrganizationSettings` row (raw SQL)
     → serializes receipt-number issuance; increment `NextReceiptNumber`.
   - `SELECT … FOR UPDATE` the target due row(s) before summing allocations →
     the balance/over-payment check is race-free.
   - Insert payment + allocations + `FinancialTransaction` + refresh statuses
     of touched dues, then commit — one atomic unit.
3. A concurrent insert with the same idempotency key surfaces as a unique-index
   `DbUpdateException`; catch, re-read, and apply rule 1 (return the winner if
   the hash matches, 409 otherwise).

`RefundFeePaymentAsync` gets the same treatment: one transaction, `FOR UPDATE`
on the original payment row (serializes the refundable-amount check) and on
touched dues.

Cancellation invariant: a due whose net allocated amount > 0 cannot be
cancelled; the request fails with 409 telling the admin to refund or
reallocate the money first. Cancelling never silently converts allocations to
advance credit. Cancelled dues are excluded from balances (already the case in
`FeeBalanceCalculator`) and from further credit auto-application.

## API surface

All new mutating endpoints are `TenantAdmin`-only; reads follow existing rules.

| Endpoint | Purpose |
|---|---|
| `POST /api/finance/dues/{id}/adjustments` | body: `Type (Discount\|Waiver)`, `Amount`, `Reason` — appends a FeeAdjustment, recalculates `DiscountAmount`/`NetAmount`, refreshes status. Rejects if the due is Cancelled, or if resulting NetAmount < already-allocated total or < 0. |
| `POST /api/finance/dues/{id}/cancel` | body: `Reason` — cancels an unpaid due (see invariant above). |
| `POST /api/finance/dues/custom` | body: `StudentId`, `EnrollmentId`, `Title`, `Amount`, `DueDate` — creates a structure-less due (status by date: Upcoming/Pending). |
| `GET /api/finance/dues/{id}/adjustments` | adjustment history for a due. |
| `GET /api/finance/dues?status=Upcoming` | existing endpoint; new status value just works. |

Request/DTO changes: `RecordFeePaymentRequest` + `IdempotencyKey` (optional
string ≤ 64); `UpdateSettingsRequest`/`SettingsDto` + `FeeDueLeadDays`,
`LateEnrollmentBillingPolicy`; `FeeDueDto` + `Title`, adjustment/cancel info.

## Frontend

- `FinanceTab`: Upcoming status chip (existing status-chip pattern), status
  filter includes Upcoming; admin-gated row actions: Discount…, Cancel…,
  and an "Add charge" (custom due) action following the existing modal/Dialog
  conventions.
- `RecordFeeModal`: generates a UUID idempotency key when the modal opens and
  sends it with the payment; the key persists across retry clicks of the same
  form submission.
- Settings: numeric "Due lead days" field and a "Late enrollment billing"
  select (Skip/Full/Prorated).

## Tests

New `RhythaalayaLog.Tests` xUnit project added to the solution.

- **Pure unit tests** (`BillingSchedule`): anchor computation, cadence
  stepping across plan changes, month-end dates (Jan 31 anchor → Feb 28/29),
  plan-window resolution incl. gaps and future plans, proration arithmetic
  and rounding, lead-day windowing, Skip/Full/Prorated first-due behavior.
- **Service tests** (EF Core + SQLite in-memory): payment allocation ordering,
  advance credit application incl. Upcoming dues, refund reversal accounting,
  adjustment append + NetAmount/DiscountAmount recalculation, cancellation
  invariant, idempotent replay + fingerprint conflict, custom dues, status
  transitions. The `FOR UPDATE`/advisory-lock steps sit behind a tiny
  `IRowLocker` abstraction — real SQL on Npgsql, no-op on SQLite — so service
  logic is testable while locking stays provider-native.
- **Residual risk** (documented, accepted): true concurrent-race behavior
  (`FOR UPDATE`, advisory locks, filtered unique index under contention) only
  manifests on real PostgreSQL and is not covered by automated tests in this
  repo; it is guarded by unique indexes + single-transaction writes.

## Verification gate

`dotnet build -c Release` (0 warnings) → `dotnet test` → `dotnet ef migrations
has-pending-model-changes` (expect: the one new migration, then clean) →
frontend `npm run lint` + `npm run build`.

## Explicit non-goals

- No payment-gateway integration; payments remain manually recorded.
- No notification/reminder sending (settings flags exist; wiring is future work).
- No changes to attendance, achievements, or SaaS subscription billing.
- No retroactive regeneration of historical dues for existing data beyond what
  the normal forward-walking generator produces.
