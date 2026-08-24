import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="add-staff-title" className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[#dbdbdb] bg-white p-4 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422] sm:rounded-3xl sm:p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#dbdbdb]/60 dark:border-[#243244] pb-3 pt-1">
          <h3 id="add-staff-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white">
            {editingStaff ? 'Edit staff / mentor' : 'New staff / mentor'}
          </h3>
          <Button type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
          <div>
            <label htmlFor="staff-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Full name *</label>
            <input id="staff-name" type="text" required autoFocus placeholder="e.g. Sarah Connor" value={name}
              onChange={(event) => setName(event.target.value)}
              className="settings-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="staff-phone" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Phone</label>
              <input id="staff-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}
                className="settings-input" />
            </div>
            <div>
              <label htmlFor="staff-email" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1">Email</label>
              <input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)}
                className="settings-input" />
            </div>
          </div>
          {editingStaff && (
            <label className="flex items-center gap-2 text-xs font-bold text-[#575757] dark:text-[#cbd5e1] cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-[#3fc073] rounded" />
              Available for new batch assignments
            </label>
          )}
          {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {editingStaff && onArchive ? (
              <Button type="button" onClick={handleArchive} disabled={submitting || archiving}
                className="min-h-11 px-3 py-2 rounded-2xl text-xs font-bold text-[#ef4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:justify-start transition-colors">
                <JisIcon className="text-[16px]">archive</JisIcon>
                {archiving ? 'Archiving…' : 'Archive staff'}
              </Button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" onClick={onClose} disabled={submitting || archiving} className="min-h-11 px-4 py-2 rounded-2xl text-xs font-semibold text-[#575757] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">Cancel</Button>
              <Button type="submit" disabled={submitting || archiving || !name.trim()} className="btn-brand min-h-11 px-5 py-2 rounded-2xl text-xs font-bold disabled:opacity-50">
                {submitting ? 'Saving…' : editingStaff ? 'Save changes' : 'Add staff member'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
