import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import { Spinner } from '../ui/spinner';
import React, { useEffect, useState } from 'react';
import { Achievement, LedgerEntry, Student, StudentLedger } from '../../types';
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
  const [ledger, setLedger] = useState<StudentLedger | null>(null);
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
    Promise.all([api.studentLedger(token, student.id), api.achievements(token, student.id)])
      .then(([ledgerData, achievementRows]) => { setLedger(ledgerData); setAchievements(achievementRows); })
      .catch(() => { setLedger(null); setAchievements([]); })
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
    { id: 'fees', label: 'Fees', count: ledger?.entries.length ?? null },
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
                    {student.upcomingAmount > 0 && <span className="text-[#b45309] dark:text-amber-300"> · ₹{student.upcomingAmount.toLocaleString('en-IN')} upcoming</span>}
                  </span>
                ) : student.upcomingAmount > 0 ? (
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap text-xs bg-amber-50 text-[#b45309] font-semibold px-2.5 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-300">
                    ₹{student.upcomingAmount.toLocaleString('en-IN')} upcoming
                  </span>
                ) : student.hasUpcomingDues ? (
                  <span className="inline-flex shrink-0 items-center whitespace-nowrap text-xs bg-amber-50 text-[#b45309] font-semibold px-2.5 py-0.5 rounded-full dark:bg-amber-950/40 dark:text-amber-300">Payment upcoming</span>
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
            loading ? (
              <div className="py-2"><Spinner size="xs" inline text="Loading ledger…" /></div>
            ) : !ledger ? (
              <p className="text-xs text-[#808080]">Couldn’t load the fee ledger.</p>
            ) : (
              <FeeLedgerPanel ledger={ledger} hasUpcomingDues={student.hasUpcomingDues} />
            )
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

const inr = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const ledgerDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

const LEDGER_ROW_ICON: Record<LedgerEntry['type'], string> = {
  FeeCharge: 'receipt_long', Payment: 'payments', Concession: 'redeem',
  Waiver: 'volunteer_activism', Proration: 'pie_chart', Fine: 'gavel',
  WriteOff: 'money_off', Refund: 'undo',
};

function FeeLedgerPanel({ ledger, hasUpcomingDues }: { ledger: StudentLedger; hasUpcomingDues: boolean }) {
  const { summary, entries } = ledger;
  const settled = summary.pending === 0 && summary.availableCredit === 0;
  const received = summary.totalPaid - summary.totalRefunded;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Net fees" value={inr(summary.netCharged)} />
        <StatTile label="Received" value={inr(received)} tone="success" />
        <StatTile
          label={summary.availableCredit > 0 ? 'Credit' : 'Pending'}
          value={inr(summary.availableCredit > 0 ? summary.availableCredit : summary.pending)}
          tone={summary.availableCredit > 0 ? 'success' : summary.pending > 0 ? 'danger' : 'muted'}
        />
      </div>

      {(summary.overdue > 0 || summary.totalRefunded > 0 || summary.totalAdjustments > 0
        || summary.totalFines > 0 || summary.totalWrittenOff > 0 || summary.reservedCredit > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {summary.overdue > 0 && <SummaryChip label="Overdue" value={inr(summary.overdue)} tone="danger" />}
          {summary.reservedCredit > 0 && <SummaryChip label="Reserved for upcoming" value={inr(summary.reservedCredit)} tone="muted" />}
          {summary.totalFines > 0 && <SummaryChip label="Fines" value={inr(summary.totalFines)} tone="danger" />}
          {summary.totalAdjustments > 0 && <SummaryChip label="Adjustments" value={inr(summary.totalAdjustments)} tone="muted" />}
          {summary.totalWrittenOff > 0 && <SummaryChip label="Written off" value={inr(summary.totalWrittenOff)} tone="muted" />}
          {summary.totalRefunded > 0 && <SummaryChip label="Refunded" value={inr(summary.totalRefunded)} tone="muted" />}
        </div>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-[#808080]">
          {hasUpcomingDues ? 'No fees due yet — the next bill hasn’t reached its due date.' : 'Nothing billed yet.'}
        </p>
      ) : (
        <>
          {/* Mobile — stacked rows */}
          <div className="space-y-1.5 sm:hidden">
            {entries.map((entry, i) => (
              <div key={i} className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] px-3 py-2.5 text-xs border border-[#dbdbdb]/60 dark:border-[#243244]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <JisIcon className="shrink-0 text-[15px] text-[#9e9e9e]">{LEDGER_ROW_ICON[entry.type]}</JisIcon>
                    <span className="truncate font-semibold text-[#212121] dark:text-white">
                      {entry.description}
                      {entry.feeHeadName ? <span className="ml-1 font-normal text-[#9e9e9e]">· {entry.feeHeadName}</span> : null}
                    </span>
                  </span>
                  <span className={`shrink-0 font-bold tabular-nums ${entry.debit > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>
                    {entry.debit > 0 ? `+${inr(entry.debit)}` : `−${inr(entry.credit)}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[#808080] dark:text-[#94a3b8]">
                  <span>{ledgerDate(entry.date)}{entry.reference ? ` · ${entry.reference}` : ''}</span>
                  <span className="tabular-nums">Bal {balanceText(entry.balance)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop — statement table */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#808080] dark:text-[#94a3b8]">
                  <th className="pb-2 pr-2 font-semibold">Date</th>
                  <th className="pb-2 pr-2 font-semibold">Description</th>
                  <th className="pb-2 pr-2 text-right font-semibold">Debit</th>
                  <th className="pb-2 pr-2 text-right font-semibold">Credit</th>
                  <th className="pb-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
                {entries.map((entry, i) => (
                  <tr key={i} className="text-[#575757] dark:text-[#cbd5e1]">
                    <td className="py-2 pr-2 whitespace-nowrap">{ledgerDate(entry.date)}</td>
                    <td className="py-2 pr-2">
                      <span className="font-medium text-[#212121] dark:text-white">{entry.description}</span>
                      {entry.feeHeadName ? <span className="ml-1 text-[#9e9e9e]">· {entry.feeHeadName}</span> : null}
                      {entry.reference ? <span className="ml-1 font-mono text-[#9e9e9e]">{entry.reference}</span> : null}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{entry.debit > 0 ? inr(entry.debit) : '—'}</td>
                    <td className="py-2 pr-2 text-right tabular-nums text-[#22c55e]">{entry.credit > 0 ? inr(entry.credit) : '—'}</td>
                    <td className="py-2 text-right font-bold tabular-nums text-[#212121] dark:text-white">{balanceText(entry.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`flex items-center justify-between rounded-2xl px-3.5 py-3 text-xs font-bold ${
            settled ? 'bg-[#f0f0f0] text-[#575757] dark:bg-[#111c2b] dark:text-[#cbd5e1]'
              : summary.availableCredit > 0 ? 'bg-emerald-100 text-[#15803d] dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-rose-100 text-[#b91c1c] dark:bg-rose-950/60 dark:text-rose-300'
          }`}>
            <span className="uppercase tracking-wider">
              {settled ? 'Settled' : summary.availableCredit > 0 ? 'Available credit' : 'Balance outstanding'}
            </span>
            <span className="tabular-nums">
              {settled ? inr(0) : inr(summary.availableCredit > 0 ? summary.availableCredit : summary.pending)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Positive balance = owed; negative = the student is in credit.
function balanceText(balance: number) {
  if (balance < 0) return `${inr(balance)} Cr`;
  return inr(balance);
}

function StatTile({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'success' | 'danger' | 'muted' }) {
  const toneClass = tone === 'success' ? 'text-[#22c55e]' : tone === 'danger' ? 'text-[#ef4444]' : 'text-[#212121] dark:text-white';
  return (
    <div className="rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] p-3 border border-[#dbdbdb]/60 dark:border-[#243244]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#808080]">{label}</div>
      <div className={`mt-1 text-sm font-bold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone: 'danger' | 'muted' }) {
  const toneClass = tone === 'danger'
    ? 'bg-rose-100 text-[#ef4444] dark:bg-rose-950/60 dark:text-rose-300'
    : 'bg-[#f0f0f0] text-[#575757] dark:bg-[#172435] dark:text-[#94a3b8]';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${toneClass}`}>
    {label} <span className="tabular-nums font-bold">{value}</span>
  </span>;
}

function InfoTile({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return <div className={`p-3 bg-[#f0f0f0] dark:bg-[#111c2b] rounded-2xl border border-[#dbdbdb]/60 dark:border-[#243244] ${span2 ? 'sm:col-span-2' : ''}`}>
    <div className="text-[#808080] font-medium mb-1">{label}</div>
    <div className="font-bold text-[#212121] dark:text-white">{value}</div>
  </div>;
}
