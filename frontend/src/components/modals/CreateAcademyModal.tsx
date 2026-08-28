import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React, { useEffect, useRef, useState } from 'react';
import { Plan } from '../../api';
import { useDialogLifecycle } from './useDialogLifecycle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PasswordInput } from '../ui/password-input';

const WIZARD_STEPS = ['Academy', 'Administrator', 'Review'];
const LAST_STEP = WIZARD_STEPS.length - 1;

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function generateSlug(name: string): string {
  const base = slugify(name) || 'academy';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

function oneYearFromNow(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

interface CreateAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: Plan[];
  onCreate: (data: {
    name: string; slug: string; planId: string; subscriptionEndsAt: string;
    adminName: string; adminEmail: string; adminPassword: string;
  }) => Promise<void>;
}

export const CreateAcademyModal: React.FC<CreateAcademyModalProps> = ({ isOpen, onClose, plans, onCreate }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugCustomized, setSlugCustomized] = useState(false);
  const [planId, setPlanId] = useState('');
  const [endsAt, setEndsAt] = useState(oneYearFromNow());
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setSlug('');
    setSlugCustomized(false);
    setPlanId('');
    setEndsAt(oneYearFromNow());
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('');
    setStep(0);
    hasNavigatedRef.current = false;
    setError('');
    setSubmitting(false);
  }, [isOpen]);

  // Regenerate the suggested web address from the name — but only until the admin has
  // deliberately customized it, so their edit is never silently overwritten.
  useEffect(() => {
    if (!slugCustomized) setSlug(name.trim() ? generateSlug(name) : '');
  }, [name, slugCustomized]);

  useEffect(() => {
    if (!isOpen) return;
    if (hasNavigatedRef.current) panelHeadingRef.current?.focus();
    else nameInputRef.current?.focus();
  }, [step, isOpen]);

  if (!isOpen) return null;

  const goToStep = (targetStep: number) => {
    hasNavigatedRef.current = true;
    setStep(targetStep);
  };

  const canLeaveFirstStep = name.trim() !== '' && planId !== '' && endsAt !== '';
  const canLeaveSecondStep = adminName.trim() !== '' && adminEmail.trim() !== '' && adminPassword.length >= 8;
  const selectedPlan = plans.find((plan) => plan.id === planId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step < LAST_STEP) return;
    if (!planId) { setError('Choose a plan.'); goToStep(0); return; }
    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(), slug: slug.trim(), planId,
        subscriptionEndsAt: new Date(endsAt + 'T23:59:59Z').toISOString(),
        adminName: adminName.trim(), adminEmail: adminEmail.trim(), adminPassword
      });
      onClose();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to create the academy.';
      // "Tenant slug already exists" is the raw backend wording for a name collision on the
      // auto-generated web address — surface it in plain language and let them fix it directly.
      if (message.toLowerCase().includes('slug')) {
        setSlugCustomized(true);
        setError("That web address is already taken — please choose a different one below.");
        goToStep(0);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const errorBanner = error
    ? <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-[#ef4444] text-xs font-bold">{error}</div>
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-academy-title"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl max-h-[92dvh] rounded-3xl overflow-hidden shadow-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] flex flex-col"
        onClick={(event) => event.stopPropagation()}>
        <div className="h-1.5 bg-gradient-to-r from-[#4d999d] to-[#64a85a] shrink-0" />
        <div ref={dialogRef} tabIndex={-1} className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 sm:px-7 py-5 border-b border-[#dbdbdb]/60 dark:border-[#243244] shrink-0">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#3fc073]">
                  <JisIcon className="text-[16px]">add_business</JisIcon>
                  Step {step + 1} of {WIZARD_STEPS.length}
                </span>
                <h3 id="create-academy-title" className="font-heading text-xl sm:text-2xl font-bold text-[#212121] dark:text-white mt-1">
                  Create a new academy
                </h3>
              </div>
              <Button type="button" onClick={onClose} aria-label="Close" title="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center text-[#808080] hover:text-[#ef4444] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-2xl transition-all active:scale-95">
                <JisIcon className="text-[19px]">close</JisIcon>
              </Button>
            </div>
          </div>

          <StepIndicator current={step} onStepClick={goToStep} />

          <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            <div className="flex-1 p-5 sm:p-7 space-y-6" role="group" aria-labelledby="academy-step-heading">
            {step === 0 && (
              <section className="space-y-4">
                <StepHeading headingRef={panelHeadingRef} title="Academy details"
                  hint="Give the academy a name and a subscription plan." />
                <div>
                  <label htmlFor="academy-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Academy name <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="academy-name" ref={nameInputRef} type="text" required autoFocus placeholder="e.g. Rhythaalaya Chennai"
                    value={name} onChange={(event) => setName(event.target.value)} className="settings-input" />
                  {slug && (
                    <p className="mt-1.5 text-xs text-[#808080] dark:text-[#94a3b8]">
                      Web address: <span className="font-semibold text-[#575757] dark:text-[#cbd5e1]">{slug}</span>
                      {!slugCustomized && (
                        <Button type="button" onClick={() => setSlugCustomized(true)}
                          className="ml-2 inline text-[#3fc073] font-bold hover:underline">Customize</Button>
                      )}
                    </p>
                  )}
                  {slugCustomized && (
                    <input type="text" value={slug} onChange={(event) => setSlug(slugify(event.target.value))}
                      placeholder="rhythaalaya-chennai" className="settings-input mt-1.5" />
                  )}
                </div>
                {plans.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-[#f59e0b] dark:border-amber-900/60 dark:bg-amber-950/40" role="alert">
                    No subscription plans exist yet. Create one from the Plans section before adding an academy.
                  </div>
                ) : (
                  <div>
                    <label htmlFor="academy-plan" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                      Subscription plan <span className="text-[#ef4444]" aria-hidden="true">*</span>
                    </label>
                    <Select value={planId} onValueChange={setPlanId}>
                      <SelectTrigger id="academy-plan">
                        <SelectValue placeholder="Choose a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} — ₹{plan.monthlyPrice}/mo, up to {plan.maxStudents} students
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label htmlFor="academy-ends-at" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Access valid until <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="academy-ends-at" type="date" required value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)} className="settings-input" />
                  <p className="mt-1.5 text-xs text-[#9e9e9e]">Defaults to one year from today — you can extend this anytime later.</p>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-4">
                <StepHeading headingRef={panelHeadingRef} title="Academy administrator"
                  hint="This person can sign in right away to manage students, batches, and fees for the academy." />
                <div>
                  <label htmlFor="admin-name" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Their full name <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="admin-name" type="text" required placeholder="e.g. Priya Menon" value={adminName}
                    onChange={(event) => setAdminName(event.target.value)} className="settings-input" />
                </div>
                <div>
                  <label htmlFor="admin-email" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Their email address <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <input id="admin-email" type="email" required placeholder="admin@academy.com" value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)} className="settings-input" />
                </div>
                <div>
                  <label htmlFor="admin-password" className="block text-xs font-bold text-[#575757] dark:text-[#cbd5e1] mb-1.5">
                    Temporary password <span className="text-[#ef4444]" aria-hidden="true">*</span>
                  </label>
                  <PasswordInput id="admin-password" required minLength={8} placeholder="At least 8 characters"
                    value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="settings-input" />
                  <p className="mt-1.5 text-xs text-[#9e9e9e]">They'll use this email and password to sign in immediately.</p>
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <StepHeading headingRef={panelHeadingRef} title="Review" hint="Check everything below before creating the academy." />
                <div className="space-y-3">
                  <ReviewGroup title="Academy" onEdit={() => goToStep(0)}>
                    <ReviewRow label="Name" value={name.trim()} />
                    <ReviewRow label="Web address" value={slug} />
                    <ReviewRow label="Plan" value={selectedPlan ? `${selectedPlan.name} — ₹${selectedPlan.monthlyPrice}/mo` : ''} />
                    <ReviewRow label="Valid until" value={formatDate(endsAt)} />
                  </ReviewGroup>
                  <ReviewGroup title="Administrator" onEdit={() => goToStep(1)}>
                    <ReviewRow label="Name" value={adminName.trim()} />
                    <ReviewRow label="Email" value={adminEmail.trim()} />
                    <ReviewRow label="Password" value={adminPassword ? '••••••••' : ''} />
                  </ReviewGroup>
                </div>
              </section>
            )}

            {errorBanner}
          </div>

            <div className="sticky bottom-0 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 bg-white/95 dark:bg-[#0b1422]/95 backdrop-blur border-t border-[#dbdbdb]/60 dark:border-[#243244] px-5 sm:px-7 py-4">
              <Button type="button" onClick={onClose} disabled={submitting}
                className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#172435]">
                Cancel
              </Button>
              {step > 0 && (
                <Button type="button" onClick={() => goToStep(step - 1)} disabled={submitting}
                  className="min-h-11 px-5 rounded-2xl text-sm font-semibold text-[#575757] dark:text-[#cbd5e1] border border-[#dbdbdb] dark:border-[#243244] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] inline-flex items-center justify-center gap-1.5">
                  <JisIcon className="text-[18px]">arrow_back</JisIcon>
                  Back
                </Button>
              )}
              {step < LAST_STEP ? (
                <Button type="button" onClick={() => goToStep(step + 1)}
                  disabled={(step === 0 && !canLeaveFirstStep) || (step === 1 && !canLeaveSecondStep)}
                  className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
                  Next
                  <JisIcon className="text-[18px]">arrow_forward</JisIcon>
                </Button>
              ) : (
                <Button type="submit" disabled={submitting}
                  className="btn-brand min-h-11 px-6 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-45">
                  <JisIcon className="text-[18px]">check_circle</JisIcon>
                  {submitting ? 'Creating…' : 'Create academy'}
                </Button>
              )}
            </div>
          </form>
        </div>
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
    <div className="mb-1">
      <h4 id="academy-step-heading" ref={headingRef} tabIndex={-1} className="font-heading text-sm font-bold text-[#212121] dark:text-white outline-none">{title}</h4>
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
