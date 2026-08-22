import React, { useEffect, useState } from 'react';
import { Staff } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStaff?: Staff | null;
  onSave: (name: string, phone: string, email: string, isActive: boolean) => Promise<void>;
  onArchive?: (staffId: string) => Promise<void>;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ isOpen, onClose, editingStaff, onSave, onArchive }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setName(editingStaff?.name || '');
    setPhone(editingStaff?.phone || '');
    setEmail(editingStaff?.email || '');
    setIsActive(editingStaff?.isActive ?? true);
    setError('');
  }, [isOpen, editingStaff]);

  if (!isOpen) return null;

  const handleArchive = async () => {
    if (!editingStaff || !onArchive) return;
    if (!confirm(`Archive "${editingStaff.name}"? They'll be hidden from new batch assignments, but existing batches and history are kept.`)) return;
    setArchiving(true);
    setError('');
    try {
      await onArchive(editingStaff.id);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not archive the staff member.');
    } finally {
      setArchiving(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), phone.trim(), email.trim(), isActive);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save the staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-staff-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-brand-200/50 bg-white p-4 shadow-2xl dark:bg-slate-900 sm:rounded-2xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 id="add-staff-title" className="font-heading text-xl font-bold text-slate-900 dark:text-white">
            {editingStaff ? 'Edit staff / mentor' : 'New staff / mentor'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="staff-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Full name *</label>
            <input id="staff-name" type="text" required autoFocus placeholder="e.g. Sarah Connor" value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-phone" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Phone</label>
              <input id="staff-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
            </div>
            <div>
              <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Email</label>
              <input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
                className="w-full min-h-11 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white" />
            </div>
          </div>
          {editingStaff && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Available for new batch assignments
            </label>
          )}
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {editingStaff && onArchive ? (
              <button type="button" onClick={handleArchive} disabled={submitting || archiving}
                className="min-h-11 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start">
                <span className="material-symbols-outlined text-[16px]">archive</span>
                {archiving ? 'Archiving…' : 'Archive staff'}
              </button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} disabled={submitting || archiving} className="min-h-11 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
              <button type="submit" disabled={submitting || archiving || !name.trim()} className="btn-brand min-h-11 px-5 py-2 rounded-xl text-xs font-semibold disabled:opacity-50">
                {submitting ? 'Saving…' : editingStaff ? 'Save changes' : 'Add staff member'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
