import { Batch, OrgSettings, Student, Transaction } from './types';

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
  userCount: number; studentCount: number; subscription?: Subscription;
}
export interface TenantUser {
  id: string;
  tenantId?: string;
  email: string;
  fullName: string;
  role: 'TenantAdmin' | 'Staff';
  isActive: boolean;
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
    if (response.status === 401) authStore.clear();
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const isoStartOfYear = () => new Date(new Date().getFullYear(), 0, 1).toISOString();
const isoNextYear = () => new Date(new Date().getFullYear() + 1, 0, 1).toISOString();

export const api = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  batches: (token: string) => request<any[]>('/batches', {}, token).then(rows => rows.map(mapBatch)),
  students: (token: string) => request<any[]>('/students', {}, token).then(rows => rows.map(mapStudent)),
  settings: (token: string) => request<any>('/settings', {}, token).then(mapSettings),
  finance: (token: string) =>
    request<any>('/finance/summary?from=' + encodeURIComponent(isoStartOfYear()) +
      '&to=' + encodeURIComponent(isoNextYear()), {}, token)
      .then(result => result.transactions.map(mapTransaction)),

  createBatch: (token: string, batch: Batch) =>
    request<any>('/batches', { method: 'POST', body: JSON.stringify({
      name: batch.name, course: batch.course, schedule: batch.schedule, instructor: batch.instructor
    }) }, token).then(mapBatch),
  createStudent: (token: string, student: Student, batches: Batch[]) => {
    const batch = batches.find(x => x.name === student.batch);
    if (!batch) throw new ApiError('Select a valid batch.', 400);
    return request<any>('/students', { method: 'POST', body: JSON.stringify({
      name: student.name, batchId: batch.id, monthlyFee: student.feeAmount,
      openingBalance: student.feeStatus === 'Pending' ? student.feeAmount : 0,
      phone: student.phone, email: student.email, joinDate: student.joinDate
    }) }, token).then(mapStudent);
  },
  archiveStudent: (token: string, id: string) =>
    request<void>('/students/' + id, { method: 'DELETE' }, token),
  recordPayment: (token: string, studentId: string, amount: number, method: string) =>
    request('/finance/payments', { method: 'POST', body: JSON.stringify({
      studentId, amount, method: mapPaymentMethod(method), reference: null, occurredAt: null
    }) }, token),
  createTransaction: (token: string, item: Transaction) =>
    request<any>('/finance/transactions', { method: 'POST', body: JSON.stringify({
      title: item.title, type: item.type === 'income' ? 'Income' : 'Expense',
      amount: item.amount, category: item.category, occurredAt: null
    }) }, token).then(mapTransaction),
  attendance: (token: string, date: string, batchId: string) =>
    request<any>('/attendance?date=' + encodeURIComponent(date) +
      '&batchId=' + encodeURIComponent(batchId), {}, token),
  submitAttendance: (token: string, date: string, batchId: string,
    attendance: Record<string, 'P' | 'A' | 'L'>) =>
    request('/attendance', { method: 'PUT', body: JSON.stringify({
      date, batchId, entries: Object.entries(attendance).map(([studentId, status]) => ({
        studentId, status: status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Leave'
      }))
    }) }, token),
  updateSettings: (token: string, settings: OrgSettings) =>
    request<any>('/settings', { method: 'PUT', body: JSON.stringify({
      name: settings.name, type: settings.type, logoUrl: settings.logoUrl || null,
      themeColor: settings.themeColor, darkMode: settings.darkMode,
      defaultMonthlyFee: settings.defaultMonthlyFee,
      feeDueDay: Number.parseInt(settings.feeDueDate) || 5,
      currency: 'INR', locale: 'en-IN', timeZone: 'Asia/Kolkata'
    }) }, token).then(mapSettings),

  plans: (token: string) => request<Plan[]>('/superadmin/plans', {}, token),
  tenants: (token: string) => request<Tenant[]>('/superadmin/tenants', {}, token),
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
  }, token)
};

function mapBatch(x: any): Batch {
  return { id: x.id, name: x.name, course: x.course, schedule: x.schedule,
    instructor: x.instructor, enrolledCount: x.enrolledCount };
}
function mapStudent(x: any): Student {
  return {
    id: x.id, studentNumber: x.studentNumber, name: x.name, batchId: x.batchId,
    batch: x.batchName, course: x.course, feeAmount: x.outstandingBalance || x.monthlyFee,
    monthlyFee: x.monthlyFee, outstandingBalance: x.outstandingBalance,
    feeStatus: x.feeStatus, overallAttendance: x.attendancePercentage,
    phone: x.phone, email: x.email, joinDate: x.joinDate
  };
}
function mapTransaction(x: any): Transaction {
  const occurred = new Date(x.occurredAt);
  return { id: x.id, title: x.title, type: String(x.type).toLowerCase() as 'income' | 'expense',
    amount: x.amount, category: x.category, date: occurred.toLocaleDateString(),
    time: occurred.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
}
function mapSettings(x: any): OrgSettings {
  return { name: x.name, type: x.type, logoUrl: x.logoUrl || '', themeColor: x.themeColor,
    darkMode: x.darkMode, defaultMonthlyFee: x.defaultMonthlyFee,
    feeDueDate: String(x.feeDueDay) };
}
function mapPaymentMethod(method: string) {
  if (method === 'Card') return 'Card';
  if (method === 'UPI') return 'Upi';
  if (method === 'Bank Transfer') return 'BankTransfer';
  return 'Cash';
}
