import React, { useEffect, useState } from 'react';
import { Batch, Course, Staff, WEEKDAY_LABELS, WEEKDAY_SHORT } from '../../types';
import { Dialog, DialogError } from './Dialog';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  staff: Staff[];
  editingBatch?: Batch | null;
  onSave: (payload: {
    name: string;
    courseId: string;
    staffId: string;
    days: string[];
    startTime: string;
    endTime: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
  }) => Promise<void>;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  courses,
  staff,
  editingBatch,
  onSave
}) => {
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
  const [error, setError] = useState('');
  const formId = 'batch-form';

  const availableCourses = courses.filter((course) => course.isActive || course.id === courseId);
  const availableStaff = staff.filter((member) => member.isActive || member.id === staffId);

  useEffect(() => {
    if (!isOpen) return;
    setName(editingBatch?.name || '');
    setCourseId(editingBatch?.courseId || courses.find((course) => course.isActive)?.id || '');
    setStaffId(editingBatch?.staffId || staff.find((member) => member.isActive)?.id || '');
    setDays(editingBatch?.days || []);
    setStartTime(editingBatch?.startTime?.slice(0, 5) || '17:00');
    setEndTime(editingBatch?.endTime?.slice(0, 5) || '18:00');
    setStartDate(editingBatch?.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(editingBatch?.endDate || '');
    setIsActive(editingBatch?.isActive ?? true);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingBatch]);

  const toggleDay = (day: string) =>
    setDays((previous) => previous.includes(day)
      ? previous.filter((item) => item !== day)
      : [...previous, day]);

  const blocked = availableCourses.length === 0 || availableStaff.length === 0;
  const complete = Boolean(name.trim() && courseId && staffId && days.length && startDate);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete) {
      setError('Fill in the name, course, teacher, at least one day, and a start date.');
      return;
    }
    if (startTime >= endTime) {
      setError('The class has to end after it starts.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(), courseId, staffId, days, startTime, endTime,
        startDate, endDate: endDate || null, isActive
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The batch could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingBatch ? 'Edit batch' : 'Add batch'}
      description="A batch is one class: a course, a teacher, and the days it meets."
      footer={blocked ? (
        <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
      ) : (
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" form={formId} disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : editingBatch ? 'Save batch' : 'Add batch'}
          </button>
        </>
      )}
    >
      {blocked ? (
        <div className="empty">
          <p className="text-[13px] font-semibold text-ink">Set up a course and a teacher first</p>
          <p className="label max-w-80">
            A batch needs an active course to teach and a teacher to run it. Add both on the Batches
            screen, then come back here.
          </p>
        </div>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="batch-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
            <input
              id="batch-name"
              type="text"
              required
              autoFocus
              placeholder="Vocal — Beginners"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="batch-course" className="label mb-1.5 block font-semibold text-ink">Course</label>
              <select
                id="batch-course"
                required
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className="field"
              >
                {availableCourses.map((course) => (
                  <option key={course.id} value={course.id}>{course.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="batch-staff" className="label mb-1.5 block font-semibold text-ink">Teacher</label>
              <select
                id="batch-staff"
                required
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                className="field"
              >
                {availableStaff.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Picking the days is picking a point in the weekly cycle, so the
              control is the same seven-slot grid the batch card shows. */}
          <fieldset>
            <legend className="label mb-1.5 font-semibold text-ink">Meets on</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((day, index) => {
                const on = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={on}
                    aria-label={day}
                    className={`beat h-11 w-11 text-[12px] ${on ? 'beat-on' : 'hover:border-ink-3'}`}
                  >
                    {WEEKDAY_SHORT[index].charAt(0)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="batch-start-time" className="label mb-1.5 block font-semibold text-ink">Starts</label>
              <input
                id="batch-start-time"
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="field num"
              />
            </div>
            <div>
              <label htmlFor="batch-end-time" className="label mb-1.5 block font-semibold text-ink">Ends</label>
              <input
                id="batch-end-time"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="field num"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="batch-start-date" className="label mb-1.5 block font-semibold text-ink">
                First class
              </label>
              <input
                id="batch-start-date"
                type="date"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="field num"
              />
            </div>
            <div>
              <label htmlFor="batch-end-date" className="label mb-1.5 block font-semibold text-ink">
                Last class
              </label>
              <input
                id="batch-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field num"
              />
              <p className="label-xs mt-1.5">Leave empty if it runs indefinitely.</p>
            </div>
          </div>

          {editingBatch && (
            <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line px-3 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="h-4 w-4 shrink-0 accent-[var(--c-leaf)]"
              />
              Running
            </label>
          )}

          <DialogError message={error} />
        </form>
      )}
    </Dialog>
  );
};
