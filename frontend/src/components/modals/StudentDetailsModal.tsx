import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import { Spinner } from '../ui/spinner';
import React, { useEffect, useState } from 'react';
import { Achievement, FeeDue, FeePayment, PAYMENT_METHOD_LABELS, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';
import { confirmAction } from '../../lib/confirm';
import { AddAchievementModal } from './AddAchievementModal';

const ACHIEVEMENT_ICONS: Record<Achievement['category'], string> = {
  Won: 'workspace_premium', Participated: 'how_to_reg', Other: 'category',
};

type DetailsTab = 'details' | 'fees' | 'achievements';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  token: string;
  onRecordFee: (student?: Student) => void;
  onSendMessage: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onEdit: (student: Student) => void;
  onAchievementsChanged: () => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen, onClose, student, token, onRecordFee, onSendMessage, onDeleteStudent, onEdit, onAchievementsChanged
}) => {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const [dues, setDues] = useState<FeeDue[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddAchievementOpen, setIsAddAchievementOpen] = useState(false);
  const [achievementError, setAchievementError] = useState('');
  const [tab, setTab] = useState<DetailsTab>('details');

  useEffect(() => {
    if (!isOpen || !student) return;
    setTab('details');
    setAchievementError('');
    setLoading(true);
    Promise.all([api.studentDues(token, student.id), api.studentPayments(token, student.id), api.achievements(token, student.id)])
      .then(([dueRows, paymentRows, achievementRows]) => { setDues(dueRows); setPayments(paymentRows); setAchievements(achievementRows); })
      .catch(() => { setDues([]); setPayments([]); setAchievements([]); })
      .finally(() => setLoading(false));
  }, [isOpen, student, token]);

  const handleViewCertificate = async (achievement: Achievement) => {
    if (!student) return;
    try {
      const url = await api.achievementFileBlobUrl(token, student.id, achievement.id);
      window.open(url, '_blank', 'noopener');
    } catch (requestError) {
      setAchievementError(requestError instanceof Error ? requestError.message : 'Could not open that certificate.');
    }
  };

  const handleDeleteCertificate = async (achievement: Achievement) => {
    if (!student) return;
    if (!(await confirmAction({
      title: `Remove "${achievement.title}"?`,
      confirmText: 'Remove',
      tone: 'destructive',
    }))) return;
    try {
      await api.deleteAchievement(token, student.id, achievement.id);
      setAchievements((prev) => prev.filter((item) => item.id !== achievement.id));
      onAchievementsChanged();
    } catch (requestError) {
      setAchievementError(requestError instanceof Error ? requestError.message : 'Could not remove that certificate.');
    }
  };

  if (!isOpen || !student) return null;

  const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const activeEnrollments = student.enrollments.filter((e) => e.status === 'Active');

  const tabs: { id: DetailsTab; label: string; count: number | null }[] = [
    { id: 'details', label: 'Details', count: null },
    { id: 'fees', label: 'Fees', count: payments.length },
    { id: 'achievements', label: 'Achievements', count: achievements.length },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-details-title"
        className="relative flex h-[90dvh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[#dbdbdb] bg-white shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixed */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#dbdbdb]/60 dark:border-[#243244] px-4 pt-5 pb-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-heading font-bold text-xl sm:text-2xl shrink-0 shadow-md shadow-[#3fc073]/20">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 id="student-details-title" className="truncate font-heading text-lg sm:text-xl font-bold text-[#212121] dark:text-white">
                {student.name}
              </h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
                Student ID: <span className="font-mono font-bold text-[#212121] dark:text-white">{student.studentNumber}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {student.outstandingBalance > 0 ? (
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap text-xs bg-rose-100 text-[#ef4444] font-semibold px-2.5 py-0.5 rounded-full dark:bg-rose-950/80 dark:text-rose-300">
                    ₹{student.outstandingBalance.toLocaleString('en-IN')} outstanding
                  </span>
                ) : student.hasBillableDues ? (
                  <span className="text-xs bg-emerald-100 text-[#22c55e] font-semibold px-2.5 py-0.5 rounded-full dark:bg-emerald-950/80 dark:text-emerald-300">Fully paid</span>
                ) : (
                  <span className="text-xs bg-[#f0f0f0] text-[#808080] font-semibold px-2.5 py-0.5 rounded-full dark:bg-[#172435] dark:text-[#94a3b8]">No dues yet</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" onClick={() => { onClose(); onEdit(student); }} aria-label="Edit student details" title="Edit details"
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#575757] dark:text-[#cbd5e1] hover:text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-all active:scale-95">
              <JisIcon className="text-[19px]">edit</JisIcon>
            </Button>
            <Button type="button" onClick={onClose} aria-label="Close student details" title="Close"
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
              <JisIcon className="text-[19px]">close</JisIcon>
            </Button>
          </div>
        </div>

        {/* Tab bar — fixed */}
        <div className="shrink-0 px-4 pt-3 sm:px-6">
          <div className="flex gap-1 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] p-1" role="tablist" aria-label="Student sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-all ${
                  tab === t.id
                    ? 'bg-white text-[#212121] shadow-xs dark:bg-[#0b1422] dark:text-white'
                    : 'text-[#808080] dark:text-[#94a3b8] hover:text-[#212121] dark:hover:text-white'
                }`}
              >
                {t.label}
                {t.count ? (
                  <span
                    className={`inline-flex min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      tab === t.id
                        ? 'bg-[#e9f7ee] text-[#35a160] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]'
                        : 'bg-[#dbdbdb]/70 text-[#575757] dark:bg-[#243244] dark:text-[#cbd5e1]'
                    }`}
                  >
                    {t.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Body — the only scroll region */}
        <div
          role="tabpanel"
          aria-label={tabs.find((t) => t.id === tab)?.label}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-5"
        >
          {tab === 'details' && (
            <>
              <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 sm:gap-4">
                <InfoTile label="Joined" value={student.joinDate ? new Date(student.joinDate).toLocaleDateString('en-IN') : 'Not provided'} />
                <InfoTile label="Date of birth" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : 'Not provided'} />
                <InfoTile label="Parent / guardian" value={student.parentName || 'Not provided'} />
                <InfoTile label="Phone" value={student.phone || 'Not provided'} />
                <InfoTile label="Email" value={student.email || 'Not provided'} />
                <InfoTile label="Attendance" value={`${student.overallAttendance}%`} />
                <InfoTile label="Address" value={student.address || 'Not provided'} span2 />
              </div>

              <div className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] p-3.5 border border-[#dbdbdb]/60 dark:border-[#243244]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#808080] mb-1.5">Enrolled in</div>
                {activeEnrollments.length === 0 ? (
                  <p className="text-sm text-[#808080]">Not enrolled in a batch</p>
                ) : (
                  <div className="space-y-1">
                    {activeEnrollments.map((enrollment) => (
                      <div key={enrollment.id} className="text-sm font-semibold text-[#212121] dark:text-white">
                        {enrollment.courseName} <span className="font-normal text-[#9e9e9e]">·</span> {enrollment.batchName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'fees' && (
            <>
              <CollapsibleSection title="Fee dues" count={dues.length}>
                {loading ? <div className="py-2"><Spinner size="xs" inline text="Loading dues…" /></div> : dues.length === 0 ? (
                  <p className="text-xs text-[#808080]">No dues generated yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {dues.map((due) => (
                      <div key={due.id} className="flex items-center justify-between rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] px-3 py-2 text-xs border border-[#dbdbdb]/60 dark:border-[#243244]">
                        <span className="text-[#575757] dark:text-[#cbd5e1]">{due.courseName} · {new Date(due.dueDate).toLocaleDateString('en-IN')}</span>
                        <span className={`font-bold ${due.status === 'Paid' ? 'text-[#22c55e]' : due.status === 'Overdue' ? 'text-[#ef4444]' : 'text-[#212121] dark:text-white'}`}>
                          ₹{due.netAmount.toLocaleString('en-IN')} · {due.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="Payment history" count={payments.length}>
                {loading ? <div className="py-2"><Spinner size="xs" inline text="Loading payments…" /></div> : payments.length === 0 ? (
                  <p className="text-xs text-[#808080]">No payments recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] px-3 py-2 text-xs border border-[#dbdbdb]/60 dark:border-[#243244]">
                        <span className="text-[#575757] dark:text-[#cbd5e1] font-mono">{payment.receiptNumber} · {PAYMENT_METHOD_LABELS[payment.method]}</span>
                        <span className={`font-bold ${payment.amount < 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                          {payment.amount < 0 ? '-' : '+'}₹{Math.abs(payment.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            </>
          )}

          {tab === 'achievements' && (
            <section>
              {achievementError && <div role="alert" className="mb-2 p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{achievementError}</div>}
              {loading ? <div className="py-2"><Spinner size="xs" inline text="Loading certificates…" /></div> : achievements.length === 0 ? (
                <p className="text-xs text-[#808080]">No certificates uploaded yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {achievements.map((achievement) => (
                    <div key={achievement.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] px-3 py-2.5 text-xs border border-[#dbdbdb]/60 dark:border-[#243244]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20">
                          <JisIcon className="text-[16px]">{ACHIEVEMENT_ICONS[achievement.category]}</JisIcon>
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-bold text-[#212121] dark:text-white">{achievement.title}</div>
                          <div className="truncate text-[#808080] dark:text-[#94a3b8]">
                            {achievement.category}{achievement.level ? ` · ${achievement.level}` : ''} · {new Date(achievement.eventDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button type="button" onClick={() => handleViewCertificate(achievement)} title="View certificate"
                          className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-xl text-[#808080] hover:text-[#3fc073]">
                          <JisIcon className="text-[16px]">{achievement.contentType === 'application/pdf' ? 'picture_as_pdf' : 'image'}</JisIcon>
                        </Button>
                        <Button type="button" onClick={() => handleDeleteCertificate(achievement)} title="Remove certificate"
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-[#808080] hover:text-[#ef4444]">
                          <JisIcon className="text-[16px]">delete</JisIcon>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" onClick={() => setIsAddAchievementOpen(true)}
                className="btn-brand mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold shadow-sm">
                <JisIcon className="text-[18px]">add</JisIcon>
                <span>Add achievement or certificate</span>
              </Button>
            </section>
          )}
        </div>

        {/* Action toolbar — fixed */}
        <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-[#dbdbdb]/60 dark:border-[#243244] px-4 py-4 sm:px-6 sm:grid-cols-2">
          <Button onClick={() => { onClose(); onSendMessage(student); }}
            className="min-h-11 py-2 px-3 bg-[#25D366]/15 text-[#13773a] dark:text-emerald-300 hover:bg-[#25D366]/25 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 transition-colors">
            <JisIcon className="text-[18px]">chat</JisIcon><span>WhatsApp Msg</span>
          </Button>
          <Button onClick={() => { onClose(); onRecordFee(student); }}
            className="btn-brand min-h-11 py-2 px-3 text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5">
            <JisIcon className="text-[18px]">receipt_long</JisIcon><span>Record fee payment</span>
          </Button>
          <Button onClick={async () => {
              if (await confirmAction({
                title: `Remove ${student.name}?`,
                text: 'This removes the student from the academy.',
                confirmText: 'Remove',
                tone: 'destructive',
              })) { onDeleteStudent(student.id); onClose(); }
            }}
            className="min-h-11 py-2 px-3 text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold rounded-2xl flex items-center justify-center gap-1 sm:col-span-2 transition-colors">
            <JisIcon className="text-[18px]">delete</JisIcon><span>Remove</span>
          </Button>
        </div>
      </div>
    </div>

    <AddAchievementModal
        isOpen={isAddAchievementOpen}
        onClose={() => setIsAddAchievementOpen(false)}
        studentId={student.id}
        token={token}
        onCreated={(achievement) => { setAchievements((prev) => [achievement, ...prev]); onAchievementsChanged(); }}
      />
    </>
  );
};

function CollapsibleSection({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mb-2 flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-[#808080]">
          {title}
          {count ? <span className="ml-1.5 font-semibold text-[#9e9e9e]">· {count}</span> : null}
        </span>
        <JisIcon className={`text-[18px] text-[#9e9e9e] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</JisIcon>
      </button>
      {open && children}
    </section>
  );
}

function InfoTile({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return <div className={`p-3 bg-[#f0f0f0] dark:bg-[#111c2b] rounded-2xl border border-[#dbdbdb]/60 dark:border-[#243244] ${span2 ? 'sm:col-span-2' : ''}`}>
    <div className="text-[#808080] font-medium mb-1">{label}</div>
    <div className="font-bold text-[#212121] dark:text-white">{value}</div>
  </div>;
}
