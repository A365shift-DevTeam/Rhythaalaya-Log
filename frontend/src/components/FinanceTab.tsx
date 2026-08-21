import React, { useState } from 'react';
import { Course, FeeDue, FeeFrequency, FeeStructure, FEE_FREQUENCY_LABELS, Student, Transaction } from '../types';

interface FinanceTabProps {
  students: Student[];
  transactions: Transaction[];
  outstandingDues: FeeDue[];
  courses: Course[];
  feeStructures: FeeStructure[];
  canManage: boolean;
  onOpenRecordFee: (student?: Student) => void;
  onOpenWhatsAppAll: () => void;
  onOpenAddTransaction: () => void;
  onAddFeeStructure: (payload: {
    courseId: string; name: string; amount: number; frequency: FeeFrequency; effectiveFrom: string; effectiveTo?: string | null;
  }) => Promise<void>;
}

const DUE_STATUS_STYLE: Record<string, string> = {
  Overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
  Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const FinanceTab: React.FC<FinanceTabProps> = ({
  students, transactions, outstandingDues, courses, feeStructures, canManage,
  onOpenRecordFee, onOpenWhatsAppAll, onOpenAddTransaction, onAddFeeStructure
}) => {
  const pendingStudents = students.filter((s) => s.outstandingBalance > 0);
  const totalDuePending = outstandingDues.reduce((sum, due) => sum + due.balanceAmount, 0);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const marginPercentage = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const isNetLoss = netProfit < 0;
  const marginBarWidth = Math.min(100, Math.abs(marginPercentage));

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
        <div className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
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

        <div className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
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

        <div className={`bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between border-l-4 ${isNetLoss ? 'border-l-rose-500' : 'border-l-brand-500'}`}>
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

      {/* Bottom Row: Recent Transactions & Pending Fee Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Financial Logs</h3>
            {canManage && <button onClick={onOpenAddTransaction} className="font-sans text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline uppercase tracking-wider">+ Record Entry</button>}
          </div>
          <div className="space-y-3">
            {transactions.length === 0 && <p className="text-xs text-slate-500">No transactions recorded yet.</p>}
            {transactions.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-brand-50/70 dark:bg-brand-900/40 border border-brand-200/50 dark:border-brand-700/50 hover:border-brand-300 dark:hover:border-brand-600 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'income' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'}`}>
                    <span className="material-symbols-outlined text-[18px]">{item.type === 'income' ? 'arrow_downward' : 'arrow_upward'}</span>
                  </div>
                  <div>
                    <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">{item.title}</div>
                    <div className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.date} • {item.category}</div>
                  </div>
                </div>
                <div className={`font-sans text-sm font-extrabold ${item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between">
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
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${DUE_STATUS_STYLE[due.status] ?? DUE_STATUS_STYLE.Pending}`}>{due.status}</span>
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

      {/* Fee structures (admin setup, tucked away since it's rarely touched) */}
      <FeeStructuresPanel courses={courses} feeStructures={feeStructures} canManage={canManage} onAdd={onAddFeeStructure} />
    </div>
  );
};

function FeeStructuresPanel({ courses, feeStructures, canManage, onAdd }: {
  courses: Course[]; feeStructures: FeeStructure[]; canManage: boolean;
  onAdd: (payload: { courseId: string; name: string; amount: number; frequency: FeeFrequency; effectiveFrom: string; effectiveTo?: string | null }) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FeeFrequency>('Monthly');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOpen = () => {
    setCourseId(courses[0]?.id || '');
    setName('');
    setAmount('');
    setFrequency('Monthly');
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!courseId || !name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setSubmitting(true);
    setError('');
    try {
      await onAdd({ courseId, name: name.trim(), amount: parsedAmount, frequency, effectiveFrom });
      setOpen(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the fee structure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl shadow-xs p-6">
      <button type="button" onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Fee structures</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {feeStructures.length} plan{feeStructures.length === 1 ? '' : 's'} · what each course charges and how often
          </p>
        </div>
        <span className={`material-symbols-outlined shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>expand_more</span>
      </button>

      {expanded && (
      <div className="mt-4">
      <div className="flex justify-end mb-4">
        {canManage && <button type="button" onClick={handleOpen} disabled={courses.length === 0}
          className="btn-brand min-h-10 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
          <span className="material-symbols-outlined text-[16px]">add</span>Add fee plan
        </button>}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-4">
          <select value={courseId} onChange={(event) => setCourseId(event.target.value)} required
            className="min-h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white">
            {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </select>
          <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name e.g. Standard Fee"
            className="min-h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white" />
          <input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="Amount ₹"
            className="min-h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white" />
          <select value={frequency} onChange={(event) => setFrequency(event.target.value as FeeFrequency)}
            className="min-h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white">
            {(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => <option key={f} value={f}>{FEE_FREQUENCY_LABELS[f]}</option>)}
          </select>
          <input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} required
            className="min-h-10 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white" />
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-2 justify-end">
            {error && <span className="text-xs text-rose-600 mr-auto">{error}</span>}
            <button type="button" onClick={() => setOpen(false)} className="min-h-10 px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white dark:hover:bg-slate-700">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-brand min-h-10 px-4 rounded-lg text-xs font-bold disabled:opacity-50">{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      )}

      {feeStructures.length === 0 ? (
        <p className="text-xs text-slate-500">No fee structures yet. {!canManage ? 'Ask your admin to add one.' : courses.length === 0 ? 'Create a course first.' : 'Add one to start generating dues.'}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {feeStructures.map((structure) => (
            <div key={structure.id} className={`rounded-xl border p-3.5 ${structure.isActive ? 'border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-70'}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white">{structure.courseName}</div>
                {!structure.isActive && <span className="text-[10px] font-bold text-slate-500">Superseded</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{structure.name}</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-brand-700 dark:text-brand-300 tabular-nums">₹{structure.amount.toLocaleString('en-IN')}</span>
                <span className="text-[11px] text-slate-500">/ {FEE_FREQUENCY_LABELS[structure.frequency]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
      )}
    </section>
  );
}
