import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import { MobileSpeedDial } from './MobileSpeedDial';
import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FeeDue, Student, Transaction } from '../types';

const CATEGORICAL_LIGHT = ['#3fc073', '#6bd194', '#22c55e', '#f59e0b', '#b3e6c7', '#2b824e', '#a855f7', '#ec4899'];
const CATEGORICAL_DARK = ['#6bd194', '#b3e6c7', '#4ade80', '#fbbf24', '#cbecd8', '#3fc073', '#c084fc', '#f472b6'];

interface FinanceTabProps {
  students: Student[];
  transactions: Transaction[];
  outstandingDues: FeeDue[];
  canManage: boolean;
  darkMode: boolean;
  onOpenRecordFee: (student?: Student) => void;
  onOpenWhatsAppAll: () => void;
  onOpenAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onAdjustDue: (due: FeeDue) => void;
  onOpenAddCharge: () => void;
}

const DUE_STATUS_STYLE: Record<string, string> = {
  Overdue: 'bg-rose-100 text-[#ef4444] dark:bg-rose-950/80 dark:text-rose-300',
  Partial: 'bg-amber-100 text-[#f59e0b] dark:bg-amber-950/80 dark:text-amber-300',
  Pending: 'bg-[#f0f0f0] text-[#6b6b6b] dark:bg-[#111c2b] dark:text-[#cbd5e1]',
  Upcoming: 'bg-sky-100 text-[#0284c7] dark:bg-sky-950/80 dark:text-sky-300',
};

export const FinanceTab: React.FC<FinanceTabProps> = ({
  students,
  transactions,
  outstandingDues,
  canManage,
  darkMode,
  onOpenRecordFee,
  onOpenWhatsAppAll: _onOpenWhatsAppAll,
  onOpenAddTransaction,
  onEditTransaction,
  onAdjustDue,
  onOpenAddCharge,
}) => {
  const categorical = darkMode ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const pendingStudents = students.filter((s) => s.outstandingBalance > 0);
  const [expandedStudentId, setExpandedStudentId] = React.useState<string | null>(null);
  // Upcoming dues are visible but not yet payable, so they don't count as pending money
  const totalDuePending = outstandingDues
    .filter((due) => due.status !== 'Upcoming')
    .reduce((sum, due) => sum + due.balanceAmount, 0);

  // One row per student in Dues & Collections; their individual dues expand on demand.
  const STATUS_SEVERITY: Record<string, number> = { Overdue: 0, Partial: 1, Pending: 2, Upcoming: 3 };
  const groupMap = new Map<string, { studentId: string; studentName: string; dues: FeeDue[] }>();
  for (const due of outstandingDues) {
    const group = groupMap.get(due.studentId) ?? { studentId: due.studentId, studentName: due.studentName, dues: [] };
    group.dues.push(due);
    groupMap.set(due.studentId, group);
  }
  const duesByStudent = Array.from(groupMap.values()).map((group) => {
    const sorted = group.dues.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return {
      ...group,
      dues: sorted,
      total: sorted.reduce((sum, due) => sum + (due.status === 'Upcoming' ? 0 : due.balanceAmount), 0),
      worstStatus: sorted.reduce((worst, due) =>
        (STATUS_SEVERITY[due.status] ?? 9) < (STATUS_SEVERITY[worst] ?? 9) ? due.status : worst, sorted[0].status),
    };
  }).sort((a, b) => b.total - a.total);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const marginPercentage = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const isNetLoss = netProfit < 0;
  const marginBarWidth = Math.min(100, Math.abs(marginPercentage));

  const expenseCategoryTotals = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseCategoryTotals.set(t.category, (expenseCategoryTotals.get(t.category) || 0) + t.amount);
    });
  const expenseEntries = Array.from(expenseCategoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topExpenseEntries = expenseEntries.slice(0, 7);
  const otherExpense = expenseEntries.slice(7).reduce((sum, [, value]) => sum + value, 0);
  const expenseByCategory = [
    ...topExpenseEntries,
    ...(otherExpense ? ([['Other', otherExpense]] as [string, number][]) : []),
  ].map(([label, value], index) => ({
    id: label,
    label,
    value,
    color: index < categorical.length ? categorical[index] : '#9e9e9e',
  }));
  const topExpenseCategory = expenseEntries[0];
  const topExpenseShare = topExpenseCategory && totalExpense ? Math.round((topExpenseCategory[1] / totalExpense) * 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
            Financial Ledger
          </h2>
          <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-0.5">
            Track tuition revenue, operating costs, and pending dues
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canManage && (
            <Button
              type="button"
              onClick={onOpenAddTransaction}
              className="btn-brand flex-1 sm:flex-initial min-h-11 px-4 py-2 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider hidden md:flex items-center justify-center gap-1.5 active:scale-95"
            >
              <JisIcon className="text-[18px]">add</JisIcon>
              <span>Record entry</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onOpenRecordFee()}
            className="min-h-11 flex-1 sm:flex-initial bg-white dark:bg-[#0b1422] text-[#3fc073] dark:text-[#b3e6c7] border border-[#dbdbdb] dark:border-[#243244] px-4 py-2 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors hidden md:flex items-center justify-center gap-1.5 active:scale-95"
          >
            <JisIcon className="text-[18px]">payments</JisIcon>
            <span>Collect Fee</span>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-gradient-to-r from-[#22c55e]/10 via-[#22c55e]/[0.03] to-transparent">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs sm:text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Total Revenue
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <JisIcon className="text-[18px] sm:text-[20px]">trending_up</JisIcon>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#22c55e] tracking-tight tabular-nums">
              ₹{totalIncome.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-xs text-[#808080] dark:text-[#94a3b8] font-medium">Year to date</p>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-gradient-to-r from-[#ef4444]/10 via-[#ef4444]/[0.03] to-transparent">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs sm:text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Operating Costs
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-50 text-[#ef4444] dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
              <JisIcon className="text-[18px] sm:text-[20px]">trending_down</JisIcon>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-heading text-2xl sm:text-3xl font-bold text-[#ef4444] tracking-tight tabular-nums">
              ₹{totalExpense.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-xs text-[#808080] dark:text-[#94a3b8] font-medium">Year to date</p>
          </div>
        </div>

        <div className={`premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-gradient-to-r ${isNetLoss ? 'from-[#ef4444]/10 via-[#ef4444]/[0.03]' : 'from-[#3fc073]/10 via-[#3fc073]/[0.03]'} to-transparent`}>
          <div className="flex justify-between items-start">
            <span className={`font-sans text-xs sm:text-xs font-bold uppercase tracking-wider ${isNetLoss ? 'text-[#ef4444]' : 'text-[#3fc073]'} flex items-center gap-2`}>
              <span className={`w-2 h-2 rounded-full ${isNetLoss ? 'bg-[#ef4444]' : 'bg-[#3fc073]'}`} />
              {isNetLoss ? 'Net Loss' : 'Net Profit'}
            </span>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center ${isNetLoss ? 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/60' : 'bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20'}`}>
              <JisIcon className="text-[18px] sm:text-[20px]">account_balance_wallet</JisIcon>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className={`font-heading text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${isNetLoss ? 'text-[#ef4444]' : 'text-[#3fc073]'}`}>
              {isNetLoss ? '-' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="w-full bg-[#f0f0f0] dark:bg-[#111c2b] rounded-full h-2 overflow-hidden">
                <div className={`${isNetLoss ? 'bg-[#ef4444]' : 'bg-[#3fc073]'} h-2 rounded-full transition-all`} style={{ width: `${marginBarWidth}%` }} />
              </div>
              <div className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] font-semibold flex justify-between">
                <span>Profit Margin</span>
                <span className={isNetLoss ? 'text-[#ef4444]' : 'text-[#3fc073]'}>{marginPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spending by category */}
      {expenseByCategory.length > 0 && (
        <article className="premium-card rounded-3xl overflow-hidden">
          <div className="p-4 sm:p-5 md:p-6 pb-2 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#3fc073]">Cost breakdown</span>
              <h4 className="font-heading text-lg sm:text-xl font-bold text-[#212121] dark:text-white mt-1">Spending by category</h4>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Where operating costs are going, year to date</p>
            </div>
            <span className="shrink-0 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-3 py-1.5 inline-flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-bold text-[#ef4444] tabular-nums">{expenseEntries.length}</span>
              <span className="text-xs uppercase tracking-wider font-bold text-[#808080] dark:text-[#94a3b8]">
                {expenseEntries.length === 1 ? 'Category' : 'Categories'}
              </span>
            </span>
          </div>

          <div className="px-3 sm:px-6 pb-5 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] items-center gap-4">
              <div
                className="relative h-[200px] sm:h-[220px] min-w-0"
                role="img"
                aria-label={`Spending breakdown across ${expenseEntries.length} categories. ${topExpenseCategory?.[0] || 'No category'} is the largest at ${topExpenseShare} percent.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CategoryTooltip />} />
                    <Pie data={expenseByCategory} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="68%" outerRadius="91%" paddingAngle={4} cornerRadius={7} stroke="none">
                      {expenseByCategory.map((item) => (
                        <Cell key={item.id} fill={item.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-[#212121] dark:text-white tabular-nums">
                    ₹{totalExpense >= 1000 ? `${Math.round(totalExpense / 1000)}k` : totalExpense}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] font-bold text-[#9e9e9e] mt-0.5">Total spend</span>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2 px-1 sm:px-2" role="table" aria-label="Spending by category">
                {expenseByCategory.map((item) => (
                  <div key={item.id} role="row" className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                    <span role="cell" className="min-w-0 inline-flex items-center gap-2 text-xs text-[#575757] dark:text-[#cbd5e1]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate" title={item.label}>{item.label}</span>
                    </span>
                    <span role="cell" className="text-right shrink-0">
                      <span className="block font-bold tabular-nums text-xs text-[#212121] dark:text-white">₹{item.value.toLocaleString('en-IN')}</span>
                      <span className="block text-xs text-[#9e9e9e] tabular-nums">{totalExpense ? Math.round((item.value / totalExpense) * 100) : 0}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Bottom Row: Recent Transactions & Pending Fee Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Financial Logs */}
        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">Financial Logs</h3>
                <p className="text-xs text-[#808080] dark:text-[#94a3b8]">Recent cash inflows and expenses</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {transactions.length === 0 && <p className="text-xs text-[#808080] py-6 text-center">No transactions recorded yet.</p>}
              {transactions.slice(0, 5).map((item) => {
                const editable = canManage && !item.feePaymentId;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-3 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] hover:border-[#3fc073]/40 dark:hover:border-[#3fc073]/40 transition-all ${
                      editable ? 'cursor-pointer' : ''
                    }`}
                    role={editable ? 'button' : undefined}
                    tabIndex={editable ? 0 : undefined}
                    onClick={editable ? () => onEditTransaction(item) : undefined}
                    onKeyDown={editable ? (event) => { if (event.key === 'Enter') onEditTransaction(item); } : undefined}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                          item.type === 'income'
                            ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60'
                            : 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/60'
                        }`}
                      >
                        <JisIcon className="text-[18px]">
                          {item.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                        </JisIcon>
                      </div>
                      <div className="min-w-0">
                        <div className="font-sans text-xs sm:text-sm font-bold text-[#212121] dark:text-white truncate">{item.title}</div>
                        <div className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5 truncate">{item.date} • {item.category}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-2">
                      <div
                        className={`font-sans text-xs sm:text-sm font-bold tabular-nums ${
                          item.type === 'income' ? 'text-[#22c55e]' : 'text-[#ef4444]'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                      </div>
                      {editable && <JisIcon className="text-[16px] text-[#9e9e9e]">edit</JisIcon>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dues & Collections */}
        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">Dues & Collections</h3>
                {outstandingDues.length > 0 ? (
                  <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">
                    <span className="font-bold text-[#ef4444]">₹{totalDuePending.toLocaleString('en-IN')}</span> pending
                    from {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'}
                  </p>
                ) : (
                  <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Nothing pending right now</p>
                )}
              </div>
              {canManage && (
                <Button
                  type="button"
                  onClick={onOpenAddCharge}
                  title="Add a one-off charge like a costume or exam fee"
                  className="min-h-9 sm:min-h-10 shrink-0 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-3.5 font-sans text-xs font-bold uppercase tracking-wider text-[#3fc073] dark:text-[#b3e6c7] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors hidden md:inline-flex items-center gap-1 active:scale-95"
                >
                  <JisIcon className="text-[16px]">post_add</JisIcon>
                  <span>Charge</span>
                </Button>
              )}
            </div>

            <div className="space-y-2.5">
              {duesByStudent.length === 0 && <p className="text-xs text-[#808080] py-6 text-center">No outstanding dues — all clear!</p>}
              {duesByStudent.slice(0, 4).map((group) => {
                const student = students.find((s) => s.id === group.studentId);
                const expanded = expandedStudentId === group.studentId;
                return (
                  <div
                    key={group.studentId}
                    className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] overflow-hidden"
                  >
                    <div className="flex flex-col items-stretch justify-between gap-2.5 p-3 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => setExpandedStudentId(expanded ? null : group.studentId)}
                        aria-expanded={expanded}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                      >
                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {group.studentName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-sans text-xs font-bold text-[#212121] dark:text-white truncate">{group.studentName}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DUE_STATUS_STYLE[group.worstStatus] ?? DUE_STATUS_STYLE.Pending}`}>
                              {group.worstStatus}
                            </span>
                            <span className="font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                              {group.dues.length} {group.dues.length === 1 ? 'due' : 'dues'} · oldest {new Date(group.dues[0].dueDate).toLocaleDateString('en-IN')}
                            </span>
                            <JisIcon className="text-[16px] text-[#9e9e9e]">{expanded ? 'expand_less' : 'expand_more'}</JisIcon>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center justify-between gap-3 sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-[#dbdbdb]/60 dark:border-[#243244]">
                        <span className="font-sans text-xs font-bold text-[#212121] dark:text-white tabular-nums">
                          ₹{group.total.toLocaleString('en-IN')}
                        </span>
                        <Button
                          type="button"
                          onClick={() => onOpenRecordFee(student)}
                          className="min-h-9 px-3 py-1 bg-white dark:bg-[#0b1422] text-[#3fc073] dark:text-[#b3e6c7] hover:bg-[#3fc073] hover:text-white dark:hover:bg-[#3fc073] dark:hover:text-white rounded-2xl border border-[#dbdbdb] dark:border-[#243244] text-xs font-bold transition-all active:scale-95 shadow-xs"
                        >
                          Collect
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-[#dbdbdb]/60 dark:border-[#243244] divide-y divide-[#dbdbdb]/40 dark:divide-[#243244]/60">
                        {group.dues.map((due) => (
                          <div key={due.id} className="flex items-center justify-between gap-3 px-3 py-2 pl-[3.25rem]">
                            <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DUE_STATUS_STYLE[due.status] ?? DUE_STATUS_STYLE.Pending}`}>
                                {due.status}
                              </span>
                              <span className="font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                                {due.title || due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="font-sans text-xs font-bold text-[#212121] dark:text-white tabular-nums">
                                ₹{due.balanceAmount.toLocaleString('en-IN')}
                              </span>
                              {canManage && (
                                <Button
                                  type="button"
                                  onClick={() => onAdjustDue(due)}
                                  aria-label={`Adjust due for ${due.studentName}`}
                                  title="Discount, waive, or cancel this due"
                                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-[#808080] hover:text-[#3fc073] hover:border-[#3fc073]/40 transition-all active:scale-95"
                                >
                                  <JisIcon className="text-[15px]">tune</JisIcon>
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#dbdbdb]/60 dark:border-[#243244] text-xs text-[#808080]">
            <span>Dues are generated automatically from fee structures — use Collect Fee above to record a manual payment</span>
          </div>
        </div>
      </div>

      {/* Mobile quick actions: header + charge buttons live behind one floating button */}
      <MobileSpeedDial
        openLabel="Collect fee, record entry or add charge"
        actions={[
          ...(canManage ? [
            { label: 'Add charge', icon: 'post_add', tone: 'from-[#f5b041] to-[#f59e0b] shadow-[#f59e0b]/35', onClick: onOpenAddCharge },
            { label: 'Record entry', icon: 'receipt_long', tone: 'from-[#4fb3dc] to-[#379fc8] shadow-[#379fc8]/35', onClick: onOpenAddTransaction },
          ] : []),
          { label: 'Collect fee', icon: 'payments', tone: 'from-[#3fc073] to-[#35a160] shadow-[#3fc073]/35', onClick: () => onOpenRecordFee() },
        ]}
      />
    </div>
  );
};

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: readonly { name?: string; value?: number | string }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const amount = Number(item.value || 0);

  return (
    <div className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white/95 dark:bg-[#0b1422]/95 px-3 py-2 shadow-xl backdrop-blur-xl">
      <div className="text-xs font-bold text-[#212121] dark:text-white">{item.name}</div>
      <div className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">₹{amount.toLocaleString('en-IN')}</div>
    </div>
  );
}
