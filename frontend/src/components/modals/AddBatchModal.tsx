import React, { useRef, useState } from 'react';
import { Batch } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (batch: Batch) => void;
  defaultMonthlyFee: number;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  onAddBatch,
  defaultMonthlyFee
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [schedule, setSchedule] = useState('');
  const [instructor, setInstructor] = useState('Sarah Connor');
  const [monthlyFee, setMonthlyFee] = useState(String(defaultMonthlyFee));
  const schedulePickerRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !course.trim() || !schedule || Number(monthlyFee) <= 0) return;

    const formattedSchedule = new Date(schedule).toLocaleString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newBatch: Batch = {
      id: `b-${Date.now()}`,
      name,
      course: course || name,
      schedule: formattedSchedule,
      instructor,
      monthlyFee: Number(monthlyFee),
      enrolledCount: 0
    };

    onAddBatch(newBatch);
    onClose();
    setName('');
    setCourse('');
    setSchedule('');
    setMonthlyFee(String(defaultMonthlyFee));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-batch-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 id="add-batch-title" className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
            Create New Batch / Course
          </h3>
          <button type="button" onClick={onClose} aria-label="Close add batch" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#565e74] hover:bg-slate-100 hover:text-[#0b1c30] dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Batch Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Evening Batch - Salsa Beginners"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Course / Style Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Salsa"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div>
            <label htmlFor="batch-monthly-fee" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Standard Monthly Fee (₹) *
            </label>
            <input
              id="batch-monthly-fee"
              type="number"
              min="1"
              step="1"
              required
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#45b080]/30 focus:border-[#45b080]"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              This fee is filled automatically when enrolling a student in this course.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Schedule Date & Time *
            </label>
            <div className="relative">
              <input
                ref={schedulePickerRef}
                type="datetime-local"
                required
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full min-h-11 py-2.5 pl-3 pr-14 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <button
                type="button"
                aria-label="Open calendar and time picker"
                title="Choose date and time"
                onClick={() => {
                  schedulePickerRef.current?.focus();
                  schedulePickerRef.current?.showPicker?.();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl bg-[#45b080] hover:bg-[#36946a] text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Lead Instructor
            </label>
            <input
              type="text"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#f3faf7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold"
            >
              Create Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
