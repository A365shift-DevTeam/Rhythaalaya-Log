import React, { useState, useEffect } from 'react';
import {
  Student,
  Batch,
  Transaction,
  OrgSettings
} from './types';
import {
  INITIAL_STUDENTS,
  INITIAL_BATCHES,
  INITIAL_TRANSACTIONS,
  INITIAL_SETTINGS
} from './data/mockData';

import { Navigation } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { StudentsTab } from './components/StudentsTab';
import { FinanceTab } from './components/FinanceTab';
import { LogTab } from './components/LogTab';
import { MenuTab } from './components/MenuTab';

import { AddStudentModal } from './components/modals/AddStudentModal';
import { RecordFeeModal } from './components/modals/RecordFeeModal';
import { WhatsAppModal } from './components/modals/WhatsAppModal';
import { AddTransactionModal } from './components/modals/AddTransactionModal';
import { AddBatchModal } from './components/modals/AddBatchModal';
import { StudentDetailsModal } from './components/modals/StudentDetailsModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'students' | 'finance' | 'log' | 'menu'>('home');

  // Local storage state initialization
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('studiosync_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    const saved = localStorage.getItem('studiosync_batches');
    return saved ? JSON.parse(saved) : INITIAL_BATCHES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('studiosync_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [settings, setSettings] = useState<OrgSettings>(() => {
    const saved = localStorage.getItem('studiosync_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('studiosync_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('studiosync_batches', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('studiosync_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('studiosync_settings', JSON.stringify(settings));
  }, [settings]);

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
  const handleAddStudent = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
    // update batch count
    setBatches((prev) =>
      prev.map((b) => (b.name === newStudent.batch ? { ...b, enrolledCount: b.enrolledCount + 1 } : b))
    );
  };

  const handleRecordFee = (studentId: string, amount: number, method: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, feeStatus: 'Paid', overdueDays: undefined } : s))
    );

    const targetStudent = students.find((s) => s.id === studentId);
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title: `Fee Collection - ${targetStudent?.name || studentId}`,
      type: 'income',
      amount,
      category: 'Fees',
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleAddBatch = (newBatch: Batch) => {
    setBatches((prev) => [...prev, newBatch]);
  };

  const handleDeleteStudent = (studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
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
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.batches) setBatches(parsed.batches);
          if (parsed.transactions) setTransactions(parsed.transactions);
          if (parsed.settings) setSettings(parsed.settings);
          alert('StudioSync academy data successfully imported!');
        } catch (err) {
          alert('Invalid JSON backup file.');
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Navigation Drawer (Desktop) & Bottom Nav Bar (Mobile) */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAddStudent={() => setIsAddStudentOpen(true)}
        settings={settings}
      />

      {/* Main Content Viewport */}
      <main className="md:ml-[280px] min-h-screen px-4 md:px-10 py-6 md:py-8 max-w-[1440px] mx-auto pb-[80px] md:pb-12">
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
            onOpenAddStudent={() => setIsAddStudentOpen(true)}
          />
        )}

        {currentTab === 'menu' && (
          <MenuTab
            settings={settings}
            setSettings={setSettings}
            batches={batches}
            onOpenAddBatch={() => setIsAddBatchOpen(true)}
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
