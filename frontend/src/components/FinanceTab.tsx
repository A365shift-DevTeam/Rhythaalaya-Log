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
}

const DUE_STATUS_STYLE: Record<string, string> = {
  Overdue: 'bg-rose-100 text-[#ef4444] dark:bg-rose-950/80 dark:text-rose-300',
  Partial: 'bg-amber-100 text-[#f59e0b] dark:bg-amber-950/80 dark:text-amber-300',
  Pending: 'bg-[#f0f0f0] text-[#6b6b6b] dark:bg-[#111c2b] dark:text-[#cbd5e1]',
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
}) => {
  const categorical = darkMode ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const pendingStudents = students.filter((s) => s.outstandingBalance > 0);
  const totalDuePending = outstandingDues.reduce((sum, due) => sum + due.balanceAmount, 0);

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
            <button
              type="button"
              onClick={onOpenAddTransaction}
              className="btn-brand flex-1 sm:flex-initial min-h-11 px-4 py-2 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Record entry</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenRecordFee()}
            className="min-h-11 flex-1 sm:flex-initial bg-white dark:bg-[#0b1422] text-[#3fc073] dark:text-[#b3e6c7] border border-[#dbdbdb] dark:border-[#243244] px-4 py-2 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Collect Fee</span>
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs sm:text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Total Revenue
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">trending_up</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#212121] dark:text-white tracking-tight">
              ₹{totalIncome.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-xs text-[#808080] dark:text-[#94a3b8] font-medium">Year to date</p>
          </div>
        </div>

        <div className="premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs sm:text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Operating Costs
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-rose-50 text-[#ef4444] dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">trending_down</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-[#ef4444] tracking-tight tabular-nums">
              ₹{totalExpense.toLocaleString('en-IN')}
            </div>
            <p className="mt-1 text-xs text-[#808080] dark:text-[#94a3b8] font-medium">Year to date</p>
          </div>
        </div>

        <div className={`premium-card p-4 sm:p-5 md:p-6 flex flex-col justify-between border-l-4 ${isNetLoss ? 'border-l-[#ef4444]' : 'border-l-[#3fc073]'}`}>
          <div className="flex justify-between items-start">
            <span className={`font-sans text-xs sm:text-xs font-bold uppercase tracking-wider ${isNetLoss ? 'text-[#ef4444]' : 'text-[#3fc073]'}`}>
              {isNetLoss ? 'Net Loss' : 'Net Profit'}
            </span>
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center ${isNetLoss ? 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/60' : 'bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20'}`}>
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className={`font-heading text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight tabular-nums ${isNetLoss ? 'text-[#ef4444]' : 'text-[#3fc073]'}`}>
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
            <span className="shrink-0 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-2.5 sm:px-3 py-1.5 text-right">
              <span className="block text-base sm:text-lg font-bold text-[#ef4444] tabular-nums">{expenseEntries.length}</span>
              <span className="block text-xs uppercase tracking-wider font-bold text-[#808080]">Categories</span>
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
              {canManage && (
                <button
                  type="button"
                  onClick={onOpenAddTransaction}
                  className="btn-brand min-h-9 sm:min-h-10 rounded-2xl px-3.5 font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Entry</span>
                </button>
              )}
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
                        <span className="material-symbols-outlined text-[18px]">
                          {item.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
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
                      {editable && <span className="material-symbols-outlined text-[16px] text-[#9e9e9e]">edit</span>}
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
            <div className="mb-4">
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

            <div className="space-y-2.5">
              {outstandingDues.length === 0 && <p className="text-xs text-[#808080] py-6 text-center">No outstanding dues — all clear!</p>}
              {outstandingDues.slice(0, 4).map((due) => {
                const student = students.find((s) => s.id === due.studentId);
                return (
                  <div
                    key={due.id}
                    className="flex flex-col items-stretch justify-between gap-2.5 p-3 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b]/60 border border-[#dbdbdb]/70 dark:border-[#243244] sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {due.studentName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-sans text-xs font-bold text-[#212121] dark:text-white truncate">{due.studentName}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DUE_STATUS_STYLE[due.status] ?? DUE_STATUS_STYLE.Pending}`}>
                            {due.status}
                          </span>
                          <span className="font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                            {due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-[#dbdbdb]/60 dark:border-[#243244]">
                      <span className="font-sans text-xs font-bold text-[#212121] dark:text-white tabular-nums">
                        ₹{due.balanceAmount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenRecordFee(student)}
                        className="min-h-9 px-3 py-1 bg-white dark:bg-[#0b1422] text-[#3fc073] dark:text-[#b3e6c7] hover:bg-[#3fc073] hover:text-white dark:hover:bg-[#3fc073] dark:hover:text-white rounded-2xl border border-[#dbdbdb] dark:border-[#243244] text-xs font-bold transition-all active:scale-95 shadow-xs"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#dbdbdb]/60 dark:border-[#243244] flex flex-col items-start justify-between gap-2 text-xs text-[#808080] sm:flex-row sm:items-center">
            <span>Dues are generated automatically from fee structures</span>
            <button
              type="button"
              onClick={() => onOpenRecordFee()}
              className="min-h-9 rounded-2xl px-2 text-[#3fc073] dark:text-[#b3e6c7] font-bold hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors"
            >
              Manual Collect &rarr;
            </button>
          </div>
        </div>
      </div>
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
