import React, { useEffect, useState } from 'react';
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

const METHODS: PaymentMethod[] = ['Cash', 'Upi', 'Card', 'BankTransfer', 'Cheque', 'Other'];

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({ isOpen, onClose, students, initialStudent, token, onRecordFee }) => {
  const eligibleStudents = students.filter((student) => student.isActive);
  const [selectedStudentId, setSelectedStudentId] = useState('');
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
    const initial = eligibleStudents.find((student) => student.id === initialStudent?.id) ?? eligibleStudents[0];
    setSelectedStudentId(initial?.id ?? '');
    setMethod('Cash');
    setRemarks('');
    setError('');
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialStudent?.id]);

  useEffect(() => {
    if (!isOpen || !selectedStudentId) { setDues([]); return; }
    setLoadingDues(true);
    api.studentDues(token, selectedStudentId)
      .then((rows) => {
        const outstanding = rows.filter((due) => due.status !== 'Paid' && due.status !== 'Cancelled');
        setDues(outstanding);
        const firstDue = outstanding[0];
        setFeeDueId(firstDue ? firstDue.id : 'advance');
        setAmount(firstDue ? String(firstDue.balanceAmount) : '');
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load fee dues.'))
      .finally(() => setLoadingDues(false));
  }, [isOpen, selectedStudentId, token]);

  if (!isOpen) return null;

  const selectedStudent = eligibleStudents.find((student) => student.id === selectedStudentId);
  const selectedDue = dues.find((due) => due.id === feeDueId);

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
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="record-fee-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="record-fee-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-500">payments</span>
            <span>Record fee payment</span>
          </h3>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Close fee payment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="fee-student" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Select student</label>
            <select id="fee-student" value={selectedStudentId} disabled={eligibleStudents.length === 0 || submitting}
              onChange={(event) => setSelectedStudentId(event.target.value)}
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60">
              {eligibleStudents.length === 0 && <option value="">No active students</option>}
              {eligibleStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentNumber}) — ₹{student.outstandingBalance.toLocaleString('en-IN')} due
                </option>
              ))}
            </select>
          </div>

          {selectedStudentId && (
            <div>
              <label htmlFor="fee-due" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Apply to</label>
              <select id="fee-due" value={feeDueId} disabled={loadingDues || submitting} onChange={(event) => handleDueChange(event.target.value)}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60">
                <option value="advance">Advance payment (no specific due yet)</option>
                {dues.map((due) => (
                  <option key={due.id} value={due.id}>
                    {due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN')} · ₹{due.balanceAmount.toLocaleString('en-IN')} ({due.status})
                  </option>
                ))}
              </select>
              {loadingDues && <p className="mt-1 text-xs text-slate-400">Loading dues…</p>}
              {!loadingDues && dues.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">No pending dues — this will be recorded as advance credit, automatically applied to future dues.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fee-amount" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Payment amount (₹)</label>
              <input id="fee-amount" type="number" required min="0.01" step="0.01" value={amount} disabled={submitting}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60" />
              {selectedDue && <div className="mt-1 text-xs text-slate-500">Balance: ₹{selectedDue.balanceAmount.toLocaleString('en-IN')}</div>}
            </div>
            <div>
              <label htmlFor="fee-method" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Payment method</label>
              <select id="fee-method" value={method} disabled={submitting} onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60">
                {METHODS.map((item) => <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fee-remarks" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Remarks (optional)</label>
            <input id="fee-remarks" type="text" value={remarks} disabled={submitting} onChange={(event) => setRemarks(event.target.value)}
              placeholder="Reference note, cheque number, etc."
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white disabled:opacity-60" />
          </div>

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || eligibleStudents.length === 0} className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">{submitting ? 'progress_activity' : 'check'}</span>
              <span>{submitting ? 'Recording…' : 'Confirm payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
