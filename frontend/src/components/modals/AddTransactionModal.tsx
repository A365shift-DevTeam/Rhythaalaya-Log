import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

export interface TransactionFields {
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
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
  const [category, setCategory] = useState(incomeCategories[0] || 'Other Income');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  const availableCategories = type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (!isOpen) return;
    setTitle(editingTransaction?.title || '');
    setType(editingTransaction?.type || 'income');
    setAmount(editingTransaction ? String(editingTransaction.amount) : '');
    setCategory(editingTransaction?.category || incomeCategories[0] || 'Other Income');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTransaction]);

  useEffect(() => {
    if (!isOpen || editingTransaction) return;
    setCategory(availableCategories[0] || (type === 'income' ? 'Other Income' : 'Other Expense'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setSubmitting(true);
    setError('');
    try {
      await onSave({ title: title.trim(), type, amount: parsedAmount, category });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction || !onDelete) return;
    if (!confirm(`Delete "${editingTransaction.title}"? This can't be undone.`)) return;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title" className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        {/* Floating Close Button */}
        <div className="sticky top-0 z-30 flex justify-end pointer-events-none -mb-10 sm:-mb-12">
          <div className="pointer-events-auto flex items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/80">
            <button type="button" onClick={onClose} aria-label="Close" title="Close"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95">
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 pt-1">
          <h3 id="transaction-modal-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white pr-12">
            {editingTransaction ? 'Edit financial entry' : 'Add financial entry'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="transaction-title" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-type" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Entry type
              </label>
              <select
                id="transaction-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>
            </div>

            <div>
              <label htmlFor="transaction-amount" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="transaction-category" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              id="transaction-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            >
              {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {editingTransaction && onDelete ? (
              <button type="button" onClick={handleDelete} disabled={submitting || deleting}
                className="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start">
                <span className="material-symbols-outlined text-[16px]">delete</span>
                {deleting ? 'Deleting…' : 'Delete entry'}
              </button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={submitting || deleting} className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={submitting || deleting} className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                {submitting ? 'Saving…' : editingTransaction ? 'Save changes' : 'Save entry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
