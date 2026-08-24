import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Course, FeeFrequency, FeeStructure, FEE_FREQUENCY_LABELS } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

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
  onSave: (name: string, description: string, isActive: boolean, fee: NewCourseFee | null) => Promise<void>;
  onArchive?: (courseId: string) => Promise<void>;
  onAddFeeStructure: (payload: { courseId: string; name: string; amount: number; frequency: FeeFrequency; effectiveFrom: string }) => Promise<void>;
  onUpdateFeeStructure: (structureId: string, payload: { name: string; effectiveTo?: string | null; isActive: boolean }) => Promise<void>;
}

const todayIso = () => new Date().toISOString().split('T')[0];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen, onClose, editingCourse, feeStructures, onSave, onArchive, onAddFeeStructure, onUpdateFeeStructure
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [setFeeNow, setSetFeeNow] = useState(true);
  const [feeName, setFeeName] = useState('Monthly Fee');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeFrequency, setFeeFrequency] = useState<FeeFrequency>('Monthly');
  const [feeDueDate, setFeeDueDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  // Fee plan management (edit mode only)
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planError, setPlanError] = useState('');
  const [editingPlan, setEditingPlan] = useState(false);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanEffectiveTo, setEditPlanEffectiveTo] = useState('');
  const [editPlanIsActive, setEditPlanIsActive] = useState(true);

  const courseFeeStructures = editingCourse ? feeStructures.filter((f) => f.courseId === editingCourse.id) : [];
  const activePlan = courseFeeStructures.find((f) => f.isActive);
  const pastPlans = [...courseFeeStructures.filter((f) => !f.isActive)]
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  useEffect(() => {
    if (!isOpen) return;
    setName(editingCourse?.name || '');
    setDescription(editingCourse?.description || '');
    setIsActive(editingCourse?.isActive ?? true);
    setSetFeeNow(true);
    setFeeName('Monthly Fee');
    setFeeAmount('');
    setFeeFrequency('Monthly');
    setFeeDueDate(todayIso());
    setError('');
    setShowNewPlanForm(false);
    setShowHistory(false);
    setEditingPlan(false);
    setPlanError('');
  }, [isOpen, editingCourse]);

  if (!isOpen) return null;

  const handleArchive = async () => {
    if (!editingCourse || !onArchive) return;
    if (!confirm(`Archive "${editingCourse.name}"? It will be marked inactive and hidden from new batch/enrollment options, but existing history is kept.`)) return;
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
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
        wantsFee ? { name: feeName.trim(), amount: parsedAmount, frequency: feeFrequency, dueDate: feeDueDate } : null);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the course.');
    } finally {
      setSubmitting(false);
    }
  };

  const openNewPlanForm = () => {
    setFeeName(activePlan ? activePlan.name : 'Monthly Fee');
    setFeeAmount('');
    setFeeFrequency(activePlan ? activePlan.frequency : 'Monthly');
    setFeeDueDate(todayIso());
    setPlanError('');
    setShowNewPlanForm(true);
  };

  const handleNewPlanSubmit = async () => {
    if (!editingCourse) return;
    const parsedAmount = Number(feeAmount);
    if (!feeName.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPlanError('Enter a valid fee name and amount.');
      return;
    }
    setPlanSubmitting(true);
    setPlanError('');
    try {
      await onAddFeeStructure({ courseId: editingCourse.id, name: feeName.trim(), amount: parsedAmount, frequency: feeFrequency, effectiveFrom: feeDueDate });
      setShowNewPlanForm(false);
    } catch (requestError) {
      setPlanError(requestError instanceof Error ? requestError.message : 'Could not save the fee plan.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  const openEditPlan = () => {
    if (!activePlan) return;
    setEditPlanName(activePlan.name);
    setEditPlanEffectiveTo(activePlan.effectiveTo || '');
    setEditPlanIsActive(activePlan.isActive);
    setPlanError('');
    setEditingPlan(true);
  };

  const handleEditPlanSubmit = async () => {
    if (!activePlan || !editPlanName.trim()) return;
    setPlanSubmitting(true);
    setPlanError('');
    try {
      await onUpdateFeeStructure(activePlan.id, { name: editPlanName.trim(), effectiveTo: editPlanEffectiveTo || null, isActive: editPlanIsActive });
      setEditingPlan(false);
    } catch (requestError) {
      setPlanError(requestError instanceof Error ? requestError.message : 'Could not save changes.');
    } finally {
      setPlanSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-md sm:p-5">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-course-title" className="max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-3xl border border-[#dbdbdb] bg-white shadow-2xl dark:border-[#243244] dark:bg-[#0b1422]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#dbdbdb]/60 px-5 py-5 dark:border-[#243244] sm:px-7">
          <h3 id="add-course-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
            {editingCourse ? 'Edit course' : 'New course'}
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 max-h-[calc(92dvh-86px)] flex-col font-sans text-sm">
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7 space-y-4">
          <div>
            <label htmlFor="course-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Course name *</label>
            <input id="course-name" type="text" required autoFocus placeholder="e.g. Bharatanatyam" value={name}
              onChange={(event) => setName(event.target.value)}
              className="settings-input" />
          </div>
          <div>
            <label htmlFor="course-description" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Description</label>
            <textarea id="course-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)}
              className="w-full p-3 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:border-[#3fc073]" />
          </div>
          {editingCourse && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#3fc073] rounded" />
              Course is active
            </label>
          )}

          {!editingCourse && (
            <div className="rounded-3xl border border-[#cbecd8] bg-[#f4fbf7]/60 p-4 dark:border-[#3fc073]/30 dark:bg-[#07111f]/40 space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[#212121] dark:text-white cursor-pointer">
                <input type="checkbox" checked={setFeeNow} onChange={(event) => setSetFeeNow(event.target.checked)} className="h-4 w-4 accent-[#3fc073] rounded" />
                Set the fee now
              </label>
              {setFeeNow && (
                <div className="space-y-3">
                  <p className="text-xs text-[#808080] dark:text-[#94a3b8] -mt-1">
                    Every student enrolled in this course will be billed this amount on this schedule, all sharing the same due date each period.
                  </p>
                  <div>
                    <label htmlFor="course-fee-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Fee name</label>
                    <input id="course-fee-name" type="text" value={feeName} onChange={(event) => setFeeName(event.target.value)}
                      placeholder="e.g. Monthly Fee"
                      className="settings-input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="course-fee-amount" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Amount (₹)</label>
                      <input id="course-fee-amount" type="number" min="1" step="1" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)}
                        placeholder="2000"
                        className="settings-input" />
                    </div>
                    <div>
                      <label htmlFor="course-fee-frequency" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Frequency</label>
                      <select id="course-fee-frequency" value={feeFrequency} onChange={(event) => setFeeFrequency(event.target.value as FeeFrequency)}
                        className="w-full min-h-11 px-3.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white outline-none focus:border-[#3fc073]">
                        {(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => <option key={f} value={f}>{FEE_FREQUENCY_LABELS[f]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="course-fee-due" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Due date</label>
                    <input id="course-fee-due" type="date" value={feeDueDate} onChange={(event) => setFeeDueDate(event.target.value)}
                      className="settings-input" />
                    {feeFrequency !== 'OneTime' && (
                      <p className="mt-1 text-xs text-[#808080] dark:text-[#94a3b8]">
                        Repeats on this day of the {feeFrequency === 'Monthly' ? 'month' : 'cycle'} for every student.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {editingCourse && (
            <div className="rounded-3xl border border-[#cbecd8] bg-[#f4fbf7]/60 p-4 dark:border-[#3fc073]/30 dark:bg-[#07111f]/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3fc073]">Fee plan</h4>
                {!showNewPlanForm && !editingPlan && (
                  <Button type="button" onClick={openNewPlanForm}
                    className="min-h-8 px-2.5 rounded-xl text-xs font-bold text-[#3fc073] hover:bg-white dark:hover:bg-[#0f1a2a] flex items-center gap-1 transition-colors">
                    <JisIcon className="text-[14px]">add</JisIcon>
                    {activePlan ? 'Change price' : 'Set up fee plan'}
                  </Button>
                )}
              </div>

              {!showNewPlanForm && !editingPlan && (
                activePlan ? (
                  <div className="rounded-2xl bg-white dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#212121] dark:text-white truncate">{activePlan.name}</div>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-[#3fc073] tabular-nums">₹{activePlan.amount.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-[#808080]">/ {FEE_FREQUENCY_LABELS[activePlan.frequency]}</span>
                      </div>
                      <div className="text-xs text-[#9e9e9e] mt-0.5">Due {new Date(activePlan.effectiveFrom).toLocaleDateString('en-IN')}</div>
                    </div>
                    <Button type="button" onClick={openEditPlan} aria-label="Edit fee plan"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[#808080] hover:text-[#3fc073] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
                      <JisIcon className="text-[15px]">edit</JisIcon>
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-[#808080] dark:text-[#94a3b8]">No fee plan set for this course yet — students won't be billed until one is added.</p>
                )
              )}

              {editingPlan && activePlan && (
                <div className="space-y-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleEditPlanSubmit(); } }}>
                  <input value={editPlanName} onChange={(event) => setEditPlanName(event.target.value)}
                    className="w-full min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white" />
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">
                    Ends on
                    <input type="date" value={editPlanEffectiveTo} onChange={(event) => setEditPlanEffectiveTo(event.target.value)}
                      className="min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white" />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
                    <input type="checkbox" checked={editPlanIsActive} onChange={(event) => setEditPlanIsActive(event.target.checked)} className="h-3.5 w-3.5 accent-[#3fc073] rounded" />
                    Plan is active
                  </label>
                  {planError && <p className="text-xs text-[#ef4444] font-bold">{planError}</p>}
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <Button type="button" onClick={() => setEditingPlan(false)} className="min-h-8 px-2.5 rounded-xl text-xs font-semibold text-[#575757] hover:bg-white dark:hover:bg-[#172435]">Cancel</Button>
                    <Button type="button" onClick={handleEditPlanSubmit} disabled={planSubmitting || !editPlanName.trim()} className="btn-brand min-h-8 px-3 rounded-xl text-xs font-bold disabled:opacity-50">{planSubmitting ? 'Saving…' : 'Save'}</Button>
                  </div>
                </div>
              )}

              {showNewPlanForm && (
                <div className="space-y-3" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleNewPlanSubmit(); } }}>
                  {activePlan && (
                    <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
                      This starts a new plan that supersedes "{activePlan.name}" — its due date must be after {new Date(activePlan.effectiveFrom).toLocaleDateString('en-IN')}.
                    </p>
                  )}
                  <input value={feeName} onChange={(event) => setFeeName(event.target.value)} placeholder="Fee name"
                    className="w-full min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="1" step="1" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)} placeholder="Amount ₹"
                      className="min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white" />
                    <select value={feeFrequency} onChange={(event) => setFeeFrequency(event.target.value as FeeFrequency)}
                      className="min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white">
                      {(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => <option key={f} value={f}>{FEE_FREQUENCY_LABELS[f]}</option>)}
                    </select>
                  </div>
                  <input type="date" value={feeDueDate} onChange={(event) => setFeeDueDate(event.target.value)}
                    className="w-full min-h-9 px-2 rounded-xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] text-xs text-[#212121] dark:text-white" />
                  {planError && <p className="text-xs text-[#ef4444] font-bold">{planError}</p>}
                  <div className="flex items-center gap-2 justify-end">
                    <Button type="button" onClick={() => setShowNewPlanForm(false)} className="min-h-8 px-2.5 rounded-xl text-xs font-semibold text-[#575757] hover:bg-white dark:hover:bg-[#172435]">Cancel</Button>
                    <Button type="button" onClick={handleNewPlanSubmit} disabled={planSubmitting || !feeName.trim() || !feeAmount} className="btn-brand min-h-8 px-3 rounded-xl text-xs font-bold disabled:opacity-50">{planSubmitting ? 'Saving…' : 'Save plan'}</Button>
                  </div>
                </div>
              )}

              {pastPlans.length > 0 && (
                <div>
                  <Button type="button" onClick={() => setShowHistory((value) => !value)}
                    className="flex items-center gap-1 text-xs font-bold text-[#808080] hover:text-[#212121] dark:hover:text-white">
                    <JisIcon className={`text-[14px] transition-transform ${showHistory ? 'rotate-180' : ''}`}>expand_more</JisIcon>
                    Past plans ({pastPlans.length})
                  </Button>
                  {showHistory && (
                    <div className="mt-2 space-y-1.5">
                      {pastPlans.map((plan) => (
                        <div key={plan.id} className="text-xs text-[#808080] dark:text-[#94a3b8] rounded-2xl bg-white/60 dark:bg-[#111c2b]/60 px-2.5 py-1.5">
                          {plan.name} · ₹{plan.amount.toLocaleString('en-IN')} / {FEE_FREQUENCY_LABELS[plan.frequency]} · ended {plan.effectiveTo ? new Date(plan.effectiveTo).toLocaleDateString('en-IN') : '—'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          </div>
          <div className="shrink-0 flex flex-col-reverse gap-2.5 border-t border-[#dbdbdb]/60 bg-white/95 px-5 py-4 backdrop-blur dark:border-[#243244] dark:bg-[#0b1422]/95 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            {editingCourse && onArchive ? (
              <Button type="button" onClick={handleArchive} disabled={submitting || archiving}
                className="min-h-11 px-3 py-2 rounded-2xl text-xs font-bold text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start transition-colors">
                <JisIcon className="text-[16px]">archive</JisIcon>
                {archiving ? 'Archiving…' : 'Archive course'}
              </Button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" onClick={onClose} disabled={submitting || archiving} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
              <Button type="submit" disabled={submitting || archiving || !name.trim()} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving…' : editingCourse ? 'Save changes' : 'Create course'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
