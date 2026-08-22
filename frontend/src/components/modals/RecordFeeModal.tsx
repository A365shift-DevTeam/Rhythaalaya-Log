import React, { useEffect, useMemo, useState } from 'react';
import { FeeDue, FeePayment, PAYMENT_METHOD_LABELS, PaymentMethod, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface RecordFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  token: string;
  onRecordFee: (payload: {
    studentId: string; feeDueId: string | null; amount: number; method: PaymentMethod; remarks?: string;
  }) => Promise<FeePayment>;
}

const METHODS: { value: PaymentMethod; icon: string }[] = [
  { value: 'Cash', icon: 'payments' },
  { value: 'Upi', icon: 'qr_code_2' },
  { value: 'Card', icon: 'credit_card' },
  { value: 'BankTransfer', icon: 'account_balance' },
  { value: 'Cheque', icon: 'receipt_long' },
  { value: 'Other', icon: 'more_horiz' },
];

const STATUS_STYLE: Record<string, string> = {
  Overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
  Pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({ isOpen, onClose, students, initialStudent, token, onRecordFee }) => {
  const eligibleStudents = useMemo(() => students.filter((student) => student.isActive), [students]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [feeDueId, setFeeDueId] = useState<string>('advance');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const initial = eligibleStudents.find((student) => student.id === initialStudent?.id);
    setSelectedStudentId(initial?.id ?? '');
    setPickerOpen(!initial);
    setQuery('');
    setMethod('Cash');
    setRemarks('');
    setError('');
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialStudent?.id]);

  useEffect(() => {
    if (!isOpen || !selectedStudentId) { setDues([]); return; }
    let ignore = false;
    setLoadingDues(true);
    api.studentDues(token, selectedStudentId)
      .then((rows) => {
        if (ignore) return;
        const outstanding = rows
          .filter((due) => due.status !== 'Paid' && due.status !== 'Cancelled')
          .sort((a, b) => (a.status === 'Overdue' ? -1 : b.status === 'Overdue' ? 1 : 0) || a.dueDate.localeCompare(b.dueDate));
        setDues(outstanding);
        const firstDue = outstanding[0];
        setFeeDueId(firstDue ? firstDue.id : 'advance');
        setAmount(firstDue ? String(firstDue.balanceAmount) : '');
      })
      .catch((requestError) => { if (!ignore) setError(requestError instanceof Error ? requestError.message : 'Unable to load fee dues.'); })
      .finally(() => { if (!ignore) setLoadingDues(false); });
    return () => { ignore = true; };
  }, [isOpen, selectedStudentId, token]);

  if (!isOpen) return null;

  const selectedStudent = eligibleStudents.find((student) => student.id === selectedStudentId);
  const selectedDue = dues.find((due) => due.id === feeDueId);
  const totalOutstanding = dues.reduce((sum, due) => sum + due.balanceAmount, 0);

  const filteredStudents = query.trim()
    ? eligibleStudents.filter((student) => {
        const term = query.trim().toLowerCase();
        return student.name.toLowerCase().includes(term) || student.studentNumber.toLowerCase().includes(term);
      })
    : eligibleStudents;

  const handlePickStudent = (id: string) => {
    setSelectedStudentId(id);
    setPickerOpen(false);
    setQuery('');
  };

  const handleDueChange = (id: string) => {
    setFeeDueId(id);
    const due = dues.find((item) => item.id === id);
    setAmount(due ? String(due.balanceAmount) : '');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paymentAmount = Number(amount);
    if (!selectedStudent) { setError('Select a student.'); return; }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) { setError('Enter a valid payment amount.'); return; }
    if (selectedDue && paymentAmount > selectedDue.balanceAmount) { setError('Payment cannot exceed this due\'s remaining balance.'); return; }

    setSubmitting(true);
    setError('');
    try {
      await onRecordFee({
        studentId: selectedStudent.id, feeDueId: feeDueId === 'advance' ? null : feeDueId,
        amount: paymentAmount, method, remarks: remarks.trim() || undefined
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Payment could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="record-fee-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="record-fee-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-500">payments</span>
            <span>Collect fee</span>
          </h3>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close fee payment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 font-sans text-sm">
          {/* Step 1: student */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <StepBadge n={1} /> Who's paying?
            </span>

            {selectedStudent && !pickerOpen ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-800 dark:bg-brand-900/40">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900 dark:text-white">{selectedStudent.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{selectedStudent.studentNumber}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setPickerOpen(true)} disabled={submitting}
                  className="min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold text-brand-600 hover:bg-white dark:text-brand-300 dark:hover:bg-slate-800">
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                  <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus={eligibleStudents.length > 6}
                    placeholder="Search by name or student ID"
                    className="w-full min-h-11 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1 dark:border-slate-800">
                  {eligibleStudents.length === 0 && <p className="p-2 text-xs text-slate-500">No active students.</p>}
                  {eligibleStudents.length > 0 && filteredStudents.length === 0 && <p className="p-2 text-xs text-slate-500">No students match "{query}".</p>}
                  {filteredStudents.map((student) => (
                    <button key={student.id} type="button" onClick={() => handlePickStudent(student.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-brand-50 dark:hover:bg-brand-900/40">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{student.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{student.studentNumber}</div>
                        </div>
                      </div>
                      {student.outstandingBalance > 0 && (
                        <span className="shrink-0 text-[11px] font-bold text-rose-600 dark:text-rose-400">₹{student.outstandingBalance.toLocaleString('en-IN')} due</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: what for */}
          {selectedStudentId && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <StepBadge n={2} /> What's this for?
              </span>

              {loadingDues && <p className="text-xs text-slate-400">Loading dues…</p>}

              {!loadingDues && (
                <>
                  {dues.length > 0 && (
                    <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Total outstanding</span>
                      <span className="font-extrabold text-rose-600 dark:text-rose-400">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {dues.map((due) => {
                      const active = feeDueId === due.id;
                      return (
                        <button key={due.id} type="button" onClick={() => handleDueChange(due.id)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all ${active ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-900/40' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-700'}`}>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-900 dark:text-white">{due.courseName}</div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[due.status] ?? STATUS_STYLE.Pending}`}>{due.status}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">due {new Date(due.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-extrabold text-slate-900 dark:text-white">₹{due.balanceAmount.toLocaleString('en-IN')}</span>
                        </button>
                      );
                    })}

                    <button type="button" onClick={() => handleDueChange('advance')}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${feeDueId === 'advance' ? 'border-brand-500 bg-brand-50/80 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-900/40' : 'border-dashed border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-700'}`}>
                      <span className="material-symbols-outlined text-[18px] text-brand-500">savings</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">Advance payment</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">Not tied to a due yet — applied automatically later</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: amount & method */}
          {selectedStudentId && (
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <StepBadge n={3} /> How much & how?
              </span>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="fee-amount" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Amount received (₹)</label>
                  {selectedDue && Number(amount) !== selectedDue.balanceAmount && (
                    <button type="button" onClick={() => setAmount(String(selectedDue.balanceAmount))} className="text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400">
                      Use full ₹{selectedDue.balanceAmount.toLocaleString('en-IN')}
                    </button>
                  )}
                </div>
                <input id="fee-amount" type="number" required min="0.01" step="0.01" value={amount} disabled={submitting}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full min-h-12 p-3 text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60" />
                {selectedDue && <div className="mt-1 text-xs text-slate-500">Balance on this due: ₹{selectedDue.balanceAmount.toLocaleString('en-IN')}</div>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Payment method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((item) => (
                    <button key={item.value} type="button" disabled={submitting} onClick={() => setMethod(item.value)}
                      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-bold transition-all ${method === item.value ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-900/40 dark:text-brand-300' : 'border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-700'}`}>
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      {PAYMENT_METHOD_LABELS[item.value]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="fee-remarks" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Note (optional)</label>
                <input id="fee-remarks" type="text" value={remarks} disabled={submitting} onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Reference note, cheque number, etc."
                  className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60" />
              </div>
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !selectedStudentId} className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">{submitting ? 'progress_activity' : 'check'}</span>
              <span>{submitting ? 'Recording…' : amount ? `Confirm ₹${Number(amount).toLocaleString('en-IN')}` : 'Confirm payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-extrabold text-white">{n}</span>
  );
}
