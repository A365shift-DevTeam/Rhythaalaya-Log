import { Batch, WEEKDAY_LABELS } from '../types';

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

export const addDaysToIso = (iso: string, delta: number): string => {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + delta);
  return toIsoDate(date);
};

/** True when the batch meets on this date: right weekday, and inside its run window. */
export const isBatchScheduledOn = (batch: Pick<Batch, 'days' | 'startDate' | 'endDate'>, iso: string): boolean => {
  const day = iso.slice(0, 10);
  // A batch with no weekdays recorded has no schedule to contradict, so never hide it.
  if (batch.days?.length && !batch.days.includes(weekdayLabelFor(day))) return false;
  if (batch.startDate && day < batch.startDate.slice(0, 10)) return false;
  if (batch.endDate && day > batch.endDate.slice(0, 10)) return false;
  return true;
};

/** The nearest date on or after `iso` that the batch meets, within `limit` days. */
export const nextSessionDate = (
  batch: Pick<Batch, 'days' | 'startDate' | 'endDate'>, iso: string, limit = 14
): string | null => {
  for (let i = 0; i <= limit; i++) {
    const candidate = addDaysToIso(iso, i);
    if (isBatchScheduledOn(batch, candidate)) return candidate;
  }
  return null;
};
