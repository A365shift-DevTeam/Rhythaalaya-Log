import { Batch, SessionOverride, WEEKDAY_LABELS } from '../types';

/** The batch fields the schedule helpers below actually read. */
type ScheduleBatch = Pick<Batch, 'days' | 'startDate' | 'endDate'> & { sessionOverrides?: SessionOverride[] };

/**
 * Batch schedules are stored as weekday names ("Tuesday") plus a run window.
 * These helpers answer "does this batch actually meet on this date?" so the
 * attendance log only ever offers batches that hold a class that day.
 */

/** Parse "yyyy-MM-dd" in local time. `new Date(iso)` would parse it as UTC and shift the day. */
export const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Format a Date as "yyyy-MM-dd" in local time, for the same reason. */
export const toIsoDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const todayIsoDate = (): string => toIsoDate(new Date());

/** The weekday name for a date, in the same vocabulary as Batch.days. */
export const weekdayLabelFor = (iso: string): string => WEEKDAY_LABELS[parseIsoDate(iso).getDay()];

/**
 * The next date on or after `from` that falls on `day` of the month — the billing anchor for a
 * "due on day N every month" fee plan. Days 29–31 clamp to the last day of shorter months.
 */
export const nextMonthlyDueDate = (day: number, from: Date = new Date()): string => {
  const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  let year = from.getFullYear();
  let month = from.getMonth();
  let dueDay = Math.min(day, lastDayOf(year, month));
  if (dueDay < from.getDate()) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    dueDay = Math.min(day, lastDayOf(year, month));
  }
  return toIsoDate(new Date(year, month, dueDay));
};

/**
 * Day `day` of the CURRENT month (clamped to the month's length) — the billing anchor for a
 * brand-new course's "due on day N every month" plan. It never steps back into a prior month
 * when `day` is later in the month than today, so a course created this month is never billed
 * for a period that ended before it existed (which showed this-month joiners as instantly
 * overdue). Each student's first due still follows their own join/batch start. Days 29–31
 * clamp to shorter months.
 */
export const currentMonthlyDueDate = (day: number, from: Date = new Date()): string => {
  const year = from.getFullYear();
  const month = from.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toIsoDate(new Date(year, month, Math.min(day, lastDay)));
};

export const addDaysToIso = (iso: string, delta: number): string => {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
};

/**
 * True when the batch's *recurring pattern* covers this date: right weekday, inside its run
 * window. Ignores one-off reschedules — use `isBatchScheduledOn` for "does a class actually
 * happen this day".
 */
export const matchesBatchPattern = (batch: Pick<Batch, 'days' | 'startDate' | 'endDate'>, iso: string): boolean => {
  const day = iso.slice(0, 10);
  // A batch with no weekdays recorded has no schedule to contradict, so never hide it.
  if (batch.days?.length && !batch.days.includes(weekdayLabelFor(day))) return false;
  if (batch.startDate && day < batch.startDate.slice(0, 10)) return false;
  if (batch.endDate && day > batch.endDate.slice(0, 10)) return false;
  return true;
};

/**
 * True when a class actually meets on this date: the recurring pattern, minus any session moved
 * away from this date (or cancelled), plus any session moved onto it.
 */
export const isBatchScheduledOn = (batch: ScheduleBatch, iso: string): boolean => {
  const day = iso.slice(0, 10);
  const overrides = batch.sessionOverrides ?? [];
  // A class moved onto this date meets here even if the weekday pattern doesn't cover it.
  if (overrides.some((o) => o.newDate?.slice(0, 10) === day)) return true;
  // A class moved away from this date (newDate set elsewhere) or cancelled (newDate absent) no
  // longer meets here.
  if (overrides.some((o) => o.originalDate.slice(0, 10) === day)) return false;
  return matchesBatchPattern(batch, iso);
};

/** The session override, if any, that moved a class onto `iso` for this batch. */
export const sessionMovedOnto = (batch: ScheduleBatch, iso: string): SessionOverride | undefined =>
  (batch.sessionOverrides ?? []).find((o) => o.newDate?.slice(0, 10) === iso.slice(0, 10));

/** The nearest date on or after `iso` that the batch meets, within `limit` days. */
export const nextSessionDate = (
  batch: ScheduleBatch, iso: string, limit = 14
): string | null => {
  for (let i = 0; i <= limit; i++) {
    const candidate = addDaysToIso(iso, i);
    if (isBatchScheduledOn(batch, candidate)) return candidate;
  }
  return null;
};

/** "14d ago", "1mo ago", "just now" — compact relative time for admin tables (last login, etc). */
export const formatRelativeTime = (isoTimestamp?: string): string => {
  if (!isoTimestamp) return 'Never';
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return 'Never';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};
