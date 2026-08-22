import React, { useEffect, useState } from 'react';
import { Batch, Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

export interface StudentFields {
  name: string; dateOfBirth: string | null; parentName: string; phone: string; email: string; address: string;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  editingStudent?: Student | null;
  onAddStudent: (student: StudentFields, batchIds: string[]) => Promise<void>;
  onUpdateStudent: (studentId: string, student: StudentFields, batchIds: string[]) => Promise<void>;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen, onClose, batches, editingStudent, onAddStudent, onUpdateStudent
}) => {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setName(editingStudent?.name || '');
    setDateOfBirth(editingStudent?.dateOfBirth || '');
    setParentName(editingStudent?.parentName || '');
    setPhone(editingStudent?.phone || '');
    setEmail(editingStudent?.email || '');
    setAddress(editingStudent?.address || '');
    setSelectedBatchIds(editingStudent?.enrollments
      .filter((enrollment) => enrollment.status === 'Active')
      .map((enrollment) => enrollment.batchId) || []);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingStudent]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    const fields: StudentFields = {
      name: name.trim(), dateOfBirth: dateOfBirth || null, parentName: parentName.trim(),
      phone: phone.trim(), email: email.trim(), address: address.trim()
    };
    try {
      if (editingStudent) await onUpdateStudent(editingStudent.id, fields, selectedBatchIds);
      else await onAddStudent(fields, selectedBatchIds);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the student.');
    } finally {
      setSubmitting(false);
    }
  };

  const existingActiveBatchIds = editingStudent?.enrollments
    .filter((enrollment) => enrollment.status === 'Active')
    .map((enrollment) => enrollment.batchId) || [];
  const editableBatches = batches.filter((batch) => batch.isActive || existingActiveBatchIds.includes(batch.id));
  const toggleBatch = (targetBatchId: string) => {
    setSelectedBatchIds((previous) => previous.includes(targetBatchId)
      ? previous.filter((id) => id !== targetBatchId)
      : [...previous, targetBatchId]);
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
              <span className="material-symbols-outlined text-[16px]">{editingStudent ? 'edit' : 'person_add'}</span>
              {editingStudent ? 'Edit student' : 'New student'}
            </span>
            <h3 id="add-student-title" className="font-heading text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white mt-1">
              {editingStudent ? editingStudent.name : 'Enroll a student'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 shrink-0 inline-flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(92dvh-118px)]">
          <div className="p-5 sm:p-7 space-y-6">
            <section aria-labelledby="student-information-heading">
              {!editingStudent && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center text-xs font-extrabold">1</span>
                  <h4 id="student-information-heading" className="font-heading text-sm font-bold text-slate-900 dark:text-white">Student details</h4>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="student-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Student name <span className="text-rose-600" aria-hidden="true">*</span>
                  </label>
                  <input id="student-name" type="text" required autoFocus autoComplete="name" placeholder="Enter the student's full name"
                    value={name} onChange={(event) => setName(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="student-dob" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Date of birth</label>
                  <input id="student-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="student-parent" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Parent / guardian name</label>
                  <input id="student-parent" type="text" placeholder="e.g. Anita Sharma" value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone number</label>
                  <input id="student-phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="student-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email address</label>
                  <input id="student-email" type="email" autoComplete="email" placeholder="student@example.com" value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full min-h-11 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="student-address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                  <textarea id="student-address" rows={2} placeholder="Street, city, postal code" value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-950 dark:text-white" />
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section aria-labelledby="batch-enrollment-heading">
              <div className="flex items-center gap-3 mb-4">
                {editingStudent ? (
                  <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 inline-flex items-center justify-center text-xs font-extrabold">2</span>
                )}
                <div>
                  <h4 id="batch-enrollment-heading" className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                    {editingStudent ? 'Batch enrollment' : 'Enroll in batches (optional)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Select every batch this student should attend.</p>
                </div>
              </div>

              {editableBatches.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
                  {editingStudent
                    ? 'No active batches are available. Create a batch before assigning this student.'
                    : 'No active batches yet. You can save the student now and enroll them from the Students tab once a batch exists.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {editableBatches.map((batch) => {
                    const isSelected = selectedBatchIds.includes(batch.id);
                    return (
                      <label key={batch.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors ${isSelected
                        ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
                        : 'border-slate-200 bg-slate-50 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700'}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleBatch(batch.id)} className="h-4 w-4 shrink-0 accent-emerald-600" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-900 dark:text-white">{batch.name}</span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{batch.courseName}{!batch.isActive ? ' - Inactive' : ''}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-7 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="btn-brand min-h-11 px-6 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {submitting ? 'Saving…' : editingStudent ? 'Save changes' : 'Save student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
