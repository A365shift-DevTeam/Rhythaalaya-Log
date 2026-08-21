import React, { useEffect, useState } from 'react';
import { Batch, FeeDue, FeePayment, PAYMENT_METHOD_LABELS, Student, WEEKDAY_SHORT } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

const WEEKDAY_LOOKUP = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const formatBatchTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};
const formatBatchDays = (days: string[]) => days.map((d) => WEEKDAY_SHORT[WEEKDAY_LOOKUP.indexOf(d)]).join(', ');
const formatBatchSchedule = (batch?: Batch) => batch ? `${formatBatchDays(batch.days)} · ${formatBatchTime(batch.startTime)} – ${formatBatchTime(batch.endTime)}` : '';

const ENROLLMENT_STATUS_STYLE: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
  Completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300',
  Withdrawn: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
};

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
  const [enrollPickerOpen, setEnrollPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [enrollingBatchId, setEnrollingBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    setLoading(true);
    setEnrollPickerOpen(false);
    setHistoryOpen(false);
    Promise.all([api.studentDues(token, student.id), api.studentPayments(token, student.id)])
      .then(([dueRows, paymentRows]) => { setDues(dueRows); setPayments(paymentRows); })
      .catch(() => { setDues([]); setPayments([]); })
      .finally(() => setLoading(false));
  }, [isOpen, student, token]);

  if (!isOpen || !student) return null;

  const initials = student.name.split(' ').map((n) => n[0]).join('');
  const enrolledBatchIds = new Set(student.enrollments.filter((e) => e.status === 'Active').map((e) => e.batchId));
  const availableBatches = batches.filter((b) => b.isActive && !enrolledBatchIds.has(b.id));
  const activeEnrollments = student.enrollments.filter((e) => e.status === 'Active');
  const pastEnrollments = [...student.enrollments]
    .filter((e) => e.status !== 'Active')
    .sort((a, b) => (b.endedOn ?? b.enrolledOn).localeCompare(a.endedOn ?? a.enrolledOn));

  const handleEnroll = async (batchId: string) => {
    setBusy(true);
    setEnrollingBatchId(batchId);
    try {
      await onEnroll(student.id, batchId);
      setEnrollPickerOpen(false);
    } finally {
      setBusy(false);
      setEnrollingBatchId(null);
    }
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Enrollments {student.enrollments.length > 0 && <span className="text-slate-400">({student.enrollments.length})</span>}
            </h4>
            <button type="button" disabled={availableBatches.length === 0 || busy} onClick={() => setEnrollPickerOpen((open) => !open)}
              title={availableBatches.length === 0 ? 'No open batches to enroll in' : undefined}
              className="btn-brand min-h-9 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[15px]">{enrollPickerOpen ? 'close' : 'add'}</span>
              {enrollPickerOpen ? 'Cancel' : 'Enroll'}
            </button>
          </div>

          {/* Active enrollments — the primary, current state */}
          <div className="space-y-2">
            {activeEnrollments.length === 0 && (
              <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-400">event_busy</span>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">Not enrolled in any batch</div>
                    <div className="text-[11px] text-slate-500">
                      {availableBatches.length === 0 ? 'No open batches available yet.' : 'Tap "Enroll" above to add them to a batch.'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeEnrollments.map((enrollment) => {
              const batch = batches.find((b) => b.id === enrollment.batchId);
              return (
                <div key={enrollment.id} className="rounded-xl border border-slate-200 dark:border-slate-700 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900 p-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ENROLLMENT_STATUS_STYLE.Active}`}>Active</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{enrollment.courseName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{enrollment.batchName}{batch && ` · ${formatBatchSchedule(batch)}`}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Enrolled {new Date(enrollment.enrolledOn).toLocaleDateString('en-IN')}
                        {enrollment.outstandingBalance > 0 && (
                          <span className="ml-1.5 font-bold text-rose-600 dark:text-rose-400">· ₹{enrollment.outstandingBalance.toLocaleString('en-IN')} due</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" disabled={busy} onClick={() => handleEnd(enrollment.id, 'Completed')}
                        className="min-h-9 px-2.5 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700">Complete</button>
                      <button type="button" disabled={busy} onClick={() => handleEnd(enrollment.id, 'Withdrawn')}
                        className="min-h-9 px-2.5 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900">Withdraw</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enroll picker — tap a batch to enroll, no dropdown */}
          {enrollPickerOpen && (
            <div className="mt-3 space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-0.5">Choose a batch to enroll in</p>
              {availableBatches.map((b) => (
                <button key={b.id} type="button" disabled={busy} onClick={() => handleEnroll(b.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left hover:border-brand-300 dark:hover:border-brand-700 disabled:opacity-60 transition-all">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{b.courseName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{b.name} · {formatBatchSchedule(b)}</div>
                  </div>
                  <span className="material-symbols-outlined shrink-0 text-brand-500 text-[18px]">
                    {enrollingBatchId === b.id ? 'progress_activity' : 'chevron_right'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Past enrollments — collapsed history, distinguishable by date range */}
          {pastEnrollments.length > 0 && (
            <div className="mt-3">
              <button type="button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                <span className={`material-symbols-outlined text-[16px] transition-transform ${historyOpen ? 'rotate-180' : ''}`}>expand_more</span>
                History ({pastEnrollments.length})
              </button>
              {historyOpen && (
                <div className="mt-2 space-y-1.5">
                  {pastEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{enrollment.courseName} — {enrollment.batchName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(enrollment.enrolledOn).toLocaleDateString('en-IN')}
                          {' → '}
                          {enrollment.endedOn ? new Date(enrollment.endedOn).toLocaleDateString('en-IN') : '—'}
                          {enrollment.outstandingBalance > 0 && ` · ₹${enrollment.outstandingBalance.toLocaleString('en-IN')} due`}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ENROLLMENT_STATUS_STYLE[enrollment.status] ?? ''}`}>{enrollment.status}</span>
                    </div>
                  ))}
                </div>
              )}
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
