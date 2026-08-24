import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
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
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#dbdbdb]/60 pt-4 dark:border-[#243244]">
            {saved && <span role="status" className="text-xs font-semibold text-[#22c55e]">Receipt setup saved</span>}
            <Button type="submit" className="btn-brand min-h-11 rounded-2xl px-5 text-xs font-bold">Save receipt setup</Button>
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
        <div className="premium-card divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
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
    <JisIcon className="mt-0.5 text-[22px] text-[#3fc073]" aria-hidden="true">{icon}</JisIcon>
    <div><h3 id={id} className="text-sm font-bold text-[#212121] dark:text-white">{title}</h3>
      <p className="mt-0.5 text-xs leading-5 text-[#808080] dark:text-[#94a3b8]">{description}</p></div>
  </div>;
}

function Field({ label, id, hint, children }: { label: string; id: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-xs font-bold text-[#575757] dark:text-[#cbd5e1]">{label}</label>
    {children}{hint && <p className="mt-1 text-xs text-[#9e9e9e]">{hint}</p>}</div>;
}

function ReceiptOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#0b1422] px-3.5 text-xs font-semibold text-[#212121] dark:text-[#e2e8f0] cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#3fc073] rounded" />{label}
  </label>;
}

function ReceiptPreview({ settings, receipt }: { settings: OrgSettings; receipt: ReceiptSettings }) {
  return <aside className="rounded-3xl border border-dashed border-[#cbecd8] dark:border-[#3fc073]/40 bg-[#f4fbf7]/60 p-4 dark:bg-[#07111f]/40" aria-label="Receipt preview">
    <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#3fc073]">Live preview</div>
    <div className="mt-4 text-center">
      {receipt.showLogo && <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-sm font-bold text-white shadow-xs">
        {settings.logoUrl ? <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" /> : settings.name.charAt(0)}
      </div>}
      <div className="text-sm font-bold text-[#212121] dark:text-white">{settings.name}</div>
      <div className="mt-0.5 text-xs text-[#808080]">{receipt.address || 'Academy address'}</div>
    </div>
    <div className="my-4 border-t border-dashed border-[#cbecd8] dark:border-[#1d492f]" />
    <div className="space-y-2 text-xs"><PreviewRow label="Receipt" value={`${receipt.prefix || 'REC'}-0001`} />
      <PreviewRow label="Student" value="Student name" /><PreviewRow label="Amount" value="₹1,500" /></div>
    <div className="mt-4 rounded-2xl bg-white/90 px-3 py-2 text-center text-xs text-[#808080] dark:bg-[#0b1422]/80 dark:text-[#94a3b8]">{receipt.footer || 'Receipt footer'}</div>
  </aside>;
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-[#808080]">{label}</span><span className="font-bold text-[#212121] dark:text-white">{value}</span></div>;
}

function CategoryEditor({ title, tone, categories, onChange }: { title: string; tone: 'income' | 'expense'; categories: string[]; onChange: (categories: string[]) => void }) {
  const [value, setValue] = useState('');
  const add = (event: React.FormEvent) => {
    event.preventDefault(); const next = value.trim();
    if (!next || categories.some((item) => item.toLowerCase() === next.toLowerCase()) || categories.length >= 20) return;
    onChange([...categories, next]); setValue('');
  };
  const toneClasses = tone === 'income' ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/50' : 'bg-rose-50 text-[#ef4444] dark:bg-rose-950/50';
  return <div className="premium-card p-4 sm:p-5">
    <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-[#212121] dark:text-white">{title}</h4><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses}`}>{categories.length}/20</span></div>
    <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <span key={category} className="inline-flex min-h-9 items-center gap-1 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] pl-3 pr-1 text-xs font-semibold text-[#212121] dark:bg-[#0b1422] dark:text-[#e2e8f0]">{category}
      <Button type="button" disabled={categories.length === 1} onClick={() => onChange(categories.filter((item) => item !== category))} aria-label={`Remove ${category}`} className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-white disabled:opacity-30 dark:hover:bg-[#172435]"><JisIcon className="text-[17px]">close</JisIcon></Button></span>)}</div>
    <form onSubmit={add} className="mt-4 flex gap-2"><label className="sr-only" htmlFor={`new-${tone}-category`}>New {tone} category</label><input id={`new-${tone}-category`} maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} className="settings-input min-w-0 flex-1" placeholder={`Add ${tone} category`} />
      <Button type="submit" disabled={!value.trim() || categories.length >= 20} className="min-h-11 rounded-2xl bg-[#212121] px-4 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-[#212121]">Add</Button></form>
  </div>;
}

function PreferenceRow({ icon, title, description, checked, disabled, onChange }: { icon: string; title: string; description: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex min-h-16 items-center gap-3 p-4 sm:px-6 cursor-pointer hover:bg-[#f0f0f0]/50 dark:hover:bg-[#172435]/40 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
    <JisIcon className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]">{icon}</JisIcon>
    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#212121] dark:text-white">{title}</span><span className="mt-0.5 block text-xs text-[#808080] dark:text-[#94a3b8]">{description}</span></span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-[#3fc073] rounded cursor-pointer" />
  </label>;
}
