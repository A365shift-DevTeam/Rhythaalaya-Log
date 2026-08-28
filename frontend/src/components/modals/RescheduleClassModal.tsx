import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { useDialogLifecycle } from './useDialogLifecycle';

interface RescheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchName: string;
  /** Human-readable label for the session being moved, e.g. "Thursday, Thu 27 Aug 2026". */
  sessionLabel: string;
  onSubmit: (body: { newDate: string | null; reason: string | null }) => Promise<void>;
}

export const RescheduleClassModal: React.FC<RescheduleClassModalProps> = ({
  isOpen, onClose, batchName, sessionLabel, onSubmit,
}) => {
  const [newDate, setNewDate] = useState('');
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setNewDate(''); setCancel(false); setReason(''); setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || (!cancel && !newDate)) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ newDate: cancel ? null : newDate, reason: reason.trim() || null });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not reschedule the class.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reschedule-class-title"
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="reschedule-class-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
            Reschedule this class
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <p className="text-xs text-[#9e9e9e] leading-relaxed">
            Moves only the {sessionLabel} session of{' '}
            <span className="font-semibold text-[#575757] dark:text-[#cbd5e1]">{batchName}</span> — the rest of the
            batch schedule is untouched.
          </p>

          <div>
            <label htmlFor="reschedule-new-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
              Move to
            </label>
            <input id="reschedule-new-date" type="date" value={newDate} disabled={cancel} autoFocus
              onChange={(event) => setNewDate(event.target.value)}
              className="settings-input disabled:opacity-40" />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
            <input type="checkbox" checked={cancel} onChange={(event) => setCancel(event.target.checked)}
              className="h-4 w-4 accent-[#3fc073] rounded" />
            Cancel this class (no replacement)
          </label>

          <div>
            <label htmlFor="reschedule-reason" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
              Reason (optional)
            </label>
            <input id="reschedule-reason" type="text" value={reason} maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Public holiday" className="settings-input" />
          </div>

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || (!cancel && !newDate)}
              className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50">
              {submitting ? 'Saving…' : cancel ? 'Cancel this class' : 'Move this class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
