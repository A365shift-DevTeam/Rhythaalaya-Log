import { Student } from '../types';

export type FeeStandingVariant = 'destructive' | 'warning' | 'success' | 'secondary';

export interface FeeStanding {
  /** Short form for a badge, e.g. "₹4,800" or "Paid". */
  label: string;
  /** Spelled out for a tooltip or screen reader, e.g. "₹4,800 pending". */
  full: string;
  variant: FeeStandingVariant;
}

/**
 * How a student's fees read at a glance.
 *
 * Only money that has actually fallen due counts. A bill that has not reached its due date is
 * not the student's problem yet, so it is left out entirely rather than shown as a pending
 * state of its own. A student who has never been billed shows "No dues" rather than "Paid",
 * because the two mean different things to whoever is chasing payment.
 *
 * Shared so the Students tab, the batch roster and the attendance roll all say the same thing
 * about the same student.
 */
export function feeStanding(student: Student): FeeStanding {
  if (student.outstandingBalance > 0) {
    const amount = `₹${student.outstandingBalance.toLocaleString('en-IN')}`;
    return { label: amount, full: `${amount} pending`, variant: 'destructive' };
  }
  if (student.hasBillableDues) {
    return { label: 'Paid', full: 'Nothing due right now', variant: 'success' };
  }
  return { label: 'No dues', full: 'Nothing billed yet', variant: 'secondary' };
}
