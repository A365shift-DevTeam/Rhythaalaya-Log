import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useRef, useState } from 'react';
import { Batch, Student } from '../../types';
import { useDialogLifecycle } from './useDialogLifecycle';
import { todayIsoDate as todayIso } from '../../lib/schedule';

const WIZARD_STEPS = ['Student', 'Contact', 'Batches', 'Review'];
const LAST_STEP = WIZARD_STEPS.length - 1;

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
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joinDate, setJoinDate] = useState(todayIso());
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [concessionPercent, setConcessionPercent] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [batchMenuOpen, setBatchMenuOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasNavigatedRef = useRef(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);
  const batchPanelRef = useRef<HTMLDivElement>(null);

  const isWizard = !editingStudent;

  // Dismiss the batch menu on an outside press, and on Escape before the dialog sees it.
  useEffect(() => {
    if (!batchMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!batchMenuRef.current?.contains(event.target as Node)) setBatchMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      event.preventDefault();
      setBatchMenuOpen(false);
      document.getElementById('batch-picker-trigger')?.focus();
    };

    // The panel is absolutely positioned inside the modal's scroller, so nudge it into
    // view — otherwise it can open below the fold with nothing prompting a scroll.
    const frame = window.requestAnimationFrame(() =>
      batchPanelRef.current?.scrollIntoView({ block: 'nearest' }));

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [batchMenuOpen]);

  // A menu left hanging open across a step change or a reopen is just a stray popover.
  useEffect(() => { setBatchMenuOpen(false); }, [step, isOpen]);

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name);
      setDateOfBirth(editingStudent.dateOfBirth || '');
      setJoinDate(editingStudent.joinDate || todayIso());
      setParentName(editingStudent.parentName || '');
      setPhone(editingStudent.phone || '');
      setEmail(editingStudent.email || '');
      setAddress(editingStudent.address || '');
      setConcessionPercent(editingStudent.concessionPercent ? String(editingStudent.concessionPercent) : '');
      setSelectedBatchIds(editingStudent.enrollments.filter((e) => e.status === 'Active').map((e) => e.batchId));
    } else {
      setName('');
      setDateOfBirth('');
      setJoinDate(todayIso());
      setParentName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setConcessionPercent('');
      setSelectedBatchIds([]);
    }
    setStep(0);
    hasNavigatedRef.current = false;
    setError('');
    setSubmitting(false);
  }, [editingStudent, isOpen]);

  // Announce each wizard step: the name field on first open, the panel heading thereafter.
  useEffect(() => {
    if (!isOpen || !isWizard) return;
    if (hasNavigatedRef.current) {
      panelHeadingRef.current?.focus();
    } else {
      nameInputRef.current?.focus();
    }
  }, [step, isOpen, isWizard]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isWizard && step < LAST_STEP) return;
    if (!name.trim()) { setError('Student name is required.'); return; }
    const concession = Number(concessionPercent) || 0;
    if (concession < 0 || concession > 100) { setError('Concession must be between 0 and 100 percent.'); return; }
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
        concessionPercent: concession,
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

  const goToStep = (targetStep: number) => {
    hasNavigatedRef.current = true;
    setStep(targetStep);
  };
  const canLeaveFirstStep = name.trim() !== '' && joinDate !== '';
  const selectedBatches = editableBatches.filter((batch) => selectedBatchIds.includes(batch.id));

  const nameField = (
    <div className="sm:col-span-2">
      <label htmlFor="student-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
        Student name <span className="text-[#ef4444]" aria-hidden="true">*</span>
      </label>
      <input id="student-name" ref={nameInputRef} type="text" required autoFocus={!isWizard} autoComplete="name" placeholder="Enter the student's full name"
        value={name} onChange={(event) => setName(event.target.value)}
        className="settings-input" />
    </div>
  );
  const dateOfBirthField = (
    <div>
      <label htmlFor="student-dob" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Date of birth</label>
      <input id="student-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)}
        className="settings-input" />
    </div>
  );
  const joinDateField = (
    <div>
      <label htmlFor="student-join-date" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
        Date of joining <span className="text-[#ef4444]" aria-hidden="true">*</span>
      </label>
      <input id="student-join-date" type="date" required value={joinDate} onChange={(event) => setJoinDate(event.target.value)}
        className="settings-input" />
    </div>
  );
  const concessionFields = (
    <div>
      <label htmlFor="student-concession" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Fee concession (%)</label>
      <input id="student-concession" type="number" min={0} max={100} step={1} placeholder="0" value={concessionPercent}
        onChange={(event) => setConcessionPercent(event.target.value)}
        className="settings-input" />
      <p className="mt-1 text-xs text-[#9e9e9e]">Automatically reduces every course fee for this student.</p>
    </div>
  );
  const parentNameField = (
    <div>
      <label htmlFor="student-parent" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Parent / guardian name</label>
      <input id="student-parent" type="text" placeholder="e.g. Anita Sharma" value={parentName}
        onChange={(event) => setParentName(event.target.value)}
        className="settings-input" />
    </div>
  );
  const phoneField = (
    <div>
      <label htmlFor="student-phone" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Phone number</label>
      <input id="student-phone" type="tel" autoComplete="tel" placeholder="e.g. +91 98765 43210" value={phone}
        onChange={(event) => setPhone(event.target.value)}
        className="settings-input" />
    </div>
  );
  const emailField = (
    <div>
      <label htmlFor="student-email" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Email address</label>
      <input id="student-email" type="email" autoComplete="email" placeholder="student@example.com" value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="settings-input" />
    </div>
  );
  const addressField = (
    <div className="sm:col-span-2">
      <label htmlFor="student-address" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">Address</label>
      <textarea id="student-address" rows={2} placeholder="Street, city, postal code" value={address}
        onChange={(event) => setAddress(event.target.value)}
        className="w-full px-3.5 py-2.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-sm text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:ring-4 focus:ring-[#3fc073]/15" />
    </div>
  );

  const batchPicker = editableBatches.length === 0 ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#f59e0b] dark:border-amber-900/60 dark:bg-amber-950/40" role="alert">
      {editingStudent
        ? 'No active batches are available. Create a batch before assigning this student.'
        : 'No active batches yet. You can save the student now and enroll them from the Students tab once a batch exists.'}
    </div>
  ) : (
    <div className="relative" ref={batchMenuRef}>
      <button
        type="button"
        id="batch-picker-trigger"
        onClick={() => setBatchMenuOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={batchMenuOpen}
        className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left text-sm font-medium text-[#212121] outline-none transition-all dark:text-[#e2e8f0] ${batchMenuOpen
          ? 'border-[#3fc073] bg-white ring-4 ring-[#3fc073]/15 dark:border-[#4d999d] dark:bg-[#0b1422]'
          : 'border-[#dbdbdb] bg-[#f0f0f0] hover:border-[#3fc073]/50 dark:border-[#243244] dark:bg-[#111c2b]'}`}
      >
        <JisIcon className="text-[#9e9e9e] text-[20px] shrink-0">groups</JisIcon>
        <span className={`min-w-0 flex-1 truncate ${selectedBatches.length === 0 ? 'text-[#9e9e9e] dark:text-[#64748b]' : ''}`}>
          {selectedBatches.length === 0 ? 'Select batches' : selectedBatches.map((batch) => batch.name).join(', ')}
        </span>
        {selectedBatches.length > 0 && (
          <span className="shrink-0 rounded-full bg-[#e9f7ee] px-2 py-0.5 text-xs font-bold text-[#35a160] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]">
            {selectedBatches.length}
          </span>
        )}
        <JisIcon className={`text-[#9e9e9e] text-[20px] shrink-0 transition-transform ${batchMenuOpen ? 'rotate-180' : ''}`}>expand_more</JisIcon>
      </button>

      {batchMenuOpen && (
        <div
          ref={batchPanelRef}
          role="listbox"
          aria-multiselectable="true"
          aria-labelledby="batch-picker-trigger"
          className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-[#dbdbdb] bg-white p-1.5 shadow-2xl dark:border-[#243244] dark:bg-[#0b1422]"
        >
          {editableBatches.map((batch) => {
            const isSelected = selectedBatchIds.includes(batch.id);
            return (
              <label
                key={batch.id}
                role="option"
                aria-selected={isSelected}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-all ${isSelected
                  ? 'border-[#3fc073] bg-[#f4fbf7] dark:border-[#3fc073] dark:bg-[#07111f]/50'
                  : 'border-transparent hover:border-[#3fc073]/50 hover:bg-[#f0f0f0] dark:hover:bg-[#111c2b]'}`}
              >
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
    </div>
  );

  const errorBanner = error
    ? <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>
    : null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-student-title"
      onClick={onClose}
    >
      <div className="bg-white dark:bg-[#0b1422] rounded-3xl max-w-2xl w-full max-h-[92dvh] overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-4 px-5 sm:px-7 py-5 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
          <div className="pr-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#3fc073]">
              <JisIcon className="text-[16px]">{editingStudent ? 'edit' : 'person_add'}</JisIcon>
              {editingStudent ? 'Edit student' : `Step ${step + 1} of ${WIZARD_STEPS.length}`}
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

        {isWizard && <StepIndicator current={step} onStepClick={goToStep} />}

        <form onSubmit={handleSubmit} className={`overflow-y-auto ${isWizard ? 'max-h-[calc(92dvh-186px)]' : 'max-h-[calc(92dvh-118px)]'}`}>
          {isWizard ? (
            <div className="p-5 sm:p-7 space-y-6" role="group" aria-labelledby="student-step-heading">
              {step === 0 && (
                <section>
                  <StepHeading headingRef={panelHeadingRef} title="Student details" hint="Who is joining, and when did they start?" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nameField}
                    {dateOfBirthField}
                    {joinDateField}
                    {concessionFields}
                  </div>
                </section>
              )}

              {step === 1 && (
                <section>
                  <StepHeading headingRef={panelHeadingRef} title="Contact details" hint="All optional — you can fill these in later." />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parentNameField}
                    {phoneField}
                    {emailField}
                    {addressField}
                  </div>
                </section>
              )}

              {step === 2 && (
                <section>
                  <StepHeading headingRef={panelHeadingRef} title="Enroll in batches" hint="Select every batch this student should attend. Optional." />
                  {batchPicker}
                </section>
              )}

              {step === 3 && (
                <section>
                  <StepHeading headingRef={panelHeadingRef} title="Review" hint="Check everything below before saving." />
                  <div className="space-y-3">
                    <ReviewGroup title="Student" onEdit={() => goToStep(0)}>
                      <ReviewRow label="Student name" value={name.trim()} />
                      <ReviewRow label="Date of birth" value={formatDate(dateOfBirth)} />
                      <ReviewRow label="Date of joining" value={formatDate(joinDate)} />
                      <ReviewRow label="Fee concession" value={Number(concessionPercent) > 0
                        ? `${Number(concessionPercent)}%` : ''} emptyText="None" />
                    </ReviewGroup>
                    <ReviewGroup title="Contact" onEdit={() => goToStep(1)}>
                      <ReviewRow label="Parent / guardian" value={parentName.trim()} />
                      <ReviewRow label="Phone number" value={phone.trim()} />
                      <ReviewRow label="Email address" value={email.trim()} />
                      <ReviewRow label="Address" value={address.trim()} />
                    </ReviewGroup>
                    <ReviewGroup title="Batches" onEdit={() => goToStep(2)}>
                      <ReviewRow
                        label={selectedBatches.length === 1 ? 'Batch' : 'Batches'}
                        value={selectedBatches.map((batch) => batch.name).join(', ')}
                        emptyText="None selected"
                      />
                    </ReviewGroup>
                  </div>
                </section>
              )}

              {errorBanner}
            </div>
          ) : (
            <div className="p-5 sm:p-7 space-y-6">
              <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {nameField}
                  {dateOfBirthField}
                  {joinDateField}
                  {parentNameField}
                  {phoneField}
                  {emailField}
                  {addressField}
                  {concessionFields}
                </div>
              </section>

              <div className="h-px bg-[#dbdbdb]/60 dark:bg-[#111c2b]" />

              <section aria-labelledby="batch-enrollment-heading">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 inline-flex items-center justify-center">
                    <JisIcon className="text-[18px]">calendar_view_week</JisIcon>
                  </span>
                  <div>
                    <h4 id="batch-enrollment-heading" className="font-heading text-sm font-bold text-[#212121] dark:text-white">Batch enrollment</h4>
                    <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">Select every batch this student should attend.</p>
                  </div>
                </div>
                {batchPicker}
              </section>

              {errorBanner}
            </div>
          )}

          <div className="sticky bottom-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 px-5 sm:px-7 py-4 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur border-t border-[#dbdbdb]/60 dark:border-[#243244]">
            <Button type="button" onClick={onClose} disabled={submitting}
              className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
              Cancel
            </Button>
            {isWizard && step > 0 && (
              <Button type="button" onClick={() => goToStep(step - 1)} disabled={submitting}
                className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] border border-[#dbdbdb] dark:border-[#243244] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] inline-flex items-center justify-center gap-1.5">
                <JisIcon className="text-[18px]">arrow_back</JisIcon>
                Back
              </Button>
            )}
            {isWizard && step < LAST_STEP ? (
              <Button type="button" onClick={() => goToStep(step + 1)} disabled={step === 0 && !canLeaveFirstStep}
                className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
                Next
                <JisIcon className="text-[18px]">arrow_forward</JisIcon>
              </Button>
            ) : (
              <Button type="submit" disabled={submitting || !name.trim()}
                className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
                <JisIcon className="text-[18px]">check_circle</JisIcon>
                {submitting ? 'Saving…' : editingStudent ? 'Save changes' : 'Save student'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

function formatDate(iso: string) {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StepIndicator({ current, onStepClick }: { current: number; onStepClick: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-1 px-5 sm:px-7 py-3.5 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
      {WIZARD_STEPS.map((label, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        return (
          <li key={label} className={`flex items-center gap-1.5 ${index === LAST_STEP ? '' : 'flex-1'}`}>
            <Button
              type="button"
              onClick={() => onStepClick(index)}
              disabled={index > current}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-2xl px-1.5 py-1 transition-all disabled:cursor-default ${index <= current ? 'hover:bg-[#f0f0f0] dark:hover:bg-[#172435]' : ''}`}
            >
              <span className={`w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center text-xs font-bold transition-colors ${isCurrent
                ? 'bg-[#3fc073] text-white'
                : isDone
                  ? 'bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20'
                  : 'bg-[#f0f0f0] text-[#808080] dark:bg-[#111c2b] dark:text-[#94a3b8]'}`}>
                {isDone ? <JisIcon className="text-[14px]">check</JisIcon> : index + 1}
              </span>
              <span className={`hidden sm:block text-xs font-bold whitespace-nowrap ${isCurrent
                ? 'text-[#212121] dark:text-white'
                : 'text-[#808080] dark:text-[#94a3b8]'}`}>
                {label}
              </span>
            </Button>
            {index < LAST_STEP && (
              <span aria-hidden="true" className={`h-0.5 flex-1 rounded-full ${isDone ? 'bg-[#3fc073]' : 'bg-[#dbdbdb] dark:bg-[#243244]'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({ headingRef, title, hint }: { headingRef: React.RefObject<HTMLHeadingElement>; title: string; hint: string }) {
  return (
    <div className="mb-4">
      <h4 id="student-step-heading" ref={headingRef} tabIndex={-1} className="font-heading text-sm font-bold text-[#212121] dark:text-white outline-none">{title}</h4>
      <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">{hint}</p>
    </div>
  );
}

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#dbdbdb] bg-[#f0f0f0] px-4 py-3.5 dark:border-[#243244] dark:bg-[#111c2b]">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h5 className="text-xs font-bold uppercase tracking-[0.14em] text-[#808080] dark:text-[#94a3b8]">{title}</h5>
        <Button type="button" onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-2xl px-2 py-1 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20">
          <JisIcon className="text-[15px]">edit</JisIcon>
          Edit
        </Button>
      </div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value, emptyText = 'Not provided' }: { label: string; value: string; emptyText?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-[#808080] dark:text-[#94a3b8]">{label}</dt>
      <dd className={`min-w-0 text-right text-xs font-bold break-words ${value
        ? 'text-[#212121] dark:text-white'
        : 'text-[#808080] font-semibold italic dark:text-[#94a3b8]'}`}>
        {value || emptyText}
      </dd>
    </div>
  );
}
