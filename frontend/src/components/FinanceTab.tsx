import React, { useState } from 'react';
import {
  Course,
  FeeDue,
  FeeFrequency,
  FeeStructure,
  FEE_FREQUENCY_LABELS,
  Student,
  Transaction
} from '../types';

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
    courseId: string;
    name: string;
    amount: number;
    frequency: FeeFrequency;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }) => Promise<void>;
}

const rupees = (value: number) => {
  const amount = Number(value || 0);
  return `${amount < 0 ? '−' : ''}₹${Math.abs(amount).toLocaleString('en-IN')}`;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric'
});

export const FinanceTab: React.FC<FinanceTabProps> = ({
  students,
  transactions,
  outstandingDues,
  courses,
  feeStructures,
  canManage,
  onOpenRecordFee,
  onOpenWhatsAppAll,
  onOpenAddTransaction,
  onAddFeeStructure
}) => {
  const owingStudents = students.filter((student) => student.outstandingBalance > 0);
  const collected = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const spent = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const net = collected - spent;
  const outstanding = outstandingDues.reduce((sum, due) => sum + due.balanceAmount, 0);
  const overdue = outstandingDues.filter((due) => due.status === 'Overdue');

  return (
    <div className="space-y-5 pb-8 md:space-y-6">
      <header>
        <h1 className="display-lg">Fees</h1>
        <p className="label mt-1">Collect dues, keep the ledger, and set what each course charges.</p>
      </header>

      <section aria-label="Money summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Collected" value={rupees(collected)} note="Year to date" />
        <Stat label="Spent" value={rupees(spent)} note="Year to date" />
        <Stat label="Net" value={rupees(net)} note="Year to date" tone={net < 0 ? 'due' : 'settled'} />
        <Stat
          label="Outstanding"
          value={rupees(outstanding)}
          note={overdue.length ? `${overdue.length} overdue` : 'None overdue'}
          tone={outstanding > 0 ? 'due' : 'settled'}
        />
      </section>

      {/* Collecting dues is the daily job, so it leads the screen. */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-2.5 border-b border-line px-3 py-2.5 md:px-4">
          <div className="min-w-0">
            <h2 className="title">Dues to collect</h2>
            <p className="label-xs mt-0.5">
              {outstandingDues.length
                ? <><span className="num">{outstandingDues.length}</span> due{outstandingDues.length === 1 ? '' : 's'} across <span className="num">{owingStudents.length}</span> student{owingStudents.length === 1 ? '' : 's'}</>
                : 'Everyone is settled'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenWhatsAppAll}
              disabled={owingStudents.length === 0}
              className="btn btn-secondary btn-sm"
            >
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">chat</span>
              Remind all
            </button>
            <button type="button" onClick={() => onOpenRecordFee()} className="btn btn-primary btn-sm">
              Record fee
            </button>
          </div>
        </div>

        {outstandingDues.length === 0 ? (
          <div className="p-3">
            <div className="empty">
              <span className="material-symbols-outlined text-[26px] text-leaf" aria-hidden="true">task_alt</span>
              <p className="text-[13px] font-semibold text-ink">Nothing to collect</p>
              <p className="label max-w-72">Every due on the books has been paid.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line-2">
            {outstandingDues.map((due) => {
              const student = students.find((item) => item.id === due.studentId);
              return (
                <li key={due.id} className="flex items-center gap-3 px-3 py-2.5 md:px-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{due.studentName}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {due.courseName} · due <span className="num">{formatDate(due.dueDate)}</span>
                    </span>
                  </span>
                  {due.status === 'Overdue' && <span className="chip chip-due shrink-0">Overdue</span>}
                  {due.status === 'Partial' && <span className="chip chip-neutral shrink-0">Part paid</span>}
                  <span className="num shrink-0 text-[13px] font-semibold text-ink">
                    {rupees(due.balanceAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenRecordFee(student)}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    Collect
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-start justify-between gap-2.5 border-b border-line px-3 py-2.5 md:px-4">
          <div>
            <h2 className="title">Ledger</h2>
            <p className="label-xs mt-0.5">Every payment in and cost out</p>
          </div>
          {canManage && (
            <button type="button" onClick={onOpenAddTransaction} className="btn btn-ghost btn-sm text-leaf">
              <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
              Record entry
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="p-3">
            <div className="empty">
              <p className="text-[13px] font-semibold text-ink">The ledger is empty</p>
              <p className="label max-w-72">Record a fee payment or a cost and it lands here.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-line-2">
            {transactions.slice(0, 12).map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5 md:px-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    <span className="num">{item.date}</span> · {item.category}
                  </span>
                </span>
                <span
                  className={`num shrink-0 text-[13px] font-semibold ${
                    item.type === 'income' ? 'text-leaf-strong' : 'text-ink-2'
                  }`}
                >
                  {item.type === 'income' ? '+' : '−'}{rupees(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeeStructuresPanel
        courses={courses}
        feeStructures={feeStructures}
        canManage={canManage}
        onAdd={onAddFeeStructure}
      />
    </div>
  );
};

function Stat({
  label,
  value,
  note,
  tone = 'plain'
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'plain' | 'due' | 'settled';
}) {
  return (
    <div className="card p-3.5 md:p-4">
      <p className="label">{label}</p>
      <p
        className={`num-lg mt-1.5 truncate ${
          tone === 'due' ? 'text-kumkum' : tone === 'settled' ? 'text-leaf-strong' : 'text-ink'
        }`}
        title={value}
      >
        {value}
      </p>
      <p className="label-xs mt-1 truncate">{note}</p>
    </div>
  );
}

function FeeStructuresPanel({
  courses,
  feeStructures,
  canManage,
  onAdd
}: {
  courses: Course[];
  feeStructures: FeeStructure[];
  canManage: boolean;
  onAdd: (payload: {
    courseId: string;
    name: string;
    amount: number;
    frequency: FeeFrequency;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<FeeFrequency>('Monthly');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().split('T')[0]);
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
      setError(requestError instanceof Error ? requestError.message : 'The fee could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  const active = feeStructures.filter((structure) => structure.isActive);
  const superseded = feeStructures.filter((structure) => !structure.isActive);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-2.5 border-b border-line px-3 py-2.5 md:px-4">
        <div>
          <h2 className="title">What each course charges</h2>
          <p className="label-xs mt-0.5">Dues are raised from these automatically</p>
        </div>
        {canManage && !open && (
          <button
            type="button"
            onClick={handleOpen}
            disabled={courses.length === 0}
            className="btn btn-ghost btn-sm text-leaf"
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
            Add fee
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="border-b border-line-2 bg-surface-2 p-3 md:p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="fee-course" className="label mb-1.5 block font-semibold text-ink">Course</label>
              <select
                id="fee-course"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                required
                className="field"
              >
                {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="fee-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
              <input
                id="fee-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Standard monthly"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="fee-amount" className="label mb-1.5 block font-semibold text-ink">Amount (₹)</label>
              <input
                id="fee-amount"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
                placeholder="1200"
                className="field num"
              />
            </div>
            <div>
              <label htmlFor="fee-frequency" className="label mb-1.5 block font-semibold text-ink">Charged</label>
              <select
                id="fee-frequency"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as FeeFrequency)}
                className="field"
              >
                {(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((key) => (
                  <option key={key} value={key}>{FEE_FREQUENCY_LABELS[key]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fee-from" className="label mb-1.5 block font-semibold text-ink">Starts</label>
              <input
                id="fee-from"
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                required
                className="field num"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            {error && <p role="alert" className="mr-auto text-[12px] font-medium text-kumkum">{error}</p>}
            <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Saving…' : 'Save fee'}
            </button>
          </div>
        </form>
      )}

      {feeStructures.length === 0 ? (
        <div className="p-3">
          <div className="empty">
            <p className="text-[13px] font-semibold text-ink">No fees set up</p>
            <p className="label max-w-80">
              {!canManage
                ? 'Your admin sets what each course charges.'
                : courses.length === 0
                  ? 'Add a course first, then set what it charges.'
                  : 'Set a fee for a course and dues start being raised.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 md:p-4">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((structure) => (
              <FeeCard key={structure.id} structure={structure} />
            ))}
          </div>

          {superseded.length > 0 && (
            <details className="mt-3">
              <summary className="label cursor-pointer select-none py-1">
                Show {superseded.length} replaced fee{superseded.length === 1 ? '' : 's'}
              </summary>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {superseded.map((structure) => (
                  <FeeCard key={structure.id} structure={structure} replaced />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function FeeCard({ structure, replaced = false }: { structure: FeeStructure; replaced?: boolean; key?: React.Key }) {
  return (
    <div className={`card-inset p-3 ${replaced ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-medium text-ink" title={structure.courseName}>
          {structure.courseName}
        </p>
        {replaced && <span className="chip chip-neutral shrink-0">Replaced</span>}
      </div>
      <p className="label-xs mt-0.5 truncate">{structure.name}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="num text-[17px] font-semibold text-ink">
          ₹{structure.amount.toLocaleString('en-IN')}
        </span>
        <span className="label-xs">{FEE_FREQUENCY_LABELS[structure.frequency].toLowerCase()}</span>
      </p>
    </div>
  );
}
