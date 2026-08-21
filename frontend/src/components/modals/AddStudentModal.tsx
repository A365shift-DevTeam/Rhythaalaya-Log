import React, { useEffect, useMemo, useState } from 'react';
import { Batch, Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: Student) => void;
  batches: Batch[];
  defaultMonthlyFee: number;
}

type DiscountType = 'amount' | 'percentage';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  batches,
  defaultMonthlyFee
}) => {
  const courses = useMemo(
    () => Array.from(new Set(batches.map((item) => item.course).filter(Boolean))).sort(),
    [batches]
  );

  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [batchId, setBatchId] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('amount');
  const [discountValue, setDiscountValue] = useState('0');
  const [feeStatus, setFeeStatus] = useState<'Paid' | 'Pending'>('Pending');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  const courseBatches = useMemo(
    () => batches.filter((item) => item.course === course),
    [batches, course]
  );
  const selectedBatch = batches.find((item) => item.id === batchId);
  const standardFee = selectedBatch?.monthlyFee || defaultMonthlyFee;
  const enteredDiscount = Math.max(0, Number(discountValue) || 0);
  const discountAmount = Math.min(
    standardFee,
    discountType === 'percentage' ? standardFee * Math.min(enteredDiscount, 100) / 100 : enteredDiscount
  );
  const payableFee = Math.max(0, standardFee - discountAmount);

  useEffect(() => {
    if (!isOpen) return;
    const initialCourse = courses[0] || '';
    const initialBatch = batches.find((item) => item.course === initialCourse);
    setName('');
    setCourse(initialCourse);
    setBatchId(initialBatch?.id || '');
    setDiscountType('amount');
    setDiscountValue('0');
    setFeeStatus('Pending');
    setPhone('');
    setEmail('');
  }, [isOpen, batches, courses]);

  if (!isOpen) return null;

  const handleCourseChange = (nextCourse: string) => {
    const firstMatchingBatch = batches.find((item) => item.course === nextCourse);
    setCourse(nextCourse);
    setBatchId(firstMatchingBatch?.id || '');
    setDiscountValue('0');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !selectedBatch) return;

    onAddStudent({
      id: `STU-${Math.floor(100 + Math.random() * 900)}`,
      name: name.trim(),
      course: selectedBatch.course,
      batch: selectedBatch.name,
      batchId: selectedBatch.id,
      feeAmount: payableFee,
      monthlyFee: payableFee,
      discountAmount,
      feeStatus: payableFee === 0 ? 'Paid' : feeStatus,
      overallAttendance: 100,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      joinDate: new Date().toISOString().split('T')[0]
    });
    onClose();
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/55 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92dvh] overflow-hidden shadow-2xl border border-brand-200/70 dark:border-brand-800">
        <div className="flex justify-between items-start gap-4 px-5 sm:px-7 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              New enrollment
            </span>
            <h3 id="add-student-title" className="font-heading text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-1">
              Enroll a student
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Course selection fills the batch and standard fee automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close enrollment form"
            className="w-11 h-11 shrink-0 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(92dvh-118px)]">
          <div className="p-5 sm:p-7 space-y-6">
            <section aria-labelledby="student-information-heading">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center text-xs font-extrabold">1</span>
                <h4 id="student-information-heading" className="font-heading text-sm font-bold text-slate-900 dark:text-white">Student information</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Student name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="student-name"
                    type="text"
                    required
                    autoFocus
                    autoComplete="name"
                    placeholder="Enter the student's full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone number</label>
                  <input
                    id="student-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
                  <input
                    id="student-email"
                    type="email"
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section aria-labelledby="enrollment-details-heading">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center text-xs font-extrabold">2</span>
                <div>
                  <h4 id="enrollment-details-heading" className="font-heading text-sm font-bold text-slate-900 dark:text-white">Course and fee details</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Choose a course first; the matching batch and fee follow it.</p>
                </div>
              </div>

              {courses.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900" role="alert">
                  Create at least one batch before enrolling a student.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="student-course" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Course *</label>
                      <select
                        id="student-course"
                        required
                        value={course}
                        onChange={(event) => handleCourseChange(event.target.value)}
                        className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                      >
                        {courses.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="student-batch" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Assigned batch *</label>
                      <select
                        id="student-batch"
                        required
                        value={batchId}
                        onChange={(event) => {
                          setBatchId(event.target.value);
                          setDiscountValue('0');
                        }}
                        className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                      >
                        {courseBatches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-4">
                    <div className="rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 p-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Standard fee</span>
                      <div className="text-2xl font-extrabold text-slate-950 dark:text-white mt-1 tabular-nums">{currency.format(standardFee)}</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">per month for {selectedBatch?.course}</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <label htmlFor="student-discount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Optional discount</label>
                        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1" aria-label="Discount type">
                          {(['amount', 'percentage'] as DiscountType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => { setDiscountType(type); setDiscountValue('0'); }}
                              className={`min-h-8 px-3 rounded-md text-[11px] font-bold transition-colors ${discountType === type ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                              aria-pressed={discountType === type}
                            >
                              {type === 'amount' ? '₹ Amount' : '% Percent'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm" aria-hidden="true">{discountType === 'amount' ? '₹' : '%'}</span>
                        <input
                          id="student-discount"
                          type="number"
                          min="0"
                          max={discountType === 'amount' ? standardFee : 100}
                          step="1"
                          value={discountValue}
                          onChange={(event) => setDiscountValue(event.target.value)}
                          className="w-full min-h-11 pl-9 pr-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-slate-950 dark:bg-brand-950 text-white px-4 sm:px-5 py-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-brand-300">Student pays</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-extrabold tabular-nums">{currency.format(payableFee)}</span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      {discountAmount > 0 && <p className="text-[11px] text-emerald-300 mt-1">Discount applied: {currency.format(discountAmount)}</p>}
                    </div>
                    <div className="sm:w-44">
                      <label htmlFor="student-fee-status" className="block text-[11px] font-semibold text-slate-300 mb-1.5">Opening fee status</label>
                      <select
                        id="student-fee-status"
                        value={payableFee === 0 ? 'Paid' : feeStatus}
                        disabled={payableFee === 0}
                        onChange={(event) => setFeeStatus(event.target.value as 'Paid' | 'Pending')}
                        className="w-full min-h-11 px-3 bg-white/10 border border-white/15 rounded-xl text-sm text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-300 [&>option]:text-slate-900"
                      >
                        <option value="Pending">Payment pending</option>
                        <option value="Paid">Already paid</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-7 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !selectedBatch}
              className="btn-brand min-h-11 px-6 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Save & enroll student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
