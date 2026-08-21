import React, { useState } from 'react';
import { Transaction } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Transaction) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Fees');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      title,
      type,
      amount: Number(amount) || 0,
      category,
      date: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onAddTransaction(newTx);
    onClose();
    setTitle('');
    setAmount('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="transaction-modal-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 id="transaction-modal-title" className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
            Add Financial Entry
          </h3>
          <button type="button" onClick={onClose} aria-label="Close financial entry" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#565e74] hover:bg-slate-100 hover:text-[#0b1c30] dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="transaction-title" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Transaction Title *
            </label>
            <input
              type="text"
              id="transaction-title"
              required
              placeholder="e.g. Studio Rent / Sound Equipment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="transaction-type" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Entry Type
              </label>
              <select
                id="transaction-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              >
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>
            </div>

            <div>
              <label htmlFor="transaction-amount" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
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
                className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="transaction-category" className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Category
            </label>
            <select
              id="transaction-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-11 p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            >
              <option value="Fees">Student Fees</option>
              <option value="Rent">Rent & Operations</option>
              <option value="Salary">Instructor Salary</option>
              <option value="Misc">Misc Expense</option>
            </select>
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
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
