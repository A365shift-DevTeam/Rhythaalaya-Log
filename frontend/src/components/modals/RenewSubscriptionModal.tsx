import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Plan, Tenant } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function oneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  plans: Plan[];
  busy: boolean;
  onRenew: (planId: string, endsAt: string) => Promise<void>;
}

export const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({
  isOpen, onClose, tenant, plans, busy, onRenew
}) => {
  const [planId, setPlanId] = useState('');
  const [endsAt, setEndsAt] = useState(oneYearFromNow());
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    setPlanId(tenant.subscription?.planId || '');
    setEndsAt(oneYearFromNow());
    setError('');
  }, [isOpen, tenant]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!planId) { setError('Choose a plan.'); return; }
    try {
      await onRenew(planId, new Date(endsAt + 'T23:59:59Z').toISOString());
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the subscription.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="renew-subscription-title"
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <div>
            <h3 id="renew-subscription-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
              Update subscription
            </h3>
            <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">For {tenant.name}</p>
          </div>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="renew-plan" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Subscription plan</label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger id="renew-plan">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name} — ₹{plan.monthlyPrice}/mo, up to {plan.maxStudents} students</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="renew-ends-at" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">New access valid until</label>
            <input id="renew-ends-at" type="date" required value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="settings-input" />
          </div>
          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
            <Button type="submit" disabled={busy} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <JisIcon className="text-[17px]">{busy ? 'progress_activity' : 'check'}</JisIcon>
              {busy ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
