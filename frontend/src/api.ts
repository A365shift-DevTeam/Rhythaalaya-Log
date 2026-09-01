import { Achievement, AchievementCategory, BatchFinance, BatchFinanceRow, Batch, CollectionReport, Course,
  FeeAdjustment, FeeAdjustmentType, FeeDue, FeeDueStatus, FeeFrequency, FeeHead, FinanceDashboard, FeePayment,
  FeeStructure, LateEnrollmentBillingPolicy, OrgSettings, PaymentMethod, Receipt, Staff, Student, StudentLedger,
  Transaction } from './types';
import { DEFAULT_WHATSAPP_TEMPLATE } from './whatsappTemplate';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5101/api').replace(/\/$/, '');
const SESSION_KEY = 'rhythaalaya_session';

export type UserRole = 'SuperAdmin' | 'TenantAdmin' | 'Staff';
export interface AuthUser {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantName?: string;
  subscriptionEndsAt?: string;
}
export interface Session { token: string; expiresAt: string; user: AuthUser }
export interface OtpChallenge { pendingToken: string; expiresAt: string }
// POST /auth/login always returns this one shape: otpRequired tells you which of the other two
// fields is populated, so there's never a need to guess from which keys are present.
export interface LoginStart {
  otpRequired: boolean;
  pendingToken?: string;
  otpExpiresAt?: string;
  session?: Session;
}
export interface Plan {
  id: string; name: string; code: string; monthlyPrice: number;
  maxUsers: number; maxStudents: number; isActive: boolean;
}
export interface Subscription {
  id: string; planId: string; planName: string; status: string;
  startsAt: string; endsAt: string;
}
export interface Tenant {
  id: string; name: string; slug: string; isActive: boolean;
  userCount: number; studentCount: number; subscription?: Subscription; createdAt: string;
}
export interface TenantUser {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  role: 'TenantAdmin' | 'Staff';
  isActive: boolean;
  otpEnabled: boolean;
  lastLoginAt?: string;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export const authStore = {
  get(): Session | null {
    try {
      const value = localStorage.getItem(SESSION_KEY);
      const session = value ? JSON.parse(value) as Session : null;
      if (!session || new Date(session.expiresAt) <= new Date()) return null;
      return session;
    } catch { return null; }
  },
  set(session: Session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); },
  clear() { localStorage.removeItem(SESSION_KEY); }
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const problem = await response.json();
      message = problem.detail || problem.title || message;
    } catch { /* response has no JSON body */ }
    if (response.status === 403) message = 'You don\'t have permission to do that. Ask your academy admin.';
    if (response.status === 401) authStore.clear();
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function requestForm<T>(path: string, form: FormData, token: string): Promise<T> {
  const response = await fetch(API_URL + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form
  });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const problem = await response.json();
      message = problem.detail || problem.title || message;
    } catch { /* response has no JSON body */ }
    if (response.status === 403) message = 'You don\'t have permission to do that. Ask your academy admin.';
    if (response.status === 401) authStore.clear();
    throw new ApiError(message, response.status);
  }
  return response.json() as Promise<T>;
}

const isoStartOfYear = () => new Date(new Date().getFullYear(), 0, 1).toISOString();
const isoNextYear = () => new Date(new Date().getFullYear() + 1, 0, 1).toISOString();

export const api = {
  // Step 1: email + password. Usually the server emails a one-time code and this returns
  // otpRequired:true with a pendingToken — step 2 (verifyOtp) exchanges it for the real session.
  // For a SuperAdmin, or a user with OTP switched off, otpRequired is false and session is the
  // real session already — no code screen needed.
  login: (email: string, password: string) =>
    request<LoginStart>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verifyOtp: (pendingToken: string, code: string) =>
    request<Session>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ pendingToken, code }) }),
  resendOtp: (pendingToken: string) =>
    request<OtpChallenge>('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ pendingToken }) }),

  // Courses
  courses: (token: string) => request<any[]>('/courses', {}, token).then(rows => rows.map(mapCourse)),
  createCourse: (token: string, body: { name: string; description?: string }) =>
    request<any>('/courses', { method: 'POST', body: JSON.stringify(body) }, token).then(mapCourse),
  updateCourse: (token: string, id: string, body: { name: string; description?: string; isActive: boolean }) =>
    request<any>('/courses/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapCourse),
  archiveCourse: (token: string, id: string) => request<void>('/courses/' + id, { method: 'DELETE' }, token),

  // Staff
  staff: (token: string) => request<any[]>('/staff', {}, token).then(rows => rows.map(mapStaff)),
  createStaff: (token: string, body: { name: string; phone?: string; email?: string }) =>
    request<any>('/staff', { method: 'POST', body: JSON.stringify(body) }, token).then(mapStaff),
  updateStaff: (token: string, id: string, body: { name: string; phone?: string; email?: string; isActive: boolean }) =>
    request<any>('/staff/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapStaff),
  archiveStaff: (token: string, id: string) => request<void>('/staff/' + id, { method: 'DELETE' }, token),

  // Batches
  batches: (token: string) => request<any[]>('/batches', {}, token).then(rows => rows.map(mapBatch)),
  createBatch: (token: string, body: {
    name: string; courseId: string; staffId: string; days: string[];
    startTime: string; endTime: string; startDate: string; endDate?: string | null;
  }) => request<any>('/batches', { method: 'POST', body: JSON.stringify(body) }, token).then(mapBatch),
  updateBatch: (token: string, id: string, body: {
    name: string; courseId: string; staffId: string; days: string[];
    startTime: string; endTime: string; startDate: string; endDate?: string | null; isActive: boolean;
  }) => request<any>('/batches/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapBatch),
  archiveBatch: (token: string, id: string) => request<void>('/batches/' + id, { method: 'DELETE' }, token),
  // Reschedule (or cancel) a single class in a batch's recurring pattern. Both calls return the
  // updated batch with its full sessionOverrides list.
  addBatchSessionOverride: (token: string, batchId: string, body: {
    originalDate: string; newDate?: string | null; reason?: string | null;
  }) => request<any>(`/batches/${batchId}/session-overrides`, { method: 'POST', body: JSON.stringify(body) }, token).then(mapBatch),
  removeBatchSessionOverride: (token: string, batchId: string, overrideId: string) =>
    request<any>(`/batches/${batchId}/session-overrides/${overrideId}`, { method: 'DELETE' }, token).then(mapBatch),

  // Students & enrollment
  students: (token: string) => request<any[]>('/students', {}, token).then(rows => rows.map(mapStudent)),
  student: (token: string, id: string) => request<any>('/students/' + id, {}, token).then(mapStudent),
  // batchIds is enrolled server-side in the same transaction as the student, so a failure
  // cannot leave a half-saved student behind for a retry to duplicate.
  createStudent: (token: string, body: {
    name: string; dateOfBirth?: string | null; parentName?: string; phone?: string; email?: string;
    address?: string; joinDate?: string | null; batchIds?: string[];
    concessionPercent?: number; concessionReason?: string;
    lateBillingPolicy?: LateEnrollmentBillingPolicy | null;
  }) => request<any>('/students', { method: 'POST', body: JSON.stringify(body) }, token).then(mapStudent),
  updateStudent: (token: string, id: string, body: {
    name: string; dateOfBirth?: string | null; parentName?: string; phone?: string; email?: string;
    address?: string; joinDate?: string | null; isActive: boolean;
    concessionPercent?: number; concessionReason?: string;
  }) => request<any>('/students/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapStudent),
  archiveStudent: (token: string, id: string) =>
    request<void>('/students/' + id, { method: 'DELETE' }, token),
  enrollStudent: (token: string, studentId: string, batchId: string, enrolledOn?: string) =>
    request<any>('/students/enrollments', { method: 'POST', body: JSON.stringify({ studentId, batchId, enrolledOn: enrolledOn || null }) }, token).then(mapStudent),
  endEnrollment: (token: string, enrollmentId: string, status: 'Completed' | 'Withdrawn', endedOn?: string) =>
    request<any>(`/students/enrollments/${enrollmentId}/end`, { method: 'PUT', body: JSON.stringify({ status, endedOn: endedOn || null }) }, token).then(mapStudent),

  // Achievements & certificates
  achievements: (token: string, studentId: string) =>
    request<any[]>(`/students/${studentId}/achievements`, {}, token).then(rows => rows.map(mapAchievement)),
  createAchievement: (token: string, studentId: string, fields: {
    title: string; category: AchievementCategory; level?: string; eventDate: string; note?: string;
  }, file: File) => {
    const form = new FormData();
    form.append('title', fields.title);
    form.append('category', fields.category);
    if (fields.level) form.append('level', fields.level);
    form.append('eventDate', fields.eventDate);
    if (fields.note) form.append('note', fields.note);
    form.append('file', file);
    return requestForm<any>(`/students/${studentId}/achievements`, form, token).then(mapAchievement);
  },
  deleteAchievement: (token: string, studentId: string, achievementId: string) =>
    request<void>(`/students/${studentId}/achievements/${achievementId}`, { method: 'DELETE' }, token),
  achievementFileBlobUrl: async (token: string, studentId: string, achievementId: string) => {
    const response = await fetch(`${API_URL}/students/${studentId}/achievements/${achievementId}/file`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!response.ok) throw new ApiError('Could not load that certificate.', response.status);
    return URL.createObjectURL(await response.blob());
  },

  // Attendance
  attendance: (token: string, date: string, batchId: string) =>
    request<any>('/attendance?date=' + encodeURIComponent(date) +
      '&batchId=' + encodeURIComponent(batchId), {}, token),
  submitAttendance: (token: string, date: string, batchId: string,
    entries: { enrollmentId: string; status: 'P' | 'A' | 'L' }[]) =>
    request('/attendance', { method: 'PUT', body: JSON.stringify({
      date, batchId, entries: entries.map(({ enrollmentId, status }) => ({
        enrollmentId, status: status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Leave'
      }))
    }) }, token),

  // Fee heads
  feeHeads: (token: string) =>
    request<any[]>('/finance/fee-heads', {}, token).then(rows => rows.map(mapFeeHead)),
  createFeeHead: (token: string, body: { name: string; displayOrder?: number }) =>
    request<any>('/finance/fee-heads', { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeeHead),
  updateFeeHead: (token: string, id: string, body: { name: string; displayOrder: number; isActive: boolean }) =>
    request<any>('/finance/fee-heads/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapFeeHead),

  // Fee structures
  feeStructures: (token: string, courseId?: string) =>
    request<any[]>('/finance/fee-structures' + (courseId ? '?courseId=' + encodeURIComponent(courseId) : ''), {}, token)
      .then(rows => rows.map(mapFeeStructure)),
  createFeeStructure: (token: string, body: {
    courseId: string; name: string; amount: number; frequency: FeeFrequency; effectiveFrom: string;
    effectiveTo?: string | null; feeHeadId?: string | null;
  }) => request<any>('/finance/fee-structures', { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeeStructure),
  updateFeeStructure: (token: string, id: string, body: {
    name: string; effectiveTo?: string | null; isActive: boolean; feeHeadId?: string | null;
  }) => request<any>('/finance/fee-structures/' + id, { method: 'PUT', body: JSON.stringify(body) }, token).then(mapFeeStructure),

  collectionReport: (token: string, from: string, to: string, granularity: 'Day' | 'Month') =>
    request<any>(`/finance/reports/collections?from=${from}&to=${to}&granularity=${granularity}`, {}, token)
      .then(mapCollectionReport),

  // Fee dues & payments
  feeDues: (token: string, status?: FeeDueStatus) =>
    request<any[]>('/finance/dues' + (status ? '?status=' + status : ''), {}, token).then(rows => rows.map(mapFeeDue)),
  studentDues: (token: string, studentId: string) =>
    request<any[]>(`/finance/students/${studentId}/dues`, {}, token).then(rows => rows.map(mapFeeDue)),
  studentPayments: (token: string, studentId: string) =>
    request<any[]>(`/finance/students/${studentId}/payments`, {}, token).then(rows => rows.map(mapFeePayment)),
  studentLedger: (token: string, studentId: string) =>
    request<any>(`/finance/students/${studentId}/ledger`, {}, token).then(mapStudentLedger),
  batchFinanceList: (token: string) =>
    request<any[]>('/finance/batches/finance', {}, token).then(rows => rows.map(mapBatchFinanceRow)),
  batchFinance: (token: string, batchId: string) =>
    request<any>(`/finance/batches/${batchId}/finance`, {}, token).then(mapBatchFinance),
  financeDashboard: (token: string, params?: { from?: string; to?: string; batchId?: string; courseId?: string }) => {
    const q = new URLSearchParams();
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.batchId) q.set('batchId', params.batchId);
    if (params?.courseId) q.set('courseId', params.courseId);
    const qs = q.toString();
    return request<any>('/finance/dashboard' + (qs ? `?${qs}` : ''), {}, token).then(mapFinanceDashboard);
  },
  recordPayment: (token: string, body: {
    studentId: string; feeDueId?: string | null; amount: number; method: PaymentMethod;
    referenceNumber?: string; remarks?: string; paymentDate?: string | null; idempotencyKey?: string;
  }) => request<any>('/finance/payments', { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeePayment),
  dueAdjustments: (token: string, dueId: string) =>
    request<any[]>(`/finance/dues/${dueId}/adjustments`, {}, token).then(rows => rows.map(mapFeeAdjustment)),
  addDueAdjustment: (token: string, dueId: string, body: { type: FeeAdjustmentType; amount: number; reason: string }) =>
    request<any>(`/finance/dues/${dueId}/adjustments`, { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeeDue),
  cancelDue: (token: string, dueId: string, reason: string) =>
    request<any>(`/finance/dues/${dueId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }, token).then(mapFeeDue),
  createCustomDue: (token: string, body: {
    studentId: string; enrollmentId: string; title: string; amount: number; dueDate: string;
  }) => request<any>('/finance/dues/custom', { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeeDue),
  createBatchCustomDues: (token: string, body: {
    batchId: string; title: string; amount: number; dueDate: string;
  }) => request<any[]>('/finance/dues/custom/batch', { method: 'POST', body: JSON.stringify(body) }, token)
    .then(rows => rows.map(mapFeeDue)),
  refundPayment: (token: string, paymentId: string, body: { amount?: number | null; remarks?: string }) =>
    request<any>(`/finance/payments/${paymentId}/refund`, { method: 'POST', body: JSON.stringify(body) }, token).then(mapFeePayment),
  receipt: (token: string, paymentId: string) =>
    request<any>(`/finance/payments/${paymentId}/receipt`, {}, token).then(mapReceipt),

  // General ledger
  finance: (token: string) =>
    request<any>('/finance/summary?from=' + encodeURIComponent(isoStartOfYear()) +
      '&to=' + encodeURIComponent(isoNextYear()), {}, token)
      .then(result => result.transactions.map(mapTransaction)),
  createTransaction: (token: string, item: { title: string; type: 'income' | 'expense'; amount: number; category: string }) =>
    request<any>('/finance/transactions', { method: 'POST', body: JSON.stringify({
      title: item.title, type: item.type === 'income' ? 'Income' : 'Expense',
      amount: item.amount, category: item.category, occurredAt: null
    }) }, token).then(mapTransaction),
  updateTransaction: (token: string, id: string, item: { title: string; type: 'income' | 'expense'; amount: number; category: string }) =>
    request<any>('/finance/transactions/' + id, { method: 'PUT', body: JSON.stringify({
      title: item.title, type: item.type === 'income' ? 'Income' : 'Expense',
      amount: item.amount, category: item.category, occurredAt: null
    }) }, token).then(mapTransaction),
  deleteTransaction: (token: string, id: string) => request<void>('/finance/transactions/' + id, { method: 'DELETE' }, token),

  settings: (token: string) => request<any>('/settings', {}, token).then(mapSettings),
  updateSettings: (token: string, settings: OrgSettings) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify({
      name: settings.name, type: settings.type, logoUrl: settings.logoUrl || null,
      themeColor: settings.themeColor, darkMode: settings.darkMode,
      currency: 'INR', locale: 'en-IN', timeZone: 'Asia/Kolkata',
      receiptPrefix: settings.receipt.prefix,
      receiptAddress: settings.receipt.address || null,
      receiptPhone: settings.receipt.phone || null,
      receiptEmail: settings.receipt.email || null,
      receiptFooter: settings.receipt.footer,
      receiptShowLogo: settings.receipt.showLogo,
      receiptShowSignature: settings.receipt.showSignature,
      receiptAutoOpen: settings.receipt.autoOpenAfterPayment,
      incomeCategories: settings.incomeCategories,
      expenseCategories: settings.expenseCategories,
      notificationsEnabled: settings.notifications.enabled,
      feeReminderNotifications: settings.notifications.feeReminders,
      paymentNotifications: settings.notifications.paymentUpdates,
      attendanceNotifications: settings.notifications.attendanceAlerts,
      feeDueLeadDays: settings.feeDueLeadDays,
      lateEnrollmentBillingPolicy: settings.lateEnrollmentBillingPolicy,
      whatsappTemplate: settings.whatsappTemplate || null
    }) }, token).then(mapSettings),

  plans: (token: string) => request<Plan[]>('/superadmin/plans', {}, token),
  tenants: (token: string) => request<Tenant[]>('/superadmin/tenants', {}, token),
  assignTenantPlan: (token: string, tenantId: string, body: { planId: string; endsAt: string }) =>
    request<any>(`/superadmin/tenants/${tenantId}/subscription`, { method: 'POST', body: JSON.stringify({
      planId: body.planId, status: 'Active', startsAt: new Date().toISOString(), endsAt: body.endsAt
    }) }, token),
  createPlan: (token: string, body: Omit<Plan, 'id' | 'isActive'>) =>
    request<Plan>('/superadmin/plans', { method: 'POST', body: JSON.stringify(body) }, token),
  createTenant: (token: string, body: object) =>
    request<Tenant>('/superadmin/tenants', { method: 'POST', body: JSON.stringify(body) }, token),
  setTenantStatus: (token: string, id: string, isActive: boolean) =>
    request<Tenant>('/superadmin/tenants/' + id + '/status',
      { method: 'PATCH', body: JSON.stringify({ isActive }) }, token),
  assignSubscription: (token: string, tenantId: string, planId: string, endsAt: string) =>
    request<Subscription>('/superadmin/tenants/' + tenantId + '/subscription', {
      method: 'POST', body: JSON.stringify({
        planId, status: 'Active', startsAt: new Date().toISOString(), endsAt
      })
    }, token),
  tenantUsers: (token: string, tenantId: string) =>
    request<TenantUser[]>('/superadmin/tenants/' + tenantId + '/users', {}, token),
  createTenantUser: (token: string, tenantId: string, body: {
    fullName: string; email: string; password: string; role: 'TenantAdmin' | 'Staff';
  }) => request<TenantUser>('/superadmin/tenants/' + tenantId + '/users', {
    method: 'POST', body: JSON.stringify(body)
  }, token),
  setTenantUserOtp: (token: string, tenantId: string, userId: string, otpEnabled: boolean) =>
    request<TenantUser>(`/superadmin/tenants/${tenantId}/users/${userId}/otp`,
      { method: 'PATCH', body: JSON.stringify({ otpEnabled }) }, token),
  updateTenantUser: (token: string, tenantId: string, userId: string, body: { fullName: string; email: string; newPassword?: string }) =>
    request<TenantUser>(`/superadmin/tenants/${tenantId}/users/${userId}`,
      { method: 'PUT', body: JSON.stringify(body) }, token),
  setTenantUserActive: (token: string, tenantId: string, userId: string, isActive: boolean) =>
    request<TenantUser>(`/superadmin/tenants/${tenantId}/users/${userId}/status`,
      { method: 'PATCH', body: JSON.stringify({ isActive }) }, token),

  // A TenantAdmin managing their own Staff (as opposed to a SuperAdmin managing any tenant's
  // users via the two methods above). Role is always 'Staff' — the backend rejects anything else
  // from this endpoint.
  myTeam: (token: string) => request<TenantUser[]>('/tenant/users', {}, token),
  createTeamMember: (token: string, body: { fullName: string; email: string; password: string }) =>
    request<TenantUser>('/tenant/users', { method: 'POST', body: JSON.stringify({ ...body, role: 'Staff' }) }, token),
  updateTeamMember: (token: string, userId: string, body: { fullName: string; email: string; newPassword?: string }) =>
    request<TenantUser>(`/tenant/users/${userId}`, { method: 'PUT', body: JSON.stringify(body) }, token),
  setTeamMemberActive: (token: string, userId: string, isActive: boolean) =>
    request<TenantUser>(`/tenant/users/${userId}/status`,
      { method: 'PATCH', body: JSON.stringify({ isActive }) }, token),
  setMyTeamMemberOtp: (token: string, userId: string, otpEnabled: boolean) =>
    request<TenantUser>(`/tenant/users/${userId}/otp`,
      { method: 'PATCH', body: JSON.stringify({ otpEnabled }) }, token)
};

function mapCourse(x: any): Course {
  return { id: x.id, name: x.name, description: x.description || undefined, isActive: x.isActive, batchCount: x.batchCount };
}
function mapStaff(x: any): Staff {
  return { id: x.id, name: x.name, phone: x.phone || undefined, email: x.email || undefined, isActive: x.isActive, batchCount: x.batchCount };
}
function mapBatch(x: any): Batch {
  return {
    id: x.id, name: x.name, courseId: x.courseId, courseName: x.courseName, staffId: x.staffId, staffName: x.staffName,
    days: x.days || [], startTime: x.startTime, endTime: x.endTime, startDate: x.startDate, endDate: x.endDate || undefined,
    isActive: x.isActive, enrolledCount: x.enrolledCount,
    sessionOverrides: (x.sessionOverrides || []).map((o: any) => ({
      id: o.id, originalDate: o.originalDate, newDate: o.newDate || undefined, reason: o.reason || undefined
    }))
  };
}
function mapAchievement(x: any): Achievement {
  return {
    id: x.id, studentId: x.studentId, title: x.title, category: x.category as AchievementCategory,
    level: x.level || undefined, eventDate: x.eventDate, note: x.note || undefined, fileName: x.fileName,
    contentType: x.contentType, fileSizeBytes: x.fileSizeBytes, createdAt: x.createdAt
  };
}

function mapStudent(x: any): Student {
  return {
    id: x.id, studentNumber: x.studentNumber, name: x.name, dateOfBirth: x.dateOfBirth || undefined,
    parentName: x.parentName || undefined, address: x.address || undefined, phone: x.phone || undefined,
    email: x.email || undefined, joinDate: x.joinDate, isActive: x.isActive, outstandingBalance: x.outstandingBalance,
    hasBillableDues: x.hasBillableDues ?? false,
    hasUpcomingDues: x.hasUpcomingDues ?? false,
    overallAttendance: x.attendancePercentage, wonCount: x.wonCount ?? 0, participatedCount: x.participatedCount ?? 0,
    concessionPercent: x.concessionPercent ?? 0, concessionReason: x.concessionReason || undefined,
    enrollments: (x.enrollments || []).map((e: any) => ({
      id: e.id, batchId: e.batchId, batchName: e.batchName, courseId: e.courseId, courseName: e.courseName,
      enrolledOn: e.enrolledOn, endedOn: e.endedOn || undefined, status: e.status, outstandingBalance: e.outstandingBalance
    }))
  };
}
function mapFeeStructure(x: any): FeeStructure {
  return {
    id: x.id, courseId: x.courseId, courseName: x.courseName, name: x.name, amount: x.amount,
    frequency: x.frequency, effectiveFrom: x.effectiveFrom, effectiveTo: x.effectiveTo || undefined, isActive: x.isActive,
    feeHeadId: x.feeHeadId || undefined, feeHeadName: x.feeHeadName || undefined
  };
}
function mapFeeHead(x: any): FeeHead {
  return { id: x.id, name: x.name, displayOrder: x.displayOrder ?? 0, isActive: x.isActive ?? true, structureCount: x.structureCount ?? 0 };
}
function mapCollectionReport(x: any): CollectionReport {
  return {
    from: x.from, to: x.to, granularity: x.granularity,
    totalCollected: x.totalCollected ?? 0, totalRefunded: x.totalRefunded ?? 0, totalNet: x.totalNet ?? 0,
    points: (x.points || []).map((p: any) => ({
      period: p.period, collected: p.collected ?? 0, refunded: p.refunded ?? 0, net: p.net ?? 0,
    })),
  };
}
function mapFeeDue(x: any): FeeDue {
  return {
    id: x.id, studentId: x.studentId, studentName: x.studentName, enrollmentId: x.enrollmentId, batchId: x.batchId,
    batchName: x.batchName, courseName: x.courseName, feeStructureId: x.feeStructureId || undefined,
    title: x.title || undefined, dueDate: x.dueDate,
    amount: x.amount, discountAmount: x.discountAmount, netAmount: x.netAmount, paidAmount: x.paidAmount,
    balanceAmount: x.balanceAmount, status: x.status,
    cancelledAt: x.cancelledAt || undefined, cancelReason: x.cancelReason || undefined
  };
}
function mapFeeAdjustment(x: any): FeeAdjustment {
  return { id: x.id, type: x.type, amount: x.amount, reason: x.reason,
    performedByName: x.performedByName, createdAt: x.createdAt };
}
function mapFeePayment(x: any): FeePayment {
  return {
    id: x.id, studentId: x.studentId, studentName: x.studentName, receiptNumber: x.receiptNumber, amount: x.amount,
    paymentDate: x.paymentDate, method: x.method, referenceNumber: x.referenceNumber || undefined,
    collectedByName: x.collectedByName, remarks: x.remarks || undefined, refundOfPaymentId: x.refundOfPaymentId || undefined,
    allocations: (x.allocations || []).map((a: any) => ({
      feeDueId: a.feeDueId, dueDate: a.dueDate, courseName: a.courseName, batchName: a.batchName, amount: a.amount
    }))
  };
}
function mapStudentLedger(x: any): StudentLedger {
  const s = x.summary || {};
  return {
    studentId: x.studentId, studentName: x.studentName,
    summary: {
      totalCharged: s.totalCharged ?? 0, totalFines: s.totalFines ?? 0,
      totalAdjustments: s.totalAdjustments ?? 0, totalWrittenOff: s.totalWrittenOff ?? 0,
      netCharged: s.netCharged ?? 0, totalPaid: s.totalPaid ?? 0,
      pending: s.pending ?? 0, availableCredit: s.availableCredit ?? 0,
      overdue: s.overdue ?? 0, totalRefunded: s.totalRefunded ?? 0,
    },
    entries: (x.entries || []).map((e: any) => ({
      date: e.date, type: e.type, description: e.description,
      debit: e.debit ?? 0, credit: e.credit ?? 0, balance: e.balance ?? 0,
      feeDueId: e.feeDueId || undefined, paymentId: e.paymentId || undefined,
      reference: e.reference || undefined, feeHeadName: e.feeHeadName || undefined,
    })),
  };
}
function mapBatchFinanceRow(x: any): BatchFinanceRow {
  return {
    batchId: x.batchId, batchName: x.batchName, courseName: x.courseName, studentCount: x.studentCount ?? 0,
    netCharged: x.netCharged ?? 0, collected: x.collected ?? 0, pending: x.pending ?? 0,
    overdue: x.overdue ?? 0, availableCredit: x.availableCredit ?? 0,
  };
}
function mapBatchFinance(x: any): BatchFinance {
  return {
    batchId: x.batchId, batchName: x.batchName, courseName: x.courseName,
    totalCharged: x.totalCharged ?? 0, totalFines: x.totalFines ?? 0, totalAdjustments: x.totalAdjustments ?? 0,
    totalWrittenOff: x.totalWrittenOff ?? 0, netCharged: x.netCharged ?? 0, collected: x.collected ?? 0,
    pending: x.pending ?? 0, overdue: x.overdue ?? 0, availableCredit: x.availableCredit ?? 0,
    paidCount: x.paidCount ?? 0, partiallyPaidCount: x.partiallyPaidCount ?? 0, pendingCount: x.pendingCount ?? 0,
    overdueCount: x.overdueCount ?? 0, withCreditCount: x.withCreditCount ?? 0, noDuesCount: x.noDuesCount ?? 0,
    students: (x.students || []).map((s: any) => ({
      studentId: s.studentId, studentName: s.studentName, enrollmentId: s.enrollmentId,
      netCharged: s.netCharged ?? 0, collected: s.collected ?? 0, pending: s.pending ?? 0,
      overdue: s.overdue ?? 0, availableCredit: s.availableCredit ?? 0, status: s.status,
    })),
  };
}
function mapFinanceDashboard(x: any): FinanceDashboard {
  return {
    totalCharged: x.totalCharged ?? 0, totalFines: x.totalFines ?? 0, totalAdjustments: x.totalAdjustments ?? 0,
    totalWrittenOff: x.totalWrittenOff ?? 0, netCharged: x.netCharged ?? 0, totalCollected: x.totalCollected ?? 0,
    totalPending: x.totalPending ?? 0, totalOverdue: x.totalOverdue ?? 0, totalStudentCredit: x.totalStudentCredit ?? 0,
    collectionToday: x.collectionToday ?? 0, collectionThisMonth: x.collectionThisMonth ?? 0,
    collectionInRange: x.collectionInRange ?? 0, refundsInRange: x.refundsInRange ?? 0,
    writeOffsInRange: x.writeOffsInRange ?? 0, rangeFrom: x.rangeFrom || undefined, rangeTo: x.rangeTo || undefined,
  };
}
function mapReceipt(x: any): Receipt {
  return {
    paymentId: x.paymentId, receiptNumber: x.receiptNumber, organizationName: x.organizationName,
    organizationAddress: x.organizationAddress || undefined, organizationPhone: x.organizationPhone || undefined,
    organizationEmail: x.organizationEmail || undefined, organizationLogoUrl: x.organizationLogoUrl || undefined,
    showLogo: x.showLogo, showSignature: x.showSignature, receiptFooter: x.receiptFooter,
    studentName: x.studentName, studentNumber: x.studentNumber, courseName: x.courseName, batchName: x.batchName,
    amount: x.amount, paymentDate: x.paymentDate, method: x.method, collectedByName: x.collectedByName
  };
}
function mapTransaction(x: any): Transaction {
  const occurred = new Date(x.occurredAt);
  return { id: x.id, title: x.title, type: String(x.type).toLowerCase() as 'income' | 'expense',
    amount: x.amount, category: x.category, date: occurred.toLocaleDateString(),
    occurredAt: x.occurredAt, feePaymentId: x.feePaymentId || undefined,
    time: occurred.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}
function mapSettings(x: any): OrgSettings {
  return { name: x.name, type: x.type, logoUrl: x.logoUrl || '', themeColor: x.themeColor,
    darkMode: x.darkMode,
    receipt: {
      prefix: x.receiptPrefix || 'REC', address: x.receiptAddress || '',
      phone: x.receiptPhone || '', email: x.receiptEmail || '',
      footer: x.receiptFooter || 'Thank you for your payment.',
      showLogo: x.receiptShowLogo ?? true,
      showSignature: x.receiptShowSignature ?? false,
      autoOpenAfterPayment: x.receiptAutoOpen ?? true
    },
    incomeCategories: Array.isArray(x.incomeCategories) && x.incomeCategories.length
      ? x.incomeCategories : ['Student Fees', 'Registration', 'Events', 'Other Income'],
    expenseCategories: Array.isArray(x.expenseCategories) && x.expenseCategories.length
      ? x.expenseCategories : ['Rent & Operations', 'Instructor Salary', 'Equipment', 'Utilities', 'Marketing', 'Other Expense', 'Refund'],
    notifications: {
      enabled: x.notificationsEnabled ?? true,
      feeReminders: x.feeReminderNotifications ?? true,
      paymentUpdates: x.paymentNotifications ?? true,
      attendanceAlerts: x.attendanceNotifications ?? true
    },
    feeDueLeadDays: x.feeDueLeadDays ?? 7,
    lateEnrollmentBillingPolicy: x.lateEnrollmentBillingPolicy ?? 'Skip',
    whatsappTemplate: x.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE
  };
}
