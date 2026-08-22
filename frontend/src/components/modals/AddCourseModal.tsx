import React, { useEffect, useState } from 'react';
import { Course, FeeFrequency, FEE_FREQUENCY_LABELS } from '../../types';
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
  onSave: (name: string, description: string, isActive: boolean, fee: NewCourseFee | null) => Promise<void>;
  onArchive?: (courseId: string) => Promise<void>;
}

const todayIso = () => new Date().toISOString().split('T')[0];

export const AddCourseModal: React.FC<AddCourseModalProps> = ({ isOpen, onClose, editingCourse, onSave, onArchive }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-course-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="add-course-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white">
            {editingCourse ? 'Edit course' : 'New course'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="course-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Course name *</label>
            <input id="course-name" type="text" required autoFocus placeholder="e.g. Bharatanatyam" value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
          </div>
          <div>
            <label htmlFor="course-description" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Description</label>
            <textarea id="course-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
          </div>
          {editingCourse && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Course is active
            </label>
          )}

          {!editingCourse && (
            <div className="rounded-xl border border-brand-200/70 bg-brand-50/40 p-3.5 dark:border-brand-800 dark:bg-brand-950/30 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={setFeeNow} onChange={(event) => setSetFeeNow(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Set the fee now
              </label>
              {setFeeNow && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                    Every student enrolled in this course will be billed this amount on this schedule, all sharing the same due date each period.
                  </p>
                  <div>
                    <label htmlFor="course-fee-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Fee name</label>
                    <input id="course-fee-name" type="text" value={feeName} onChange={(event) => setFeeName(event.target.value)}
                      placeholder="e.g. Monthly Fee"
                      className="w-full min-h-11 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="course-fee-amount" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Amount (₹)</label>
                      <input id="course-fee-amount" type="number" min="1" step="1" value={feeAmount} onChange={(event) => setFeeAmount(event.target.value)}
                        placeholder="2000"
                        className="w-full min-h-11 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label htmlFor="course-fee-frequency" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frequency</label>
                      <select id="course-fee-frequency" value={feeFrequency} onChange={(event) => setFeeFrequency(event.target.value as FeeFrequency)}
                        className="w-full min-h-11 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                        {(Object.keys(FEE_FREQUENCY_LABELS) as FeeFrequency[]).map((f) => <option key={f} value={f}>{FEE_FREQUENCY_LABELS[f]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="course-fee-due" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Due date</label>
                    <input id="course-fee-due" type="date" value={feeDueDate} onChange={(event) => setFeeDueDate(event.target.value)}
                      className="w-full min-h-11 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
                    {feeFrequency !== 'OneTime' && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Repeats on this day of the {feeFrequency === 'Monthly' ? 'month' : 'cycle'} for every student.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {editingCourse && onArchive ? (
              <button type="button" onClick={handleArchive} disabled={submitting || archiving}
                className="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start">
                <span className="material-symbols-outlined text-[16px]">archive</span>
                {archiving ? 'Archiving…' : 'Archive course'}
              </button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={submitting || archiving} className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button type="submit" disabled={submitting || archiving || !name.trim()} className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                {submitting ? 'Saving…' : editingCourse ? 'Save changes' : 'Create course'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
