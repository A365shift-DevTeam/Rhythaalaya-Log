import React, { useState } from 'react';
import { Transaction } from '../../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#a8ddd0]/40 space-y-4">
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
            Add Financial Entry
          </h3>
          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Transaction Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Studio Rent / Sound Equipment"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Entry Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              >
                <option value="income">Income (+)</option>
                <option value="expense">Expense (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                required
                placeholder="250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            >
              <option value="Fees">Student Fees</option>
              <option value="Rent">Rent & Operations</option>
              <option value="Salary">Instructor Salary</option>
              <option value="Misc">Misc Expense</option>
            </select>
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
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
