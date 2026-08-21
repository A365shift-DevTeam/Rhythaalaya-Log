import React, { useState } from 'react';
import { Student, Batch } from '../../types';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: Student) => void;
  batches: Batch[];
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  batches
}) => {
  const [name, setName] = useState('');
  const [course, setCourse] = useState('Yoga 101');
  const [batch, setBatch] = useState(batches[0]?.name || 'Morning Batch - Yoga 101');
  const [feeAmount, setFeeAmount] = useState('150');
  const [feeStatus, setFeeStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newStudent: Student = {
      id: `STU-${Math.floor(100 + Math.random() * 900)}`,
      name,
      course,
      batch,
      feeAmount: Number(feeAmount) || 150,
      feeStatus,
      overallAttendance: 100,
      phone: phone || '+1 (555) 012-3456',
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      joinDate: new Date().toISOString().split('T')[0]
    };

    onAddStudent(newStudent);
    onClose();
    setName('');
    setPhone('');
    setEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#a8ddd0]/40 space-y-5">
        <div className="flex justify-between items-center border-b border-[#f3faf7] dark:border-[#1e293b] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#0b1c30] dark:text-[#f8fafc]">
            Enroll New Student
          </h3>
          <button
            onClick={onClose}
            className="text-[#565e74] hover:text-[#0b1c30] p-1 rounded-lg"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc] focus:outline-none focus:border-[#45b080]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Course
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Yoga 101"
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Assign Batch
              </label>
              <select
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Monthly Fee (₹)
              </label>
              <input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Initial Fee Status
              </label>
              <select
                value={feeStatus}
                onChange={(e) => setFeeStatus(e.target.value as any)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="+1 (555) 012-3456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#565e74] dark:text-[#cbd5e1] mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[#f3faf7] dark:bg-[#1e293b] border border-[#a8ddd0] rounded-xl text-[#0b1c30] dark:text-[#f8fafc]"
              />
            </div>
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
              Save & Enroll Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
