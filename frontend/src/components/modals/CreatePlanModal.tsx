import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { useDialogLifecycle } from './useDialogLifecycle';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  busy: boolean;
  onCreate: (data: { name: string; code: string; monthlyPrice: number; maxUsers: number; maxStudents: number }) => Promise<void>;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ isOpen, onClose, busy, onCreate }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setName(''); setCode(''); setMonthlyPrice(''); setMaxUsers(''); setMaxStudents('');
    setError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await onCreate({
        name: name.trim(), code: code.trim(), monthlyPrice: Number(monthlyPrice),
        maxUsers: Number(maxUsers), maxStudents: Number(maxStudents)
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create the plan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-plan-title"
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="create-plan-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">New subscription plan</h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="plan-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Plan name</label>
            <input id="plan-name" required autoFocus placeholder="e.g. Professional" value={name}
              onChange={(event) => setName(event.target.value)} className="settings-input" />
          </div>
          <div>
            <label htmlFor="plan-code" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Short code</label>
            <input id="plan-code" required placeholder="e.g. PRO" value={code}
              onChange={(event) => setCode(event.target.value)} className="settings-input" />
            <p className="mt-1 text-xs text-[#9e9e9e]">A short internal label for this plan — not shown to academies.</p>
          </div>
          <div>
            <label htmlFor="plan-price" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Monthly price (₹)</label>
            <input id="plan-price" type="number" min={0} required placeholder="1999" value={monthlyPrice}
              onChange={(event) => setMonthlyPrice(event.target.value)} className="settings-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-max-users" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Max. people</label>
              <input id="plan-max-users" type="number" min={1} required placeholder="10" value={maxUsers}
                onChange={(event) => setMaxUsers(event.target.value)} className="settings-input" />
            </div>
            <div>
              <label htmlFor="plan-max-students" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Max. students</label>
              <input id="plan-max-students" type="number" min={1} required placeholder="250" value={maxStudents}
                onChange={(event) => setMaxStudents(event.target.value)} className="settings-input" />
            </div>
          </div>
          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
            <Button type="submit" disabled={busy} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <JisIcon className="text-[17px]">{busy ? 'progress_activity' : 'check'}</JisIcon>
              {busy ? 'Creating…' : 'Create plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
