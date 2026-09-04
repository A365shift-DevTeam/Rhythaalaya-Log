import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import { Switch } from '../ui/switch';
import React, { useEffect, useState } from 'react';
import { Course, FeeFrequency, FeeStructure, FEE_FREQUENCY_LABELS } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';
import { addDaysToIso, parseIsoDate, toIsoDate, todayIsoDate as todayIso } from '../../lib/schedule';
import { confirmAction } from '../../lib/confirm';
import { SimpleSelect } from '../ui/select';

const labelClass = 'block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5';
const fmtDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const PERIOD_MONTHS: Record<FeeFrequency, number> = { Monthly: 1, Quarterly: 3, HalfYearly: 6, Yearly: 12, OneTime: 0 };

/** Same day, k periods later — clamps day 29–31 to shorter months, matching the billing engine. */
const addPeriodsIso = (iso: string, freq: FeeFrequency, k: number): string => {
  const d = parseIsoDate(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + PERIOD_MONTHS[freq] * k, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toIsoDate(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay)));
};

function ToggleRow({ checked, onChange, title, hint }: {
  checked: boolean; onChange: (v: boolean) => void; title: string; hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#212121] dark:text-white">{title}</span>
        <span className="mt-0.5 block text-xs text-[#808080] dark:text-[#94a3b8]">{hint}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </label>
  );
}

function FirstBillDateField({ id, value, onChange, frequency, min, isNewPlan }: {
  id: string; value: string; onChange: (v: string) => void; frequency: FeeFrequency; min?: string; isNewPlan: boolean;
}) {
  const oneTime = frequency === 'OneTime';
  const past = !!value && !min && value < todayIso();
  const preview = !value ? ''
    : oneTime ? `One-time bill on ${fmtDate(value)}.`
    : `Bills on ${fmtDate(value)}, then ${fmtDate(addPeriodsIso(value, frequency, 1))}, ${fmtDate(addPeriodsIso(value, frequency, 2))}…`;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{oneTime ? 'Bill date' : isNewPlan ? 'New price starts' : 'First bill date'}</label>
      <input id={id} type="date" value={value} min={min} onChange={(event) => onChange(event.target.value)} className="settings-input" />
      {preview && <p className="mt-1 text-xs text-[#9e9e9e]">{preview}</p>}
      {past && (
        <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-[#b45309] dark:text-amber-300">
          <JisIcon className="shrink-0 text-[14px]">history</JisIcon>
          <span>This date is in the past — students already enrolled by then get back-dated (overdue) bills.</span>
        </p>
      )}
    </div>
  );
}

/** Select options for the per-course Upcoming notice: academy default, then 1–30 days before the due date. */
const NOTICE_DEFAULT = 'default';
const NOTICE_OPTIONS = [
  { value: NOTICE_DEFAULT, label: 'Academy default' },
  ...Array.from({ length: 30 }, (_, i) => i + 1).map((n) => ({ value: String(n), label: n === 1 ? '1 day' : `${n} days` })),
];

function UpcomingNoticeField({ id, value, onChange }: { id: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="rounded-2xl border border-[#dbdbdb] p-3.5 dark:border-[#243244]">
      <label htmlFor={id} className="block text-sm font-bold text-[#212121] dark:text-white">Upcoming fee notice</label>
      <p className="mt-0.5 mb-2.5 text-xs text-[#808080] dark:text-[#94a3b8]">Show upcoming fees this many days before the due date.</p>
      <SimpleSelect id={id} value={value === null ? NOTICE_DEFAULT : String(value)}
        onValueChange={(next) => onChange(next === NOTICE_DEFAULT ? null : Number(next))}
        options={NOTICE_OPTIONS} />
    </div>
  );
}

export interface NewCourseFee {
  name: string;
  amount: number;
  frequency: FeeFrequency;
  dueDate: string;
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourse?: Course | null;
  feeStructures: FeeStructure[];
  onSave: (name: string, description: string, isActive: boolean, fee: NewCourseFee | null,
    upcomingNotificationDays: number | null) => Promise<void>;
  onArchive?: (courseId: string) => Promise<void>;
  onAddFeeStructure: (payload: {
    courseId: string; name: string; amount: number; frequency: FeeFrequency; effectiveFrom: string;
  }) => Promise<void>;
  onUpdateFeeStructure: (structureId: string, payload: {
    name: string; effectiveTo?: string | null; isActive: boolean;
  }) => Promise<void>;
}


export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen, onClose, editingCourse, feeStructures, onSave, onArchive, onAddFeeStructure, onUpdateFeeStructure
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  // Create mode is a 2-step wizard (1 = details, 2 = fee). Ignored while editing.
  const [step, setStep] = useState<1 | 2>(1);
  const [setFeeNow, setSetFeeNow] = useState(true);
  const [feeName, setFeeName] = useState('Monthly Fee');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeFrequency, setFeeFrequency] = useState<FeeFrequency>('Monthly');
  // The date the first bill is dated. Recurring bills fall on the same day, one period apart.
  const [feeStartDate, setFeeStartDate] = useState(todayIso());
  // Days before the due date a fee shows as Upcoming; null = academy default.
  const [noticeDays, setNoticeDays] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  // Fee plan management (edit mode only) — one form for everything.
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planError, setPlanError] = useState('');
  const [planActive, setPlanActive] = useState(true);

  const courseFeeStructures = editingCourse ? feeStructures.filter((f) => f.courseId === editingCourse.id) : [];

  // The admin picks the exact first-bill date; the engine bills from there on the plan's cadence.
  const isFirstPlan = !editingCourse || courseFeeStructures.length === 0;
  const resolvedFeeDate = feeStartDate;
  const activePlan = courseFeeStructures.find((f) => f.isActive);
  // A superseding (price-change) plan must begin after the current one.
  const minStartDate = !isFirstPlan && activePlan ? addDaysToIso(activePlan.effectiveFrom.slice(0, 10), 1) : undefined;
  const pastPlans = [...courseFeeStructures.filter((f) => !f.isActive)]
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  useEffect(() => {
    if (!isOpen) return;
    setName(editingCourse?.name || '');
    setDescription(editingCourse?.description || '');
    setIsActive(editingCourse?.isActive ?? true);
    setStep(1);
    setSetFeeNow(true);
    setFeeName('Monthly Fee');
    setFeeAmount('');
    setFeeFrequency('Monthly');
    setFeeStartDate(todayIso());
    setNoticeDays(editingCourse?.upcomingNotificationDays ?? null);
    setError('');
    setPlanFormOpen(false);
    setShowHistory(false);
    setPlanError('');
  }, [isOpen, editingCourse]);

  // True when saving the plan form would create a NEW forward-dated plan rather than edit in place:
  // there's no plan yet, or the amount/frequency has been changed.
  const planFormCreatesNew = !activePlan
    || (Number(feeAmount) || 0) !== activePlan.amount
    || feeFrequency !== activePlan.frequency;

  if (!isOpen) return null;

  const handleArchive = async () => {
    if (!editingCourse || !onArchive) return;
    if (!(await confirmAction({
      title: `Archive "${editingCourse.name}"?`,
      text: 'It will be marked inactive and hidden from new batch/enrollment options, but existing history is kept.',
      confirmText: 'Archive',
      tone: 'destructive',
    }))) return;
    setArchiving(true);
    setError('');
    try {
      await onArchive(editingCourse.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not archive the course.');
    } finally {
      setArchiving(false);
    }
  };

  const goToFeeStep = () => {
    if (!name.trim()) { setError('Enter a course name first.'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    // In create mode the form only submits from step 2.
    if (!editingCourse && step !== 2) { goToFeeStep(); return; }
    const wantsFee = !editingCourse && setFeeNow;
    const parsedAmount = Number(feeAmount);
    if (wantsFee && (!feeName.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      setError('Enter a valid fee name and amount, or turn off "Set the fee now".');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), description.trim(), isActive,
        wantsFee ? { name: feeName.trim(), amount: parsedAmount, frequency: feeFrequency, dueDate: resolvedFeeDate } : null,
        noticeDays);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the course.');
    } finally {
      setSubmitting(false);
    }
  };

  // One entry point. Pre-fills the current plan so a rename doesn't force re-typing the amount.
  const openPlanForm = () => {
    setFeeName(activePlan?.name ?? 'Monthly Fee');
    setFeeAmount(activePlan ? String(activePlan.amount) : '');
    const freq = activePlan?.frequency ?? 'Monthly';
    setFeeFrequency(freq);
    // A price change supersedes the current plan, so default the start one period ahead of it.
    setFeeStartDate(activePlan ? addPeriodsIso(activePlan.effectiveFrom.slice(0, 10), freq, 1) : todayIso());
    setPlanActive(activePlan?.isActive ?? true);
    setPlanError('');
    setPlanFormOpen(true);
  };

  // Changing the amount or frequency starts a NEW forward-dated plan (past bills keep the old
  // price). Anything else is an in-place edit of the current plan.
  const handlePlanSubmit = async () => {
    if (!editingCourse) return;
    const parsedAmount = Number(feeAmount);
    const trimmedName = feeName.trim();
    if (!trimmedName || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPlanError('Enter a valid fee name and amount.');
      return;
    }
    const priceChanged = !activePlan || parsedAmount !== activePlan.amount || feeFrequency !== activePlan.frequency;
    setPlanSubmitting(true);
    setPlanError('');
    try {
      if (priceChanged) {
        await onAddFeeStructure({
          courseId: editingCourse.id, name: trimmedName, amount: parsedAmount,
          frequency: feeFrequency, effectiveFrom: resolvedFeeDate,
        });
      } else {
        await onUpdateFeeStructure(activePlan.id, {
          name: trimmedName, effectiveTo: null, isActive: planActive,
        });
      }
      setPlanFormOpen(false);
    } catch (requestError) {
      setPlanError(requestError instanceof Error ? requestError.message : 'Could not save the plan.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const subtitle = editingCourse ? editingCourse.name : (name.trim() || 'Untitled course');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-course-title" className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-[#dbdbdb] bg-white shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl">
        {/* Header */}
        <div className="shrink-0 border-b border-[#dbdbdb]/60 px-6 pt-5 pb-4 dark:border-[#243244]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 id="add-course-title" className="font-heading text-lg font-bold text-[#212121] dark:text-white">
                {editingCourse ? 'Edit course' : 'New course'}
              </h3>
              {(editingCourse || (!editingCourse && step === 2)) && (
                <p className="mt-0.5 truncate text-xs text-[#808080] dark:text-[#94a3b8]">{subtitle}</p>
              )}
            </div>
            <Button type="button" onClick={onClose} aria-label="Close"
              className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
              <JisIcon className="text-[18px]">close</JisIcon>
            </Button>
          </div>
          {!editingCourse && (
            <div className="mt-3.5 flex items-center gap-2">
              {([[1, 'Details'], [2, 'Fee']] as const).map(([n, stepLabel], index) => {
                const done = step > n;
                const current = step === n;
                return (
                  <React.Fragment key={n}>
                    {index > 0 && <span className={`h-px flex-1 ${done || current ? 'bg-[#3fc073]/50' : 'bg-[#dbdbdb] dark:bg-[#243244]'}`} />}
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${current ? 'text-[#3fc073]' : done ? 'text-[#575757] dark:text-[#cbd5e1]' : 'text-[#9e9e9e]'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        current ? 'bg-[#3fc073] text-white' : done ? 'bg-[#3fc073]/15 text-[#3fc073]' : 'bg-[#f0f0f0] text-[#9e9e9e] dark:bg-[#172435]'
                      }`}>
                        {done ? <JisIcon className="text-[13px]">check</JisIcon> : n}
                      </span>
                      {stepLabel}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col font-sans text-sm">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">

            {/* Step 1 — Details (create), or the details block (edit) */}
            {(editingCourse || step === 1) && (
              <>
                <div>
                  <label htmlFor="course-name" className={labelClass}>Course name <span className="text-[#ef4444]">*</span></label>
                  <input id="course-name" type="text" required autoFocus placeholder="e.g. Bharatanatyam" value={name}
                    onChange={(event) => setName(event.target.value)} className="settings-input" />
                  <p className="mt-1 text-xs text-[#9e9e9e]">Shown on batches, enrollments and receipts.</p>
                </div>
                <div>
                  <label htmlFor="course-description" className={labelClass}>Description</label>
                  <textarea id="course-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional — a short note about this course."
                    className="min-h-[84px] w-full rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] p-3 text-sm text-[#212121] outline-none transition-all placeholder:text-[#9e9e9e] focus:border-[#3fc073] focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#e2e8f0] dark:placeholder:text-[#64748b] dark:focus:bg-[#0b1422]" />
                </div>
                {editingCourse && (
                  <div className="rounded-2xl border border-[#dbdbdb] p-3.5 dark:border-[#243244]">
                    <ToggleRow checked={isActive} onChange={setIsActive}
                      title="Course is active"
                      hint="Inactive courses stay in reports but can't take new batches or enrollments." />
                  </div>
                )}
              </>
            )}

            {/* Step 2 — Fee (create) */}
            {!editingCourse && step === 2 && (
              <>
                <div className="rounded-2xl border border-[#dbdbdb] p-3.5 dark:border-[#243244]">
                  <ToggleRow checked={setFeeNow} onChange={setSetFeeNow}
                    title="Bill on a schedule now"
                    hint="Every enrolled student is billed this amount each period, on a shared due date." />
                </div>
                {setFeeNow ? (
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="course-fee-name" className={labelClass}>Fee name</label>
                      <input id="course-fee-name" type="text" value={feeName} onChange={(event) => setFeeName(event.target.value)}
                        placeholder="e.g. Monthly Fee" className="settings-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="course-fee-amount" className={labelClass}>Amount (₹)</label>
                        <input id="course-fee-amount" type="number" min="1" step="1" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)}
                          placeholder="2000" className="settings-input" />
                      </div>
                      <div>
                        <label htmlFor="course-fee-frequency" className={labelClass}>Frequency</label>
                        <SimpleSelect id="course-fee-frequency" value={feeFrequency}
                          onValueChange={(value) => setFeeFrequency(value as FeeFrequency)}
                          options={(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => ({ value: f, label: FEE_FREQUENCY_LABELS[f] }))} />
                      </div>
                    </div>
                    <FirstBillDateField id="course-fee-start" value={feeStartDate} onChange={setFeeStartDate}
                      frequency={feeFrequency} isNewPlan={false} />
                  </div>
                ) : (
                  <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
                    You can add a fee plan later from the course's page. Students won't be billed until then.
                  </p>
                )}
                <UpcomingNoticeField id="course-upcoming-notice" value={noticeDays} onChange={setNoticeDays} />
              </>
            )}

            {/* Fee plan (edit) */}
            {editingCourse && (
              <div className="rounded-2xl border border-[#dbdbdb] p-3.5 dark:border-[#243244]">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Fee plan</h4>
                  {!planFormOpen && (
                    <Button type="button" onClick={openPlanForm}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#3fc073] hover:bg-[#3fc073]/10 transition-colors">
                      <JisIcon className="text-[14px]">{activePlan ? 'edit' : 'add'}</JisIcon>
                      {activePlan ? 'Edit plan' : 'Set up plan'}
                    </Button>
                  )}
                </div>

                {!planFormOpen && (
                  activePlan ? (
                    <div className="mt-2.5">
                      <div className="truncate text-sm font-bold text-[#212121] dark:text-white">{activePlan.name}</div>
                      <div className="mt-0.5 text-xs text-[#575757] dark:text-[#cbd5e1]">
                        <span className="font-bold text-[#3fc073] tabular-nums">₹{activePlan.amount.toLocaleString('en-IN')}</span>
                        {' · '}{FEE_FREQUENCY_LABELS[activePlan.frequency]}
                      </div>
                      <div className="mt-0.5 text-xs text-[#9e9e9e]">Next due {fmtDate(activePlan.effectiveFrom)}</div>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[#808080] dark:text-[#94a3b8]">No plan yet — students won't be billed until one is added.</p>
                  )
                )}

                {planFormOpen && (
                  <div className="mt-2.5 space-y-2.5" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handlePlanSubmit(); } }}>
                    <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
                      {planFormCreatesNew
                        ? `Starts a new plan on ${fmtDate(resolvedFeeDate)}. The current plan ends the day before — past bills keep their price.`
                        : 'Editing this plan. Change the amount or frequency to start a new priced plan instead.'}
                    </p>
                    <div>
                      <label className={labelClass}>Fee name</label>
                      <input value={feeName} onChange={(event) => setFeeName(event.target.value)} placeholder="e.g. Monthly Fee" className="settings-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className={labelClass}>Amount (₹)</label>
                        <input type="number" min="1" step="1" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} placeholder="2000" className="settings-input" />
                      </div>
                      <div>
                        <label className={labelClass}>Frequency</label>
                        <SimpleSelect aria-label="Fee frequency" value={feeFrequency}
                          onValueChange={(value) => setFeeFrequency(value as FeeFrequency)}
                          options={(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => ({ value: f, label: FEE_FREQUENCY_LABELS[f] }))} />
                      </div>
                    </div>
                    {planFormCreatesNew ? (
                      <FirstBillDateField id="plan-fee-start" value={feeStartDate} onChange={setFeeStartDate}
                        frequency={feeFrequency} min={minStartDate} isNewPlan={!isFirstPlan} />
                    ) : (
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
                        <input type="checkbox" checked={planActive} onChange={(event) => setPlanActive(event.target.checked)} className="h-3.5 w-3.5 accent-[#3fc073] rounded" />
                        Plan is active
                      </label>
                    )}
                    {planError && <p className="text-xs font-bold text-[#ef4444]">{planError}</p>}
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <Button type="button" onClick={() => setPlanFormOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
                      <Button type="button" onClick={handlePlanSubmit} disabled={planSubmitting || !feeName.trim() || !feeAmount} className="btn-brand rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-50">
                        {planSubmitting ? 'Saving…' : planFormCreatesNew ? 'Save new plan' : 'Save changes'}
                      </Button>
                    </div>
                  </div>
                )}

                {pastPlans.length > 0 && !planFormOpen && (
                  <div className="mt-2.5 border-t border-[#dbdbdb]/60 pt-2.5 dark:border-[#243244]">
                    <Button type="button" onClick={() => setShowHistory((value) => !value)}
                      className="flex items-center gap-1 text-xs font-bold text-[#808080] hover:text-[#212121] dark:hover:text-white">
                      <JisIcon className={`text-[14px] transition-transform ${showHistory ? 'rotate-180' : ''}`}>expand_more</JisIcon>
                      Past plans ({pastPlans.length})
                    </Button>
                    {showHistory && (
                      <div className="mt-2 space-y-1.5">
                        {pastPlans.map((plan) => (
                          <div key={plan.id} className="rounded-xl bg-[#f0f0f0] px-2.5 py-1.5 text-xs text-[#808080] dark:bg-[#111c2b] dark:text-[#94a3b8]">
                            {plan.name} · ₹{plan.amount.toLocaleString('en-IN')} / {FEE_FREQUENCY_LABELS[plan.frequency]} · ended {plan.effectiveTo ? fmtDate(plan.effectiveTo) : '—'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {editingCourse && (
              <UpcomingNoticeField id="course-upcoming-notice" value={noticeDays} onChange={setNoticeDays} />
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[#dbdbdb]/60 bg-white/95 px-6 py-4 backdrop-blur dark:border-[#243244] dark:bg-[#0b1422]/95">
            {error && (
              <p role="alert" className="mb-2.5 flex items-start gap-1.5 text-xs font-bold text-[#ef4444]">
                <JisIcon className="text-[15px] shrink-0">error</JisIcon>
                <span>{error}</span>
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {editingCourse && onArchive ? (
                <Button type="button" onClick={handleArchive} disabled={submitting || archiving}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold text-[#ef4444] hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/40 sm:justify-start transition-colors">
                  <JisIcon className="text-[16px]">archive</JisIcon>
                  {archiving ? 'Archiving…' : 'Archive course'}
                </Button>
              ) : <span className="hidden sm:block" />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {!editingCourse && step === 2 ? (
                  <Button type="button" onClick={() => { setError(''); setStep(1); }} disabled={submitting}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-2xl px-4 py-2 text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
                    <JisIcon className="text-[16px]">arrow_back</JisIcon> Back
                  </Button>
                ) : (
                  <Button type="button" onClick={onClose} disabled={submitting || archiving}
                    className="min-h-11 rounded-2xl px-4 py-2 text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
                )}
                {!editingCourse && step === 1 ? (
                  <Button type="button" onClick={goToFeeStep} disabled={!name.trim()}
                    className="btn-brand flex min-h-11 items-center justify-center gap-1 rounded-2xl px-5 py-2 text-xs font-bold disabled:opacity-50">
                    Next <JisIcon className="text-[16px]">arrow_forward</JisIcon>
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting || archiving || !name.trim()}
                    className="btn-brand min-h-11 rounded-2xl px-5 py-2 text-xs font-bold disabled:opacity-50">
                    {submitting ? 'Saving…' : editingCourse ? 'Save changes' : 'Create course'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
