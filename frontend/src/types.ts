export type AttendanceStatus = 'P' | 'A' | 'L';
export type AppTab = 'home' | 'students' | 'batches' | 'finance' | 'log' | 'reports' | 'menu';

export type EnrollmentStatus = 'Active' | 'Completed' | 'Withdrawn';
export type FeeFrequency = 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Yearly' | 'OneTime';
export type FeeDueStatus = 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled';
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
}

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  batchCount: number;
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
  overallAttendance: number;
  wonCount: number;
  participatedCount: number;
  enrollments: EnrollmentSummary[];
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
}

export interface FeeDue {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentId: string;
  batchId: string;
  batchName: string;
  courseName: string;
  feeStructureId: string;
  dueDate: string;
  amount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: FeeDueStatus;
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
  courseName: string;
  batchName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  collectedByName: string;
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
}
