import React, { useEffect, useState } from 'react';
import { OrgSettings, ReceiptSettings } from '../types';
import { Field, Section, ToggleRow } from './SettingsUI';

interface FinancialSettingsProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
}

export function FinancialSettings({ settings, setSettings }: FinancialSettingsProps) {
  const [draft, setDraft] = useState<ReceiptSettings>(settings.receipt);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(settings.receipt), [settings.receipt]);

  const saveReceipt = (event: React.FormEvent) => {
    event.preventDefault();
    setSettings((previous) => ({
      ...previous,
      receipt: { ...draft, prefix: draft.prefix.trim().toUpperCase() }
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <Section title="Receipts" description="What appears on every receipt you hand a parent.">
        <form onSubmit={saveReceipt} className="p-3 md:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Receipt number prefix" id="receipt-prefix" hint="Receipts read SLA-0001, SLA-0002, and so on.">
                <input
                  id="receipt-prefix"
                  required
                  maxLength={16}
                  value={draft.prefix}
                  onChange={(event) => setDraft((value) => ({ ...value, prefix: event.target.value }))}
                  className="field num uppercase"
                  placeholder="REC"
                />
              </Field>
              <Field label="Phone" id="receipt-phone">
                <input
                  id="receipt-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => setDraft((value) => ({ ...value, phone: event.target.value }))}
                  className="field"
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Email" id="receipt-email">
                <input
                  id="receipt-email"
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft((value) => ({ ...value, email: event.target.value }))}
                  className="field"
                  placeholder="accounts@academy.com"
                />
              </Field>
              <Field label="Address" id="receipt-address">
                <input
                  id="receipt-address"
                  value={draft.address}
                  onChange={(event) => setDraft((value) => ({ ...value, address: event.target.value }))}
                  className="field"
                  placeholder="Street, city, postal code"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Closing line" id="receipt-footer">
                  <input
                    id="receipt-footer"
                    required
                    maxLength={300}
                    value={draft.footer}
                    onChange={(event) => setDraft((value) => ({ ...value, footer: event.target.value }))}
                    className="field"
                    placeholder="Thank you for your payment."
                  />
                </Field>
              </div>
              <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
                <Check
                  label="Show the logo"
                  checked={draft.showLogo}
                  onChange={(checked) => setDraft((value) => ({ ...value, showLogo: checked }))}
                />
                <Check
                  label="Show a signature line"
                  checked={draft.showSignature}
                  onChange={(checked) => setDraft((value) => ({ ...value, showSignature: checked }))}
                />
                <Check
                  label="Open after payment"
                  checked={draft.autoOpenAfterPayment}
                  onChange={(checked) => setDraft((value) => ({ ...value, autoOpenAfterPayment: checked }))}
                />
              </div>
            </div>

            <ReceiptPreview settings={settings} receipt={draft} />
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-line-2 pt-3">
            {saved && <span role="status" className="text-[12px] font-medium text-leaf-strong">Receipts saved</span>}
            <button type="submit" className="btn btn-primary btn-sm">Save receipts</button>
          </div>
        </form>
      </Section>

      <Section title="Categories" description="The choices offered when you record money in or out.">
        <div className="grid gap-3 p-3 lg:grid-cols-2 md:p-4">
          <CategoryEditor
            title="Money in"
            tone="income"
            categories={settings.incomeCategories}
            onChange={(incomeCategories) => setSettings((previous) => ({ ...previous, incomeCategories }))}
          />
          <CategoryEditor
            title="Money out"
            tone="expense"
            categories={settings.expenseCategories}
            onChange={(expenseCategories) => setSettings((previous) => ({ ...previous, expenseCategories }))}
          />
        </div>
      </Section>

      <Section title="Notifications" description="What shows up under the bell.">
        <div className="divide-y divide-line-2">
          <ToggleRow
            title="Turn notifications on"
            note="Switch this off and the bell stays quiet."
            checked={settings.notifications.enabled}
            onChange={(enabled) => setSettings((previous) => ({
              ...previous, notifications: { ...previous.notifications, enabled }
            }))}
          />
          <ToggleRow
            title="Fee reminders"
            note="When students have money outstanding."
            disabled={!settings.notifications.enabled}
            checked={settings.notifications.feeReminders}
            onChange={(feeReminders) => setSettings((previous) => ({
              ...previous, notifications: { ...previous.notifications, feeReminders }
            }))}
          />
          <ToggleRow
            title="Payment updates"
            note="When a payment or a cost is recorded."
            disabled={!settings.notifications.enabled}
            checked={settings.notifications.paymentUpdates}
            onChange={(paymentUpdates) => setSettings((previous) => ({
              ...previous, notifications: { ...previous.notifications, paymentUpdates }
            }))}
          />
          <ToggleRow
            title="Attendance alerts"
            note="When a student drops below 75% present."
            disabled={!settings.notifications.enabled}
            checked={settings.notifications.attendanceAlerts}
            onChange={(attendanceAlerts) => setSettings((previous) => ({
              ...previous, notifications: { ...previous.notifications, attendanceAlerts }
            }))}
          />
        </div>
      </Section>
    </>
  );
}

function Check({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line px-3 text-[12px] font-medium text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-[var(--c-leaf)]"
      />
      {label}
    </label>
  );
}

function ReceiptPreview({ settings, receipt }: { settings: OrgSettings; receipt: ReceiptSettings }) {
  return (
    <aside className="card-inset h-max p-3.5" aria-label="Receipt preview">
      <p className="label-xs">Preview</p>

      <div className="mt-3 text-center">
        {receipt.showLogo && (
          <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-ctl bg-leaf text-[13px] font-semibold text-leaf-on">
            {settings.logoUrl
              ? <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" />
              : settings.name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="title text-[15px]">{settings.name}</p>
        <p className="label-xs mt-0.5">{receipt.address || 'Academy address'}</p>
      </div>

      <div className="my-3 border-t border-dashed border-line" />

      <dl className="space-y-1.5">
        <PreviewRow label="Receipt" value={`${receipt.prefix || 'REC'}-0001`} mono />
        <PreviewRow label="Student" value="Anjali Ramesh" />
        <PreviewRow label="Amount" value="₹1,200" mono />
      </dl>

      {receipt.showSignature && (
        <div className="mt-4 ml-auto w-28 border-t border-line pt-1 text-center">
          <span className="label-xs">Signature</span>
        </div>
      )}

      <p className="mt-3 rounded-ctl bg-surface px-2.5 py-2 text-center text-[11px] text-ink-2">
        {receipt.footer || 'Closing line'}
      </p>
    </aside>
  );
}

function PreviewRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="label-xs">{label}</dt>
      <dd className={`text-[12px] font-medium text-ink ${mono ? 'num' : ''}`}>{value}</dd>
    </div>
  );
}

function CategoryEditor({
  title,
  tone,
  categories,
  onChange
}: {
  title: string;
  tone: 'income' | 'expense';
  categories: string[];
  onChange: (categories: string[]) => void;
}) {
  const [value, setValue] = useState('');

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const next = value.trim();
    if (!next || categories.some((item) => item.toLowerCase() === next.toLowerCase()) || categories.length >= 20) return;
    onChange([...categories, next]);
    setValue('');
  };

  return (
    <div className="card-inset p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        <span className="label-xs">
          <span className="num">{categories.length}</span>/20
        </span>
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {categories.map((category) => (
          <li
            key={category}
            className="inline-flex items-center gap-0.5 rounded-ctl border border-line bg-surface py-0.5 pl-2.5 pr-0.5 text-[12px] text-ink"
          >
            {category}
            <button
              type="button"
              disabled={categories.length === 1}
              onClick={() => onChange(categories.filter((item) => item !== category))}
              aria-label={`Remove ${category}`}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-2.5 flex gap-2">
        <label className="sr-only" htmlFor={`new-${tone}-category`}>Add a {title.toLowerCase()} category</label>
        <input
          id={`new-${tone}-category`}
          maxLength={80}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="field min-w-0 flex-1"
          placeholder="Add a category"
        />
        <button
          type="submit"
          disabled={!value.trim() || categories.length >= 20}
          className="btn btn-secondary shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
}
