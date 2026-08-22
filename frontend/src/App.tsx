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

import { Navigation, PrimaryAction } from './components/Navigation';
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

  // The accent picker in Settings swaps the leaf token family. Without this
  // the stored themeColor was written but never read.
  useEffect(() => {
    document.documentElement.dataset.accent = settings.themeColor || 'emerald';
  }, [settings.themeColor]);

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

  // The action that follows the screen, so the button is never the wrong
  // one for the tab you are looking at.
  const primaryAction: PrimaryAction | null = (() => {
    switch (currentTab) {
      case 'home':
      case 'students':
        return { label: 'Add student', icon: 'person_add', onClick: () => setIsAddStudentOpen(true) };
      case 'batches':
        return isAdmin
          ? { label: 'Add batch', icon: 'add', onClick: () => { setEditingBatch(null); setIsAddBatchOpen(true); } }
          : null;
      case 'finance':
        return { label: 'Record fee', icon: 'payments', onClick: () => openRecordFee(undefined) };
      default:
        return null;
    }
  })();

  if (loading) return (
    <div className="min-h-dvh bg-bg p-4 md:p-8" role="status" aria-live="polite">
      <span className="sr-only">Loading your academy</span>
      <div className="mx-auto max-w-6xl animate-pulse space-y-5 pt-16 md:pt-24">
        <div className="h-8 w-56 rounded-ctl bg-surface-3" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-card bg-surface" />)}
        </div>
        <div className="h-80 rounded-card bg-surface" />
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-ink antialiased">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        settings={settings}
        userName={session.user.fullName}
        userRole={isAdmin ? 'Admin' : 'Staff'}
        onLogout={onLogout}
        primaryAction={primaryAction}
        renderNotifications={(tone) => (
          <NotificationCenter
            tone={tone}
            tenantKey={session.user.tenantId || session.user.email}
            preferences={settings.notifications}
            students={students}
            transactions={transactions}
            onNavigate={setCurrentTab}
          />
        )}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-dvh px-4 pb-24 pt-4 sm:px-6 md:ml-[240px] md:pb-10 md:pt-7 lg:px-8"
      >
        <div className="mx-auto w-full max-w-[1400px]">
        {loadError && <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-card border border-kumkum-line bg-kumkum-tint px-3.5 py-3 text-[13px] text-kumkum">
          <span className="material-symbols-outlined mt-px shrink-0 text-[20px]" aria-hidden="true">error</span>
          <span className="min-w-0 flex-1 py-0.5">{loadError}</span>
          <button type="button" onClick={() => void reload()} className="btn btn-sm shrink-0 border-kumkum-line text-kumkum hover:bg-kumkum/10">Try again</button>
          <button type="button" onClick={() => setLoadError('')} aria-label="Dismiss" className="icon-btn h-9 w-9 shrink-0 text-kumkum hover:bg-kumkum/10">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>}
        {currentTab === 'home' && (
          <React.Suspense fallback={
            <div className="empty min-h-[420px]">
              <span className="label">Loading today…</span>
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
        academyName={settings.name}
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
