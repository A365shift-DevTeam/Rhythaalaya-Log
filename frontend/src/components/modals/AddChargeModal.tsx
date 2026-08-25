import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Batch, Student } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  batches: Batch[];
  token: string;
  onCreated: () => Promise<void> | void;
}

type ChargeScope = 'student' | 'batch';

const todayIso = () => new Date().toISOString().slice(0, 10);

/// One-off charge outside the fee schedule (costume, exam, event fee). Targets either a single
/// student or every active student in a batch; students pay through the normal Collect Fee flow.
export const AddChargeModal: React.FC<AddChargeModalProps> = ({ isOpen, onClose, students, batches, token, onCreated }) => {
  const eligibleStudents = students.filter((student) =>
    student.isActive && student.enrollments.some((enrollment) => enrollment.status === 'Active'));
  const activeBatches = batches.filter((batch) => batch.isActive);
  const [scope, setScope] = useState<ChargeScope>('student');
  const [studentId, setStudentId] = useState('');
  const [enrollmentId, setEnrollmentId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setScope('student');
    setStudentId('');
    setEnrollmentId('');
    setBatchId('');
    setTitle('');
    setAmount('');
    setDueDate(todayIso());
    setError('');
    setNotice('');
    setSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedStudent = eligibleStudents.find((student) => student.id === studentId);
  const activeEnrollments = selectedStudent?.enrollments.filter((enrollment) => enrollment.status === 'Active') ?? [];
  const selectedBatch = activeBatches.find((batch) => batch.id === batchId);

  const handlePickStudent = (id: string) => {
    setStudentId(id);
    const student = eligibleStudents.find((item) => item.id === id);
    const active = student?.enrollments.filter((enrollment) => enrollment.status === 'Active') ?? [];
    setEnrollmentId(active.length === 1 ? active[0].id : '');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const chargeAmount = Number(amount);
    if (scope === 'student' && !selectedStudent) { setError('Select a student.'); return; }
    if (scope === 'student' && !enrollmentId) { setError('Select the batch this charge belongs to.'); return; }
    if (scope === 'batch' && !batchId) { setError('Select a batch.'); return; }
    if (!title.trim()) { setError('Give the charge a name, e.g. Costume fee.'); return; }
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) { setError('Enter a valid amount.'); return; }
    if (!dueDate) { setError('Pick a due date.'); return; }

    setSubmitting(true);
    setError('');
    try {
      if (scope === 'student') {
        await api.createCustomDue(token, {
          studentId: selectedStudent!.id, enrollmentId, title: title.trim(), amount: chargeAmount, dueDate,
        });
      } else {
        const created = await api.createBatchCustomDues(token, {
          batchId, title: title.trim(), amount: chargeAmount, dueDate,
        });
        setNotice(`Charged ${created.length} ${created.length === 1 ? 'student' : 'students'}.`);
      }
      await onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The charge could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-charge-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="add-charge-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white flex items-center gap-2">
            <JisIcon className="text-[#3fc073]">post_add</JisIcon>
            <span>Add one-off charge</span>
          </h3>
          <Button type="button" onClick={onClose} disabled={submitting} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95 disabled:opacity-50">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Who is this charge for?</label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" disabled={submitting} onClick={() => setScope('student')}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${scope === 'student' ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                <JisIcon className="text-[20px]">person</JisIcon>
                One student
              </Button>
              <Button type="button" disabled={submitting} onClick={() => setScope('batch')}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${scope === 'batch' ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                <JisIcon className="text-[20px]">groups</JisIcon>
                Whole batch
              </Button>
            </div>
          </div>

          {scope === 'student' ? (
            <>
              <div>
                <label htmlFor="charge-student" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Student</label>
                <select id="charge-student" required value={studentId} disabled={submitting}
                  onChange={(event) => handlePickStudent(event.target.value)}
                  className="settings-input">
                  <option value="" disabled>Select a student…</option>
                  {eligibleStudents.map((student) => (
                    <option key={student.id} value={student.id}>{student.name} ({student.studentNumber})</option>
                  ))}
                </select>
              </div>

              {selectedStudent && activeEnrollments.length > 1 && (
                <div>
                  <label htmlFor="charge-enrollment" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Batch</label>
                  <select id="charge-enrollment" required value={enrollmentId} disabled={submitting}
                    onChange={(event) => setEnrollmentId(event.target.value)}
                    className="settings-input">
                    <option value="" disabled>Select a batch…</option>
                    {activeEnrollments.map((enrollment) => (
                      <option key={enrollment.id} value={enrollment.id}>{enrollment.courseName} · {enrollment.batchName}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div>
              <label htmlFor="charge-batch" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Batch</label>
              <select id="charge-batch" required value={batchId} disabled={submitting}
                onChange={(event) => setBatchId(event.target.value)}
                className="settings-input">
                <option value="" disabled>Select a batch…</option>
                {activeBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.courseName} · {batch.name} ({batch.enrolledCount} students)</option>
                ))}
              </select>
              {selectedBatch && (
                <p className="mt-1 text-xs text-[#9e9e9e]">
                  Every active student in {selectedBatch.name} ({selectedBatch.enrolledCount}) gets this charge. Students already holding an identical charge are skipped.
                </p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="charge-title" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">What is this charge for?</label>
            <input id="charge-title" type="text" required maxLength={160} value={title} disabled={submitting}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Costume fee, Exam fee, Annual day"
              className="settings-input" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="charge-amount" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">
                {scope === 'batch' ? 'Amount per student (₹)' : 'Amount (₹)'}
              </label>
              <input id="charge-amount" type="number" required min="0.01" step="0.01" value={amount} disabled={submitting}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="settings-input" />
            </div>
            <div>
              <label htmlFor="charge-due-date" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Due date</label>
              <input id="charge-due-date" type="date" required value={dueDate} disabled={submitting}
                onChange={(event) => setDueDate(event.target.value)}
                className="settings-input" />
            </div>
          </div>

          <p className="text-xs text-[#9e9e9e]">
            A future due date shows as “Upcoming” until it arrives. Any advance credit a student holds is applied automatically.
          </p>

          {notice && <div role="status" className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#22c55e] text-xs font-bold">{notice}</div>}
          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <JisIcon className="text-[16px]">{submitting ? 'progress_activity' : 'check'}</JisIcon>
              <span>
                {submitting ? 'Adding…'
                  : amount ? `Add charge ₹${Number(amount).toLocaleString('en-IN')}${scope === 'batch' ? ' each' : ''}`
                  : 'Add charge'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
