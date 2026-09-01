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

/// One-off charge outside the fee schedule. Batch-first flow: pick a batch, charge everyone in
/// it or only the students you tick, and the summary line always shows the money consequence
/// (N students × amount = total) before anything is committed.
export const AddChargeModal: React.FC<AddChargeModalProps> = ({ isOpen, onClose, students, batches, token, onCreated }) => {
  const activeBatches = batches.filter((batch) => batch.isActive);
  const [batchId, setBatchId] = useState('');
  const [wholeBatch, setWholeBatch] = useState(true);
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  // Ordering snapshot: selected students float to the top, but only re-sorted when the search
  // changes — never while ticking, so rows don't jump under the cursor.
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
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
    setQuery('');
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
  const chargeAmount = Number(amount);
  const validAmount = Number.isFinite(chargeAmount) && chargeAmount > 0;
  const totalAmount = validAmount ? targetCount * chargeAmount : 0;

  const filteredStudents = (query.trim()
    ? batchStudents.filter(({ student }) => {
        const term = query.trim().toLowerCase();
        return student.name.toLowerCase().includes(term) || student.studentNumber.toLowerCase().includes(term);
      })
    : batchStudents)
    .slice()
    .sort((a, b) => Number(pinnedIds.has(b.enrollmentId)) - Number(pinnedIds.has(a.enrollmentId)));

  // The header checkbox operates on what's shown: with a search active it selects/clears just
  // the filtered results, so "search, tick all matches" is one click.
  const filteredAllSelected = filteredStudents.length > 0
    && filteredStudents.every((item) => selectedEnrollmentIds.has(item.enrollmentId));

  const handlePickBatch = (id: string) => {
    setBatchId(id);
    setWholeBatch(true);
    setSelectedEnrollmentIds(new Set());
    setPinnedIds(new Set());
    setQuery('');
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPinnedIds(new Set(selectedEnrollmentIds));
  };

  const toggleStudent = (enrollmentId: string) => {
    setSelectedEnrollmentIds((previous) => {
      const next = new Set(previous);
      if (next.has(enrollmentId)) next.delete(enrollmentId);
      else next.add(enrollmentId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedEnrollmentIds((previous) => {
      const next = new Set(previous);
      if (filteredAllSelected) filteredStudents.forEach((item) => next.delete(item.enrollmentId));
      else filteredStudents.forEach((item) => next.add(item.enrollmentId));
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedBatch) { setError('Select a batch.'); return; }
    if (batchStudents.length === 0) { setError('This batch has no active students.'); return; }
    if (!wholeBatch && selectedEnrollmentIds.size === 0) { setError('Tick at least one student, or switch to Everyone.'); return; }
    if (!title.trim()) { setError('Give the charge a name, e.g. Costume fee.'); return; }
    if (!validAmount) { setError('Enter a valid amount.'); return; }
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
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-charge-title" className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-5">
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

        <form onSubmit={handleSubmit} className="space-y-5 font-sans text-sm">
          {/* Step 1: batch */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
              <StepBadge n={1} /> Which batch?
            </span>
            {selectedBatch ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] p-3 dark:border-[#243244] dark:bg-[#111c2b]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white shadow-xs">
                    <JisIcon className="text-[20px]">groups</JisIcon>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-[#212121] dark:text-white">{selectedBatch.name}</div>
                    <div className="text-xs text-[#808080]">{selectedBatch.courseName} · {batchStudents.length} students</div>
                  </div>
                </div>
                <Button type="button" onClick={() => handlePickBatch('')} disabled={submitting}
                  className="min-h-9 shrink-0 rounded-xl px-3 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors">
                  Change
                </Button>
              </div>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-2xl border border-[#dbdbdb]/60 p-1 dark:border-[#243244]">
                {activeBatches.length === 0 && <p className="p-2 text-xs text-[#808080]">No active batches.</p>}
                {activeBatches.map((batch) => (
                  <Button key={batch.id} type="button" disabled={submitting} onClick={() => handlePickBatch(batch.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#dbdbdb] text-[#575757] dark:bg-[#111c2b] dark:text-[#cbd5e1]">
                        <JisIcon className="text-[17px]">groups</JisIcon>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#212121] dark:text-white">{batch.name}</div>
                        <div className="text-xs text-[#808080]">{batch.courseName}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[#9e9e9e]">
                      {batch.enrolledCount} {batch.enrolledCount === 1 ? 'student' : 'students'}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: everyone or ticked students */}
          {selectedBatch && (
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
                <StepBadge n={2} /> Who pays?
              </span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who pays">
                <Button type="button" role="radio" aria-checked={wholeBatch} disabled={submitting} onClick={() => setWholeBatch(true)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-bold transition-all ${wholeBatch ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                  <JisIcon className="text-[18px]">groups</JisIcon>
                  Everyone ({batchStudents.length})
                </Button>
                <Button type="button" role="radio" aria-checked={!wholeBatch} disabled={submitting} onClick={() => setWholeBatch(false)}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-bold transition-all ${!wholeBatch ? 'border-[#3fc073] bg-[#e9f7ee] text-[#35a160] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]' : 'border-[#dbdbdb] text-[#575757] hover:border-[#3fc073]/40 dark:border-[#243244] dark:text-[#cbd5e1]'}`}>
                  <JisIcon className="text-[18px]">checklist</JisIcon>
                  Only some
                </Button>
              </div>

              {!wholeBatch && (
                <div className="mt-2 rounded-2xl border border-[#dbdbdb]/60 dark:border-[#243244] overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-[#dbdbdb]/60 dark:border-[#243244] bg-[#f0f0f0]/60 dark:bg-[#111c2b]/60 px-3 py-2">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1]">
                      <input type="checkbox" checked={filteredAllSelected} disabled={submitting || filteredStudents.length === 0}
                        onChange={toggleAll} className="h-4 w-4 accent-[#3fc073] rounded" />
                      {query.trim()
                        ? `All ${filteredStudents.length} shown`
                        : selectedEnrollmentIds.size === 0
                          ? 'Select all'
                          : `${selectedEnrollmentIds.size} of ${batchStudents.length} selected`}
                    </label>
                    {query.trim() && selectedEnrollmentIds.size > 0 && (
                      <span className="text-xs font-semibold text-[#9e9e9e]">{selectedEnrollmentIds.size} selected</span>
                    )}
                    {batchStudents.length > 6 && (
                      <div className="relative ml-auto">
                        <JisIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[15px] text-[#9e9e9e]">search</JisIcon>
                        <input type="text" value={query} onChange={(event) => handleQueryChange(event.target.value)}
                          placeholder="Search" aria-label="Search students"
                          className="w-32 rounded-xl border border-[#dbdbdb] bg-white py-1 pl-7 pr-2 text-xs text-[#212121] outline-none focus:border-[#3fc073] dark:border-[#243244] dark:bg-[#0b1422] dark:text-white" />
                      </div>
                    )}
                  </div>
                  <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                    {filteredStudents.length === 0 && (
                      <p className="p-2 text-xs text-[#808080]">
                        {query ? `No students match "${query}".` : 'No active students in this batch.'}
                      </p>
                    )}
                    {filteredStudents.map(({ student, enrollmentId }) => (
                      <label key={enrollmentId} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-1 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors">
                        <input type="checkbox" checked={selectedEnrollmentIds.has(enrollmentId)} disabled={submitting}
                          onChange={() => toggleStudent(enrollmentId)}
                          className="h-4 w-4 shrink-0 accent-[#3fc073] rounded" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-[#212121] dark:text-white">{student.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-[#9e9e9e]">{student.studentNumber}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: charge details */}
          {selectedBatch && (
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">
                <StepBadge n={3} /> What for, and how much?
              </span>
              <div>
                <label htmlFor="charge-title" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Charge name</label>
                <input id="charge-title" type="text" required maxLength={160} value={title} disabled={submitting}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Costume fee"
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
            </div>
          )}

          {/* Live collection summary: the money consequence, always visible before committing */}
          {selectedBatch && targetCount > 0 && validAmount && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#3fc073]/40 bg-[#e9f7ee]/60 px-3.5 py-2.5 dark:border-[#3fc073]/30 dark:bg-[#3fc073]/10">
              <span className="text-xs font-semibold text-[#35a160] dark:text-[#b3e6c7]">
                {targetCount} {targetCount === 1 ? 'student' : 'students'} × ₹{chargeAmount.toLocaleString('en-IN')}
                {dueDate > todayIso() ? ' · upcoming' : ''}
              </span>
              <span className="text-sm font-bold tabular-nums text-[#212121] dark:text-white">
                ₹{totalAmount.toLocaleString('en-IN')} total
              </span>
            </div>
          )}

          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" onClick={onClose} disabled={submitting} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] disabled:opacity-50">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !batchId || targetCount === 0} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <JisIcon className="text-[16px]">{submitting ? 'progress_activity' : 'check'}</JisIcon>
              <span>
                {submitting ? 'Adding…'
                  : targetCount > 0 ? `Charge ${targetCount} ${targetCount === 1 ? 'student' : 'students'}`
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
