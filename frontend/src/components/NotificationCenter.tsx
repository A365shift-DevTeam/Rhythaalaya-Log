import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppTab, NotificationSettings, Student, Transaction } from '../types';

interface NotificationCenterProps {
  tenantKey: string;
  preferences: NotificationSettings;
  students: Student[];
  transactions: Transaction[];
  onNavigate: (tab: AppTab) => void;
  /** 'rail' sits on the ink sidebar and opens upward; 'bar' sits on the mobile header. */
  tone?: 'rail' | 'bar';
}

interface AppNotification {
  id: string;
  title: string;
  message: string;
  icon: string;
  tone: 'due' | 'settled' | 'neutral';
  tab: AppTab;
  time: string;
}

const TONE_CLASS: Record<AppNotification['tone'], string> = {
  due: 'bg-kumkum-tint text-kumkum',
  settled: 'bg-leaf-tint text-leaf-strong',
  neutral: 'bg-surface-2 text-ink-2'
};

export function NotificationCenter({
  tenantKey,
  preferences,
  students,
  transactions,
  onNavigate,
  tone = 'bar'
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const storageKey = `rhythaalaya_notifications_read_${tenantKey}`;
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]; }
    catch { return []; }
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = useMemo(
    () => buildNotifications(preferences, students, transactions),
    [preferences, students, transactions]
  );
  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(readIds)); }, [readIds, storageKey]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const openItem = (item: AppNotification) => {
    setReadIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    setOpen(false);
    onNavigate(item.tab);
  };

  const triggerClass = tone === 'rail'
    ? 'icon-btn text-rail-text-2 hover:bg-rail-2 hover:text-rail-text'
    : 'icon-btn h-11 w-11 border border-line';

  const panelClass = tone === 'rail'
    ? 'absolute bottom-[calc(100%+0.5rem)] left-0 z-[70] w-[336px]'
    : 'fixed left-3 right-3 top-[3.75rem] z-[70] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[336px]';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className={`relative ${triggerClass}`}
      >
        <span className="material-symbols-outlined text-[21px]" aria-hidden="true">notifications</span>
        {unreadCount > 0 && (
          <span className="num absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-kumkum px-1 text-[9px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          className={`${panelClass} overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-pop)]`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line-2 px-3.5 py-2.5">
            <div className="min-w-0">
              <h2 className="title text-[15px]">Notifications</h2>
              <p className="label-xs">
                {unreadCount ? `${unreadCount} unread` : 'Nothing new'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => setReadIds(notifications.map((item) => item.id))}
                className="btn btn-ghost btn-sm shrink-0 text-leaf"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(24rem,calc(100dvh-12rem))] overflow-y-auto p-1.5">
            {!preferences.enabled ? (
              <EmptyNotification
                icon="notifications_off"
                title="Notifications are off"
                description="Turn them on in Settings to see fee, payment, and attendance updates here."
              />
            ) : notifications.length === 0 ? (
              <EmptyNotification
                icon="notifications_none"
                title="Nothing to review"
                description="Fee, payment, and attendance updates will appear here."
              />
            ) : (
              notifications.map((item) => {
                const unread = !readIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-2.5 rounded-ctl p-2.5 text-left transition-colors hover:bg-surface-2 ${
                      unread ? 'bg-surface-2/70' : ''
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl text-[18px] ${TONE_CLASS[item.tone]}`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-ink">{item.title}</span>
                        {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-label="Unread" />}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-[1.45] text-ink-2">{item.message}</span>
                    </span>
                    <span className="num shrink-0 text-[10px] text-ink-3">{item.time}</span>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function buildNotifications(
  preferences: NotificationSettings,
  students: Student[],
  transactions: Transaction[]
): AppNotification[] {
  if (!preferences.enabled) return [];
  const items: AppNotification[] = [];

  const pending = students.filter((student) => student.outstandingBalance > 0);
  if (preferences.feeReminders && pending.length) {
    const total = pending.reduce((sum, student) => sum + student.outstandingBalance, 0);
    items.push({
      id: `fees-${pending.map((item) => item.id).sort().join('-')}-${total}`,
      title: 'Fees are outstanding',
      message: `${pending.length} student${pending.length === 1 ? '' : 's'} owe ₹${total.toLocaleString('en-IN')}.`,
      icon: 'pending_actions',
      tone: 'due',
      tab: 'finance',
      time: 'Now'
    });
  }

  if (preferences.paymentUpdates) {
    transactions.slice(0, 3).forEach((transaction) => {
      items.push({
        id: `transaction-${transaction.id}`,
        title: transaction.type === 'income' ? 'Payment recorded' : 'Expense recorded',
        message: `${transaction.title} · ${transaction.type === 'income' ? '+' : '−'}₹${transaction.amount.toLocaleString('en-IN')}`,
        icon: transaction.type === 'income' ? 'payments' : 'receipt_long',
        tone: transaction.type === 'income' ? 'settled' : 'neutral',
        tab: 'finance',
        time: transaction.date
      });
    });
  }

  if (preferences.attendanceAlerts) {
    const lowAttendance = students.filter((student) => student.overallAttendance < 75);
    if (lowAttendance.length) {
      items.push({
        id: `attendance-${lowAttendance.map((item) => item.id).sort().join('-')}`,
        title: 'Attendance is slipping',
        message: `${lowAttendance.length} student${lowAttendance.length === 1 ? ' is' : 's are'} below 75%.`,
        icon: 'fact_check',
        tone: 'due',
        tab: 'log',
        time: 'Today'
      });
    }
  }

  return items;
}

function EmptyNotification({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="px-5 py-9 text-center">
      <span className="material-symbols-outlined text-[28px] text-ink-3" aria-hidden="true">{icon}</span>
      <h3 className="title mt-1.5 text-[15px]">{title}</h3>
      <p className="label mx-auto mt-1 max-w-56">{description}</p>
    </div>
  );
}
