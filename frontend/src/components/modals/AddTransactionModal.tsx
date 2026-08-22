import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types';
import { Dialog } from './Dialog';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Transaction) => void;
  incomeCategories: string[];
  expenseCategories: string[];
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
  incomeCategories,
  expenseCategories
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(incomeCategories[0] || 'Other Income');
  const formId = 'transaction-form';

  const availableCategories = type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    if (isOpen) {
      setCategory(availableCategories[0] || (type === 'income' ? 'Other Income' : 'Other Expense'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, isOpen, incomeCategories, expenseCategories]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !amount) return;

    onAddTransaction({
      id: `tx-${Date.now()}`,
      title: title.trim(),
      type,
      amount: Number(amount) || 0,
      category,
      date: 'Today',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    });

    onClose();
    setTitle('');
    setAmount('');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Record entry"
      description="Money that came in or went out, outside of a fee payment."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            type="submit"
            form={formId}
            disabled={!title.trim() || !amount}
            className="btn btn-primary"
          >
            Record entry
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
        <fieldset>
          <legend className="label mb-1.5 font-semibold text-ink">Direction</legend>
          <div className="segmented w-full" role="group" aria-label="Direction">
            <button
              type="button"
              onClick={() => setType('income')}
              aria-pressed={type === 'income'}
              className="flex-1"
            >
              Money in
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              aria-pressed={type === 'expense'}
              className="flex-1"
            >
              Money out
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor="transaction-title" className="label mb-1.5 block font-semibold text-ink">
            What was it for
          </label>
          <input
            id="transaction-title"
            type="text"
            required
            autoFocus
            placeholder={type === 'income' ? 'Annual day ticket sales' : 'Hall rent — August'}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="transaction-amount" className="label mb-1.5 block font-semibold text-ink">
              Amount (₹)
            </label>
            <input
              id="transaction-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              required
              placeholder="2500"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="field num"
            />
          </div>

          <div>
            <label htmlFor="transaction-category" className="label mb-1.5 block font-semibold text-ink">
              Category
            </label>
            <select
              id="transaction-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="field"
            >
              {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </form>
    </Dialog>
  );
};
