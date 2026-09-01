import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import { Spinner } from '../ui/spinner';
import React, { useEffect, useState } from 'react';
import { FeeAdjustment, FeeDue } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AdjustDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  due: FeeDue | null;
  token: string;
  onApplied: () => Promise<void> | void;
}

type Mode = 'Discount' | 'Waiver' | 'Fine' | 'WriteOff' | 'Cancel';

const MODES: { value: Mode; icon: string; label: string; hint: string }[] = [
  { value: 'Discount', icon: 'percent', label: 'Discount', hint: 'Reduce this due by an amount' },
  { value: 'Waiver', icon: 'volunteer_activism', label: 'Waive', hint: 'Waive part or all of this due' },
  { value: 'Fine', icon: 'gavel', label: 'Fine', hint: 'Add a late fee — raises what the student owes' },
  { value: 'WriteOff', icon: 'money_off', label: 'Write off', hint: 'Stop pursuing this balance — recorded, not collected' },
  { value: 'Cancel', icon: 'block', label: 'Cancel', hint: 'Cancel the due entirely' },
];

const AMOUNT_LABEL: Record<Exclude<Mode, 'Cancel'>, string> = {
  Discount: 'Discount amount (₹)', Waiver: 'Waived amount (₹)',
  Fine: 'Fine amount (₹)', WriteOff: 'Write-off amount (₹)',
};

export const AdjustDueModal: React.FC<AdjustDueModalProps> = ({ isOpen, onClose, due, token, onApplied }) => {
  const [mode, setMode] = useState<Mode>('Discount');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<FeeAdjustment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setMode('Discount');
    setAmount('');
    setReason('');
    setError('');
    setSubmitting(false);
  }, [isOpen, due?.id]);

  useEffect(() => {
    if (!isOpen || !due) { setHistory([]); return; }
    let ignore = false;
    setHistoryLoading(true);
    api.dueAdjustments(token, due.id)
      .then((rows) => { if (!ignore) setHistory(rows); })
      .catch(() => { if (!ignore) setHistory([]); })
      .finally(() => { if (!ignore) setHistoryLoading(false); });
    return () => { ignore = true; };
  }, [isOpen, due?.id, token]);

  if (!isOpen || !due) return null;

  const alreadyPaid = due.paidAmount;
  const maxReduction = due.netAmount - alreadyPaid;
  const isReduction = mode === 'Discount' || mode === 'Waiver' || mode === 'WriteOff';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) { setError('A reason is required — it becomes part of the audit history.'); return; }
    const adjustmentAmount = Number(amount);
    if (mode !== 'Cancel' && (!Number.isFinite(adjustmentAmount) || adjustmentAmount <= 0)) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (mode === 'Cancel') {
        await api.cancelDue(token, due.id, trimmedReason);
      } else {
        await api.addDueAdjustment(token, due.id, { type: mode, amount: adjustmentAmount, reason: trimmedReason });
      }
      await onApplied();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The adjustment could not be applied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="adjust-due-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="adjust-due-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white flex items-center gap-2">
            <JisIcon className="text-[#3fc073]">tune</JisIcon>
            <span>Adjust fee due</span>
          </h3>
          <Button type="button" onClick={onClose} disabled={submitting} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95 disabled:opacity-50">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <div className="rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] p-3 text-xs dark:border-[#243244] dark:bg-[#111c2b]">
          <div className="font-bold text-[#212121] dark:text-white">{due.studentName}</div>
          <div className="mt-0.5 text-[#808080] dark:text-[#94a3b8]">
            {due.title || due.courseName} · due {new Date(due.dueDate).toLocaleDateString('en-IN')}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[#575757] dark:text-[#cbd5e1]">
            <span>Billed <span className="font-bold">₹{due.netAmount.toLocaleString('en-IN')}</span></span>
            <span>Paid <span className="font-bold">₹{alreadyPaid.toLocaleString('en-IN')}</span></span>
            <span>Balance <span className="font-bold text-[#ef4444]">₹{due.balanceAmount.toLocaleString('en-IN')}</span></span>
          </div>
        </div>

        {/* Adjustment history: the append-only FeeAdjustment ledger for this due */}
        {(historyLoading || history.length > 0) && (
          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
              Adjustment history
            </span>
            {historyLoading ? (
              <div className="py-1">
                <Spinner size="xs" inline text="Loading history…" />
              </div>
            ) : (
              <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-2xl border border-[#dbdbdb]/60 p-1.5 dark:border-[#243244]">
                {history.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl px-2.5 py-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#212121] dark:text-white">
                        <JisIcon className="text-[15px] text-[#3fc073]">
                          {item.type === 'Discount' ? 'percent'
                            : item.type === 'Waiver' ? 'volunteer_activism'
                            : item.type === 'Fine' ? 'gavel'
                            : item.type === 'WriteOff' ? 'money_off'
                            : 'event_repeat'}
                        </JisIcon>
                        <span>{item.type === 'Proration' ? 'Prorated' : item.type === 'WriteOff' ? 'Write-off' : item.type}</span>
                        <span className="tabular-nums">₹{Math.abs(item.amount).toLocaleString('en-IN')}</span>
                        {item.amount < 0 && <span className="font-semibold text-[#9e9e9e]">(reversed)</span>}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#808080] dark:text-[#94a3b8]" title={item.reason}>{item.reason}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-[#9e9e9e]">
                      <div>{item.performedByName}</div>
                      <div>{new Date(item.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((item) => (
                <Button key={item.value} type="button" disabled={submitting} onClick={() => setMode(item.value)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${mode === item.value ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                  <JisIcon className="text-[20px]">{item.icon}</JisIcon>
                  {item.label}
                </Button>
              ))}
            </div>
            <p className="mt-1 text-xs text-[#9e9e9e]">{MODES.find((item) => item.value === mode)?.hint}</p>
          </div>

          {mode === 'Cancel' ? (
            alreadyPaid > 0 && (
              <div className="rounded-2xl bg-amber-50 p-3 text-xs font-semibold text-[#b45309] dark:bg-amber-950/40 dark:text-amber-300">
                ₹{alreadyPaid.toLocaleString('en-IN')} is already allocated to this due. Refund or reallocate it first — cancellation will be refused otherwise.
              </div>
            )
          ) : (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="adjust-amount" className="text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">
                  {AMOUNT_LABEL[mode]}
                </label>
                {isReduction && maxReduction > 0 && Number(amount) !== maxReduction && (
                  <Button type="button" onClick={() => setAmount(String(maxReduction))} className="text-xs font-bold text-[#3fc073] hover:underline">
                    Max ₹{maxReduction.toLocaleString('en-IN')}
                  </Button>
                )}
              </div>
              <input id="adjust-amount" type="number" required min="0.01" step="0.01" max={isReduction ? maxReduction : undefined} value={amount} disabled={submitting}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount"
                className="w-full min-h-12 p-3 text-lg font-bold bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15 disabled:opacity-60" />
              <p className="mt-1 text-xs text-[#9e9e9e]">
                {mode === 'Fine'
                  ? 'Added on top of the current balance — the student will owe this much more.'
                  : mode === 'WriteOff'
                    ? `Recorded as written off, not collected (max ₹${maxReduction.toLocaleString('en-IN')}).`
                    : `Cannot reduce below what's already paid (max ₹${maxReduction.toLocaleString('en-IN')}).`}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="adjust-reason" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Reason (required, kept in audit history)</label>
            <input id="adjust-reason" type="text" required maxLength={500} value={reason} disabled={submitting}
              onChange={(event) => setReason(event.target.value)}
              placeholder={mode === 'Cancel' ? 'e.g. Student on medical leave' : 'e.g. Sibling discount'}
              className="settings-input" />
          </div>

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <JisIcon className="text-[16px]">{submitting ? 'progress_activity' : 'check'}</JisIcon>
              <span>{submitting ? 'Applying…' : mode === 'Cancel' ? 'Cancel this due' : mode === 'WriteOff' ? 'Apply write-off' : `Apply ${mode.toLowerCase()}`}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
