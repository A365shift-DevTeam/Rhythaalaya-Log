export type AttendanceStatus = 'P' | 'A' | 'L';
export type AppTab = 'home' | 'students' | 'batches' | 'finance' | 'log' | 'reports' | 'admin';

export type EnrollmentStatus = 'Active' | 'Completed' | 'Withdrawn';
export type FeeFrequency = 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Yearly' | 'OneTime';
export type FeeDueStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled' | 'Upcoming';
export type FeeAdjustmentType = 'Discount' | 'Waiver' | 'Proration' | 'Fine' | 'WriteOff';
export type LateEnrollmentBillingPolicy = 'Skip' | 'Full' | 'Prorated';
export type PaymentMethod = 'Cash' | 'Upi' | 'Card' | 'BankTransfer' | 'Cheque' | 'Other';
export type AchievementCategory = 'Won' | 'Participated' | 'Other';

export const FEE_FREQUENCY_LABELS: Record<FeeFrequency, string> = {
  Monthly: 'Monthly', Quarterly: 'Quarterly', HalfYearly: 'Half-Yearly', Yearly: 'Yearly', OneTime: 'One-Time'
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  Cash: 'Cash', Upi: 'UPI', Card: 'Card', BankTransfer: 'Bank Transfer', Cheque: 'Cheque', Other: 'Other'
};
export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface Course {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  batchCount: number;
  /** Days before the due date a fee shows as Upcoming (1–30); null/undefined = academy default. */
  upcomingNotificationDays?: number | null;
}

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  batchCount: number;
}

/**
 * A one-off change to a batch's recurring schedule. The class normally held on `originalDate`
 * is moved to `newDate`, or cancelled outright when `newDate` is absent (a holiday).
 */
export interface SessionOverride {
  id: string;
  originalDate: string; // yyyy-MM-dd -- a date the recurring pattern normally meets
  newDate?: string;     // yyyy-MM-dd -- where it moved to; absent = cancelled, no class
  reason?: string;
}

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  staffId: string;
  staffName: string;
  days: string[]; // e.g. ["Monday", "Wednesday"] -- matches WEEKDAY_LABELS
  startTime: string; // "HH:mm"
  endTime: string;
  startDate: string; // yyyy-MM-dd
  endDate?: string;
  isActive: boolean;
  enrolledCount: number;
  sessionOverrides?: SessionOverride[];
}

export interface EnrollmentSummary {
  id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseName: string;
  enrolledOn: string;
  endedOn?: string;
  status: EnrollmentStatus;
  outstandingBalance: number;
}

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  avatar?: string;
  dateOfBirth?: string;
  parentName?: string;
  address?: string;
  phone?: string;
  email?: string;
  joinDate: string;
  isActive: boolean;
  outstandingBalance: number;
  /** False when nothing has ever been billed — the UI shows "No dues" instead of "Paid". */
  hasBillableDues: boolean;
  /** True when a not-yet-due (Upcoming) bill exists — the UI shows "Payment upcoming" instead of "No dues". */
  hasUpcomingDues: boolean;
  /** Unpaid balance of not-yet-due (Upcoming) bills. Informational only — never part of outstandingBalance. */
  upcomingAmount: number;
  overallAttendance: number;
  wonCount: number;
  participatedCount: number;
  enrollments: EnrollmentSummary[];
  concessionPercent: number;
  concessionReason?: string;
}

export interface Achievement {
  id: string;
  studentId: string;
  title: string;
  category: AchievementCategory;
  level?: string;
  eventDate: string;
  note?: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface FeeHead {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  structureCount: number;
}

export interface FeeStructure {
  id: string;
  courseId: string;
  courseName: string;
  name: string;
  amount: number;
  frequency: FeeFrequency;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  feeHeadId?: string;
  feeHeadName?: string;
}

export interface FeeDue {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  batchId: string;
  batchName: string;
  courseName: string;
  feeStructureId?: string;
  title?: string;
  dueDate: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: FeeDueStatus;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface FeeAdjustment {
  id: string;
  type: FeeAdjustmentType;
  amount: number;
  reason: string;
  performedByName: string;
  createdAt: string;
}

export interface FeePaymentAllocation {
  feeDueId: string;
  dueDate: string;
  courseName: string;
  batchName: string;
  amount: number;
}

export interface FeePayment {
  id: string;
  studentId: string;
  studentName: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  referenceNumber?: string;
  collectedByName: string;
  remarks?: string;
  refundOfPaymentId?: string;
  allocations: FeePaymentAllocation[];
}

export interface Receipt {
  paymentId: string;
  receiptNumber: string;
  organizationName: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationLogoUrl?: string;
  showLogo: boolean;
  showSignature: boolean;
  receiptFooter: string;
  studentName: string;
  studentNumber: string;
  studentPhone?: string;
  courseName: string;
  batchName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  collectedByName: string;
}

export type LedgerEntryType =
  'FeeCharge' | 'Payment' | 'Concession' | 'Waiver' | 'Proration' | 'Fine' | 'WriteOff' | 'Refund';

export const LEDGER_ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  FeeCharge: 'Fee charge', Payment: 'Payment', Concession: 'Concession',
  Waiver: 'Waiver', Proration: 'Proration', Fine: 'Fine', WriteOff: 'Write-off', Refund: 'Refund',
};

/** One line of the derived Student Fee Ledger. `balance` is the running balance after this row. */
export interface LedgerEntry {
  date: string; // yyyy-MM-dd
  type: LedgerEntryType;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  feeDueId?: string;
  paymentId?: string;
  reference?: string; // receipt number, for payment / refund rows
  feeHeadName?: string; // fee category, on charge rows
}

export interface StudentFinancialSummary {
  totalCharged: number;
  totalFines: number;
  totalAdjustments: number;
  totalWrittenOff: number;
  netCharged: number;
  totalPaid: number;
  pending: number;
  availableCredit: number;
  overdue: number;
  totalRefunded: number;
}

export interface StudentLedger {
  studentId: string;
  studentName: string;
  summary: StudentFinancialSummary;
  entries: LedgerEntry[];
}

export type FeePayerStatus =
  'NoDues' | 'Paid' | 'PartiallyPaid' | 'Pending' | 'Overdue' | 'Credit';

export const FEE_PAYER_STATUS_LABELS: Record<FeePayerStatus, string> = {
  NoDues: 'No dues', Paid: 'Paid', PartiallyPaid: 'Partly paid',
  Pending: 'Pending', Overdue: 'Overdue', Credit: 'In credit',
};

export interface BatchFinanceStudent {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  netCharged: number;
  collected: number;
  pending: number;
  overdue: number;
  availableCredit: number;
  status: FeePayerStatus;
}

export interface BatchFinance {
  batchId: string;
  batchName: string;
  courseName: string;
  totalCharged: number;
  totalFines: number;
  totalAdjustments: number;
  totalWrittenOff: number;
  netCharged: number;
  collected: number;
  pending: number;
  overdue: number;
  availableCredit: number;
  paidCount: number;
  partiallyPaidCount: number;
  pendingCount: number;
  overdueCount: number;
  withCreditCount: number;
  noDuesCount: number;
  students: BatchFinanceStudent[];
}

export interface BatchFinanceRow {
  batchId: string;
  batchName: string;
  courseName: string;
  studentCount: number;
  netCharged: number;
  collected: number;
  pending: number;
  overdue: number;
  availableCredit: number;
}

export interface FinanceDashboard {
  totalCharged: number;
  totalFines: number;
  totalAdjustments: number;
  totalWrittenOff: number;
  netCharged: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalStudentCredit: number;
  collectionToday: number;
  collectionThisMonth: number;
  collectionInRange: number;
  refundsInRange: number;
  writeOffsInRange: number;
  rangeFrom?: string;
  rangeTo?: string;
}

export interface CollectionPoint {
  period: string; // yyyy-MM-dd or yyyy-MM
  collected: number;
  refunded: number;
  net: number;
}

export interface CollectionReport {
  from: string;
  to: string;
  granularity: 'Day' | 'Month';
  totalCollected: number;
  totalRefunded: number;
  totalNet: number;
  points: CollectionPoint[];
}

export interface Transaction {
  id: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  occurredAt?: string;
  time?: string;
  feePaymentId?: string;
}

export interface ReceiptSettings {
  prefix: string;
  address: string;
  phone: string;
  email: string;
  footer: string;
  showLogo: boolean;
  showSignature: boolean;
  autoOpenAfterPayment: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  feeReminders: boolean;
  paymentUpdates: boolean;
  attendanceAlerts: boolean;
}

export interface OrgSettings {
  name: string;
  type: string;
  logoUrl: string;
  themeColor: string; // 'purple' | 'blue' | 'emerald' | 'rose'
  darkMode: boolean;
  receipt: ReceiptSettings;
  incomeCategories: string[];
  expenseCategories: string[];
  notifications: NotificationSettings;
  feeDueLeadDays: number;
  lateEnrollmentBillingPolicy: LateEnrollmentBillingPolicy;
  whatsappTemplate: string;
}
