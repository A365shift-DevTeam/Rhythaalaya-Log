import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useMemo, useState } from 'react';
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

const todayIso = () => new Date().toISOString().slice(0, 10);

/// One-off charge outside the fee schedule (costume, exam, event fee). Batch-first flow: pick a
/// batch, then charge the whole batch or only the students you tick. Students pay through the
/// normal Collect Fee flow.
export const AddChargeModal: React.FC<AddChargeModalProps> = ({ isOpen, onClose, students, batches, token, onCreated }) => {
  const activeBatches = batches.filter((batch) => batch.isActive);
  const [batchId, setBatchId] = useState('');
  const [wholeBatch, setWholeBatch] = useState(true);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setBatchId('');
    setWholeBatch(true);
    setSelectedEnrollmentIds(new Set());
    setTitle('');
    setAmount('');
    setDueDate(todayIso());
    setError('');
    setSubmitting(false);
  }, [isOpen]);

  // Active students of the chosen batch, each paired with their enrollment in that batch.
  const batchStudents = useMemo(() => {
    if (!batchId) return [];
    return students
      .filter((student) => student.isActive)
      .map((student) => {
        const enrollment = student.enrollments.find((item) => item.batchId === batchId && item.status === 'Active');
        return enrollment ? { student, enrollmentId: enrollment.id, studentId: student.id } : null;
      })
      .filter((item): item is { student: Student; enrollmentId: string; studentId: string } => item !== null)
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [students, batchId]);

  if (!isOpen) return null;

  const selectedBatch = activeBatches.find((batch) => batch.id === batchId);
  const targetCount = wholeBatch ? batchStudents.length : selectedEnrollmentIds.size;

  const handlePickBatch = (id: string) => {
    setBatchId(id);
    setWholeBatch(true);
    setSelectedEnrollmentIds(new Set());
  };

  const toggleStudent = (enrollmentId: string) => {
    setSelectedEnrollmentIds((previous) => {
      const next = new Set(previous);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const chargeAmount = Number(amount);
    if (!selectedBatch) { setError('Select a batch.'); return; }
    if (batchStudents.length === 0) { setError('This batch has no active students.'); return; }
    if (!wholeBatch && selectedEnrollmentIds.size === 0) { setError('Tick at least one student, or choose whole batch.'); return; }
    if (!title.trim()) { setError('Give the charge a name, e.g. Costume fee.'); return; }
    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) { setError('Enter a valid amount.'); return; }
    if (!dueDate) { setError('Pick a due date.'); return; }

    setSubmitting(true);
    setError('');
    try {
      if (wholeBatch) {
        await api.createBatchCustomDues(token, {
          batchId, title: title.trim(), amount: chargeAmount, dueDate,
        });
      } else {
        // per-student charges reuse the single endpoint; its duplicate guard makes retries safe
        for (const target of batchStudents.filter((item) => selectedEnrollmentIds.has(item.enrollmentId))) {
          await api.createCustomDue(token, {
            studentId: target.studentId, enrollmentId: target.enrollmentId,
            title: title.trim(), amount: chargeAmount, dueDate,
          });
        }
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
          {/* Step 1: batch */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
              <StepBadge n={1} /> Which batch?
            </span>
            <select id="charge-batch" required value={batchId} disabled={submitting}
              onChange={(event) => handlePickBatch(event.target.value)}
              className="settings-input" aria-label="Batch">
              <option value="" disabled>Select a batch…</option>
              {activeBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.courseName} · {batch.name} ({batch.enrolledCount} students)</option>
              ))}
            </select>
          </div>

          {/* Step 2: whole batch or particular students */}
          {selectedBatch && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
                <StepBadge n={2} /> Who in {selectedBatch.name}?
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" disabled={submitting} onClick={() => setWholeBatch(true)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${wholeBatch ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                  <JisIcon className="text-[20px]">groups</JisIcon>
                  Whole batch ({batchStudents.length})
                </Button>
                <Button type="button" disabled={submitting} onClick={() => setWholeBatch(false)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-bold transition-all ${!wholeBatch ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                  <JisIcon className="text-[20px]">checklist</JisIcon>
                  Choose students
                </Button>
              </div>

              {!wholeBatch && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-[#dbdbdb]/60 p-1.5 dark:border-[#243244]">
                  {batchStudents.length === 0 && <p className="p-2 text-xs text-[#808080]">No active students in this batch.</p>}
                  {batchStudents.map(({ student, enrollmentId }) => (
                    <label key={enrollmentId} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                      <input type="checkbox" checked={selectedEnrollmentIds.has(enrollmentId)} disabled={submitting}
                        onChange={() => toggleStudent(enrollmentId)}
                        className="h-4 w-4 shrink-0 accent-[#3fc073] rounded" />
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#dbdbdb] text-xs font-bold text-[#575757] dark:bg-[#111c2b] dark:text-[#cbd5e1]">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-[#212121] dark:text-white">{student.name}</span>
                        <span className="block text-xs text-[#808080]">{student.studentNumber}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: charge details */}
          {selectedBatch && (
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
                <StepBadge n={3} /> Charge details
              </span>
              <div>
                <label htmlFor="charge-title" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">What is this charge for?</label>
                <input id="charge-title" type="text" required maxLength={160} value={title} disabled={submitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Costume fee, Exam fee, Annual day"
                  className="settings-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="charge-amount" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Amount per student (₹)</label>
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
                A future due date shows as “Upcoming” until it arrives. Advance credit is applied automatically, and students already holding an identical charge are skipped.
              </p>
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !batchId} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <JisIcon className="text-[16px]">{submitting ? 'progress_activity' : 'check'}</JisIcon>
              <span>
                {submitting ? 'Adding…'
                  : targetCount > 0 && amount
                    ? `Charge ${targetCount} ${targetCount === 1 ? 'student' : 'students'} ₹${Number(amount).toLocaleString('en-IN')} each`
                    : 'Add charge'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3fc073] text-xs font-bold text-white">{n}</span>
  );
}
