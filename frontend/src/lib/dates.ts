/**
 * One date style for the whole app: "4 Sep 2026". Month names are fixed so every browser
 * and locale renders the same text (Intl gives "Sept" in some, "Sep" in others).
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parse = (value: string | Date): Date | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  // A bare calendar date is local, not UTC: "2026-09-04" must never show as 3 Sep.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00' : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "4 Sep 2026" */
export const formatDate = (value: string | Date | null | undefined, fallback = ''): string => {
  const date = value ? parse(value) : null;
  if (!date) return fallback;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

/** "4 Sep" — for lists where the year is obvious. */
export const formatDayMonth = (value: string | Date | null | undefined, fallback = ''): string => {
  const date = value ? parse(value) : null;
  if (!date) return fallback;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

/** Today's calendar date as "YYYY-MM-DD" in the browser's local time. */
export const todayIso = (): string => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
