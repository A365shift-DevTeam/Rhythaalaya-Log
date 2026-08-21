import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface RecordFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  onRecordFee: (studentId: string, amount: number, paymentMethod: string) => Promise<void>;
}

type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';

const outstandingFor = (student: Student) =>
  student.outstandingBalance ?? (student.feeStatus === 'Pending' ? student.feeAmount : 0);

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  onRecordFee
}) => {
  const eligibleStudents = students.filter((student) => outstandingFor(student) > 0);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const selected = eligibleStudents.find((student) => student.id === initialStudent?.id)
      ?? eligibleStudents[0];
    setSelectedStudentId(selected?.id ?? '');
    setAmount(selected ? String(outstandingFor(selected)) : '');
    setError('');
    setSubmitting(false);
  }, [isOpen, initialStudent?.id, students]);

  if (!isOpen) return null;

  const selectedStudent = eligibleStudents.find((student) => student.id === selectedStudentId);
  const outstanding = selectedStudent ? outstandingFor(selectedStudent) : 0;

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const target = eligibleStudents.find((student) => student.id === id);
    setAmount(target ? String(outstandingFor(target)) : '');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paymentAmount = Number(amount);
    if (!selectedStudent) {
      setError('There are no students with outstanding fees.');
      return;
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (paymentAmount > outstanding) {
      setError('Payment cannot exceed the outstanding balance.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onRecordFee(selectedStudent.id, paymentAmount, method);
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
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 id="record-fee-title" className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#45b080]">payments</span>
            <span>Record Fee Payment</span>
          </h3>
          <button type="button" onClick={onClose} disabled={submitting}
            aria-label="Close fee payment" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#565e74] hover:bg-slate-100 hover:text-[#0b1c30] dark:hover:bg-slate-800 disabled:opacity-50">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="fee-student" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Select Student
            </label>
            <select id="fee-student" value={selectedStudentId} disabled={eligibleStudents.length === 0 || submitting}
              onChange={(event) => handleStudentChange(event.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] disabled:opacity-60">
              {eligibleStudents.length === 0 && <option value="">No outstanding fees</option>}
              {eligibleStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentNumber || 'Student'}) — ₹{outstandingFor(student)}
                </option>
              ))}
            </select>
          </div>

          {eligibleStudents.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
              All active students are fully paid. There is no outstanding fee to collect.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="fee-amount" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                  Payment Amount (₹)
                </label>
                <input id="fee-amount" type="number" required min="0.01" max={outstanding} step="0.01"
                  value={amount} disabled={submitting}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] disabled:opacity-60" />
                <div className="mt-1 text-xs text-[#565e74]">Outstanding: ₹{outstanding}</div>
              </div>

              <div>
                <label htmlFor="fee-method" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                  Payment Method
                </label>
                <select id="fee-method" value={method} disabled={submitting}
                  onChange={(event) => setMethod(event.target.value as PaymentMethod)}
                  className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] disabled:opacity-60">
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
          )}

          {eligibleStudents.length > 0 && (
            <div className="p-3 bg-[#e8f4ef]/50 dark:bg-[#1e293b] rounded-xl text-xs text-[#565e74] dark:text-[#cbd5e1]">
              Recording payment updates the outstanding balance and creates an income transaction.
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#f3faf7] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || eligibleStudents.length === 0}
              className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">{submitting ? 'progress_activity' : 'check'}</span>
              <span>{submitting ? 'Recording…' : 'Confirm Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
