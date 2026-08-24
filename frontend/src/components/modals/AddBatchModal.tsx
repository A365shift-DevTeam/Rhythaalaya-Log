import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Batch, Course, Staff, WEEKDAY_LABELS, WEEKDAY_SHORT } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  staff: Staff[];
  editingBatch?: Batch | null;
  onSave: (payload: {
    name: string; courseId: string; staffId: string; days: string[];
    startTime: string; endTime: string; startDate: string; endDate: string | null; isActive: boolean;
  }) => Promise<void>;
  onArchive?: (batchId: string) => Promise<void>;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({ isOpen, onClose, courses, staff, editingBatch, onSave, onArchive }) => {
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  const activeCourses = courses.filter((c) => c.isActive || c.id === courseId);
  const activeStaff = staff.filter((s) => s.isActive || s.id === staffId);

  useEffect(() => {
    if (!isOpen) return;
    setName(editingBatch?.name || '');
    setCourseId(editingBatch?.courseId || activeCourses[0]?.id || '');
    setStaffId(editingBatch?.staffId || activeStaff[0]?.id || '');
    setDays(editingBatch?.days || []);
    setStartTime(editingBatch?.startTime?.slice(0, 5) || '17:00');
    setEndTime(editingBatch?.endTime?.slice(0, 5) || '18:00');
    setStartDate(editingBatch?.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(editingBatch?.endDate || '');
    setIsActive(editingBatch?.isActive ?? true);
    setError('');
  }, [isOpen, editingBatch]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);

  const handleArchive = async () => {
    if (!editingBatch || !onArchive) return;
    if (!confirm(`Archive "${editingBatch.name}"? It will stop appearing for new enrollments and attendance, but existing history is kept.`)) return;
    setArchiving(true);
    setError('');
    try {
      await onArchive(editingBatch.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not archive the batch.');
    } finally {
      setArchiving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !courseId || !staffId || days.length === 0 || !startDate) return;
    if (startTime >= endTime) { setError('End time must be after start time.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(), courseId, staffId, days, startTime, endTime,
        startDate, endDate: endDate || null, isActive
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the batch.');
    } finally {
      setSubmitting(false);
    }
  };

  const noPrerequisites = activeCourses.length === 0 || activeStaff.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-batch-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="add-batch-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
            {editingBatch ? 'Edit batch' : 'Create batch'}
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        {noPrerequisites ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#f59e0b]" role="alert">
            Create at least one active course and one active staff member before creating a batch.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
            <div>
              <label htmlFor="batch-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Batch name *</label>
              <input id="batch-name" type="text" required autoFocus placeholder="e.g. Evening Batch - Beginners" value={name}
                onChange={(event) => setName(event.target.value)}
                className="settings-input" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="batch-course" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Course *</label>
                <select id="batch-course" required value={courseId} onChange={(event) => setCourseId(event.target.value)}
                  className="w-full min-h-11 px-3.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white outline-none focus:border-[#3fc073]">
                  {activeCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="batch-staff" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Staff / mentor *</label>
                <select id="batch-staff" required value={staffId} onChange={(event) => setStaffId(event.target.value)}
                  className="w-full min-h-11 px-3.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm font-semibold text-[#212121] dark:text-white outline-none focus:border-[#3fc073]">
                  {activeStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Days of the week *</span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select batch days">
                {WEEKDAY_LABELS.map((day, index) => (
                  <Button key={day} type="button" onClick={() => toggleDay(day)} aria-pressed={days.includes(day)}
                    className={`min-h-10 min-w-11 px-2.5 rounded-2xl text-xs font-bold border transition-all ${
                      days.includes(day)
                        ? 'bg-[#3fc073] border-[#3fc073] text-white shadow-xs'
                        : 'bg-[#f0f0f0] dark:bg-[#111c2b] border-[#dbdbdb] dark:border-[#243244] text-[#575757] dark:text-[#cbd5e1] hover:border-[#3fc073]/40'
                    }`}>
                    {WEEKDAY_SHORT[index]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="batch-start-time" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Start time *</label>
                <input id="batch-start-time" type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)}
                  className="settings-input" />
              </div>
              <div>
                <label htmlFor="batch-end-time" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">End time *</label>
                <input id="batch-end-time" type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)}
                  className="settings-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="batch-start-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Start date *</label>
                <input id="batch-start-date" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)}
                  className="settings-input" />
              </div>
              <div>
                <label htmlFor="batch-end-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">End date</label>
                <input id="batch-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)}
                  min={startDate} className="settings-input" />
              </div>
            </div>

            {editingBatch && (
              <label className="flex items-center gap-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#3fc073] rounded" />
                Batch is active
              </label>
            )}

            {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              {editingBatch && onArchive ? (
                <Button type="button" onClick={handleArchive} disabled={submitting || archiving}
                  className="min-h-11 px-3 py-2 rounded-2xl text-xs font-bold text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start transition-colors">
                  <JisIcon className="text-[16px]">archive</JisIcon>
                  {archiving ? 'Archiving…' : 'Archive batch'}
                </Button>
              ) : <span />}
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" onClick={onClose} disabled={submitting || archiving} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
                <Button type="submit" disabled={submitting || archiving} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50">
                  {submitting ? 'Saving…' : editingBatch ? 'Save changes' : 'Create batch'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
