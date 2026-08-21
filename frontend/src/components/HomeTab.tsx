import React from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AppTab, Student, Batch, Transaction } from '../types';

const chartColors = ['#45b080', '#2e8d72', '#83cfa6', '#c7a35a', '#64748b'];
const formatRupees = (value: number | null | undefined) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

interface HomeTabProps {
  students: Student[];
  batches: Batch[];
  transactions: Transaction[];
  setCurrentTab: (tab: AppTab) => void;
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
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const currentMonth = new Date();
  const newStudentsThisMonth = students.filter((student) => {
    if (!student.joinDate) return false;
    const joined = new Date(student.joinDate);
    return joined.getMonth() === currentMonth.getMonth()
      && joined.getFullYear() === currentMonth.getFullYear();
  }).length;

  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      income: 0,
      expense: 0
    };
  });

  transactions.forEach((transaction) => {
    const date = new Date(transaction.occurredAt || transaction.date);
    if (Number.isNaN(date.getTime())) return;
    const bucket = monthBuckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket[transaction.type] += transaction.amount;
  });

  const financialTrend = monthBuckets.map((item) => ({
    ...item,
    net: item.income - item.expense
  }));
  const periodIncome = financialTrend.reduce((sum, item) => sum + item.income, 0);
  const periodExpenses = financialTrend.reduce((sum, item) => sum + item.expense, 0);
  const periodNet = periodIncome - periodExpenses;
  const hasFinancialData = periodIncome > 0 || periodExpenses > 0;
  const feeSettlementRate = students.length
    ? Math.round(((students.length - pendingCount) / students.length) * 100)
    : 0;

  const enrollmentEntries = Array.from(
    students.reduce((result, student) => {
      result.set(student.course, (result.get(student.course) || 0) + 1);
      return result;
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1]);
  const topEnrollmentEntries = enrollmentEntries.slice(0, 4);
  const otherEnrollment = enrollmentEntries.slice(4).reduce((sum, [, value]) => sum + value, 0);
  const enrollmentByCourse = [
    ...topEnrollmentEntries,
    ...(otherEnrollment ? [['Other courses', otherEnrollment] as [string, number]] : [])
  ].map(([label, value], index) => ({
    id: label,
    label,
    value,
    color: chartColors[index % chartColors.length]
  }));
  const leadingCourse = enrollmentEntries[0];
  const leadingCourseShare = leadingCourse && students.length
    ? Math.round((leadingCourse[1] / students.length) * 100)
    : 0;

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
            type="button"
            onClick={onOpenAddStudent}
            className="btn-brand min-h-11 flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTab('log')}
            className="min-h-11 flex-1 sm:flex-initial bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-200/80 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[18px]">fact_check</span>
            <span>Roll Call</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {/* Total Students */}
        <button type="button"
          onClick={() => setCurrentTab('students')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
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
              <span className="material-symbols-outlined text-[14px]">person_add</span>
              {newStudentsThisMonth} joined this month
            </p>
          </div>
        </button>

        {/* Active Batches */}
        <button type="button"
          onClick={() => setCurrentTab('batches')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
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
        </button>

        {/* Revenue Collected */}
        <button type="button"
          onClick={() => setCurrentTab('finance')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
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
              ₹{totalCollected.toLocaleString()}
            </p>
            <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              This billing period
            </p>
          </div>
        </button>

        {/* Avg Attendance */}
        <button type="button"
          onClick={() => setCurrentTab('log')}
          className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col justify-between text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 dark:hover:border-brand-600 shadow-xs"
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
        </button>
      </div>

      {/* Executive insights row */}
      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6" aria-labelledby="dashboard-insights-title">
        <h3 id="dashboard-insights-title" className="sr-only">Executive academy insights</h3>

        <article className="xl:col-span-3 relative overflow-hidden rounded-3xl bg-[#0a211a] dark:bg-[#071712] text-white border border-emerald-800/60 shadow-xl shadow-emerald-950/10">
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
          <div className="relative p-5 md:p-7 pb-2">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Executive financial view
                </span>
                <h4 className="font-heading text-xl md:text-2xl font-extrabold mt-3">Revenue performance</h4>
                <p className="text-xs text-emerald-100/65 mt-1.5">Six-month income, operating cost, and net position</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0 lg:min-w-[330px]" aria-label="Six-month financial summary">
                <ExecutiveMetric label="Revenue" value={formatRupees(periodIncome)} tone="green" />
                <ExecutiveMetric label="Net" value={formatRupees(periodNet)} tone={periodNet >= 0 ? 'gold' : 'rose'} />
                <ExecutiveMetric label="Settled" value={`${feeSettlementRate}%`} tone="neutral" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/70" aria-label="Financial chart legend">
              <span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-[#62d4a0]" />Collected revenue</span>
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px] bg-slate-500" />Operating cost</span>
              <span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-[#dfbd72]" />Net position</span>
            </div>
          </div>

          <div className="relative h-[300px] md:h-[330px] w-full px-1 sm:px-3 pb-4" role="img" aria-label={`Six-month financial chart. Revenue ${formatRupees(periodIncome)}, expenses ${formatRupees(periodExpenses)}, net ${formatRupees(periodNet)}.`}>
            {hasFinancialData ? <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financialTrend} margin={{ top: 28, right: 18, bottom: 8, left: 4 }}>
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#62d4a0" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#62d4a0" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(167, 243, 208, 0.10)" strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#a7c8bb', fontSize: 11, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: '#89a99d', fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`} />
                <Tooltip content={<FinancialTooltip />} cursor={{ stroke: 'rgba(167, 243, 208, 0.22)', strokeWidth: 1 }} />
                <Area isAnimationActive={!reduceMotion} type="monotone" dataKey="income" name="Collected revenue" stroke="#62d4a0" strokeWidth={2.5} fill="url(#revenueArea)" activeDot={{ r: 5, fill: '#62d4a0', stroke: '#0a211a', strokeWidth: 3 }} />
                <Bar isAnimationActive={!reduceMotion} dataKey="expense" name="Operating cost" fill="#64748b" fillOpacity={0.72} maxBarSize={18} radius={[5, 5, 1, 1]} />
                <Line isAnimationActive={!reduceMotion} type="monotone" dataKey="net" name="Net position" stroke="#dfbd72" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#dfbd72', stroke: '#0a211a', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer> : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 text-emerald-100/60">
                <span className="material-symbols-outlined text-3xl text-emerald-300/70 mb-2">query_stats</span>
                <p className="text-sm font-semibold text-white">No financial activity yet</p>
                <p className="text-xs mt-1">Income and cost trends will appear after the first transaction.</p>
              </div>
            )}
          </div>
        </article>

        <article className="xl:col-span-2 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg shadow-slate-900/[0.04] overflow-hidden">
          <div className="p-5 md:p-7 pb-2 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Enrollment portfolio</span>
              <h4 className="font-heading text-xl font-extrabold text-slate-950 dark:text-white mt-2">Course concentration</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Student distribution across the academy</p>
            </div>
            <span className="shrink-0 rounded-xl bg-brand-50 dark:bg-brand-950/60 border border-brand-100 dark:border-brand-800 px-3 py-2 text-right">
              <span className="block text-lg font-black text-brand-700 dark:text-brand-300 tabular-nums">{enrollmentEntries.length}</span>
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Courses</span>
            </span>
          </div>

          {enrollmentByCourse.length > 0 ? (
            <div className="px-4 md:px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] items-center">
                <div className="relative h-[230px] min-w-0" role="img" aria-label={`Enrollment portfolio showing ${students.length} students. ${leadingCourse?.[0] || 'No course'} is the largest course at ${leadingCourseShare} percent.`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<EnrollmentTooltip />} />
                      <Pie data={enrollmentByCourse} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="68%" outerRadius="91%" paddingAngle={4} cornerRadius={7} stroke="none" isAnimationActive={!reduceMotion}>
                        {enrollmentByCourse.map((item) => <Cell key={item.id} fill={item.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-950 dark:text-white tabular-nums">{students.length}</span>
                    <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-slate-400 mt-1">Students</span>
                  </div>
                </div>

                <div className="space-y-2.5 px-2" role="table" aria-label="Course enrollment breakdown">
                  {enrollmentByCourse.map((item) => (
                    <div key={item.id} role="row" className="group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                      <span role="cell" className="min-w-0 inline-flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate" title={item.label}>{item.label}</span>
                      </span>
                      <span role="cell" className="text-right">
                        <span className="block font-extrabold tabular-nums text-xs text-slate-950 dark:text-white">{item.value}</span>
                        <span className="block text-[9px] text-slate-400 tabular-nums">{Math.round(item.value / students.length * 100)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-[19px] text-brand-600 dark:text-brand-400 mt-0.5">insights</span>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">Portfolio signal:</span>{' '}
                  {leadingCourse ? `${leadingCourse[0]} leads enrollment with ${leadingCourse[1]} students (${leadingCourseShare}%).` : 'Enrollment data will appear after the first student is added.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-[290px] flex flex-col items-center justify-center text-center px-6 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-3xl text-brand-400 mb-2">data_usage</span>
              <p className="text-sm font-semibold">No enrollment data yet</p>
              <p className="text-xs mt-1">Add a student to populate the portfolio.</p>
            </div>
          )}
        </article>
      </section>

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
              type="button"
              onClick={onOpenAddBatch}
              className="min-h-11 rounded-xl px-2 text-brand-500 dark:text-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/50 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1"
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
                      {b.schedule} • <span className="text-slate-700 dark:text-slate-300 font-medium">{b.instructor}</span> • ₹{b.monthlyFee.toLocaleString('en-IN')}/month
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-sans text-xs font-semibold bg-brand-50 dark:bg-slate-900 text-brand-600 dark:text-brand-300 px-2.5 py-1 rounded-lg border border-brand-100 dark:border-brand-800/50">
                    {b.enrolledCount} Enrolled
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('log')}
                    className="btn-brand min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1"
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
              ₹{pendingTotal.toLocaleString()}
            </div>
            <p className="font-sans text-xs opacity-80 mt-1">
              Outstanding fees requiring reminder action
            </p>
          </div>

          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              onClick={() => setCurrentTab('finance')}
              className="w-full min-h-11 bg-white text-brand-700 py-2.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-brand-50 transition-colors shadow-xs active:scale-[0.98]"
            >
              Manage Reminders
            </button>
            <button
              type="button"
              onClick={() => onOpenRecordFee()}
              className="w-full min-h-11 bg-black/25 text-white py-2 rounded-xl font-sans text-xs font-semibold hover:bg-black/35 transition-colors border border-white/20"
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
            type="button"
            onClick={() => setCurrentTab('finance')}
            className="min-h-11 rounded-xl px-2 font-sans text-xs font-bold text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/50 uppercase tracking-wider"
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
                  tx.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

type ExecutiveMetricTone = 'green' | 'gold' | 'rose' | 'neutral';

function ExecutiveMetric({ label, value, tone }: { label: string; value: string; tone: ExecutiveMetricTone }) {
  const tones: Record<ExecutiveMetricTone, string> = {
    green: 'text-emerald-300',
    gold: 'text-amber-200',
    rose: 'text-rose-300',
    neutral: 'text-white'
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] px-2.5 sm:px-3 py-2.5 min-w-0">
      <span className="block text-[9px] uppercase tracking-wider font-semibold text-emerald-100/55 truncate">{label}</span>
      <span className={`block text-xs sm:text-sm font-extrabold tabular-nums mt-1 truncate ${tones[tone]}`} title={value}>{value}</span>
    </div>
  );
}

interface ChartTooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { color?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly ChartTooltipItem[];
  label?: string;
}

function FinancialTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-48 rounded-2xl border border-emerald-700/60 bg-[#071712]/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/70 mb-2.5">{label} performance</div>
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-5 text-xs">
            <span className="inline-flex items-center gap-2 text-emerald-50/75">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.payload?.color || '#62d4a0' }} />
              {item.name}
            </span>
            <span className={`font-extrabold tabular-nums ${item.name === 'Operating cost' ? 'text-rose-300' : ''}`}>
              {formatRupees(Number(item.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnrollmentTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const count = Number(item.value || 0);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{count} student{count === 1 ? '' : 's'}</div>
    </div>
  );
}
