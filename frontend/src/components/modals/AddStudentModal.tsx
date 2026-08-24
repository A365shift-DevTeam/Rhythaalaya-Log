import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Batch, Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (studentData: any, batchIds: string[]) => Promise<void>;
  onUpdateStudent: (studentId: string, studentData: any, batchIds: string[]) => Promise<void>;
  editingStudent?: Student | null;
  batches: Batch[];
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAddStudent,
  onUpdateStudent,
  editingStudent,
  batches,
}) => {
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joinDate, setJoinDate] = useState(todayIso());
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name);
      setDateOfBirth(editingStudent.dateOfBirth || '');
      setJoinDate(editingStudent.joinDate || todayIso());
      setParentName(editingStudent.parentName || '');
      setPhone(editingStudent.phone || '');
      setEmail(editingStudent.email || '');
      setAddress(editingStudent.address || '');
      setSelectedBatchIds(editingStudent.enrollments.filter((e) => e.status === 'Active').map((e) => e.batchId));
    } else {
      setName('');
      setDateOfBirth('');
      setJoinDate(todayIso());
      setParentName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setSelectedBatchIds([]);
    }
    setError('');
    setSubmitting(false);
  }, [editingStudent, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError('Student name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        dateOfBirth: dateOfBirth || undefined,
        joinDate: joinDate || todayIso(),
        parentName: parentName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      };
      if (editingStudent) {
        await onUpdateStudent(editingStudent.id, payload, selectedBatchIds);
      } else {
        await onAddStudent(payload, selectedBatchIds);
      }
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save student.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
    >
      <div className="bg-white dark:bg-[#0b1422] rounded-3xl max-w-2xl w-full max-h-[92dvh] overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244]">
        <div className="flex justify-between items-start gap-4 px-5 sm:px-7 py-5 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
          <div className="pr-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#3fc073]">
              <JisIcon className="text-[16px]">{editingStudent ? 'edit' : 'person_add'}</JisIcon>
              {editingStudent ? 'Edit student' : 'New student'}
            </span>
            <h3 id="add-student-title" className="font-heading text-xl sm:text-2xl font-bold text-[#212121] dark:text-white mt-1">
              {editingStudent ? editingStudent.name : 'Enroll a student'}
            </h3>
          </div>
          <div className="flex items-center shrink-0">
            <Button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="flex h-9 w-9 items-center justify-center text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-2xl transition-all active:scale-95"
            >
              <JisIcon className="text-[19px]">close</JisIcon>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(92dvh-118px)]">
          <div className="p-5 sm:p-7 space-y-6">
            <section aria-labelledby="student-information-heading">
              {!editingStudent && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 inline-flex items-center justify-center text-xs font-bold">1</span>
                  <h4 id="student-information-heading" className="font-heading text-sm font-bold text-[#212121] dark:text-white">Student details</h4>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="student-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Student name <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="student-name" type="text" required autoFocus autoComplete="name" placeholder="Enter the student's full name"
                    value={name} onChange={(event) => setName(event.target.value)}
                    className="settings-input" />
                </div>
                <div>
                  <label htmlFor="student-dob" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Date of birth</label>
                  <input id="student-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)}
                    className="settings-input" />
                </div>
                <div>
                  <label htmlFor="student-join-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Date of joining <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="student-join-date" type="date" required value={joinDate} onChange={(event) => setJoinDate(event.target.value)}
                    className="settings-input" />
                </div>
                <div>
                  <label htmlFor="student-parent" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Parent / guardian name</label>
                  <input id="student-parent" type="text" placeholder="e.g. Anita Sharma" value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    className="settings-input" />
                </div>
                <div>
                  <label htmlFor="student-phone" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Phone number</label>
                  <input id="student-phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="settings-input" />
                </div>
                <div>
                  <label htmlFor="student-email" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Email address</label>
                  <input id="student-email" type="email" autoComplete="email" placeholder="student@example.com" value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="settings-input" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="student-address" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Address</label>
                  <textarea id="student-address" rows={2} placeholder="Street, city, postal code" value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15" />
                </div>
              </div>
            </section>

            <div className="h-px bg-[#dbdbdb]/60 dark:bg-[#111c2b]" />

            <section aria-labelledby="batch-enrollment-heading">
              <div className="flex items-center gap-3 mb-4">
                {editingStudent ? (
                  <span className="w-8 h-8 rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 inline-flex items-center justify-center">
                    <JisIcon className="text-[18px]">calendar_view_week</JisIcon>
                  </span>
                ) : (
                  <span className="w-7 h-7 rounded-full bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 inline-flex items-center justify-center text-xs font-bold">2</span>
                )}
                <div>
                  <h4 id="batch-enrollment-heading" className="font-heading text-sm font-bold text-[#212121] dark:text-white">
                    {editingStudent ? 'Batch enrollment' : 'Enroll in batches (optional)'}
                  </h4>
                  <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Select every batch this student should attend.</p>
                </div>
              </div>

              {editableBatches.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#f59e0b] dark:border-amber-900/60 dark:bg-amber-950/40" role="alert">
                  {editingStudent
                    ? 'No active batches are available. Create a batch before assigning this student.'
                    : 'No active batches yet. You can save the student now and enroll them from the Students tab once a batch exists.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {editableBatches.map((batch) => {
                    const isSelected = selectedBatchIds.includes(batch.id);
                    return (
                      <label key={batch.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-all ${isSelected
                        ? 'border-[#3fc073] bg-[#f4fbf7] dark:border-[#3fc073] dark:bg-[#07111f]/50'
                        : 'border-[#dbdbdb] bg-[#f0f0f0] hover:border-[#3fc073]/50 dark:border-[#243244] dark:bg-[#111c2b]'}`}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleBatch(batch.id)} className="h-4 w-4 shrink-0 accent-[#3fc073] rounded" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-[#212121] dark:text-white">{batch.name}</span>
                          <span className="block truncate text-xs text-[#808080] dark:text-[#94a3b8]">{batch.courseName}{!batch.isActive ? ' - Inactive' : ''}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-7 py-4 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur border-t border-[#dbdbdb]/60 dark:border-[#243244]">
            <Button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}
              className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
              <JisIcon className="text-[18px]">check_circle</JisIcon>
              {submitting ? 'Saving…' : editingStudent ? 'Save changes' : 'Save student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
