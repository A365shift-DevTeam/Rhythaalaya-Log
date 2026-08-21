import React, { useEffect, useState } from 'react';
import { Batch, FeeDue, FeePayment, PAYMENT_METHOD_LABELS, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

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

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen, onClose, student, batches, token, onRecordFee, onSendMessage, onDeleteStudent, onEnroll, onEndEnrollment
}) => {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrollBatchId, setEnrollBatchId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    setLoading(true);
    Promise.all([api.studentDues(token, student.id), api.studentPayments(token, student.id)])
      .then(([dueRows, paymentRows]) => { setDues(dueRows); setPayments(paymentRows); })
      .catch(() => { setDues([]); setPayments([]); })
      .finally(() => setLoading(false));
  }, [isOpen, student, token]);

  if (!isOpen || !student) return null;

  const initials = student.name.split(' ').map((n) => n[0]).join('');
  const enrolledBatchIds = new Set(student.enrollments.filter((e) => e.status === 'Active').map((e) => e.batchId));
  const availableBatches = batches.filter((b) => b.isActive && !enrolledBatchIds.has(b.id));

  const handleEnroll = async () => {
    if (!enrollBatchId) return;
    setBusy(true);
    try { await onEnroll(student.id, enrollBatchId); setEnrollBatchId(''); } finally { setBusy(false); }
  };

  const handleEnd = async (enrollmentId: string, status: 'Completed' | 'Withdrawn') => {
    setBusy(true);
    try { await onEndEnrollment(enrollmentId, status); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="student-details-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 id="student-details-title" className="truncate font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {student.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Student ID: <span className="font-mono font-bold text-slate-900 dark:text-white">{student.studentNumber}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {student.outstandingBalance > 0 ? (
                  <span className="text-[11px] bg-rose-100 text-rose-700 font-semibold px-2.5 py-0.5 rounded-full">
                    ₹{student.outstandingBalance.toLocaleString('en-IN')} outstanding
                  </span>
                ) : (
                  <span className="text-[11px] bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full">Fully paid</span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close student details" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Contact details */}
        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:gap-4">
          <InfoTile label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : 'Not provided'} />
          <InfoTile label="Parent / guardian" value={student.parentName || 'Not provided'} />
          <InfoTile label="Phone" value={student.phone || 'Not provided'} />
          <InfoTile label="Email" value={student.email || 'Not provided'} />
          <InfoTile label="Address" value={student.address || 'Not provided'} span2 />
          <InfoTile label="Attendance" value={`${student.overallAttendance}%`} />
        </div>

        {/* Enrollments */}
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Enrollments</h4>
          <div className="space-y-2">
            {student.enrollments.length === 0 && <p className="text-xs text-slate-500">Not enrolled in any batch yet.</p>}
            {student.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{enrollment.courseName} — {enrollment.batchName}</div>
                  <div className="text-[11px] text-slate-500">
                    {enrollment.status} since {new Date(enrollment.enrolledOn).toLocaleDateString('en-IN')}
                    {enrollment.outstandingBalance > 0 && ` · ₹${enrollment.outstandingBalance.toLocaleString('en-IN')} due`}
                  </div>
                </div>
                {enrollment.status === 'Active' && (
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" disabled={busy} onClick={() => handleEnd(enrollment.id, 'Completed')}
                      className="min-h-9 px-2.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700">Complete</button>
                    <button type="button" disabled={busy} onClick={() => handleEnd(enrollment.id, 'Withdrawn')}
                      className="min-h-9 px-2.5 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900">Withdraw</button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {availableBatches.length > 0 && (
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <select value={enrollBatchId} onChange={(event) => setEnrollBatchId(event.target.value)}
                className="flex-1 min-h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white">
                <option value="">Enroll in another batch…</option>
                {availableBatches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.courseName}</option>)}
              </select>
              <button type="button" disabled={!enrollBatchId || busy} onClick={handleEnroll}
                className="btn-brand min-h-10 px-4 rounded-xl text-xs font-bold disabled:opacity-50">Enroll</button>
            </div>
          )}
        </section>

        {/* Fee dues */}
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Fee dues</h4>
          {loading ? <p className="text-xs text-slate-400">Loading…</p> : dues.length === 0 ? (
            <p className="text-xs text-slate-500">No dues generated yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {dues.map((due) => (
                <div key={due.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{due.courseName} · {new Date(due.dueDate).toLocaleDateString('en-IN')}</span>
                  <span className={`font-bold ${due.status === 'Paid' ? 'text-emerald-600' : due.status === 'Overdue' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}`}>
                    ₹{due.netAmount.toLocaleString('en-IN')} · {due.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Payment history */}
        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Payment history</h4>
          {loading ? <p className="text-xs text-slate-400">Loading…</p> : payments.length === 0 ? (
            <p className="text-xs text-slate-500">No payments recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{payment.receiptNumber} · {PAYMENT_METHOD_LABELS[payment.method]}</span>
                  <span className={`font-bold ${payment.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {payment.amount < 0 ? '-' : '+'}₹{Math.abs(payment.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Action Toolbar */}
        <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 sm:grid-cols-2">
          <button onClick={() => { onClose(); onSendMessage(student); }}
            className="min-h-11 py-2 px-3 bg-[#25D366]/10 text-[#13773a] dark:text-emerald-300 hover:bg-[#25D366]/20 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">chat</span><span>WhatsApp Msg</span>
          </button>
          <button onClick={() => { onClose(); onRecordFee(student); }}
            className="btn-brand min-h-11 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span><span>Record fee payment</span>
          </button>
          <button onClick={() => {
              if (confirm(`Are you sure you want to remove ${student.name} from the academy?`)) { onDeleteStudent(student.id); onClose(); }
            }}
            className="min-h-11 py-2 px-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 sm:col-span-2">
            <span className="material-symbols-outlined text-[18px]">delete</span><span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function InfoTile({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return <div className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-xl ${span2 ? 'sm:col-span-2' : ''}`}>
    <div className="text-slate-400 font-medium mb-1">{label}</div>
    <div className="font-semibold text-slate-900 dark:text-white">{value}</div>
  </div>;
}
