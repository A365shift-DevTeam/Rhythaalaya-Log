import { Button } from './components/ui/button';
import { JisIcon } from './components/JisIcon';
import { Spinner } from './components/ui/spinner';
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
import { todayIsoDate } from './lib/schedule';
import { applyDarkMode, readStoredDarkMode } from './lib/darkMode';
import { LoginPage } from './components/LoginPage';
import { SuperAdminPage } from './components/SuperAdminPage';
import { DarkModeToggle } from './components/DarkModeToggle';

import { Navigation } from './components/Navigation';
import { StudentsTab } from './components/StudentsTab';
import { FinanceTab } from './components/FinanceTab';
import { LogTab } from './components/LogTab';
import { AdminPage } from './components/AdminPage';
import { BatchesTab } from './components/BatchesTab';
import { ReportsTab } from './components/ReportsTab';

import { AddStudentModal } from './components/modals/AddStudentModal';
import { RecordFeeModal } from './components/modals/RecordFeeModal';
import { AdjustDueModal } from './components/modals/AdjustDueModal';
import { AddChargeModal } from './components/modals/AddChargeModal';
import { WhatsAppModal } from './components/modals/WhatsAppModal';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { AddBatchModal } from './components/modals/AddBatchModal';
import { AddCourseModal, NewCourseFee } from './components/modals/AddCourseModal';
import { AddStaffModal } from './components/modals/AddStaffModal';
import { StudentDetailsModal } from './components/modals/StudentDetailsModal';
import { FeeReceiptModal } from './components/modals/FeeReceiptModal';
import { NotificationCenter } from './components/NotificationCenter';
import { Toaster } from './components/ui/toaster';

const HomeTab = React.lazy(() =>
  import('./components/HomeTab').then((module) => ({ default: module.HomeTab }))
);

export default function App() {
  const [session, setSession] = useState<Session | null>(() => authStore.get());
  const login = (value: Session) => { authStore.set(value); setSession(value); };
  const logout = () => { authStore.clear(); setSession(null); };

  // Lifted above the role branch (not inside TenantApplication) so it's applied consistently
  // regardless of which view renders — see lib/darkMode.ts for why that split used to matter.
  const [darkMode, setDarkMode] = useState<boolean>(readStoredDarkMode);
  useEffect(() => { applyDarkMode(darkMode); }, [darkMode]);
  const toggleDarkMode = () => setDarkMode((current) => !current);

  let content: React.ReactNode;
  if (!session) {
    content = <LoginPage onLogin={login} />;
  } else if (session.user.role === 'SuperAdmin') {
    content = <SuperAdminPage session={session} onLogout={logout} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  } else {
    content = <TenantApplication session={session} onLogout={logout} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  }

  return (
    <>
      {content}
      <Toaster />
    </>
  );
}

function TenantApplication({ session, onLogout, darkMode, onToggleDarkMode }: {
  session: Session; onLogout: () => void; darkMode: boolean; onToggleDarkMode: () => void;
}) {
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

  // showLoader only blanks the whole page for the initial load (nothing on screen yet) or a
  // manual retry after a failed load. Every reload after a save/add is silent — the modal that
  // triggered it already has its own submitting state, and the page shouldn't blank out from
  // under the user just to refresh a list.
  const reload = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [studentRows, batchRows, courseRows, staffRows, structureRows, dueRows, transactionRows, org] = await Promise.all([
        api.students(session.token), api.batches(session.token), api.courses(session.token), api.staff(session.token),
        api.feeStructures(session.token), api.feeDues(session.token), api.finance(session.token), api.settings(session.token)
      ]);
      setStudents(studentRows); setBatches(batchRows); setCourses(courseRows); setStaff(staffRows);
      setFeeStructures(structureRows);
      setOutstandingDues(dueRows.filter((due) => due.status === 'Pending' || due.status === 'Partial'
        || due.status === 'Overdue' || due.status === 'Upcoming'));
      setTransactions(transactionRows); setSettings(org);
      setLoadError('');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onLogout();
      else setLoadError(error instanceof Error ? error.message : 'The request could not be completed.');
    }
    finally { if (showLoader) setLoading(false); }
  };
  useEffect(() => { void reload(true); }, [session.token]);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const openAddStudent = () => { setEditingStudent(null); setIsAddStudentOpen(true); };
  const openEditStudent = (targetStudent: Student) => { setEditingStudent(targetStudent); setIsAddStudentOpen(true); };
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isRecordFeeOpen, setIsRecordFeeOpen] = useState(false);
  const [feeTargetStudent, setFeeTargetStudent] = useState<Student | undefined>(undefined);
  const [adjustTargetDue, setAdjustTargetDue] = useState<FeeDue | null>(null);
  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | undefined>(undefined);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const openAddTransaction = () => { setEditingTransaction(null); setIsAddTransactionOpen(true); };
  const openEditTransaction = (transaction: Transaction) => { setEditingTransaction(transaction); setIsAddTransactionOpen(true); };
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);
  const [detailsTargetStudent, setDetailsTargetStudent] = useState<Student | null>(null);
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const closeAllModals = () => {
    setIsAddStudentOpen(false);
    setEditingStudent(null);
    setIsAddBatchOpen(false);
    setEditingBatch(null);
    setIsAddCourseOpen(false);
    setEditingCourse(null);
    setIsAddStaffOpen(false);
    setEditingStaff(null);
    setIsRecordFeeOpen(false);
    setFeeTargetStudent(undefined);
    setAdjustTargetDue(null);
    setIsAddChargeOpen(false);
    setIsWhatsAppOpen(false);
    setWhatsAppTargetStudent(undefined);
    setIsAddTransactionOpen(false);
    setEditingTransaction(null);
    setIsStudentDetailsOpen(false);
    setDetailsTargetStudent(null);
    setIsReceiptOpen(false);
  };

  const handleTabChange = (tab: AppTab) => {
    closeAllModals();
    setCurrentTab(tab);
  };

  // Actions
  const handleAddStudent = async (payload: {
    name: string; dateOfBirth: string | null; joinDate: string; parentName: string; phone: string; email: string; address: string;
    concessionPercent?: number; concessionReason?: string;
  }, batchIds: string[]) => {
    // One request: the server writes the student and every enrollment in a single transaction,
    // so a failure saves nothing and pressing Save again cannot create a duplicate student.
    await api.createStudent(session.token, { ...payload, batchIds: [...new Set(batchIds)] });
    await reload();
  };

  const handleUpdateStudent = async (studentId: string, payload: {
    name: string; dateOfBirth: string | null; joinDate: string; parentName: string; phone: string; email: string; address: string;
    concessionPercent?: number; concessionReason?: string;
  }, batchIds: string[]) => {
    const existing = students.find((s) => s.id === studentId);
    let updated = await api.updateStudent(session.token, studentId, { ...payload, isActive: existing?.isActive ?? true });
    const requestedBatchIds = [...new Set(batchIds)];
    const activeEnrollments = existing?.enrollments.filter((enrollment) => enrollment.status === 'Active') || [];
    const activeBatchIds = new Set(activeEnrollments.map((enrollment) => enrollment.batchId));

    for (const targetBatchId of requestedBatchIds.filter((id) => !activeBatchIds.has(id))) {
      updated = await api.enrollStudent(session.token, studentId, targetBatchId);
    }
    for (const enrollment of activeEnrollments.filter((item) => !requestedBatchIds.includes(item.batchId))) {
      updated = await api.endEnrollment(session.token, enrollment.id, 'Withdrawn');
    }

    await reload();
    setDetailsTargetStudent((prev) => prev && prev.id === updated.id ? updated : prev);
  };


  const handleRecordFee = async (payload: { studentId: string; feeDueId: string | null; amount: number; method: PaymentMethod; remarks?: string; idempotencyKey?: string }) => {
    const payment = await api.recordPayment(session.token, payload);
    const receipt = await api.receipt(session.token, payment.id);
    setLastReceipt(receipt);
    if (settings.receipt.autoOpenAfterPayment) setIsReceiptOpen(true);
    await reload();
    return payment;
  };

  const handleSaveTransaction = async (fields: { title: string; type: 'income' | 'expense'; amount: number; category: string }) => {
    if (editingTransaction) {
      const updated = await api.updateTransaction(session.token, editingTransaction.id, fields);
      setTransactions((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    } else {
      const created = await api.createTransaction(session.token, fields);
      setTransactions((prev) => [created, ...prev]);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    await api.deleteTransaction(session.token, transactionId);
    setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
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

  const handleArchiveBatch = async (batchId: string) => {
    await api.archiveBatch(session.token, batchId);
    setBatches((prev) => prev.map((b) => b.id === batchId ? { ...b, isActive: false } : b));
  };

  const handleSaveCourse = async (name: string, description: string, isActive: boolean, fee: NewCourseFee | null) => {
    if (editingCourse) {
      const updated = await api.updateCourse(session.token, editingCourse.id, { name, description, isActive });
      setCourses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    } else {
      const created = await api.createCourse(session.token, { name, description });
      setCourses((prev) => [...prev, created]);
      if (fee) {
        await handleAddFeeStructure({
          courseId: created.id, name: fee.name, amount: fee.amount, frequency: fee.frequency, effectiveFrom: fee.dueDate
        });
      }
    }
  };

  const handleArchiveCourse = async (courseId: string) => {
    await api.archiveCourse(session.token, courseId);
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, isActive: false } : c));
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

  const handleArchiveStaff = async (staffId: string) => {
    await api.archiveStaff(session.token, staffId);
    setStaff((prev) => prev.map((s) => s.id === staffId ? { ...s, isActive: false } : s));
  };

  const handleAddFeeStructure = async (payload: {
    courseId: string; name: string; amount: number; frequency: FeeStructure['frequency']; effectiveFrom: string; effectiveTo?: string | null;
  }) => {
    const created = await api.createFeeStructure(session.token, payload);
    setFeeStructures((prev) => [created, ...prev.filter((s) => s.courseId !== created.courseId || s.id !== created.id)]);
    await reload();
  };

  const handleUpdateFeeStructure = async (structureId: string, payload: { name: string; effectiveTo?: string | null; isActive: boolean }) => {
    const updated = await api.updateFeeStructure(session.token, structureId, payload);
    setFeeStructures((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await api.archiveStudent(session.token, studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      // Archiving withdraws the student's enrollments server-side, so batch enrolled counts change.
      setBatches(await api.batches(session.token));
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
    downloadAnchor.setAttribute('download', `rhythaalaya_backup_${todayIsoDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const openRecordFee = (student?: Student) => { setFeeTargetStudent(student); setIsRecordFeeOpen(true); };
  const openWhatsApp = (student?: Student) => { setWhatsAppTargetStudent(student); setIsWhatsAppOpen(true); };
  const openStudentDetails = (student: Student) => { setDetailsTargetStudent(student); setIsStudentDetailsOpen(true); };

  if (loading) return (
    <div className="min-h-screen bg-[#f4fbf7] dark:bg-[#07111f] p-4 sm:p-6 md:p-8 flex flex-col justify-start" role="status" aria-live="polite">
      <div className="mx-auto max-w-6xl w-full space-y-6 pt-6 sm:pt-10 md:pt-14">
        {/* Visible Loading Header with Spinner & Text */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-[#dbdbdb]/80 bg-white/90 p-4 sm:p-5 shadow-xs backdrop-blur-xl dark:border-[#243244] dark:bg-[#0b1422]/90">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 shadow-inner">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#3fc073]/25 border-t-[#3fc073]" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#212121] dark:text-white">Loading academy…</h2>
                <span className="inline-flex h-2 w-2 rounded-full bg-[#3fc073] animate-ping" />
              </div>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8]">Fetching your students, batches, and dashboard data</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3fc073] bg-[#e9f7ee] dark:bg-[#3fc073]/15 px-3 py-1.5 rounded-xl self-end sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#3fc073] animate-pulse" />
            <span>Please wait…</span>
          </div>
        </div>

        {/* Skeleton Layout */}
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-56 rounded-2xl bg-[#e9f7ee] dark:bg-[#1d492f]/50" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 rounded-3xl bg-white dark:bg-[#0b1422] border border-[#dbdbdb]/60 dark:border-[#243244] p-4 flex flex-col justify-between">
                <div className="h-4 w-20 rounded-lg bg-[#f0f0f0] dark:bg-[#152336]" />
                <div className="h-8 w-16 rounded-lg bg-[#e9f7ee] dark:bg-[#1d492f]/40" />
              </div>
            ))}
          </div>
          <div className="h-80 rounded-3xl bg-white dark:bg-[#0b1422] border border-[#dbdbdb]/60 dark:border-[#243244] p-6 space-y-4">
            <div className="h-6 w-44 rounded-lg bg-[#f0f0f0] dark:bg-[#152336]" />
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-10 rounded-xl bg-[#f0f0f0]/70 dark:bg-[#152336]/60" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const headerActions = (
    <>
      <DarkModeToggle darkMode={darkMode} onToggle={onToggleDarkMode} />
      <NotificationCenter tenantKey={session.user.tenantId || session.user.email} preferences={settings.notifications}
        students={students} transactions={transactions} onNavigate={handleTabChange} />
      <Button type="button" onClick={onLogout} aria-label="Sign out" className="min-h-9 sm:min-h-11 shrink-0 rounded-2xl border border-[#dbdbdb] px-2.5 sm:px-3.5 text-xs font-semibold bg-white text-[#212121] transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#e2e8f0] dark:hover:bg-rose-950/40 flex items-center gap-1 active:scale-95">
        <span className="hidden md:inline">Sign out</span>
        <JisIcon className="text-[17px] md:hidden">logout</JisIcon>
      </Button>
    </>
  );

  return (
    <div className="app-shell min-h-screen bg-[#f4fbf7] dark:bg-[#07111f] text-[#212121] dark:text-[#e2e8f0] font-sans antialiased selection:bg-[#3fc073] selection:text-white">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation
        currentTab={currentTab}
        setCurrentTab={handleTabChange}
        onOpenAddStudent={() => {
          closeAllModals();
          openAddStudent();
        }}
        settings={settings}
        isAdmin={isAdmin}
        actions={headerActions}
      />

      <main id="main-content" tabIndex={-1} className="md:ml-[270px] min-h-screen px-3 sm:px-6 lg:px-8 py-3 sm:py-6 md:py-8 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[1440px]">
        <header className="relative z-30 mb-4 sm:mb-5 hidden md:flex min-w-0 items-center justify-between gap-2.5 rounded-2xl border border-[#dbdbdb]/80 bg-white/80 px-3.5 py-2 sm:py-2.5 shadow-xs backdrop-blur-xl dark:border-[#243244] dark:bg-[#0b1422]/80 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-xs sm:text-sm font-bold text-[#212121] dark:text-white">{session.user.tenantName}</p>
            <p className="truncate text-xs sm:text-xs text-[#808080] dark:text-[#94a3b8]">Signed in as {session.user.fullName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {headerActions}
          </div>
        </header>
        {loadError && <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <JisIcon className="mt-0.5 text-[20px]" aria-hidden="true">error</JisIcon>
          <span className="min-w-0 flex-1 py-1">{loadError}</span>
          <Button type="button" onClick={() => void reload()} className="min-h-9 rounded-xl px-2.5 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50">Retry</Button>
          <Button type="button" onClick={() => setLoadError('')} aria-label="Dismiss error" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50">
            <JisIcon className="text-[20px]" aria-hidden="true">close</JisIcon>
          </Button>
        </div>}
        {currentTab === 'home' && (
          <React.Suspense fallback={
            <div className="min-h-[420px] rounded-3xl border border-[#dbdbdb]/80 dark:border-[#243244] bg-white dark:bg-[#0b1422] flex flex-col items-center justify-center gap-2 p-8">
              <Spinner size="lg" text="Loading dashboard…" subtext="Please wait a moment" />
            </div>
          }>
            <HomeTab
              students={students}
              batches={batches}
              transactions={transactions}
              outstandingDues={outstandingDues}
              darkMode={darkMode}
              setCurrentTab={handleTabChange}
              onOpenAddStudent={openAddStudent}
              onOpenAddBatch={() => { setEditingBatch(null); setIsAddBatchOpen(true); }}
              onOpenRecordFee={openRecordFee}
            />
          </React.Suspense>
        )}

        {currentTab === 'students' && (
          <StudentsTab
            students={students}
            onOpenAddStudent={openAddStudent}
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
            onRestoreCourse={async (course) => {
              await api.updateCourse(session.token, course.id, {
                name: course.name, description: course.description || undefined, isActive: true,
              });
              await reload();
            }}
            onRestoreBatch={async (batch) => {
              await api.updateBatch(session.token, batch.id, {
                name: batch.name, courseId: batch.courseId, staffId: batch.staffId, days: batch.days,
                startTime: batch.startTime, endTime: batch.endTime, startDate: batch.startDate,
                endDate: batch.endDate || null, isActive: true,
              });
              await reload();
            }}
          />
        )}

        {currentTab === 'finance' && (
          <FinanceTab
            students={students}
            transactions={transactions}
            outstandingDues={outstandingDues}
            canManage={isAdmin}
            darkMode={darkMode}
            onOpenRecordFee={openRecordFee}
            onOpenWhatsAppAll={() => openWhatsApp(undefined)}
            onOpenAddTransaction={openAddTransaction}
            onEditTransaction={openEditTransaction}
            onAdjustDue={(due) => setAdjustTargetDue(due)}
            onOpenAddCharge={() => setIsAddChargeOpen(true)}
          />
        )}

        {currentTab === 'log' && (
          <LogTab
            students={students}
            batches={batches}
            token={session.token}
            onOpenAddStudent={openAddStudent}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsTab
            students={students}
            batches={batches}
            courses={courses}
            onViewStudent={openStudentDetails}
          />
        )}

        {currentTab === 'admin' && isAdmin && (
          <AdminPage
            settings={settings}
            setSettings={handleSettings}
            onExportData={handleExportData}
            session={session}
          />
        )}
        </div>
      </main>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => { setIsAddStudentOpen(false); setEditingStudent(null); }}
        editingStudent={editingStudent}
        onAddStudent={handleAddStudent}
        onUpdateStudent={handleUpdateStudent}
        batches={batches}
      />

      <RecordFeeModal
        isOpen={isRecordFeeOpen}
        onClose={() => setIsRecordFeeOpen(false)}
        students={students}
        feeStructures={feeStructures}
        initialStudent={feeTargetStudent}
        token={session.token}
        onRecordFee={handleRecordFee}
      />

      <AdjustDueModal
        isOpen={adjustTargetDue !== null}
        onClose={() => setAdjustTargetDue(null)}
        due={adjustTargetDue}
        token={session.token}
        onApplied={reload}
      />

      <AddChargeModal
        isOpen={isAddChargeOpen}
        onClose={() => setIsAddChargeOpen(false)}
        students={students}
        batches={batches}
        token={session.token}
        onCreated={reload}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        student={whatsAppTargetStudent}
        allOverdueStudents={students.filter((s) => s.outstandingBalance > 0)}
        academyName={settings.name}
        template={settings.whatsappTemplate}
      />

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => { setIsAddTransactionOpen(false); setEditingTransaction(null); }}
        editingTransaction={editingTransaction}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
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
        onArchive={handleArchiveBatch}
      />

      <AddCourseModal
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        editingCourse={editingCourse}
        feeStructures={feeStructures}
        onSave={handleSaveCourse}
        onArchive={handleArchiveCourse}
        onAddFeeStructure={handleAddFeeStructure}
        onUpdateFeeStructure={handleUpdateFeeStructure}
      />

      <AddStaffModal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        editingStaff={editingStaff}
        onSave={handleSaveStaff}
        onArchive={handleArchiveStaff}
      />

      <StudentDetailsModal
        isOpen={isStudentDetailsOpen}
        onClose={() => setIsStudentDetailsOpen(false)}
        student={detailsTargetStudent}
        token={session.token}
        onRecordFee={openRecordFee}
        onSendMessage={(student) => openWhatsApp(student)}
        onDeleteStudent={handleDeleteStudent}
        onEdit={openEditStudent}
        onAchievementsChanged={() => void reload()}
      />
      <FeeReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} receipt={lastReceipt} />
    </div>
  );
}
