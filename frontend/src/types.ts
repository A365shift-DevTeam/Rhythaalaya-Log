export type AttendanceStatus = 'P' | 'A' | 'L';

export interface Student {
  id: string; // STU-001
  name: string;
  avatar?: string;
  course: string;
  batch: string; // e.g. 'Morning Batch - Yoga 101' or 'Mon/Wed 5pm'
  feeStatus: 'Paid' | 'Pending';
  feeAmount: number;
  overallAttendance: number; // percentage e.g. 95
  phone?: string;
  email?: string;
  joinDate?: string;
  overdueDays?: number;
}

export interface Batch {
  id: string;
  name: string;
  course: string;
  schedule: string; // e.g., "Mon/Wed 5:00 PM"
  instructor: string;
  enrolledCount: number;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  batchId: string;
  studentAttendance: Record<string, AttendanceStatus>; // studentId -> 'P' | 'A' | 'L'
  isSubmitted: boolean;
}

export interface Transaction {
  id: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category: string; // 'Rent', 'Fees', 'Salary', 'Misc'
  date: string;
  time?: string;
}

export interface OrgSettings {
  name: string;
  type: string;
  logoUrl: string;
  themeColor: string; // 'purple' | 'blue' | 'emerald' | 'rose'
  darkMode: boolean;
  defaultMonthlyFee: number;
  feeDueDate: string; // '5th of Month'
}
