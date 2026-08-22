import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FeeDue, Student, Transaction } from '../types';

// Validated categorical palette (dataviz skill) — same fixed order as Home's enrollment
// donut, CVD-checked against this app's light/dark card surfaces. Keep in sync.
const CATEGORICAL_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

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
  Overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
  Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const FinanceTab: React.FC<FinanceTabProps> = ({
  students, transactions, outstandingDues, canManage, darkMode,
  onOpenRecordFee, onOpenWhatsAppAll, onOpenAddTransaction, onEditTransaction
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
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    expenseCategoryTotals.set(t.category, (expenseCategoryTotals.get(t.category) || 0) + t.amount);
  });
  const expenseEntries = Array.from(expenseCategoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topExpenseEntries = expenseEntries.slice(0, 7);
  const otherExpense = expenseEntries.slice(7).reduce((sum, [, value]) => sum + value, 0);
  const expenseByCategory = [
    ...topExpenseEntries,
    ...(otherExpense ? [['Other', otherExpense] as [string, number]] : [])
  ].map(([label, value], index) => ({
    id: label, label, value,
    color: index < categorical.length ? categorical[index] : '#94a3b8'
  }));
  const topExpenseCategory = expenseEntries[0];
  const topExpenseShare = topExpenseCategory && totalExpense
    ? Math.round((topExpenseCategory[1] / totalExpense) * 100)
    : 0;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financial Ledger</h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Track tuition revenue, operating costs, and pending dues</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-heading text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">₹{totalIncome.toLocaleString('en-IN')}</div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">Year to date</p>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Operating Costs
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">trending_down</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="font-heading text-3xl md:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">₹{totalExpense.toLocaleString('en-IN')}</div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">Year to date</p>
          </div>
        </div>

        <div className={`premium-card p-6 flex flex-col justify-between border-l-4 ${isNetLoss ? 'border-l-rose-500' : 'border-l-brand-500'}`}>
          <div className="flex justify-between items-start">
            <span className={`font-sans text-xs font-bold uppercase tracking-wider ${isNetLoss ? 'text-rose-600 dark:text-rose-400' : 'text-brand-500 dark:text-brand-400'}`}>
              {isNetLoss ? 'Net Loss' : 'Net Profit'}
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isNetLoss ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-brand-50 text-brand-500 dark:bg-brand-900/60 dark:text-brand-400'}`}>
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-4">
            <div className={`font-heading text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums ${isNetLoss ? 'text-rose-600 dark:text-rose-400' : 'text-brand-600 dark:text-brand-400'}`}>
              {isNetLoss ? '-' : ''}₹{Math.abs(netProfit).toLocaleString('en-IN')}
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div className={`${isNetLoss ? 'bg-rose-500' : 'bg-brand-500'} h-2 rounded-full transition-all`} style={{ width: `${marginBarWidth}%` }}></div>
              </div>
              <div className="font-sans text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex justify-between">
                <span>Profit Margin</span>
                <span className={isNetLoss ? 'text-rose-600 dark:text-rose-400' : 'text-brand-500 dark:text-brand-400'}>{marginPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spending by category */}
      {expenseByCategory.length > 0 && (
        <article className="premium-card rounded-3xl overflow-hidden">
          <div className="p-5 md:p-7 pb-2 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Cost breakdown</span>
              <h4 className="font-heading text-xl font-extrabold text-slate-950 dark:text-white mt-2">Spending by category</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Where operating costs are going, year to date</p>
            </div>
            <span className="shrink-0 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 px-3 py-2 text-right">
              <span className="block text-lg font-black text-rose-700 dark:text-rose-300 tabular-nums">{expenseEntries.length}</span>
              <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">Categories</span>
            </span>
          </div>

          <div className="px-4 md:px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(190px,1fr)_minmax(170px,0.9fr)] items-center">
              <div className="relative h-[220px] min-w-0" role="img" aria-label={`Spending breakdown across ${expenseEntries.length} categories. ${topExpenseCategory?.[0] || 'No category'} is the largest at ${topExpenseShare} percent.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CategoryTooltip />} />
                    <Pie data={expenseByCategory} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius="68%" outerRadius="91%" paddingAngle={4} cornerRadius={7} stroke="none">
                      {expenseByCategory.map((item) => <Cell key={item.id} fill={item.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-950 dark:text-white tabular-nums">₹{totalExpense >= 1000 ? `${Math.round(totalExpense / 1000)}k` : totalExpense}</span>
                  <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-slate-400 mt-1">Total spend</span>
                </div>
              </div>

              <div className="space-y-2.5 px-2" role="table" aria-label="Spending by category">
                {expenseByCategory.map((item) => (
                  <div key={item.id} role="row" className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2">
                    <span role="cell" className="min-w-0 inline-flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate" title={item.label}>{item.label}</span>
                    </span>
                    <span role="cell" className="text-right">
                      <span className="block font-extrabold tabular-nums text-xs text-slate-950 dark:text-white">₹{item.value.toLocaleString('en-IN')}</span>
                      <span className="block text-[9px] text-slate-400 tabular-nums">{totalExpense ? Math.round(item.value / totalExpense * 100) : 0}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      )}

      {/* Bottom Row: Recent Transactions & Pending Fee Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="premium-card p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Financial Logs</h3>
            {canManage && <button type="button" onClick={onOpenAddTransaction}
              className="btn-brand min-h-10 rounded-xl px-3 font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Record entry</span>
            </button>}
          </div>
          <div className="space-y-3">
            {transactions.length === 0 && <p className="text-xs text-slate-500">No transactions recorded yet.</p>}
            {transactions.slice(0, 5).map((item) => {
              const editable = canManage && !item.feePaymentId;
              return (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl bg-brand-50/70 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-700/50 hover:border-brand-300 dark:hover:border-brand-600 transition-all ${editable ? 'cursor-pointer' : ''}`}
                  role={editable ? 'button' : undefined} tabIndex={editable ? 0 : undefined}
                  onClick={editable ? () => onEditTransaction(item) : undefined}
                  onKeyDown={editable ? (event) => { if (event.key === 'Enter') onEditTransaction(item); } : undefined}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                      <span className="material-symbols-outlined text-[18px]">{item.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-bold text-slate-900 dark:text-white truncate">{item.title}</div>
                      <div className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.date} • {item.category}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className={`font-sans text-sm font-extrabold ${item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                    </div>
                    {editable && <span className="material-symbols-outlined text-[16px] text-slate-400">edit</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-5 gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Dues & Collections</h3>
                {outstandingDues.length > 0 ? (
                  <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-extrabold text-rose-600 dark:text-rose-400">₹{totalDuePending.toLocaleString('en-IN')}</span> pending
                    from {pendingStudents.length} {pendingStudents.length === 1 ? 'student' : 'students'}
                  </p>
                ) : (
                  <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1">Nothing pending right now</p>
                )}
              </div>
              <button type="button" onClick={onOpenWhatsAppAll} disabled={pendingStudents.length === 0}
                className="min-h-11 shrink-0 flex items-center gap-1.5 bg-emerald-700 text-white px-3.5 py-2 rounded-xl transition-all font-sans text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">forum</span><span>WhatsApp All</span>
              </button>
            </div>

            <div className="space-y-3">
              {outstandingDues.length === 0 && <p className="text-xs text-slate-500">No outstanding dues — nice work!</p>}
              {outstandingDues.slice(0, 4).map((due) => {
                const student = students.find((s) => s.id === due.studentId);
                return (
                  <div key={due.id} className="flex flex-col items-stretch justify-between gap-3 p-3 rounded-xl bg-brand-50/70 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-700/50 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs shrink-0">{due.studentName.charAt(0)}</div>
                      <div className="min-w-0">
                        <div className="font-sans text-xs font-bold text-slate-900 dark:text-white truncate">{due.studentName}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DUE_STATUS_STYLE[due.status] ?? DUE_STATUS_STYLE.Pending}`}>{due.status}</span>
                          <span className="font-sans text-[11px] text-slate-500 dark:text-slate-400">{due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="font-sans text-xs font-extrabold text-slate-900 dark:text-white">₹{due.balanceAmount.toLocaleString('en-IN')}</span>
                      <button type="button" onClick={() => onOpenRecordFee(student)}
                        className="min-h-11 px-3.5 py-2 bg-white dark:bg-brand-900/60 text-brand-600 dark:text-brand-300 hover:bg-brand-500 hover:text-white rounded-xl border border-brand-200 dark:border-brand-700 text-xs font-bold transition-all">
                        Collect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col items-start justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center">
            <span>Dues are generated automatically from fee structures</span>
            <button type="button" onClick={() => onOpenRecordFee()} className="min-h-11 rounded-xl px-2 text-brand-500 dark:text-brand-400 font-bold hover:bg-brand-50 dark:hover:bg-brand-900/50">
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
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</div>
      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">₹{amount.toLocaleString('en-IN')}</div>
    </div>
  );
}
