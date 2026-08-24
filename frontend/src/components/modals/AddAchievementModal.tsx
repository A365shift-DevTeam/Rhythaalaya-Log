import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useState } from 'react';
import { Achievement, AchievementCategory } from '../../types';
import { api } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';

interface AddAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  token: string;
  onCreated: (achievement: Achievement) => void;
}

const CATEGORIES: { value: AchievementCategory; label: string; icon: string }[] = [
  { value: 'Won', label: 'Won', icon: 'workspace_premium' },
  { value: 'Participated', label: 'Participated', icon: 'how_to_reg' },
  { value: 'Other', label: 'Other', icon: 'category' },
];

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

const todayIso = () => new Date().toISOString().slice(0, 10);

export const AddAchievementModal: React.FC<AddAchievementModalProps> = ({
  isOpen, onClose, studentId, token, onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AchievementCategory>('Won');
  const [level, setLevel] = useState('');
  const [eventDate, setEventDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(''); setCategory('Won'); setLevel(''); setEventDate(todayIso()); setNote('');
    setFile(null); setError(''); setSubmitting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] || null;
    if (!picked) { setFile(null); return; }
    if (!ACCEPTED_TYPES.includes(picked.type)) {
      setError('Upload a JPG, PNG, WEBP image or a PDF.');
      event.target.value = '';
      return;
    }
    const isPdf = picked.type === 'application/pdf';
    if (picked.size > (isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
      setError(isPdf ? 'PDF certificates must be 8MB or smaller.' : 'Image certificates must be 15MB or smaller.');
      event.target.value = '';
      return;
    }
    setError('');
    setFile(picked);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) { setError('Give the achievement a title.'); return; }
    if (!file) { setError('Attach the certificate file.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const created = await api.createAchievement(token, studentId, {
        title: title.trim(), category, level: level.trim() || undefined, eventDate, note: note.trim() || undefined,
      }, file);
      onCreated(created);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save the certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-achievement-title"
      onKeyDown={(event) => {
        // This dialog nests inside StudentDetailsModal, which also listens for Escape at the
        // document level. Stop the key from bubbling there so Escape closes only this dialog.
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      }}
    >
      <div className="bg-white dark:bg-[#0b1422] rounded-3xl max-w-lg w-full max-h-[92dvh] overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244]">
        <div className="flex justify-between items-start gap-4 px-5 sm:px-7 py-5 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
          <div className="pr-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#3fc073]">
              <JisIcon className="text-[16px]">cloud_upload</JisIcon>
              New certificate
            </span>
            <h3 id="add-achievement-title" className="font-heading text-xl font-bold text-[#212121] dark:text-white mt-1">
              Add achievement
            </h3>
          </div>
          <Button type="button" onClick={onClose} aria-label="Close" title="Close"
            className="flex h-9 w-9 items-center justify-center text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-2xl transition-all active:scale-95">
            <JisIcon className="text-[19px]">close</JisIcon>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(92dvh-118px)]">
          <div className="p-5 sm:p-7 space-y-4">
            <div>
              <label htmlFor="achievement-title" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                Title / event name <span className="text-[#ef4444]" aria-hidden="true">*</span>
              </label>
              <input id="achievement-title" type="text" required autoFocus placeholder="e.g. State Level Bharatanatyam Competition"
                value={title} onChange={(event) => setTitle(event.target.value)} className="settings-input" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((option) => (
                  <Button key={option.value} type="button" onClick={() => setCategory(option.value)}
                    aria-pressed={category === option.value}
                    className={`min-h-11 rounded-2xl border px-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      category === option.value
                        ? 'border-[#3fc073] bg-[#f4fbf7] text-[#35a160] dark:border-[#3fc073] dark:bg-[#07111f]/50 dark:text-[#b3e6c7]'
                        : 'border-[#dbdbdb] bg-[#f0f0f0] text-[#575757] hover:border-[#3fc073]/50 dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#cbd5e1]'
                    }`}>
                    <JisIcon className="text-[16px]">{option.icon}</JisIcon>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="achievement-level" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Level</label>
                <input id="achievement-level" type="text" placeholder="e.g. District, State, National" value={level}
                  onChange={(event) => setLevel(event.target.value)} className="settings-input" />
              </div>
              <div>
                <label htmlFor="achievement-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                  Date <span className="text-[#ef4444]" aria-hidden="true">*</span>
                </label>
                <input id="achievement-date" type="date" required value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)} className="settings-input" />
              </div>
            </div>

            <div>
              <label htmlFor="achievement-note" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Note</label>
              <textarea id="achievement-note" rows={2} placeholder="Optional details" value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                Certificate file <span className="text-[#ef4444]" aria-hidden="true">*</span>
              </label>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[#dbdbdb] bg-[#f0f0f0] px-4 py-3 hover:border-[#3fc073]/50 dark:border-[#243244] dark:bg-[#111c2b] transition-colors">
                <JisIcon className="text-[#3fc073] text-[20px]">upload</JisIcon>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">
                  {file ? file.name : 'Choose a JPG, PNG, WEBP or PDF file'}
                </span>
                <input type="file" accept={ACCEPTED_TYPES.join(',')} onChange={handleFileChange} className="hidden" />
              </label>
              <p className="mt-1.5 text-xs text-[#808080] dark:text-[#94a3b8]">Images are compressed automatically. Max 15MB (images) or 8MB (PDF).</p>
            </div>

            {error && <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>}
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-7 py-4 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur border-t border-[#dbdbdb]/60 dark:border-[#243244]">
            <Button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !file}
              className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
              <JisIcon className="text-[18px]">check_circle</JisIcon>
              {submitting ? 'Saving…' : 'Save certificate'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
