import React, { useState, useEffect } from 'react';
import {
  Student,
  Batch,
  Course,
  Staff,
  Transaction,
  FeeDue,
  FeeStructure,
  OrgSettings,
  AppTab,
  Receipt,
  PaymentMethod
} from './types';
import {
  INITIAL_SETTINGS
} from './data/mockData';
import { ApiError, api, authStore, Session } from './api';
import { LoginPage } from './components/LoginPage';
import { SuperAdminPage } from './components/SuperAdminPage';

import { Navigation } from './components/Navigation';
import { StudentsTab } from './components/StudentsTab';
import { FinanceTab } from './components/FinanceTab';
import { LogTab } from './components/LogTab';
import { MenuTab } from './components/MenuTab';
import { BatchesTab } from './components/BatchesTab';

import { AddStudentModal } from './components/modals/AddStudentModal';
import { RecordFeeModal } from './components/modals/RecordFeeModal';
import { WhatsAppModal } from './components/modals/WhatsAppModal';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { AddBatchModal } from './components/modals/AddBatchModal';
import { AddCourseModal } from './components/modals/AddCourseModal';
import { AddStaffModal } from './components/modals/AddStaffModal';
import { StudentDetailsModal } from './components/modals/StudentDetailsModal';
import { FeeReceiptModal } from './components/modals/FeeReceiptModal';
import { NotificationCenter } from './components/NotificationCenter';

const HomeTab = React.lazy(() =>
  import('./components/HomeTab').then((module) => ({ default: module.HomeTab }))
);

export default function App() {
  const [session, setSession] = useState<Session | null>(() => authStore.get());
  const login = (value: Session) => { authStore.set(value); setSession(value); };
  const logout = () => { authStore.clear(); setSession(null); };

  if (!session) return <LoginPage onLogin={login} />;
  if (session.user.role === 'SuperAdmin')
    return <SuperAdminPage session={session} onLogout={logout} />;
  return <TenantApplication session={session} onLogout={logout} />;
}

function TenantApplication({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const isAdmin = session.user.role === 'TenantAdmin';
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [outstandingDues, setOutstandingDues] = useState<FeeDue[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<OrgSettings>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const showError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) onLogout();
    else setLoadError(error instanceof Error ? error.message : 'The request could not be completed.');
  };

  const reload = async () => {
    setLoading(true);
    try {
      const [studentRows, batchRows, courseRows, staffRows, structureRows, dueRows, transactionRows, org] = await Promise.all([
        api.students(session.token), api.batches(session.token), api.courses(session.token), api.staff(session.token),
        api.feeStructures(session.token), api.feeDues(session.token), api.finance(session.token), api.settings(session.token)
      ]);
      setStudents(studentRows); setBatches(batchRows); setCourses(courseRows); setStaff(staffRows);
      setFeeStructures(structureRows);
      setOutstandingDues(dueRows.filter((due) => due.status === 'Pending' || due.status === 'Partial' || due.status === 'Overdue'));
      setTransactions(transactionRows); setSettings(org);
      setLoadError('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onLogout();
      else setLoadError(error instanceof Error ? error.message : 'The request could not be completed.');
    }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [session.token]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isRecordFeeOpen, setIsRecordFeeOpen] = useState(false);
  const [feeTargetStudent, setFeeTargetStudent] = useState<Student | undefined>(undefined);

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | undefined>(undefined);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);
  const [detailsTargetStudent, setDetailsTargetStudent] = useState<Student | null>(null);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Actions
  const handleAddStudent = async (payload: {
    name: string; dateOfBirth: string | null; parentName: string; phone: string; email: string; address: string;
  }, enrollBatchId: string | null) => {
    const created = await api.createStudent(session.token, payload);
    if (enrollBatchId) await api.enrollStudent(session.token, created.id, enrollBatchId);
    await reload();
  };

  const handleEnroll = async (studentId: string, batchId: string) => {
    const updated = await api.enrollStudent(session.token, studentId, batchId);
    setDetailsTargetStudent((prev) => prev && prev.id === updated.id ? updated : prev);
    await reload();
  };

  const handleEndEnrollment = async (enrollmentId: string, status: 'Completed' | 'Withdrawn') => {
    const updated = await api.endEnrollment(session.token, enrollmentId, status);
    setDetailsTargetStudent((prev) => prev && prev.id === updated.id ? updated : prev);
    await reload();
  };

  const handleRecordFee = async (payload: { studentId: string; feeDueId: string | null; amount: number; method: PaymentMethod; remarks?: string }) => {
    const payment = await api.recordPayment(session.token, payload);
    const receipt = await api.receipt(session.token, payment.id);
    setLastReceipt(receipt);
    if (settings.receipt.autoOpenAfterPayment) setIsReceiptOpen(true);
    await reload();
    return payment;
  };

  const handleAddTransaction = async (newTx: Transaction) => {
    try {
      const created = await api.createTransaction(session.token, newTx);
      setTransactions((prev) => [created, ...prev]);
    } catch (error) { showError(error); }
  };

  const handleSaveBatch = async (payload: {
    name: string; courseId: string; staffId: string; days: string[];
    startTime: string; endTime: string; startDate: string; endDate: string | null; isActive: boolean;
  }) => {
    if (editingBatch) {
      const updated = await api.updateBatch(session.token, editingBatch.id, payload);
      setBatches((prev) => prev.map((b) => b.id === updated.id ? updated : b));
    } else {
      const created = await api.createBatch(session.token, payload);
      setBatches((prev) => [...prev, created]);
    }
  };

  const handleSaveCourse = async (name: string, description: string, isActive: boolean) => {
    if (editingCourse) {
      const updated = await api.updateCourse(session.token, editingCourse.id, { name, description, isActive });
      setCourses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } else {
      const created = await api.createCourse(session.token, { name, description });
      setCourses((prev) => [...prev, created]);
    }
  };

  const handleSaveStaff = async (name: string, phone: string, email: string, isActive: boolean) => {
    if (editingStaff) {
      const updated = await api.updateStaff(session.token, editingStaff.id, { name, phone, email, isActive });
      setStaff((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } else {
      const created = await api.createStaff(session.token, { name, phone, email });
      setStaff((prev) => [...prev, created]);
    }
  };

  const handleAddFeeStructure = async (payload: {
    courseId: string; name: string; amount: number; frequency: FeeStructure['frequency']; effectiveFrom: string; effectiveTo?: string | null;
  }) => {
    const created = await api.createFeeStructure(session.token, payload);
    setFeeStructures((prev) => [created, ...prev.filter((s) => s.courseId !== created.courseId || s.id !== created.id)]);
    await reload();
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await api.archiveStudent(session.token, studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) { showError(error); }
  };

  const handleSettings: React.Dispatch<React.SetStateAction<OrgSettings>> = (action) => {
    setSettings(previous => {
      const next = typeof action === 'function' ? action(previous) : action;
      void api.updateSettings(session.token, next).then(setSettings).catch(showError);
      return next;
    });
  };

  const handleExportData = () => {
    const backupData = { students, batches, courses, staff, transactions, settings, exportDate: new Date().toISOString() };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rhythaalaya_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = '';
    setLoadError('Direct JSON import is disabled for tenant safety. Use the API migration workflow for bulk imports.');
  };

  const openRecordFee = (student?: Student) => { setFeeTargetStudent(student); setIsRecordFeeOpen(true); };
  const openWhatsApp = (student?: Student) => { setWhatsAppTargetStudent(student); setIsWhatsAppOpen(true); };
  const openStudentDetails = (student: Student) => { setDetailsTargetStudent(student); setIsStudentDetailsOpen(true); };

  if (loading) return (
    <div className="min-h-screen bg-mint-50 dark:bg-brand-950 p-4 md:p-8" role="status" aria-live="polite">
      <span className="sr-only">Loading academy</span>
      <div className="mx-auto max-w-6xl animate-pulse space-y-5 pt-16 md:pt-24">
        <div className="h-8 w-56 rounded-xl bg-brand-100 dark:bg-brand-900" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 rounded-2xl bg-white dark:bg-slate-900" />)}
        </div>
        <div className="h-80 rounded-3xl bg-white dark:bg-slate-900" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-mint-50 dark:bg-brand-950 text-slate-900 dark:text-brand-50 font-sans antialiased selection:bg-brand-500 selection:text-white">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        settings={settings}
      />

      <main id="main-content" tabIndex={-1} className="md:ml-[270px] min-h-screen px-4 sm:px-6 lg:px-8 py-5 md:py-8 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-5 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-brand-200/60 bg-white/80 px-3 py-2.5 shadow-xs backdrop-blur-sm dark:border-brand-800 dark:bg-slate-900/80 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{session.user.tenantName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Signed in as {session.user.fullName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationCenter tenantKey={session.user.tenantId || session.user.email} preferences={settings.notifications}
              students={students} transactions={transactions} onNavigate={setCurrentTab} />
            <button type="button" onClick={onLogout} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3.5 text-xs font-bold bg-white text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-rose-950/40">
              Sign out
            </button>
          </div>
        </header>
        {loadError && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <span className="material-symbols-outlined mt-0.5 text-[20px]" aria-hidden="true">error</span>
          <span className="min-w-0 flex-1 py-1">{loadError}</span>
          <button type="button" onClick={() => void reload()} className="min-h-9 rounded-lg px-2.5 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50">Retry</button>
          <button type="button" onClick={() => setLoadError('')} aria-label="Dismiss error" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>}
        {currentTab === 'home' && (
          <React.Suspense fallback={
            <div className="min-h-[420px] rounded-3xl border border-brand-200/60 dark:border-brand-800 bg-white dark:bg-slate-900 flex items-center justify-center text-sm font-semibold text-brand-700 dark:text-brand-300">
              Loading dashboard…
            </div>
          }>
            <HomeTab
              students={students}
              batches={batches}
              transactions={transactions}
              outstandingDues={outstandingDues}
              setCurrentTab={setCurrentTab}
              onOpenAddStudent={() => setIsAddStudentOpen(true)}
              onOpenAddBatch={() => { setEditingBatch(null); setIsAddBatchOpen(true); }}
              onOpenRecordFee={openRecordFee}
            />
          </React.Suspense>
        )}

        {currentTab === 'students' && (
          <StudentsTab
            students={students}
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
            onOpenRecordFee={openRecordFee}
            onViewStudent={openStudentDetails}
            onSendMessage={(student) => openWhatsApp(student)}
          />
        )}

        {currentTab === 'batches' && (
          <BatchesTab
            batches={batches}
            courses={courses}
            staff={staff}
            canManage={isAdmin}
            onOpenAddBatch={() => { setEditingBatch(null); setIsAddBatchOpen(true); }}
            onEditBatch={(batch) => { setEditingBatch(batch); setIsAddBatchOpen(true); }}
            onOpenAddCourse={() => { setEditingCourse(null); setIsAddCourseOpen(true); }}
            onEditCourse={(course) => { setEditingCourse(course); setIsAddCourseOpen(true); }}
            onOpenAddStaff={() => { setEditingStaff(null); setIsAddStaffOpen(true); }}
            onEditStaff={(member) => { setEditingStaff(member); setIsAddStaffOpen(true); }}
          />
        )}

        {currentTab === 'finance' && (
          <FinanceTab
            students={students}
            transactions={transactions}
            outstandingDues={outstandingDues}
            courses={courses}
            feeStructures={feeStructures}
            canManage={isAdmin}
            onOpenRecordFee={openRecordFee}
            onOpenWhatsAppAll={() => openWhatsApp(undefined)}
            onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
            onAddFeeStructure={handleAddFeeStructure}
          />
        )}

        {currentTab === 'log' && (
          <LogTab
            students={students}
            batches={batches}
            token={session.token}
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
          />
        )}

        {currentTab === 'menu' && (
          <MenuTab
            settings={settings}
            setSettings={handleSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        )}
        </div>
      </main>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onAddStudent={handleAddStudent}
        batches={batches}
      />

      <RecordFeeModal
        isOpen={isRecordFeeOpen}
        onClose={() => setIsRecordFeeOpen(false)}
        students={students}
        initialStudent={feeTargetStudent}
        token={session.token}
        onRecordFee={handleRecordFee}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        student={whatsAppTargetStudent}
        allOverdueStudents={students.filter((s) => s.outstandingBalance > 0)}
      />

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onAddTransaction={handleAddTransaction}
        incomeCategories={settings.incomeCategories}
        expenseCategories={settings.expenseCategories}
      />

      <AddBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        courses={courses}
        staff={staff}
        editingBatch={editingBatch}
        onSave={handleSaveBatch}
      />

      <AddCourseModal
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        editingCourse={editingCourse}
        onSave={handleSaveCourse}
      />

      <AddStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        editingStaff={editingStaff}
        onSave={handleSaveStaff}
      />

      <StudentDetailsModal
        isOpen={isStudentDetailsOpen}
        onClose={() => setIsStudentDetailsOpen(false)}
        student={detailsTargetStudent}
        batches={batches}
        token={session.token}
        onRecordFee={openRecordFee}
        onSendMessage={(student) => openWhatsApp(student)}
        onDeleteStudent={handleDeleteStudent}
        onEnroll={handleEnroll}
        onEndEnrollment={handleEndEnrollment}
      />
      <FeeReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} receipt={lastReceipt} />
    </div>
  );
}
