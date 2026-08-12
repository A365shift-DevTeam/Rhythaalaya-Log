import React, { useState } from 'react';
import { Student, Transaction } from '../types';

interface FinanceTabProps {
  students: Student[];
  transactions: Transaction[];
  onOpenRecordFee: (student?: Student) => void;
  onOpenWhatsAppAll: () => void;
  onOpenAddTransaction: () => void;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({
  students,
  transactions,
  onOpenRecordFee,
  onOpenWhatsAppAll,
  onOpenAddTransaction
}) => {
  const [period, setPeriod] = useState<'month' | 'last_month' | 'year'>('month');

  const pendingStudents = students.filter((s) => s.feeStatus === 'Pending');

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const marginPercentage = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Ledger
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track studio tuition revenue, operating costs, and pending dues
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <button
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'month'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod('last_month')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'last_month'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              period === 'year'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-heading text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${totalIncome.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-1 font-sans text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              <span>12.5% higher than last period</span>
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Operating Costs
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_down</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-heading text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${totalExpense.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center gap-1 font-sans text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="material-symbols-outlined text-[16px]">horizontal_rule</span>
              <span>Controlled overheads</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between relative overflow-hidden border-l-4 border-l-indigo-600">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Net Profit
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-heading text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${netProfit.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${marginPercentage}%` }}></div>
              </div>
              <div className="font-sans text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex justify-between">
                <span>Profit Margin</span>
                <span className="text-indigo-600 dark:text-indigo-400">{marginPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Chart (2/3) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 lg:col-span-2 flex flex-col justify-between min-h-[320px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                Income vs Overhead Trends
              </h3>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monthly revenue trajectory & cashflow
              </p>
            </div>
            <button
              onClick={onOpenAddTransaction}
              className="bg-indigo-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Record Tx</span>
            </button>
          </div>

          {/* SVG Chart */}
          <div className="flex-1 w-full relative mt-2 pb-6 min-h-[180px]">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400 font-mono w-10">
              <span>$15k</span>
              <span>$10k</span>
              <span>$5k</span>
              <span>$0</span>
            </div>

            {/* Grid lines */}
            <div className="absolute left-12 right-0 top-2 bottom-6 flex flex-col justify-between">
              <div className="w-full border-t border-slate-200/60 dark:border-slate-800"></div>
              <div className="w-full border-t border-slate-200/60 dark:border-slate-800"></div>
              <div className="w-full border-t border-slate-200/60 dark:border-slate-800"></div>
              <div className="w-full border-t border-slate-200/80 dark:border-slate-800"></div>
            </div>

            {/* SVG Lines */}
            <div className="absolute left-12 right-0 top-2 bottom-6 overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Expense Line */}
                <path
                  d="M0,80 Q20,70 40,75 T80,65 T100,60"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.8"
                />

                {/* Income Line */}
                <path
                  d="M0,90 Q15,60 30,50 T60,30 T80,20 T100,10"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Gradient Fill */}
                <path
                  d="M0,90 Q15,60 30,50 T60,30 T80,20 T100,10 L100,100 L0,100 Z"
                  fill="url(#incomeGradient)"
                  opacity="0.15"
                />

                <defs>
                  <linearGradient id="incomeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <circle cx="80" cy="20" r="4" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                <circle cx="100" cy="10" r="4" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
              </svg>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-12 right-0 bottom-0 flex justify-between text-[10px] text-slate-400 font-sans font-bold uppercase pt-2">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
          <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-4">
            Cost Categories
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="w-32 h-32 rounded-full border-8 border-indigo-600 border-t-rose-500 border-r-amber-500 flex flex-col items-center justify-center shadow-xs">
              <span className="font-sans text-[11px] text-slate-500 font-medium">Costs</span>
              <span className="font-heading text-base font-extrabold text-slate-900 dark:text-white">
                ${totalExpense.toLocaleString()}
              </span>
            </div>

            <div className="w-full mt-6 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Rent & Studio
                </div>
                <span className="font-bold text-slate-900 dark:text-white">60%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Salaries
                </div>
                <span className="font-bold text-slate-900 dark:text-white">25%</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Equipment & Misc
                </div>
                <span className="font-bold text-slate-900 dark:text-white">15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Transactions & Pending Fee Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Financial Logs
            </h3>
            <button
              onClick={onOpenAddTransaction}
              className="font-sans text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-wider"
            >
              + Record Entry
            </button>
          </div>

          <div className="space-y-3">
            {transactions.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {item.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div>
                    <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.date} • {item.category}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-sans text-sm font-extrabold ${
                      item.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Fee Reminders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  Dues & Collections
                </h3>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {pendingStudents.length} students pending payment
                </p>
              </div>

              {/* WhatsApp All Button */}
              <button
                onClick={onOpenWhatsAppAll}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-2 rounded-xl transition-all font-sans text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">forum</span>
                <span>WhatsApp All</span>
              </button>
            </div>

            <div className="space-y-3">
              {pendingStudents.slice(0, 4).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-sans text-xs font-bold text-slate-900 dark:text-white">
                        {student.name}
                      </div>
                      <div className="font-sans text-[11px] text-rose-600 font-semibold mt-0.5">
                        {student.overdueDays || 3} days overdue
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-sans text-xs font-extrabold text-slate-900 dark:text-white">
                      ${student.feeAmount}
                    </span>
                    <button
                      onClick={() => onOpenRecordFee(student)}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Collect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
            <span>Automated notifications active</span>
            <button
              onClick={() => onOpenRecordFee()}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Manual Collect &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

