import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useMemo, useState } from 'react';
import { FeeDue, FeePayment, FeeStructure, PAYMENT_METHOD_LABELS, PaymentMethod, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface RecordFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  feeStructures: FeeStructure[];
  initialStudent?: Student;
  token: string;
  onRecordFee: (payload: {
    studentId: string; feeDueId: string | null; amount: number; method: PaymentMethod; remarks?: string;
    idempotencyKey?: string;
  }) => Promise<FeePayment>;
}

const courseFeeTotal = (student: Student | undefined, feeStructures: FeeStructure[]) => {
  if (!student) return 0;
  const activeCourseIds = new Set(student.enrollments.filter((e) => e.status === 'Active').map((e) => e.courseId));
  return feeStructures
    .filter((structure) => structure.isActive && activeCourseIds.has(structure.courseId))
    .reduce((sum, structure) => sum + structure.amount, 0);
};

const METHODS: { value: PaymentMethod; icon: string }[] = [
  { value: 'Cash', icon: 'payments' },
  { value: 'Upi', icon: 'qr_code_2' },
  { value: 'Card', icon: 'credit_card' },
  { value: 'BankTransfer', icon: 'account_balance' },
  { value: 'Cheque', icon: 'receipt_long' },
  { value: 'Other', icon: 'more_horiz' },
];

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({ isOpen, onClose, students, feeStructures, initialStudent, token, onRecordFee }) => {
  const eligibleStudents = useMemo(() => students.filter((student) => student.isActive), [students]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // One key per collection attempt: a double-click or retried submit replays the same payment
  // on the server instead of charging twice. Regenerated whenever the modal opens.
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const initial = eligibleStudents.find((student) => student.id === initialStudent?.id);
    setSelectedStudentId(initial?.id ?? '');
    setPickerOpen(!initial);
    setQuery('');
    const suggested = initial?.outstandingBalance || courseFeeTotal(initial, feeStructures);
    setAmount(suggested > 0 ? String(suggested) : '');
    setMethod('Cash');
    setRemarks('');
    setError('');
    setSubmitting(false);
    setIdempotencyKey(crypto.randomUUID());
  }, [isOpen, initialStudent?.id]);

  // A changed payload is a new attempt and needs a fresh key; an unchanged retry reuses the
  // same key so the server replays the original payment instead of recording a duplicate.
  useEffect(() => {
    if (isOpen) setIdempotencyKey(crypto.randomUUID());
  }, [selectedStudentId, amount, method, remarks]);

  useEffect(() => {
    if (!isOpen || !selectedStudentId) { setDues([]); return; }
    let ignore = false;
    api.studentDues(token, selectedStudentId)
      .then((rows) => {
        if (ignore) return;
        const outstanding = rows
          .filter((due) => due.status !== 'Paid' && due.status !== 'Cancelled')
          .sort((a, b) => (a.status === 'Overdue' ? -1 : b.status === 'Overdue' ? 1 : 0) || a.dueDate.localeCompare(b.dueDate));
        setDues(outstanding);
        const total = outstanding.reduce((sum, due) => sum + due.balanceAmount, 0);
        if (total > 0) {
          setAmount(String(total));
        } else {
          const suggested = courseFeeTotal(eligibleStudents.find((s) => s.id === selectedStudentId), feeStructures);
          if (suggested > 0) setAmount(String(suggested));
        }
      })
      .catch((requestError) => { if (!ignore) setError(requestError instanceof Error ? requestError.message : 'Unable to load fee dues.'); });
    return () => { ignore = true; };
  }, [isOpen, selectedStudentId, token]);

  if (!isOpen) return null;

  const selectedStudent = eligibleStudents.find((student) => student.id === selectedStudentId);
  const totalOutstanding = dues.reduce((sum, due) => sum + due.balanceAmount, 0);
  const suggestedCourseFee = totalOutstanding === 0 ? courseFeeTotal(selectedStudent, feeStructures) : 0;

  const filteredStudents = query.trim()
    ? eligibleStudents.filter((student) => {
        const term = query.trim().toLowerCase();
        return student.name.toLowerCase().includes(term) || student.studentNumber.toLowerCase().includes(term);
      })
    : eligibleStudents;

  const handlePickStudent = (id: string) => {
    setSelectedStudentId(id);
    const stu = eligibleStudents.find((s) => s.id === id);
    const suggested = stu?.outstandingBalance || courseFeeTotal(stu, feeStructures);
    setAmount(suggested > 0 ? String(suggested) : '');
    setPickerOpen(false);
    setQuery('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paymentAmount = Number(amount);
    if (!selectedStudent) { setError('Select a student.'); return; }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) { setError('Enter a valid payment amount.'); return; }

    setSubmitting(true);
    setError('');
    try {
      await onRecordFee({
        studentId: selectedStudent.id,
        feeDueId: null,
        amount: paymentAmount,
        method,
        remarks: remarks.trim() || undefined,
        idempotencyKey,
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Payment could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="record-fee-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="record-fee-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white flex items-center gap-2">
            <JisIcon className="text-[#3fc073]">payments</JisIcon>
            <span>Collect fee</span>
          </h3>
          <Button type="button" onClick={onClose} disabled={submitting} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95 disabled:opacity-50">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 font-sans text-sm">
          {/* Step 1: student */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
              <StepBadge n={1} /> Who's paying?
            </span>

            {selectedStudent && !pickerOpen ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] p-3 dark:border-[#243244] dark:bg-[#111c2b]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-sm font-bold text-white shadow-xs">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-[#212121] dark:text-white">{selectedStudent.name}</div>
                    <div className="text-xs text-[#808080]">{selectedStudent.studentNumber}</div>
                  </div>
                </div>
                <Button type="button" onClick={() => setPickerOpen(true)} disabled={submitting}
                  className="min-h-9 shrink-0 rounded-xl px-3 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors">
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <JisIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#9e9e9e]">search</JisIcon>
                  <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} autoFocus={eligibleStudents.length > 6}
                    placeholder="Search by name or student ID"
                    className="w-full min-h-11 rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] py-2.5 pl-10 pr-3 text-[#212121] dark:border-[#243244] dark:bg-[#111c2b] dark:text-white outline-none focus:border-[#3fc073]" />
                </div>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-[#dbdbdb]/60 p-1 dark:border-[#243244]">
                  {eligibleStudents.length === 0 && <p className="p-2 text-xs text-[#808080]">No active students.</p>}
                  {eligibleStudents.length > 0 && filteredStudents.length === 0 && <p className="p-2 text-xs text-[#808080]">No students match "{query}".</p>}
                  {filteredStudents.map((student) => (
                    <Button key={student.id} type="button" onClick={() => handlePickStudent(student.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#dbdbdb] text-xs font-bold text-[#575757] dark:bg-[#111c2b] dark:text-[#cbd5e1]">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-[#212121] dark:text-white">{student.name}</div>
                          <div className="text-xs text-[#808080]">{student.studentNumber}</div>
                        </div>
                      </div>
                      {student.outstandingBalance > 0 && (
                        <span className="shrink-0 text-xs font-bold text-[#ef4444]">₹{student.outstandingBalance.toLocaleString('en-IN')} due</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: amount & method */}
          {selectedStudentId && (
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
                <StepBadge n={2} /> How much & how?
              </span>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="fee-amount" className="text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Amount received (₹)</label>
                  {totalOutstanding > 0 && Number(amount) !== totalOutstanding && (
                    <Button type="button" onClick={() => setAmount(String(totalOutstanding))} className="text-xs font-bold text-[#3fc073] hover:underline">
                      Use full ₹{totalOutstanding.toLocaleString('en-IN')}
                    </Button>
                  )}
                  {totalOutstanding === 0 && suggestedCourseFee > 0 && Number(amount) !== suggestedCourseFee && (
                    <Button type="button" onClick={() => setAmount(String(suggestedCourseFee))} className="text-xs font-bold text-[#3fc073] hover:underline">
                      Use course fee ₹{suggestedCourseFee.toLocaleString('en-IN')}
                    </Button>
                  )}
                </div>
                <input id="fee-amount" type="number" required min="0.01" step="0.01" value={amount} disabled={submitting}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Enter amount"
                  className="w-full min-h-12 p-3 text-lg font-bold bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15 disabled:opacity-60" />
                {totalOutstanding > 0 && (
                  <div className="mt-1 text-xs text-[#808080]">
                    Total outstanding: <span className="font-semibold text-[#ef4444]">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {totalOutstanding === 0 && suggestedCourseFee > 0 && (
                  <div className="mt-1 text-xs text-[#808080]">
                    No due generated yet — suggested from course fee: <span className="font-semibold text-[#3fc073]">₹{suggestedCourseFee.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Payment method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map((item) => (
                    <Button key={item.value} type="button" disabled={submitting} onClick={() => setMethod(item.value)}
                      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${method === item.value ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                      <JisIcon className="text-[20px]">{item.icon}</JisIcon>
                      {PAYMENT_METHOD_LABELS[item.value]}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="fee-remarks" className="block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] mb-1">Note (optional)</label>
                <input id="fee-remarks" type="text" value={remarks} disabled={submitting} onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Reference note, cheque number, etc."
                  className="settings-input" />
              </div>
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedStudentId} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <JisIcon className="text-[16px]">{submitting ? 'progress_activity' : 'check'}</JisIcon>
              <span>{submitting ? 'Recording…' : amount ? `Confirm ₹${Number(amount).toLocaleString('en-IN')}` : 'Confirm payment'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3fc073] text-xs font-bold text-white">{n}</span>
  );
}
