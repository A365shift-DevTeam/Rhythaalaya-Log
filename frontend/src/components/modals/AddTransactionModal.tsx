import { Button } from '../ui/button';
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
  }, [isOpen, editingTransaction]);

  useEffect(() => {
    if (!isOpen || editingTransaction) return;
    setCategory(availableCategories[0] || (type === 'income' ? 'Other Income' : 'Other Expense'));
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
                onValueChange={(value) => setType(value as 'income' | 'expense')}
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
