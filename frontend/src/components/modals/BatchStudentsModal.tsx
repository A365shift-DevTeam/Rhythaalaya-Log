import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { JisIcon } from '../JisIcon';
import React from 'react';
import { Batch, Student, WEEKDAY_SHORT, WEEKDAY_LABELS } from '../../types';
import { feeStanding } from '../../lib/feeStatus';
import { useDialogLifecycle } from './useDialogLifecycle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface BatchStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch | null;
  students: Student[];
  onViewStudent: (student: Student) => void;
}

const formatTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const formatDays = (days: string[]) =>
  days.map((d) => WEEKDAY_SHORT[WEEKDAY_LABELS.indexOf(d)]).join(', ');

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/**
 * A student counts toward a batch only while their enrollment is Active — the same rule the
 * server applies when it computes `batch.enrolledCount`, so this roster and the count printed
 * on the batch card can never disagree. Archived students are already absent from `students`.
 */
export function batchRoster(batch: Batch, students: Student[]): Student[] {
  return students
    .filter((student) =>
      student.enrollments.some((e) => e.batchId === batch.id && e.status === 'Active'))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const BatchStudentsModal: React.FC<BatchStudentsModalProps> = ({
  isOpen, onClose, batch, students, onViewStudent,
}) => {
  const dialogRef = useDialogLifecycle(isOpen, onClose);
  if (!isOpen || !batch) return null;

  const roster = batchRoster(batch, students);
  const schedule = `${formatDays(batch.days)} · ${formatTime(batch.startTime)} – ${formatTime(batch.endTime)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-students-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#dbdbdb] bg-white shadow-2xl sm:rounded-3xl dark:border-[#243244] dark:bg-[#0b1422]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#dbdbdb]/60 px-5 pt-5 pb-4 sm:px-6 dark:border-[#243244]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]">
                <JisIcon className="text-[20px]">groups</JisIcon>
              </span>
              <div className="min-w-0">
                <h3 id="batch-students-title" className="font-heading text-lg font-bold text-[#212121] dark:text-white">
                  {batch.name}
                </h3>
                <p className="mt-0.5 truncate text-xs text-[#808080] dark:text-[#94a3b8]">
                  <span className="font-semibold text-[#3fc073]">{batch.courseName}</span>
                  {' · '}{schedule}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#808080] transition-all hover:bg-[#f0f0f0] hover:text-[#ef4444] active:scale-95 dark:hover:bg-[#172435]"
            >
              <JisIcon className="text-[18px]">close</JisIcon>
            </Button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Badge size="lg" variant={batch.isActive ? 'success' : 'secondary'}>
              {batch.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#808080] dark:text-[#94a3b8]">
              <JisIcon className="text-[15px]">person</JisIcon>
              {batch.staffName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#808080] dark:text-[#94a3b8]">
              <JisIcon className="text-[15px]">groups</JisIcon>
              {roster.length} {roster.length === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>

        {/* Roster */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {roster.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f0f0] text-[#808080] dark:bg-[#111c2b]">
                <JisIcon className="text-[24px]">person_off</JisIcon>
              </span>
              <h4 className="mt-3 font-heading font-bold text-[#212121] dark:text-white">No students enrolled</h4>
              <p className="mx-auto mt-1 max-w-xs text-xs text-[#808080]">
                Enroll a student in this batch from the Students tab to see them here.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop / tablet: full table */}
              <div className="hidden px-3 pb-3 sm:block sm:px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                      <TableHead>Student</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead>Fees</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((student) => {
                      const enrollment = student.enrollments.find(
                        (e) => e.batchId === batch.id && e.status === 'Active');
                      const fees = feeStanding(student);
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-xs font-bold text-white">
                                {student.name.charAt(0)}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-[#212121] dark:text-white">
                                  {student.name}
                                </span>
                                <span className="block font-mono text-xs text-[#808080] dark:text-[#94a3b8]">
                                  {student.studentNumber}
                                </span>
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap text-[#808080] dark:text-[#94a3b8]">
                            {fmtDate(enrollment?.enrolledOn)}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold tabular-nums text-[#212121] dark:text-white">
                            {student.overallAttendance}%
                          </TableCell>
                          <TableCell>
                            <Badge size="sm" variant={fees.variant}>{fees.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              onClick={() => onViewStudent(student)}
                              className="h-8 rounded-xl px-3 text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:text-[#b3e6c7] dark:hover:bg-[#3fc073]/20"
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: compact list — tap a student to open their details */}
              <div className="divide-y divide-[#dbdbdb]/60 sm:hidden dark:divide-[#243244]">
                {roster.map((student) => {
                  const fees = feeStanding(student);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => onViewStudent(student)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-60"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-xs font-bold text-white">
                        {student.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-xs font-bold text-[#212121] dark:text-white">
                          {student.name}
                        </span>
                        <span className="mt-0.5 block truncate font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                          {student.studentNumber} · {student.overallAttendance}% present
                        </span>
                      </span>
                      <Badge size="sm" variant={fees.variant}>{fees.label}</Badge>
                      <JisIcon className="shrink-0 text-[18px] text-[#c2c2c2] dark:text-[#64748b]">chevron_right</JisIcon>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
