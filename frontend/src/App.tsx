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
import { HomeTab } from './components/HomeTab';
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
    alert('Direct JSON import is disabled for tenant safety. Use the API migration workflow for bulk imports.');
  };

  if (loading) return <div className="min-h-screen bg-mint-50 flex items-center justify-center font-bold text-brand-600">Loading academy…</div>;

  return (
    <div className="min-h-screen bg-mint-50 dark:bg-brand-950 text-slate-900 dark:text-brand-50 font-sans antialiased selection:bg-brand-500 selection:text-white">
      {/* Navigation Drawer (Desktop) & Bottom Nav Bar (Mobile) */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        settings={settings}
      />

      {/* Main Content Viewport */}
      <main className="md:ml-[280px] min-h-screen px-4 md:px-10 py-6 md:py-8 max-w-[1440px] mx-auto pb-[80px] md:pb-12">
        <div className="flex justify-end items-center gap-3 mb-4">
          <span className="text-xs text-slate-500">{session.user.tenantName} · {session.user.fullName}</span>
          <button onClick={onLogout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900">
            Sign out
          </button>
        </div>
        {loadError && <div className="mb-4 rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">
          {loadError}<button onClick={() => setLoadError('')} className="float-right font-bold">×</button>
        </div>}
        {currentTab === 'home' && (
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
