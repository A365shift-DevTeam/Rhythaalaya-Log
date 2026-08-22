import React, { useEffect, useState } from 'react';
import { Course } from '../../types';
import { Dialog, DialogError } from './Dialog';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourse?: Course | null;
  onSave: (name: string, description: string, isActive: boolean) => Promise<void>;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  editingCourse,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const formId = 'course-form';

  useEffect(() => {
    if (!isOpen) return;
    setName(editingCourse?.name || '');
    setDescription(editingCourse?.description || '');
    setIsActive(editingCourse?.isActive ?? true);
    setError('');
  }, [isOpen, editingCourse]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSave(name.trim(), description.trim(), isActive);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The course could not be saved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={editingCourse ? 'Edit course' : 'Add course'}
      description="A course is what you teach. Batches are the classes that run it."
      footer={
        <>
          <button type="button" onClick={onClose} disabled={submitting} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" form={formId} disabled={submitting || !name.trim()} className="btn btn-primary">
            {submitting ? 'Saving…' : editingCourse ? 'Save course' : 'Add course'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label htmlFor="course-name" className="label mb-1.5 block font-semibold text-ink">Name</label>
          <input
            id="course-name"
            type="text"
            required
            autoFocus
            placeholder="Bharatanatyam"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="course-description" className="label mb-1.5 block font-semibold text-ink">
            Description
          </label>
          <textarea
            id="course-description"
            rows={3}
            placeholder="Classical dance, beginner to advanced"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="field"
          />
        </div>

        {editingCourse && (
          <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line px-3 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--c-leaf)]"
            />
            Taking new batches
          </label>
        )}

        <DialogError message={error} />
      </form>
    </Dialog>
  );
};
