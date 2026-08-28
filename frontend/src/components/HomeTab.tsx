import { Button } from './ui/button';
import { Card } from './ui/card';
import { JisIcon } from './JisIcon';
import React, { useState } from 'react';
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
import { AppTab, Student, Batch, Transaction, FeeDue, WEEKDAY_SHORT } from '../types';

// Ambot365 categorical palette: primary greens with cool accent contrast.
const CATEGORICAL_LIGHT = ['#3fc073', '#379fc8', '#65a859', '#f59e0b', '#64b7d8', '#2b824e', '#9fd1e5', '#88be7e'];
const CATEGORICAL_DARK = ['#6bd194', '#64b7d8', '#88be7e', '#fbbf24', '#9fd1e5', '#3fc073', '#c9e3ee', '#b4d5af'];

const formatRupees = (value: number | null | undefined) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const weekdayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatDays = (days: string[]) => days.map((d) => WEEKDAY_SHORT[weekdayIndex.indexOf(d)]).join('/');
const formatTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const buildMonthBuckets = (count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - (count - 1 - index));
  return {
    key: `${date.getFullYear()}-${date.getMonth()}`,
    label: date.toLocaleDateString('en-IN', { month: 'short' }),
    monthEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0),
    income: 0,
    expense: 0
  };
});

interface HomeTabProps {
  students: Student[];
  batches: Batch[];
  transactions: Transaction[];
  outstandingDues: FeeDue[];
  darkMode: boolean;
  setCurrentTab: (tab: AppTab) => void;
  onOpenAddStudent: () => void;
  onOpenAddBatch: () => void;
  onOpenRecordFee: (student?: Student) => void;
}

const RANGE_OPTIONS = [3, 6, 12] as const;

export const HomeTab: React.FC<HomeTabProps> = ({
  students,
  batches,
  transactions,
  outstandingDues,
  darkMode,
  setCurrentTab,
  onOpenAddStudent,
  onOpenAddBatch,
  onOpenRecordFee
}) => {
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const categorical = darkMode ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const [monthsRange, setMonthsRange] = useState<typeof RANGE_OPTIONS[number]>(6);

  const pendingStudents = students.filter((s) => s.outstandingBalance > 0);
  const pendingCount = pendingStudents.length;
  const pendingTotal = pendingStudents.reduce((acc, s) => acc + s.outstandingBalance, 0);

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

  const monthBuckets = buildMonthBuckets(monthsRange);
  transactions.forEach((transaction) => {
    const date = new Date(transaction.occurredAt || transaction.date);
    if (Number.isNaN(date.getTime())) return;
    const bucket = monthBuckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket[transaction.type] += transaction.amount;
  });
  const financialTrend = monthBuckets.map((item) => ({ ...item, net: item.income - item.expense }));
  const periodIncome = financialTrend.reduce((sum, item) => sum + item.income, 0);
  const periodExpenses = financialTrend.reduce((sum, item) => sum + item.expense, 0);
  const periodNet = periodIncome - periodExpenses;
  const hasFinancialData = periodIncome > 0 || periodExpenses > 0;
  const feeSettlementRate = students.length
    ? Math.round(((students.length - pendingCount) / students.length) * 100)
    : 0;

  const sparkBuckets = buildMonthBuckets(6);
  transactions.forEach((transaction) => {
    const date = new Date(transaction.occurredAt || transaction.date);
    if (Number.isNaN(date.getTime()) || transaction.type !== 'income') return;
    const bucket = sparkBuckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.income += transaction.amount;
  });
  const feesSparkline = sparkBuckets.map((item) => item.income);
  const studentsSparkline = sparkBuckets.map((item) =>
    students.filter((s) => s.joinDate && new Date(s.joinDate) <= item.monthEnd).length);

  const enrollmentCounts = new Map<string, number>();
  students.forEach((student) => {
    student.enrollments.filter((e) => e.status === 'Active').forEach((enrollment) => {
      enrollmentCounts.set(enrollment.courseName, (enrollmentCounts.get(enrollment.courseName) || 0) + 1);
    });
  });
  const enrollmentEntries: [string, number][] = Array.from(enrollmentCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  const topEnrollmentEntries = enrollmentEntries.slice(0, 7);
  const otherEnrollment: number = enrollmentEntries.slice(7).reduce((sum, entry) => sum + entry[1], 0);
  const enrollmentByCourse = [
    ...topEnrollmentEntries,
    ...(otherEnrollment ? [['Other courses', otherEnrollment] as [string, number]] : [])
  ].map(([label, value], index) => ({
    id: label,
    label,
    value,
    color: index < categorical.length ? categorical[index] : '#9e9e9e'
  }));
  const totalEnrollments: number = enrollmentEntries.reduce((sum, entry) => sum + entry[1], 0);
  const leadingCourse = enrollmentEntries[0];
  const leadingCourseShare = leadingCourse && totalEnrollments
    ? Math.round((leadingCourse[1] / totalEnrollments) * 100)
    : 0;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Top Banner Greeting */}
      <Card className="premium-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 md:p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#3fc073]">
              {formattedDate}
            </span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
            Academy Overview
          </h2>
          <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-0.5">
            Managing <span className="font-semibold text-[#212121] dark:text-[#e2e8f0]">{students.length} students</span> across <span className="font-semibold text-[#212121] dark:text-[#e2e8f0]">{batches.length} active batches</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Button type="button" onClick={onOpenAddStudent}
            className="btn-brand min-h-11 flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <JisIcon className="text-[18px]">person_add</JisIcon><span>Add Student</span>
          </Button>
          <Button type="button" onClick={() => setCurrentTab('log')}
            className="min-h-11 flex-1 sm:flex-initial bg-[#f0f0f0] dark:bg-[#111c2b] text-[#212121] dark:text-[#e2e8f0] hover:bg-[#dbdbdb] dark:hover:bg-[#223148] px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 border border-[#dbdbdb]/60 dark:border-[#243244]">
            <JisIcon className="text-[18px]">fact_check</JisIcon><span>Attendance</span>
          </Button>
        </div>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        <Button type="button" onClick={() => setCurrentTab('students')}
          className="premium-card-interactive min-h-[150px] p-4 sm:p-5 flex flex-col justify-between text-left bg-gradient-to-r from-[#3fc073]/10 via-[#3fc073]/[0.03] to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Active Students</span>
            <div className="w-8 h-8 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] flex items-center justify-center">
              <JisIcon className="text-[18px]">group</JisIcon>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl sm:text-3xl font-bold text-[#35a160] dark:text-[#6bd194] tracking-tight tabular-nums">{students.length}</p>
            <p className="font-sans text-xs text-[#22c55e] mt-1 font-semibold flex items-center gap-1">
              <JisIcon className="text-[14px]">person_add</JisIcon>{newStudentsThisMonth} joined this month
            </p>
          </div>
          <Sparkline data={studentsSparkline} className="mt-3 -mb-1" strokeColor="#3fc073" />
        </Button>

        <Button type="button" onClick={() => setCurrentTab('batches')}
          className="premium-card-interactive min-h-[150px] p-4 sm:p-5 flex flex-col justify-between text-left bg-gradient-to-r from-[#379fc8]/10 via-[#379fc8]/[0.03] to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Batches</span>
            <div className="w-8 h-8 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-[#379fc8] dark:text-sky-400 flex items-center justify-center">
              <JisIcon className="text-[18px]">calendar_view_week</JisIcon>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl sm:text-3xl font-bold text-[#379fc8] dark:text-[#64b7d8] tracking-tight tabular-nums">{batches.length}</p>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-1 font-medium">Schedules active</p>
          </div>
        </Button>

        <Button type="button" onClick={() => setCurrentTab('finance')}
          className="premium-card-interactive min-h-[150px] p-4 sm:p-5 flex flex-col justify-between text-left bg-gradient-to-r from-[#22c55e]/10 via-[#22c55e]/[0.03] to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Fees Collected</span>
            <div className="w-8 h-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] flex items-center justify-center">
              <JisIcon className="text-[18px]">payments</JisIcon>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl sm:text-3xl font-bold text-[#22c55e] dark:text-[#4ade80] tracking-tight tabular-nums">₹{totalCollected.toLocaleString('en-IN')}</p>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-1 font-medium">Year to date</p>
          </div>
          <Sparkline data={feesSparkline} className="mt-3 -mb-1" strokeColor="#22c55e" />
        </Button>

        <Button type="button" onClick={() => setCurrentTab('log')}
          className="premium-card-interactive min-h-[150px] p-4 sm:p-5 flex flex-col justify-between text-left bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/[0.03] to-transparent">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Attendance Avg</span>
            <div className="w-8 h-8 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-[#f59e0b] dark:text-amber-400 flex items-center justify-center">
              <JisIcon className="text-[18px]">how_to_reg</JisIcon>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-heading text-2xl sm:text-3xl font-bold text-[#f59e0b] dark:text-[#fbbf24] tracking-tight tabular-nums">{averageAttendance}%</p>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-1 font-medium">Overall student roll</p>
          </div>
        </Button>
      </div>

      {/* Executive insights row */}
      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6" aria-labelledby="dashboard-insights-title">
        <h3 id="dashboard-insights-title" className="sr-only">Executive academy insights</h3>

        <article className="premium-card xl:col-span-3 relative overflow-hidden rounded-3xl">
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-[#3fc073]/10 blur-3xl pointer-events-none" />
          <div className="relative p-5 md:p-7 pb-2">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#35a160] dark:text-[#b3e6c7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3fc073]" />
                  Executive financial view
                </span>
                <h4 className="font-heading text-xl md:text-2xl font-bold text-[#212121] dark:text-white mt-3">Revenue performance</h4>
                <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1.5">{monthsRange}-month income, operating cost, and net position</p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 min-w-0 lg:min-w-[330px]" aria-label={`${monthsRange}-month financial summary`}>
                <ExecutiveMetric label="Revenue" value={formatRupees(periodIncome)} tone="blue" />
                <ExecutiveMetric label="Net" value={formatRupees(periodNet)} tone={periodNet >= 0 ? 'green' : 'rose'} />
                <ExecutiveMetric label="Settled" value={`${feeSettlementRate}%`} tone="neutral" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-wider text-[#575757] dark:text-[#cbd5e1]" aria-label="Financial chart legend">
                <span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-[#3fc073]" />Collected revenue</span>
                <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#9e9e9e] dark:bg-[#6b6b6b]" />Operating cost</span>
                <span className="inline-flex items-center gap-2"><span className="w-5 h-0.5 rounded-full bg-[#f59e0b]" />Net position</span>
              </div>
              <div className="inline-flex rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#111c2b] p-0.5" role="group" aria-label="Chart range">
                {RANGE_OPTIONS.map((option) => (
                  <Button key={option} type="button" onClick={() => setMonthsRange(option)} aria-pressed={monthsRange === option}
                    className={`min-h-7 px-2.5 rounded-lg text-xs font-bold transition-colors ${monthsRange === option ? 'bg-white dark:bg-[#223148] text-[#212121] dark:text-white shadow-xs' : 'text-[#808080] dark:text-[#94a3b8] hover:text-[#212121] dark:hover:text-white'}`}>
                    {option}mo
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative h-[300px] md:h-[330px] w-full px-1 sm:px-3 pb-4" role="img" aria-label={`${monthsRange}-month financial chart. Revenue ${formatRupees(periodIncome)}, expenses ${formatRupees(periodExpenses)}, net ${formatRupees(periodNet)}.`}>
            {hasFinancialData ? <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={financialTrend} margin={{ top: 28, right: 18, bottom: 8, left: 4 }}>
                <defs>
                  <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3fc073" stopOpacity={0.38} />
                    <stop offset="100%" stopColor="#3fc073" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'} strokeDasharray="4 6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#94a3b8' : '#808080', fontSize: 11, fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: darkMode ? '#94a3b8' : '#808080', fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `₹${Math.round(value / 1000)}k` : `₹${value}`} />
                <Tooltip content={<FinancialTooltip />} cursor={{ stroke: 'rgba(63, 192, 115, 0.25)', strokeWidth: 1 }} />
                <Area isAnimationActive={!reduceMotion} type="monotone" dataKey="income" name="Collected revenue" stroke="#3fc073" strokeWidth={2.5} fill="url(#revenueArea)" activeDot={{ r: 5, fill: '#3fc073', stroke: darkMode ? '#0b1422' : '#ffffff', strokeWidth: 3 }} />
                <Bar isAnimationActive={!reduceMotion} dataKey="expense" name="Operating cost" fill={darkMode ? '#6b6b6b' : '#9e9e9e'} fillOpacity={0.75} maxBarSize={18} radius={[5, 5, 1, 1]} />
                <Line isAnimationActive={!reduceMotion} type="monotone" dataKey="net" name="Net position" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b', stroke: darkMode ? '#0b1422' : '#ffffff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer> : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 text-[#808080] dark:text-[#94a3b8]">
                <JisIcon className="text-3xl text-[#3fc073]/70 mb-2">query_stats</JisIcon>
                <p className="text-sm font-semibold text-[#212121] dark:text-white">No financial activity yet</p>
                <p className="text-xs mt-1">Income and cost trends will appear after the first transaction.</p>
              </div>
            )}
          </div>
        </article>

        <article className="premium-card xl:col-span-2 rounded-3xl overflow-hidden">
          <div className="p-5 md:p-7 pb-2 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#3fc073]">Enrollment portfolio</span>
              <h4 className="font-heading text-xl font-bold text-[#212121] dark:text-white mt-2">Course concentration</h4>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1">Active enrollments across the academy</p>
            </div>
            <span className="shrink-0 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 border border-[#cbecd8] dark:border-[#3fc073]/30 px-3 py-1.5 inline-flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold text-[#35a160] dark:text-[#b3e6c7] tabular-nums">{enrollmentEntries.length}</span>
              <span className="text-xs uppercase tracking-wider font-bold text-[#808080] dark:text-[#94a3b8]">
                {enrollmentEntries.length === 1 ? 'Course' : 'Courses'}
              </span>
            </span>
          </div>

          {enrollmentByCourse.length > 0 ? (
            <div className="px-4 md:px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] xl:grid-cols-1 2xl:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] items-center">
                <div className="relative h-[230px] min-w-0" role="img" aria-label={`Enrollment portfolio showing ${totalEnrollments} active enrollments. ${leadingCourse?.[0] || 'No course'} is the largest at ${leadingCourseShare} percent.`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<EnrollmentTooltip />} />
                      <Pie data={enrollmentByCourse} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="68%" outerRadius="91%" paddingAngle={4} cornerRadius={7} stroke="none" isAnimationActive={!reduceMotion}>
                        {enrollmentByCourse.map((item) => <Cell key={item.id} fill={item.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#212121] dark:text-white tabular-nums">{totalEnrollments}</span>
                    <span className="text-xs uppercase tracking-[0.16em] font-bold text-[#9e9e9e] mt-1">Enrollments</span>
                  </div>
                </div>

                <div className="space-y-2.5 px-2" role="table" aria-label="Course enrollment breakdown">
                  {enrollmentByCourse.map((item) => (
                    <div key={item.id} role="row" className="group flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                      <span role="cell" className="min-w-0 inline-flex items-center gap-2.5 text-xs text-[#575757] dark:text-[#cbd5e1]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate" title={item.label}>{item.label}</span>
                      </span>
                      <span role="cell" className="text-right">
                        <span className="block font-bold tabular-nums text-xs text-[#212121] dark:text-white">{item.value}</span>
                        <span className="block text-xs text-[#9e9e9e] tabular-nums">{totalEnrollments ? Math.round(item.value / totalEnrollments * 100) : 0}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] px-4 py-3 flex items-start gap-3">
                <JisIcon className="text-[19px] text-[#3fc073] mt-0.5">insights</JisIcon>
                <p className="text-xs leading-relaxed text-[#575757] dark:text-[#cbd5e1]">
                  <span className="font-bold text-[#212121] dark:text-white">Portfolio signal:</span>{' '}
                  {leadingCourse ? `${leadingCourse[0]} leads enrollment with ${leadingCourse[1]} students (${leadingCourseShare}%).` : 'Enrollment data will appear after the first student is enrolled.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-h-[290px] flex flex-col items-center justify-center text-center px-6 text-[#808080]">
              <JisIcon className="text-3xl text-[#b3e6c7] mb-2">data_usage</JisIcon>
              <p className="text-sm font-semibold">No enrollment data yet</p>
              <p className="text-xs mt-1">Enroll a student in a batch to populate the portfolio.</p>
            </div>
          )}
        </article>
      </section>

      {/* Main Row: Batches Schedule & Overdue Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card lg:col-span-2 gap-0 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-heading text-lg font-bold text-[#212121] dark:text-white">Active Batches</h3>
              <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Current academy courses & schedules</p>
            </div>
            <Button type="button" onClick={onOpenAddBatch}
              className="min-h-11 rounded-2xl px-2 text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
              <JisIcon className="text-sm">add</JisIcon><span>New Batch</span>
            </Button>
          </div>

          <div className="space-y-3">
            {batches.length === 0 && <p className="text-xs text-[#808080]">No batches yet.</p>}
            {batches.map((b, idx) => (
              <div key={b.id} className="p-4 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#3fc073]/40 dark:hover:border-[#3fc073]/40 transition-all">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7] flex items-center justify-center font-bold text-sm shrink-0">{idx + 1}</div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-[#212121] dark:text-white">{b.name}</h4>
                    <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">
                      {formatDays(b.days)} {formatTime(b.startTime)} • <span className="text-[#575757] dark:text-[#cbd5e1] font-medium">{b.staffName}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#dbdbdb]/60 dark:border-[#243244]">
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap font-sans text-xs font-semibold bg-white dark:bg-[#0b1422] text-[#35a160] dark:text-[#b3e6c7] px-3 py-1 rounded-full border border-[#dbdbdb]/60 dark:border-[#243244]">
                    {b.enrolledCount} Enrolled
                  </span>
                  <Button type="button" onClick={() => setCurrentTab('log')} className="btn-brand min-h-10 px-3 py-1.5 rounded-2xl text-xs font-semibold flex items-center gap-1">
                    <JisIcon className="text-sm">fact_check</JisIcon><span>Attendance</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="bg-gradient-to-br from-[#3fc073] via-[#35a160] to-[#2b824e] text-white rounded-3xl p-6 shadow-xl shadow-[#3fc073]/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="font-sans text-xs uppercase tracking-wider font-bold opacity-90 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-300 animate-pulse shrink-0"></span>Pending Fees Alert
              </span>
              <span className="inline-flex shrink-0 items-center whitespace-nowrap bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-xs font-bold">{pendingCount} Overdue</span>
            </div>
            <div className="font-heading text-3xl font-bold tracking-tight mt-1">₹{pendingTotal.toLocaleString('en-IN')}</div>
            <p className="font-sans text-xs opacity-80 mt-1">Outstanding fees requiring reminder action</p>
          </div>

          <div className="mt-6 space-y-2.5">
            <Button type="button" onClick={() => setCurrentTab('finance')}
              className="w-full min-h-11 bg-white text-[#35a160] py-2.5 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#f4fbf7] transition-colors shadow-sm active:scale-[0.98]">
              Manage Reminders
            </Button>
            <Button type="button" onClick={() => onOpenRecordFee()}
              className="w-full min-h-11 bg-black/20 text-white py-2 rounded-2xl font-sans text-xs font-semibold hover:bg-black/30 transition-colors border border-white/20 active:scale-[0.98]">
              + Record Fee Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <Card className="premium-card gap-0 p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#212121] dark:text-white">Recent Academy Activity</h3>
            <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Live updates on payments and logs</p>
          </div>
          <Button type="button" onClick={() => setCurrentTab('finance')}
            className="min-h-11 rounded-2xl px-2 font-sans text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 uppercase tracking-wider transition-colors">
            View All
          </Button>
        </div>

        <div className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
          {transactions.length === 0 && <p className="py-4 text-xs text-[#808080]">No activity recorded yet.</p>}
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40' : 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40'}`}>
                  <JisIcon className="text-[18px]">{tx.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</JisIcon>
                </div>
                <div>
                  <p className="font-sans text-sm font-bold text-[#212121] dark:text-white">{tx.title}</p>
                  <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">{tx.date} • {tx.category}</p>
                </div>
              </div>
              <div className={`font-sans text-sm font-bold ${tx.type === 'income' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

type ExecutiveMetricTone = 'blue' | 'green' | 'rose' | 'neutral';

function ExecutiveMetric({ label, value, tone }: { label: string; value: string; tone: ExecutiveMetricTone }) {
  const tones: Record<ExecutiveMetricTone, string> = {
    blue: 'text-[#35a160] dark:text-[#b3e6c7]',
    green: 'text-[#22c55e] dark:text-[#4ade80]',
    rose: 'text-[#ef4444] dark:text-[#f87171]',
    neutral: 'text-[#212121] dark:text-white'
  };

  return (
    <div className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0]/70 dark:bg-[#111c2b] px-2.5 sm:px-3 py-2.5 min-w-0">
      <span className="block text-xs uppercase tracking-wider font-semibold text-[#808080] dark:text-[#94a3b8] truncate">{label}</span>
      <span className={`block text-xs sm:text-sm font-bold tabular-nums mt-1 truncate ${tones[tone]}`} title={value}>{value}</span>
    </div>
  );
}

function Sparkline({ data, className, strokeColor = '#3fc073' }: { data: number[]; className?: string; strokeColor?: string }) {
  if (data.length < 2 || data.every((v) => v === data[0])) return null;
  const width = 100;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const areaPoints = `0,${height} ${points.join(' ')} ${width},${height}`;
  const gradientId = `spark-${Math.round(min)}-${Math.round(max)}-${data.length}-${strokeColor.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={`w-full h-7 ${className || ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline points={points.join(' ')} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
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
    <div className="min-w-48 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white/95 dark:bg-[#0b1422]/95 p-3.5 shadow-xl backdrop-blur-xl">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#35a160] dark:text-[#b3e6c7] mb-2.5">{label} performance</div>
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-5 text-xs">
            <span className="inline-flex items-center gap-2 text-[#575757] dark:text-[#cbd5e1]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.payload?.color || '#3fc073' }} />
              {item.name}
            </span>
            <span className={`font-bold tabular-nums ${item.name === 'Operating cost' ? 'text-[#ef4444]' : 'text-[#212121] dark:text-white'}`}>
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
    <div className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white/95 dark:bg-[#0b1422]/95 px-3 py-2.5 shadow-xl backdrop-blur-xl">
      <div className="text-xs font-bold text-[#212121] dark:text-white">{item.name}</div>
      <div className="text-xs text-[#808080] dark:text-[#94a3b8] mt-1">{count} student{count === 1 ? '' : 's'}</div>
    </div>
  );
}
