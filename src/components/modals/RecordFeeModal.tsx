import React, { useState } from 'react';
import { Student } from '../../types';

interface RecordFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student;
  onRecordFee: (studentId: string, amount: number, paymentMethod: string) => void;
}

export const RecordFeeModal: React.FC<RecordFeeModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  onRecordFee
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudent?.id || students[0]?.id || ''
  );
  const [amount, setAmount] = useState<string>(
    initialStudent?.feeAmount.toString() || '150'
  );
  const [method, setMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');

  if (!isOpen) return null;

  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    const target = students.find((s) => s.id === id);
    if (target) {
      setAmount(target.feeAmount.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    onRecordFee(selectedStudentId, Number(amount) || 150, method);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c7c4d7]/40 space-y-4">
        <div className="flex justify-between items-center border-b border-[#eff4ff] dark:border-[#1e293b] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4648d4]">payments</span>
            <span>Record Fee Payment</span>
          </h3>
          <button onClick={onClose} className="text-[#565e74] hover:text-[#0b1c30] p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full p-2.5 bg-[#f8f9ff] dark:bg-[#1e293b] border border-[#c7c4d7] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id}) — {s.feeStatus} (${s.feeAmount})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Payment Amount ($)
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 bg-[#f8f9ff] dark:bg-[#1e293b] border border-[#c7c4d7] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full p-2.5 bg-[#f8f9ff] dark:bg-[#1e293b] border border-[#c7c4d7] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="UPI">UPI / Online</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#e5eeff]/50 dark:bg-[#1e293b] rounded-xl text-xs text-[#565e74] dark:text-[#cbd5e1]">
            ✓ Recording payment will automatically update the student's status to{' '}
            <strong className="text-emerald-600 dark:text-emerald-400">Paid</strong> and log a new income transaction.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#565e74] hover:bg-[#eff4ff]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#16a34a] text-white hover:bg-[#15803d] shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Confirm & Mark Paid</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
