import React from 'react';
import { Student, Batch, Transaction } from '../types';

interface HomeTabProps {
  students: Student[];
  batches: Batch[];
  transactions: Transaction[];
  setCurrentTab: (tab: 'home' | 'students' | 'finance' | 'log' | 'menu') => void;
  onOpenAddStudent: () => void;
  onOpenAddBatch: () => void;
  onOpenRecordFee: (student?: Student) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  students,
  batches,
  transactions,
  setCurrentTab,
  onOpenAddStudent,
  onOpenAddBatch,
  onOpenRecordFee
}) => {
  const pendingStudents = students.filter((s) => s.feeStatus === 'Pending');
  const pendingCount = pendingStudents.length;
  const pendingTotal = pendingStudents.reduce((acc, s) => acc + s.feeAmount, 0);

  const totalCollected = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const averageAttendance = Math.round(
    students.reduce((acc, s) => acc + s.overallAttendance, 0) / (students.length || 1)
  );

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Top Banner Greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              {formattedDate}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Studio Live
            </span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Academy Overview
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Managing <span className="font-semibold text-slate-800 dark:text-slate-200">{students.length} students</span> across <span className="font-semibold text-slate-800 dark:text-slate-200">{batches.length} active batches</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onOpenAddStudent}
            className="btn-brand flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
          <button
            onClick={() => setCurrentTab('log')}
            className="flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-200/80 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>Roll Call</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {/* Total Students */}
        <div
          onClick={() => setCurrentTab('students')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Students
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">group</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {students.length}
            </p>
            <p className="font-sans text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              +12 this month
            </p>
          </div>
        </div>

        {/* Active Batches */}
        <div
          onClick={() => setCurrentTab('menu')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Batches
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {batches.length}
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Schedules active
            </p>
          </div>
        </div>

        {/* Revenue Collected */}
        <div
          onClick={() => setCurrentTab('finance')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fees Collected
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${totalCollected.toLocaleString()}
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              This billing period
            </p>
          </div>
        </div>

        {/* Avg Attendance */}
        <div
          onClick={() => setCurrentTab('log')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-5 cursor-pointer flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attendance Avg
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/60 text-brand-500 dark:text-brand-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {averageAttendance}%
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Overall student roll
            </p>
          </div>
        </div>
      </div>

      {/* Main Row: Batches Schedule & Overdue Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Batches (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-brand-200/60 dark:border-brand-800 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Active Batches
              </h3>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current studio courses & schedules
              </p>
            </div>
            <button
              onClick={onOpenAddBatch}
              className="text-brand-500 dark:text-brand-400 hover:text-brand-600 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>New Batch</span>
            </button>
          </div>

          <div className="space-y-3">
            {batches.map((b, idx) => (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-brand-50/70 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brand-300 dark:hover:border-brand-600 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20 dark:text-brand-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                      {b.name}
                    </h4>
                    <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {b.schedule} • Instructor: <span className="text-slate-700 dark:text-slate-300 font-medium">{b.instructor}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-sans text-xs font-semibold bg-brand-50 dark:bg-slate-900 text-brand-600 dark:text-brand-300 px-2.5 py-1 rounded-lg border border-brand-100 dark:border-brand-800/50">
                    {b.enrolledCount} Enrolled
                  </span>
                  <button
                    onClick={() => setCurrentTab('log')}
                    className="btn-brand px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">fact_check</span>
                    <span>Roll</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Fee Banner Card */}
        <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-[#63c06a] text-white rounded-2xl p-6 shadow-lg shadow-brand-500/15 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-sans text-xs uppercase tracking-wider font-bold opacity-90 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
                Pending Fees Alert
              </span>
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold">
                {pendingCount} Overdue
              </span>
            </div>
            <div className="font-heading text-3xl font-extrabold tracking-tight mt-1">
              ${pendingTotal.toLocaleString()}
            </div>
            <p className="font-sans text-xs opacity-80 mt-1">
              Outstanding fees requiring reminder action
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={() => setCurrentTab('finance')}
              className="w-full bg-white text-brand-600 py-2.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-brand-50 transition-colors shadow-xs active:scale-[0.98]"
            >
              Manage Reminders
            </button>
            <button
              onClick={() => onOpenRecordFee()}
              className="w-full bg-black/20 text-white py-2 rounded-xl font-sans text-xs font-semibold hover:bg-black/30 transition-colors border border-white/10"
            >
              + Record Fee Payment
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-brand-200/60 dark:border-brand-800 shadow-xs">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Recent Studio Activity
            </h3>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live updates on payments and logs
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('finance')}
            className="font-sans text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline uppercase tracking-wider"
          >
            View All
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {tx.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                  </span>
                </div>
                <div>
                  <p className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                    {tx.title}
                  </p>
                  <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {tx.date} • {tx.category}
                  </p>
                </div>
              </div>
              <div
                className={`font-sans text-sm font-extrabold ${
                  tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

