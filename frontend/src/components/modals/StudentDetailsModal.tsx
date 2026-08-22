import React, { useEffect, useState } from 'react';
import { FeeDue, FeePayment, PAYMENT_METHOD_LABELS, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  token: string;
  onRecordFee: (student?: Student) => void;
  onSendMessage: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onEdit: (student: Student) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen, onClose, student, token, onRecordFee, onSendMessage, onDeleteStudent, onEdit
}) => {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(false);

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
  const activeEnrollments = student.enrollments.filter((e) => e.status === 'Active');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="student-details-title" className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-5">
        {/* Floating Actions (Edit & Close) */}
        <div className="sticky top-0 z-30 flex justify-end pointer-events-none -mb-10 sm:-mb-12">
          <div className="pointer-events-auto flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80">
            <button type="button" onClick={() => { onClose(); onEdit(student); }} aria-label="Edit student details" title="Edit details"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[19px]">edit</span>
            </button>
            <button type="button" onClick={onClose} aria-label="Close student details" title="Close"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 pt-1">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4 pr-24">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0 shadow-md shadow-brand-500/20">
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

        {/* Enrolled in — read-only; batch assignment happens once, when the student is created */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Enrolled in</div>
          {activeEnrollments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not enrolled in a batch</p>
          ) : (
            <div className="space-y-1">
              {activeEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="text-sm font-semibold text-slate-900 dark:text-white">
                  {enrollment.courseName} <span className="font-normal text-slate-400">·</span> {enrollment.batchName}
                </div>
              ))}
            </div>
          )}
        </div>

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
