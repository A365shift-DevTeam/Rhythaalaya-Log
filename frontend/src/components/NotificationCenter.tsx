import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppTab, NotificationSettings, Student, Transaction } from '../types';

interface NotificationCenterProps {
  tenantKey: string;
  preferences: NotificationSettings;
  students: Student[];
  transactions: Transaction[];
  onNavigate: (tab: AppTab) => void;
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  icon: string;
  tone: 'warning' | 'success' | 'info';
  tab: AppTab;
  time: string;
}

export function NotificationCenter({ tenantKey, preferences, students, transactions, onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const storageKey = `rhythaalaya_notifications_read_${tenantKey}`;
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]; }
    catch { return []; }
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(() => buildNotifications(preferences, students, transactions), [preferences, students, transactions]);
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(readIds)); }, [readIds, storageKey]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const openItem = (item: AppNotification) => {
    setReadIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    setOpen(false); onNavigate(item.tab);
  };

  return <div className="relative" ref={containerRef}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-brand-900/50">
      <span className="material-symbols-outlined text-[21px]" aria-hidden="true">notifications</span>
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[10px] font-extrabold text-white dark:border-slate-900">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>

    {open && <section aria-label="Notifications" className="fixed left-3 right-3 top-[78px] z-[70] max-h-[min(520px,calc(100dvh-110px))] overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-2xl dark:border-brand-800 dark:bg-slate-900 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[380px]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div><h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Notifications</h2><p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</p></div>
        {unreadCount > 0 && <button type="button" onClick={() => setReadIds(notifications.map((item) => item.id))} className="min-h-10 rounded-xl px-2 text-xs font-bold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/50">Mark all read</button>}
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2">
        {!preferences.enabled ? <EmptyNotification icon="notifications_off" title="Notifications are disabled" description="Enable them from Settings to receive operational updates." />
          : notifications.length === 0 ? <EmptyNotification icon="notifications_none" title="No notifications" description="New fee, payment, and attendance updates will appear here." />
          : notifications.map((item) => {
            const unread = !readIds.includes(item.id);
            const tones = { warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' };
            return <button key={item.id} type="button" onClick={() => openItem(item)} className={`flex min-h-[76px] w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/70 ${unread ? 'bg-brand-50/60 dark:bg-brand-900/30' : ''}`}>
              <span className={`material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[20px] ${tones[item.tone]}`}>{item.icon}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{item.title}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.message}</span></span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-400">{item.time}</span>
            </button>;
          })}
      </div>
    </section>}
  </div>;
}

function buildNotifications(preferences: NotificationSettings, students: Student[], transactions: Transaction[]): AppNotification[] {
  if (!preferences.enabled) return [];
  const items: AppNotification[] = [];
  const pending = students.filter((student) => student.outstandingBalance > 0);
  if (preferences.feeReminders && pending.length) {
    const total = pending.reduce((sum, student) => sum + student.outstandingBalance, 0);
    items.push({ id: `fees-${pending.map((item) => item.id).sort().join('-')}-${total}`, title: 'Fee collection requires attention', message: `${pending.length} students have ₹${total.toLocaleString('en-IN')} outstanding.`, icon: 'pending_actions', tone: 'warning', tab: 'finance', time: 'Now' });
  }
  if (preferences.paymentUpdates) transactions.slice(0, 3).forEach((transaction) => {
    items.push({ id: `transaction-${transaction.id}`, title: transaction.type === 'income' ? 'Income recorded' : 'Expense recorded', message: `${transaction.title} · ${transaction.type === 'income' ? '+' : '-'}₹${transaction.amount.toLocaleString('en-IN')}`, icon: transaction.type === 'income' ? 'payments' : 'receipt_long', tone: transaction.type === 'income' ? 'success' : 'info', tab: 'finance', time: transaction.date });
  });
  if (preferences.attendanceAlerts) {
    const lowAttendance = students.filter((student) => student.overallAttendance < 75);
    if (lowAttendance.length) items.push({ id: `attendance-${lowAttendance.map((item) => item.id).sort().join('-')}`, title: 'Low attendance alert', message: `${lowAttendance.length} students are below the 75% attendance threshold.`, icon: 'fact_check', tone: 'warning', tab: 'log', time: 'Today' });
  }
  return items;
}

function EmptyNotification({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <div className="px-5 py-10 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">{icon}</span><h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-white">{title}</h3><p className="mx-auto mt-1 max-w-64 text-xs leading-5 text-slate-500">{description}</p></div>;
}
