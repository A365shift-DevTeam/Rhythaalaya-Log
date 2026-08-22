import React, { useEffect, useState } from 'react';
import { Batch, FeeDue, FeePayment, PAYMENT_METHOD_LABELS, Student } from '../../types';
import { api } from '../../api';
import { Dialog } from './Dialog';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  batches: Batch[];
  token: string;
  onRecordFee: (student?: Student) => void;
  onSendMessage: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onEnroll: (studentId: string, batchId: string) => Promise<void>;
  onEndEnrollment: (enrollmentId: string, status: 'Completed' | 'Withdrawn') => Promise<void>;
}

const rupees = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
const shortDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric'
});

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen,
  onClose,
  student,
  batches,
  token,
  onRecordFee,
  onSendMessage,
  onDeleteStudent,
  onEnroll,
  onEndEnrollment
}) => {
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrollBatchId, setEnrollBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    setConfirmingRemove(false);
    setEnrollBatchId('');
    setLoading(true);
    Promise.all([api.studentDues(token, student.id), api.studentPayments(token, student.id)])
      .then(([dueRows, paymentRows]) => { setDues(dueRows); setPayments(paymentRows); })
      .catch(() => { setDues([]); setPayments([]); })
      .finally(() => setLoading(false));
  }, [isOpen, student, token]);

  if (!student) return null;

  const activeBatchIds = new Set(
    student.enrollments.filter((item) => item.status === 'Active').map((item) => item.batchId)
  );
  const joinableBatches = batches.filter((batch) => batch.isActive && !activeBatchIds.has(batch.id));

  const enrol = async () => {
    if (!enrollBatchId) return;
    setBusy(true);
    try {
      await onEnroll(student.id, enrollBatchId);
      setEnrollBatchId('');
    } finally {
      setBusy(false);
    }
  };

  const endEnrolment = async (enrollmentId: string, status: 'Completed' | 'Withdrawn') => {
    setBusy(true);
    try {
      await onEndEnrollment(enrollmentId, status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={student.name}
      description={`${student.studentNumber} · joined ${shortDate(student.joinDate)}`}
      footer={
        <>
          <button
            type="button"
            onClick={() => { onClose(); onSendMessage(student); }}
            className="btn btn-secondary"
          >
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">chat</span>
            Message
          </button>
          <button
            type="button"
            onClick={() => { onClose(); onRecordFee(student); }}
            className="btn btn-primary"
          >
            Record fee
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {student.outstandingBalance > 0
            ? <span className="chip chip-due num">{rupees(student.outstandingBalance)} outstanding</span>
            : <span className="chip chip-settled">Fees settled</span>}
          <span className={`chip ${student.overallAttendance < 75 ? 'chip-due' : 'chip-neutral'}`}>
            <span className="num">{student.overallAttendance}%</span> present
          </span>
          {!student.isActive && <span className="chip chip-neutral">Archived</span>}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          <Detail label="Parent or guardian" value={student.parentName} />
          <Detail label="Date of birth" value={student.dateOfBirth ? shortDate(student.dateOfBirth) : ''} mono />
          <Detail label="Phone" value={student.phone} mono />
          <Detail label="Email" value={student.email} />
          <div className="sm:col-span-2">
            <Detail label="Address" value={student.address} />
          </div>
        </dl>

        <Panel title="Batches">
          {student.enrollments.length === 0 ? (
            <p className="label">Not enrolled in anything yet.</p>
          ) : (
            <ul className="divide-y divide-line-2">
              {student.enrollments.map((enrollment) => (
                <li key={enrollment.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {enrollment.batchName}
                    </span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {enrollment.courseName} · {enrollment.status.toLowerCase()} since{' '}
                      <span className="num">{shortDate(enrollment.enrolledOn)}</span>
                      {enrollment.outstandingBalance > 0 && (
                        <> · <span className="num text-kumkum">{rupees(enrollment.outstandingBalance)} due</span></>
                      )}
                    </span>
                  </span>
                  {enrollment.status === 'Active' && (
                    <span className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => endEnrolment(enrollment.id, 'Completed')}
                        className="btn btn-secondary btn-sm"
                      >
                        Finished
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => endEnrolment(enrollment.id, 'Withdrawn')}
                        className="btn btn-danger btn-sm"
                      >
                        Left
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {joinableBatches.length > 0 && (
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="enrol-batch">Batch to join</label>
              <select
                id="enrol-batch"
                value={enrollBatchId}
                onChange={(event) => setEnrollBatchId(event.target.value)}
                className="field min-w-0 flex-1"
              >
                <option value="">Add to another batch…</option>
                {joinableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.name} — {batch.courseName}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!enrollBatchId || busy}
                onClick={enrol}
                className="btn btn-secondary shrink-0"
              >
                Add
              </button>
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Panel title="Dues">
            {loading ? (
              <p className="label">Loading…</p>
            ) : dues.length === 0 ? (
              <p className="label">No dues raised yet.</p>
            ) : (
              <ul className="max-h-44 divide-y divide-line-2 overflow-y-auto">
                {dues.map((due) => (
                  <li key={due.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-ink">{due.courseName}</span>
                      <span className="num block text-[11px] text-ink-3">{shortDate(due.dueDate)}</span>
                    </span>
                    <span
                      className={`num shrink-0 text-[12px] font-semibold ${
                        due.status === 'Paid'
                          ? 'text-leaf-strong'
                          : due.status === 'Overdue'
                            ? 'text-kumkum'
                            : 'text-ink'
                      }`}
                    >
                      {rupees(due.netAmount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Payments">
            {loading ? (
              <p className="label">Loading…</p>
            ) : payments.length === 0 ? (
              <p className="label">Nothing paid yet.</p>
            ) : (
              <ul className="max-h-44 divide-y divide-line-2 overflow-y-auto">
                {payments.map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="num block truncate text-[12px] text-ink">{payment.receiptNumber}</span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </span>
                    </span>
                    <span
                      className={`num shrink-0 text-[12px] font-semibold ${
                        payment.amount < 0 ? 'text-kumkum' : 'text-leaf-strong'
                      }`}
                    >
                      {payment.amount < 0 ? '−' : '+'}{rupees(Math.abs(payment.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Removing a student is confirmed in place rather than through a
            browser dialog, so the name being removed stays on screen. */}
        <div className="border-t border-line-2 pt-3.5">
          {confirmingRemove ? (
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <p className="text-[13px] text-ink">
                Remove <span className="font-semibold">{student.name}</span> from the roll? Their
                records stay in the ledger.
              </p>
              <span className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Keep
                </button>
                <button
                  type="button"
                  onClick={() => { onDeleteStudent(student.id); onClose(); }}
                  className="btn btn-danger btn-sm"
                >
                  Remove
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              className="btn btn-ghost btn-sm text-kumkum"
            >
              Remove from the roll
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-inset p-3">
      <h3 className="label mb-1 font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Detail({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-2 py-1.5">
      <dt className="label shrink-0">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[13px] ${value ? 'text-ink' : 'text-ink-3'} ${value && mono ? 'num' : ''}`}>
        {value || 'Not on file'}
      </dd>
    </div>
  );
}
