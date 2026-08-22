import React from 'react';

/* Shared shells for the Settings screen so every panel, row, and switch
   there looks and behaves the same. */

export function Section({
  title,
  description,
  action,
  children
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-start justify-between gap-2.5 border-b border-line px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <h2 className="title">{title}</h2>
          <p className="label-xs mt-0.5">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingRow({
  title,
  note,
  children
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 md:px-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {note && <p className="label-xs mt-0.5">{note}</p>}
      </div>
      {children}
    </div>
  );
}

export function ToggleRow({
  title,
  note,
  checked,
  onChange,
  disabled = false
}: {
  title: string;
  note: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 p-3 md:px-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="label-xs mt-0.5">{note}</p>
      </div>
      <Toggle checked={checked} onChange={() => onChange(!checked)} label={title} disabled={disabled} />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? 'border-leaf bg-leaf' : 'border-line bg-surface-3'
      }`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-surface transition-transform ${
          checked ? 'translate-x-[1.4rem]' : 'translate-x-[0.15rem]'
        }`}
        aria-hidden="true"
      />
    </button>
  );
}

export function Field({
  label,
  id,
  hint,
  children
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1.5 block font-semibold text-ink">{label}</label>
      {children}
      {hint && <p className="label-xs mt-1.5">{hint}</p>}
    </div>
  );
}

export function DetailRow({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 md:px-4">
      <dt className="label shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] text-ink">{children ?? value}</dd>
    </div>
  );
}
