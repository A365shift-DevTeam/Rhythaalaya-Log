import React, { useRef, useState } from 'react';
import { Batch } from '../../types';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (batch: Batch) => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  onAddBatch
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [schedule, setSchedule] = useState('');
  const [instructor, setInstructor] = useState('Sarah Connor');
  const schedulePickerRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !schedule) return;

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
      enrolledCount: 0
    };

    onAddBatch(newBatch);
    onClose();
    setName('');
    setCourse('');
    setSchedule('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#a8ddd0]/40 space-y-4">
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
            Create New Batch / Course
          </h3>
          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1">
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
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Course / Style Name
            </label>
            <input
              type="text"
              placeholder="e.g. Salsa"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
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
                className="w-full py-2.5 pl-3 pr-14 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <button
                type="button"
                aria-label="Open calendar and time picker"
                title="Choose date and time"
                onClick={() => {
                  schedulePickerRef.current?.focus();
                  schedulePickerRef.current?.showPicker?.();
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-9 rounded-lg bg-[#45b080] hover:bg-[#36946a] text-white flex items-center justify-center transition-colors shadow-sm"
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
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#f3faf7]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-brand px-5 py-2 rounded-xl text-xs font-semibold"
            >
              Create Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
