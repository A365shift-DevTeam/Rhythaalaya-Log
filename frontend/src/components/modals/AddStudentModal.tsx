import React, { useEffect, useMemo, useState } from 'react';
import { Batch } from '../../types';
import { Dialog, DialogError } from './Dialog';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  onAddStudent: (
    student: {
      name: string;
      dateOfBirth: string | null;
      parentName: string;
      phone: string;
      email: string;
      address: string;
    },
    enrollBatchId: string | null
  ) => Promise<void>;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  batches,
  onAddStudent
}) => {
  const activeBatches = useMemo(() => batches.filter((batch) => batch.isActive), [batches]);

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [enrollNow, setEnrollNow] = useState(true);
  const [batchId, setBatchId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formId = 'student-form';

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDateOfBirth('');
    setParentName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setEnrollNow(activeBatches.length > 0);
    setBatchId(activeBatches[0]?.id || '');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onAddStudent(
        {
          name: name.trim(),
          dateOfBirth: dateOfBirth || null,
          parentName: parentName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim()
        },
        enrollNow && batchId ? batchId : null
      );
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The student could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add student"
      description="Only the name is required. The rest can wait."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" form={formId} disabled={submitting || !name.trim()} className="btn btn-primary">
            {submitting ? 'Saving…' : 'Add student'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="student-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
          <input
            id="student-name"
            type="text"
            required
            autoFocus
            autoComplete="name"
            placeholder="Anjali Ramesh"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="student-parent" className="label mb-1.5 block font-semibold text-ink">
              Parent or guardian
            </label>
            <input
              id="student-parent"
              type="text"
              placeholder="Anita Ramesh"
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="student-dob" className="label mb-1.5 block font-semibold text-ink">
              Date of birth
            </label>
            <input
              id="student-dob"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              className="field num"
            />
          </div>
          <div>
            <label htmlFor="student-phone" className="label mb-1.5 block font-semibold text-ink">Phone</label>
            <input
              id="student-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field"
            />
            <p className="label-xs mt-1.5">Used for WhatsApp fee reminders.</p>
          </div>
          <div>
            <label htmlFor="student-email" className="label mb-1.5 block font-semibold text-ink">Email</label>
            <input
              id="student-email"
              type="email"
              autoComplete="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="student-address" className="label mb-1.5 block font-semibold text-ink">Address</label>
          <textarea
            id="student-address"
            rows={2}
            placeholder="Street, city, postal code"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="field"
          />
        </div>

        <div className="border-t border-line-2 pt-3.5">
          {activeBatches.length === 0 ? (
            <p className="label">
              There are no running batches yet. Save the student now and enrol them once a batch exists.
            </p>
          ) : (
            <>
              <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line px-3 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={enrollNow}
                  onChange={(event) => setEnrollNow(event.target.checked)}
                  className="h-4 w-4 shrink-0 accent-[var(--c-leaf)]"
                />
                Enrol in a batch now
              </label>

              {enrollNow && (
                <div className="mt-2.5">
                  <label htmlFor="student-batch" className="sr-only">Batch</label>
                  <select
                    id="student-batch"
                    value={batchId}
                    onChange={(event) => setBatchId(event.target.value)}
                    className="field"
                  >
                    {activeBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} — {batch.courseName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <DialogError message={error} />
      </form>
    </Dialog>
  );
};
