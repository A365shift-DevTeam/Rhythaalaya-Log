import React, { useState, useEffect } from 'react';
import {
  Student,
  Batch,
  Transaction,
  OrgSettings,
  AppTab
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
import { StudentDetailsModal } from './components/modals/StudentDetailsModal';

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
  const [currentTab, setCurrentTab] = useState<AppTab>('home');
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
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
      const [studentRows, batchRows, transactionRows, org] = await Promise.all([
        api.students(session.token), api.batches(session.token),
        api.finance(session.token), api.settings(session.token)
      ]);
      setStudents(studentRows); setBatches(batchRows); setTransactions(transactionRows); setSettings(org);
      setLoadError('');
    } catch (error) { showError(error); }
    finally { setLoading(false); }
  };
  useEffect(() => { void reload(); }, [session.token]);

  // Dark mode effect
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Modals state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isRecordFeeOpen, setIsRecordFeeOpen] = useState(false);
  const [feeTargetStudent, setFeeTargetStudent] = useState<Student | undefined>(undefined);

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [whatsAppTargetStudent, setWhatsAppTargetStudent] = useState<Student | undefined>(undefined);

  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false);
  const [detailsTargetStudent, setDetailsTargetStudent] = useState<Student | null>(null);

  // Actions
  const handleAddStudent = async (newStudent: Student) => {
    try {
      const created = await api.createStudent(session.token, newStudent, batches);
      setStudents((prev) => [created, ...prev]);
      setBatches((prev) => prev.map((b) =>
        b.id === created.batchId ? { ...b, enrolledCount: b.enrolledCount + 1 } : b));
    } catch (error) { showError(error); }
  };

  const handleRecordFee = async (studentId: string, amount: number, method: string) => {
    try {
      await api.recordPayment(session.token, studentId, amount, method);
      await reload();
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const handleAddTransaction = async (newTx: Transaction) => {
    try {
      const created = await api.createTransaction(session.token, newTx);
      setTransactions((prev) => [created, ...prev]);
    } catch (error) { showError(error); }
  };

  const handleAddBatch = async (newBatch: Batch) => {
    try {
      const created = await api.createBatch(session.token, newBatch);
      setBatches((prev) => [...prev, created]);
    } catch (error) { showError(error); }
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
    const backupData = {
      students,
      batches,
      transactions,
      settings,
      exportDate: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studiosync_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = '';
    setLoadError('Direct JSON import is disabled for tenant safety. Use the API migration workflow for bulk imports.');
  };

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
      {/* Navigation Drawer (Desktop) & Bottom Nav Bar (Mobile) */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        settings={settings}
      />

      {/* Main Content Viewport */}
      <main id="main-content" tabIndex={-1} className="md:ml-[270px] min-h-screen px-4 sm:px-6 lg:px-8 py-5 md:py-8 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-[1440px]">
        <header className="mb-5 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-brand-200/60 bg-white/80 px-3 py-2.5 shadow-xs backdrop-blur-sm dark:border-brand-800 dark:bg-slate-900/80 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{session.user.tenantName}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Signed in as {session.user.fullName}</p>
          </div>
          <button type="button" onClick={onLogout} className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3.5 text-xs font-bold bg-white text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-rose-950/40">
            Sign out
          </button>
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
              setCurrentTab={setCurrentTab}
              onOpenAddStudent={() => setIsAddStudentOpen(true)}
              onOpenAddBatch={() => setIsAddBatchOpen(true)}
              onOpenRecordFee={(student) => {
                setFeeTargetStudent(student);
                setIsRecordFeeOpen(true);
              }}
            />
          </React.Suspense>
        )}

        {currentTab === 'students' && (
          <StudentsTab
            students={students}
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
            onOpenRecordFee={(student) => {
              setFeeTargetStudent(student);
              setIsRecordFeeOpen(true);
            }}
            onViewStudent={(student) => {
              setDetailsTargetStudent(student);
              setIsStudentDetailsOpen(true);
            }}
            onSendMessage={(student) => {
              setWhatsAppTargetStudent(student);
              setIsWhatsAppOpen(true);
            }}
          />
        )}

        {currentTab === 'batches' && (
          <BatchesTab batches={batches} onOpenAddBatch={() => setIsAddBatchOpen(true)} />
        )}

        {currentTab === 'finance' && (
          <FinanceTab
            students={students}
            transactions={transactions}
            onOpenRecordFee={(student) => {
              setFeeTargetStudent(student);
              setIsRecordFeeOpen(true);
            }}
            onOpenWhatsAppAll={() => {
              setWhatsAppTargetStudent(undefined);
              setIsWhatsAppOpen(true);
            }}
            onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
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
        defaultMonthlyFee={settings.defaultMonthlyFee}
      />

      <RecordFeeModal
        isOpen={isRecordFeeOpen}
        onClose={() => setIsRecordFeeOpen(false)}
        students={students}
        initialStudent={feeTargetStudent}
        onRecordFee={handleRecordFee}
      />

      <WhatsAppModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        student={whatsAppTargetStudent}
        allOverdueStudents={students.filter((s) => s.feeStatus === 'Pending')}
      />

      <AddTransactionModal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

      <AddBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        onAddBatch={handleAddBatch}
        defaultMonthlyFee={settings.defaultMonthlyFee}
      />

      <StudentDetailsModal
        isOpen={isStudentDetailsOpen}
        onClose={() => setIsStudentDetailsOpen(false)}
        student={detailsTargetStudent}
        onRecordFee={(student) => {
          setFeeTargetStudent(student);
          setIsRecordFeeOpen(true);
        }}
        onSendMessage={(student) => {
          setWhatsAppTargetStudent(student);
          setIsWhatsAppOpen(true);
        }}
        onDeleteStudent={handleDeleteStudent}
      />
    </div>
  );
}
