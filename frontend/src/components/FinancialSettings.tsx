import React, { useEffect, useState } from 'react';
import { OrgSettings, ReceiptSettings } from '../types';

interface FinancialSettingsProps {
  settings: OrgSettings;
  setSettings: React.Dispatch<React.SetStateAction<OrgSettings>>;
}

export function FinancialSettings({ settings, setSettings }: FinancialSettingsProps) {
  const [receiptDraft, setReceiptDraft] = useState<ReceiptSettings>(settings.receipt);
  const [saved, setSaved] = useState(false);

  useEffect(() => setReceiptDraft(settings.receipt), [settings.receipt]);

  const saveReceipt = (event: React.FormEvent) => {
    event.preventDefault();
    setSettings((previous) => ({ ...previous, receipt: { ...receiptDraft, prefix: receiptDraft.prefix.trim().toUpperCase() } }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="receipt-settings-title">
        <SectionHeading id="receipt-settings-title" icon="receipt_long" title="Fee Receipt Setup"
          description="Configure the information displayed on every payment receipt." />
        <form onSubmit={saveReceipt} className="premium-card p-4 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Receipt prefix" id="receipt-prefix" hint="Example: RCT-2026">
                <input id="receipt-prefix" required maxLength={16} value={receiptDraft.prefix}
                  onChange={(event) => setReceiptDraft((value) => ({ ...value, prefix: event.target.value }))}
                  className="settings-input uppercase" placeholder="REC" />
              </Field>
              <Field label="Contact phone" id="receipt-phone">
                <input id="receipt-phone" type="tel" value={receiptDraft.phone}
                  onChange={(event) => setReceiptDraft((value) => ({ ...value, phone: event.target.value }))}
                  className="settings-input" placeholder="+91 98765 43210" />
              </Field>
              <Field label="Receipt email" id="receipt-email">
                <input id="receipt-email" type="email" value={receiptDraft.email}
                  onChange={(event) => setReceiptDraft((value) => ({ ...value, email: event.target.value }))}
                  className="settings-input" placeholder="accounts@academy.com" />
              </Field>
              <Field label="Academy address" id="receipt-address">
                <input id="receipt-address" value={receiptDraft.address}
                  onChange={(event) => setReceiptDraft((value) => ({ ...value, address: event.target.value }))}
                  className="settings-input" placeholder="Street, city, postal code" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Receipt footer" id="receipt-footer">
                  <input id="receipt-footer" required maxLength={300} value={receiptDraft.footer}
                    onChange={(event) => setReceiptDraft((value) => ({ ...value, footer: event.target.value }))}
                    className="settings-input" placeholder="Thank you for your payment." />
                </Field>
              </div>
              <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
                <ReceiptOption label="Show academy logo" checked={receiptDraft.showLogo}
                  onChange={(checked) => setReceiptDraft((value) => ({ ...value, showLogo: checked }))} />
                <ReceiptOption label="Show signature line" checked={receiptDraft.showSignature}
                  onChange={(checked) => setReceiptDraft((value) => ({ ...value, showSignature: checked }))} />
                <ReceiptOption label="Open after payment" checked={receiptDraft.autoOpenAfterPayment}
                  onChange={(checked) => setReceiptDraft((value) => ({ ...value, autoOpenAfterPayment: checked }))} />
              </div>
            </div>

            <ReceiptPreview settings={settings} receipt={receiptDraft} />
          </div>
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            {saved && <span role="status" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Receipt setup saved</span>}
            <button type="submit" className="btn-brand min-h-11 rounded-xl px-5 text-xs font-bold">Save receipt setup</button>
          </div>
        </form>
      </section>

      <section className="space-y-3" aria-labelledby="category-settings-title">
        <SectionHeading id="category-settings-title" icon="category" title="Income & Expense Categories"
          description="These categories appear automatically when recording financial entries." />
        <div className="grid gap-4 lg:grid-cols-2">
          <CategoryEditor title="Income categories" tone="income" categories={settings.incomeCategories}
            onChange={(incomeCategories) => setSettings((previous) => ({ ...previous, incomeCategories }))} />
          <CategoryEditor title="Expense categories" tone="expense" categories={settings.expenseCategories}
            onChange={(expenseCategories) => setSettings((previous) => ({ ...previous, expenseCategories }))} />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="notification-settings-title">
        <SectionHeading id="notification-settings-title" icon="notifications" title="Notification Preferences"
          description="Choose which operational updates appear in the notification center." />
        <div className="premium-card divide-y divide-slate-100 dark:divide-slate-800">
          <PreferenceRow icon="notifications_active" title="Enable notifications" description="Show academy alerts in the application."
            checked={settings.notifications.enabled}
            onChange={(enabled) => setSettings((previous) => ({ ...previous, notifications: { ...previous.notifications, enabled } }))} />
          <PreferenceRow icon="pending_actions" title="Pending fee reminders" description="Alert when students have outstanding fees."
            checked={settings.notifications.feeReminders} disabled={!settings.notifications.enabled}
            onChange={(feeReminders) => setSettings((previous) => ({ ...previous, notifications: { ...previous.notifications, feeReminders } }))} />
          <PreferenceRow icon="payments" title="Payment updates" description="Show newly recorded income and fee payments."
            checked={settings.notifications.paymentUpdates} disabled={!settings.notifications.enabled}
            onChange={(paymentUpdates) => setSettings((previous) => ({ ...previous, notifications: { ...previous.notifications, paymentUpdates } }))} />
          <PreferenceRow icon="fact_check" title="Attendance alerts" description="Highlight low attendance requiring follow-up."
            checked={settings.notifications.attendanceAlerts} disabled={!settings.notifications.enabled}
            onChange={(attendanceAlerts) => setSettings((previous) => ({ ...previous, notifications: { ...previous.notifications, attendanceAlerts } }))} />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ id, icon, title, description }: { id: string; icon: string; title: string; description: string }) {
  return <div className="flex items-start gap-3 px-1">
    <span className="material-symbols-outlined mt-0.5 text-[22px] text-brand-600 dark:text-brand-400" aria-hidden="true">{icon}</span>
    <div><h3 id={id} className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p></div>
  </div>;
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</label>
    {children}{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</div>;
}

function ReceiptOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-600" />{label}
  </label>;
}

function ReceiptPreview({ settings, receipt }: { settings: OrgSettings; receipt: ReceiptSettings }) {
  return <aside className="rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-4 dark:border-brand-700 dark:bg-brand-950/40" aria-label="Receipt preview">
    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">Live preview</div>
    <div className="mt-4 text-center">
      {receipt.showLogo && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand-500 text-sm font-bold text-white">
        {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" /> : settings.name.charAt(0)}
      </div>}
      <div className="text-sm font-extrabold text-slate-900 dark:text-white">{settings.name}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{receipt.address || 'Academy address'}</div>
    </div>
    <div className="my-4 border-t border-dashed border-brand-200 dark:border-brand-800" />
    <div className="space-y-2 text-xs"><PreviewRow label="Receipt" value={`${receipt.prefix || 'REC'}-0001`} />
      <PreviewRow label="Student" value="Student name" /><PreviewRow label="Amount" value="₹1,500" /></div>
    <div className="mt-4 rounded-lg bg-white/80 px-3 py-2 text-center text-[11px] text-slate-500 dark:bg-slate-900/70">{receipt.footer || 'Receipt footer'}</div>
  </aside>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><span className="font-bold text-slate-900 dark:text-white">{value}</span></div>;
}

function CategoryEditor({ title, tone, categories, onChange }: { title: string; tone: 'income' | 'expense'; categories: string[]; onChange: (categories: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = (event: React.FormEvent) => {
    event.preventDefault(); const next = value.trim();
    if (!next || categories.some((item) => item.toLowerCase() === next.toLowerCase()) || categories.length >= 20) return;
    onChange([...categories, next]); setValue('');
  };
  const toneClasses = tone === 'income' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
  return <div className="premium-card p-4 sm:p-5">
    <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h4><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses}`}>{categories.length}/20</span></div>
    <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <span key={category} className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{category}
      <button type="button" disabled={categories.length === 1} onClick={() => onChange(categories.filter((item) => item !== category))} aria-label={`Remove ${category}`} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white disabled:opacity-30 dark:hover:bg-slate-700"><span className="material-symbols-outlined text-[17px]">close</span></button></span>)}</div>
    <form onSubmit={add} className="mt-4 flex gap-2"><label className="sr-only" htmlFor={`new-${tone}-category`}>New {tone} category</label><input id={`new-${tone}-category`} maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} className="settings-input min-w-0 flex-1" placeholder={`Add ${tone} category`} />
      <button type="submit" disabled={!value.trim() || categories.length >= 20} className="min-h-11 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">Add</button></form>
  </div>;
}

function PreferenceRow({ icon, title, description, checked, disabled, onChange }: { icon: string; title: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex min-h-16 items-center gap-3 p-4 sm:px-6 ${disabled ? 'opacity-45' : ''}`}>
    <span className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/60 dark:text-brand-300">{icon}</span>
    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">{title}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span></span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-emerald-600" />
  </label>;
}
