import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
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
    <Button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open}
      className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-[#dbdbdb] bg-white text-[#575757] transition-all hover:border-[#3fc073] hover:bg-[#e9f7ee] hover:text-[#3fc073] dark:border-[#243244] dark:bg-[#111c2b] dark:text-[#cbd5e1] dark:hover:bg-[#3fc073]/20 active:scale-95">
      <JisIcon className="text-[19px] sm:text-[21px]" aria-hidden="true">notifications</JisIcon>
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#ef4444] px-1 text-xs font-bold text-white dark:border-[#1e293b]">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </Button>

    {open && <section aria-label="Notifications" className="fixed left-3 right-3 top-[78px] z-[70] max-h-[min(520px,calc(100dvh-110px))] overflow-hidden rounded-3xl border border-[#dbdbdb] bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-[#243244] dark:bg-[#0b1422]/90 sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[380px]">
      <div className="flex items-center justify-between border-b border-[#dbdbdb]/60 px-4 py-3 dark:border-[#243244]">
        <div><h2 className="text-sm font-bold text-[#212121] dark:text-white">Notifications</h2><p className="text-xs text-[#808080]">{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}</p></div>
        {unreadCount > 0 && <Button type="button" onClick={() => setReadIds(notifications.map((item) => item.id))} className="min-h-9 rounded-2xl px-2.5 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20">Mark all read</Button>}
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
        {!preferences.enabled ? <EmptyNotification icon="notifications_off" title="Notifications are disabled" description="Enable them from Settings to receive operational updates." />
          : notifications.length === 0 ? <EmptyNotification icon="notifications_none" title="No notifications" description="New fee, payment, and attendance updates will appear here." />
          : notifications.map((item) => {
            const unread = !readIds.includes(item.id);
            const tones = { warning: 'bg-amber-50 text-[#f59e0b] dark:bg-amber-950/50', success: 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/50', info: 'bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20' };
            return <Button key={item.id} type="button" onClick={() => openItem(item)} className={`flex min-h-[72px] w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-[#f0f0f0] dark:hover:bg-[#172435]/70 ${unread ? 'bg-[#f4fbf7] dark:bg-[#3fc073]/10' : ''}`}>
              <JisIcon className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[20px] ${tones[item.tone]}`}>{item.icon}</JisIcon>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate text-xs font-bold text-[#212121] dark:text-white">{item.title}</span>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#3fc073]" />}</span><span className="mt-0.5 block text-xs leading-5 text-[#808080] dark:text-[#94a3b8]">{item.message}</span></span>
              <span className="shrink-0 text-xs font-semibold text-[#9e9e9e]">{item.time}</span>
            </Button>;
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
  return <div className="px-5 py-10 text-center"><JisIcon className="text-4xl text-[#c2c2c2] dark:text-[#64748b]">{icon}</JisIcon><h3 className="mt-2 text-sm font-bold text-[#212121] dark:text-white">{title}</h3><p className="mx-auto mt-1 max-w-64 text-xs leading-5 text-[#808080]">{description}</p></div>;
}
