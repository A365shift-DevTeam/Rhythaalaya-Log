import { OrgSettings } from '../types';

export const INITIAL_SETTINGS: OrgSettings = {
  name: 'Rhythaalaya Academy',
  type: 'Dance and Arts Academy',
  logoUrl: '',
  themeColor: 'emerald',
  darkMode: false,
  receipt: {
    prefix: 'REC', address: '', phone: '', email: '',
    footer: 'Thank you for your payment.', showLogo: true,
    showSignature: false, autoOpenAfterPayment: true
  },
  incomeCategories: ['Student Fees', 'Registration', 'Events', 'Other Income'],
  expenseCategories: ['Rent & Operations', 'Instructor Salary', 'Equipment', 'Utilities', 'Marketing', 'Other Expense', 'Refund'],
  notifications: {
    enabled: true, feeReminders: true, paymentUpdates: true, attendanceAlerts: true
  },
  feeDueLeadDays: 7,
  lateEnrollmentBillingPolicy: 'Skip'
};
