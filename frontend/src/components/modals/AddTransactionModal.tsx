import { Button } from '../ui/button';
import { todayIso } from '../../lib/dates';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';
import { confirmAction } from '../../lib/confirm';
import { SimpleSelect } from '../ui/select';

export interface TransactionFields {
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  /** ISO instant; the calendar day the money moved (never in the future). */
  occurredAt?: string | null;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  onSave: (fields: TransactionFields) => Promise<void>;
  onDelete?: (transactionId: string) => Promise<void>;
  incomeCategories: string[];
  expenseCategories: string[];
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
  onSave,
  onDelete,
  incomeCategories,
  expenseCategories
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other Income');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  // "Student Fees" income only comes from fee receipts; a manual entry there would be counted twice.
  const manualIncomeCategories = incomeCategories.filter((c) => c.trim().toLowerCase() !== 'student fees');
  const categoriesFor = (kind: 'income' | 'expense') => kind === 'income' ? manualIncomeCategories : expenseCategories;
  // An entry saved under a category that was later removed from settings still shows (and keeps)
  // its own category instead of silently switching to another one.
  const availableCategories = category && !categoriesFor(type).includes(category)
    ? [category, ...categoriesFor(type)] : categoriesFor(type);

  useEffect(() => {
    if (!isOpen) return;
    const kind = editingTransaction?.type || 'income';
    setTitle(editingTransaction?.title || '');
    setType(kind);
    setAmount(editingTransaction ? String(editingTransaction.amount) : '');
    setCategory(editingTransaction?.category || categoriesFor(kind)[0] || (kind === 'income' ? 'Other Income' : 'Other Expense'));
    setEntryDate(editingTransaction?.occurredAt ? editingTransaction.occurredAt.slice(0, 10) : todayIso());
    setError('');
  }, [isOpen, editingTransaction]);

  // Switching the entry type moves the category to that type's first option; done in the
  // handler (not an effect) so it can never race the values seeded for an entry being edited.
  const changeType = (kind: 'income' | 'expense') => {
    setType(kind);
    setCategory(categoriesFor(kind)[0] || (kind === 'income' ? 'Other Income' : 'Other Expense'));
  };

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!title.trim()) { setError('Enter a title for the entry.'); return; }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setError('Amount must be more than ₹0.'); return; }
    if (Math.round(parsedAmount * 100) !== parsedAmount * 100) { setError('Amount can have at most two decimal places (paise).'); return; }
    if (!category.trim()) { setError('Pick a category.'); return; }
    if (!entryDate) { setError('Pick the date of the entry.'); return; }
    if (entryDate > todayIso()) { setError('The entry date cannot be in the future.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // Midday local time: the calendar day survives any timezone conversion on the way to the server.
      const occurredAt = new Date(entryDate + 'T12:00:00').toISOString();
      await onSave({ title: title.trim(), type, amount: parsedAmount, category, occurredAt });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction || !onDelete) return;
    if (!(await confirmAction({
      title: `Delete "${editingTransaction.title}"?`,
      text: "This can't be undone.",
      confirmText: 'Delete',
      tone: 'destructive',
    }))) return;
    setDeleting(true);
    setError('');
    try {
      await onDelete(editingTransaction.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete the entry.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="transaction-modal-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
            {editingTransaction ? 'Edit financial entry' : 'Add financial entry'}
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="transaction-title" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
              Transaction title *
            </label>
            <input
              type="text"
              id="transaction-title"
              required
              autoFocus
              placeholder="e.g. Studio Rent / Sound Equipment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="settings-input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-type" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
                Entry type
              </label>
              <SimpleSelect
                id="transaction-type"
                value={type}
                onValueChange={(value) => changeType(value as 'income' | 'expense')}
                options={[
                  { value: 'income', label: 'Income (+)' },
                  { value: 'expense', label: 'Expense (-)' },
                ]}
              />
            </div>

            <div>
              <label htmlFor="transaction-amount" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                id="transaction-amount"
                min="0.01"
                step="0.01"
                required
                placeholder="250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="settings-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-category" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
                Category
              </label>
              <SimpleSelect
                id="transaction-category"
                value={category}
                onValueChange={setCategory}
                options={availableCategories.map((item) => ({ value: item, label: item }))}
              />
            </div>
            <div>
              <label htmlFor="transaction-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">
                Date
              </label>
              <input
                type="date"
                id="transaction-date"
                required
                max={todayIso()}
                value={entryDate}
                onChange={(e) => { setEntryDate(e.target.value); setError(''); }}
                className="settings-input"
              />
            </div>
          </div>

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {editingTransaction && onDelete ? (
              <Button type="button" onClick={handleDelete} disabled={submitting || deleting}
                className="min-h-11 px-3 py-2 rounded-2xl text-xs font-bold text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start transition-colors">
                <JisIcon className="text-[16px]">delete</JisIcon>
                {deleting ? 'Deleting…' : 'Delete entry'}
              </Button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" onClick={onClose} disabled={submitting || deleting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || deleting} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving…' : editingTransaction ? 'Save changes' : 'Save entry'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
