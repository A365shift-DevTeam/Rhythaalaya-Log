import React, { useEffect, useState } from 'react';
import { Staff } from '../../types';
import { Dialog, DialogError } from './Dialog';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStaff?: Staff | null;
  onSave: (name: string, phone: string, email: string, isActive: boolean) => Promise<void>;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({
  isOpen,
  onClose,
  editingStaff,
  onSave
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formId = 'staff-form';

  useEffect(() => {
    if (!isOpen) return;
    setName(editingStaff?.name || '');
    setPhone(editingStaff?.phone || '');
    setEmail(editingStaff?.email || '');
    setIsActive(editingStaff?.isActive ?? true);
    setError('');
  }, [isOpen, editingStaff]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), phone.trim(), email.trim(), isActive);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The teacher could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={editingStaff ? 'Edit teacher' : 'Add teacher'}
      description="Teachers are assigned to batches."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" form={formId} disabled={submitting || !name.trim()} className="btn btn-primary">
            {submitting ? 'Saving…' : editingStaff ? 'Save teacher' : 'Add teacher'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="staff-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
          <input
            id="staff-name"
            type="text"
            required
            autoFocus
            autoComplete="name"
            placeholder="Lakshmi Sundaram"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="staff-phone" className="label mb-1.5 block font-semibold text-ink">Phone</label>
            <input
              id="staff-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="staff-email" className="label mb-1.5 block font-semibold text-ink">Email</label>
            <input
              id="staff-email"
              type="email"
              autoComplete="email"
              placeholder="teacher@academy.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
            />
          </div>
        </div>

        {editingStaff && (
          <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line px-3 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--c-leaf)]"
            />
            Available for new batches
          </label>
        )}

        <DialogError message={error} />
      </form>
    </Dialog>
  );
};
