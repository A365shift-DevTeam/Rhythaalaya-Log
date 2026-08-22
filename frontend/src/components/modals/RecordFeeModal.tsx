import React, { useEffect, useState } from 'react';
import { FeeDue, FeePayment, PAYMENT_METHOD_LABELS, PaymentMethod, Student } from '../../types';
import { api } from '../../api';
import { Dialog, DialogError } from './Dialog';

interface RecordFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  token: string;
  onRecordFee: (payload: {
    studentId: string;
    feeDueId: string | null;
    amount: number;
    method: PaymentMethod;
    remarks?: string;
  }) => Promise<FeePayment>;
}

const METHODS: PaymentMethod[] = ['Cash', 'Upi', 'Card', 'BankTransfer', 'Cheque', 'Other'];

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  token,
  onRecordFee
}) => {
  const eligibleStudents = students.filter((student) => student.isActive);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [loadingDues, setLoadingDues] = useState(false);
  const [feeDueId, setFeeDueId] = useState('advance');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formId = 'record-fee-form';

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
        const first = outstanding[0];
        setFeeDueId(first ? first.id : 'advance');
        setAmount(first ? String(first.balanceAmount) : '');
      })
      .catch((requestError) => setError(
        requestError instanceof Error ? requestError.message : 'The dues could not be loaded.'
      ))
      .finally(() => setLoadingDues(false));
  }, [isOpen, selectedStudentId, token]);

  const selectedStudent = eligibleStudents.find((student) => student.id === selectedStudentId);
  const selectedDue = dues.find((due) => due.id === feeDueId);

  const chooseDue = (id: string) => {
    setFeeDueId(id);
    const due = dues.find((item) => item.id === id);
    setAmount(due ? String(due.balanceAmount) : '');
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const paymentAmount = Number(amount);
    if (!selectedStudent) { setError('Pick a student first.'); return; }
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError('Enter how much was paid.');
      return;
    }
    if (selectedDue && paymentAmount > selectedDue.balanceAmount) {
      setError(`That is more than the ${rupees(selectedDue.balanceAmount)} left on this due.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onRecordFee({
        studentId: selectedStudent.id,
        feeDueId: feeDueId === 'advance' ? null : feeDueId,
        amount: paymentAmount,
        method,
        remarks: remarks.trim() || undefined
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The payment could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record fee"
      description="Log a payment you have received."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting || eligibleStudents.length === 0}
            className="btn btn-primary"
          >
            {submitting ? 'Recording…' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="fee-student" className="label mb-1.5 block font-semibold text-ink">Student</label>
          <select
            id="fee-student"
            value={selectedStudentId}
            disabled={eligibleStudents.length === 0 || submitting}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            className="field"
          >
            {eligibleStudents.length === 0 && <option value="">No students on the roll</option>}
            {eligibleStudents.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} · {student.studentNumber}
                {student.outstandingBalance > 0 ? ` · ${rupees(student.outstandingBalance)} due` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedStudentId && (
          <div>
            <label htmlFor="fee-due" className="label mb-1.5 block font-semibold text-ink">Put it towards</label>
            <select
              id="fee-due"
              value={feeDueId}
              disabled={loadingDues || submitting}
              onChange={(event) => chooseDue(event.target.value)}
              className="field"
            >
              {dues.map((due) => (
                <option key={due.id} value={due.id}>
                  {due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })} · {rupees(due.balanceAmount)}
                </option>
              ))}
              <option value="advance">Pay in advance</option>
            </select>
            {loadingDues && <p className="label-xs mt-1.5">Checking what is owed…</p>}
            {!loadingDues && dues.length === 0 && (
              <p className="label-xs mt-1.5">
                Nothing is owed right now, so this is held as credit and used against the next due.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="fee-amount" className="label mb-1.5 block font-semibold text-ink">
              Amount paid (₹)
            </label>
            <input
              id="fee-amount"
              type="number"
              required
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              disabled={submitting}
              onChange={(event) => setAmount(event.target.value)}
              className="field num"
            />
            {selectedDue && (
              <p className="label-xs mt-1.5 flex flex-wrap items-center gap-x-1.5">
                <span className="num">{rupees(selectedDue.balanceAmount)}</span> outstanding
                {Number(amount) !== selectedDue.balanceAmount && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(selectedDue.balanceAmount))}
                    className="font-semibold text-leaf underline underline-offset-2"
                  >
                    Pay it all
                  </button>
                )}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="fee-method" className="label mb-1.5 block font-semibold text-ink">Paid by</label>
            <select
              id="fee-method"
              value={method}
              disabled={submitting}
              onChange={(event) => setMethod(event.target.value as PaymentMethod)}
              className="field"
            >
              {METHODS.map((item) => (
                <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="fee-remarks" className="label mb-1.5 block font-semibold text-ink">Note</label>
          <input
            id="fee-remarks"
            type="text"
            value={remarks}
            disabled={submitting}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Cheque number, reference, anything worth remembering"
            className="field"
          />
        </div>

        <DialogError message={error} />
      </form>
    </Dialog>
  );
};
