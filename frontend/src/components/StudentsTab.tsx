import React, { useMemo, useState } from 'react';
import { Student } from '../types';

interface StudentsTabProps {
  students: Student[];
  onOpenAddStudent: () => void;
  onOpenRecordFee: (student?: Student) => void;
  onViewStudent: (student: Student) => void;
  onSendMessage: (student: Student) => void;
}

type FeeFilter = 'all' | 'settled' | 'owing';
type SortKey = 'name' | 'attendance' | 'owed';

const courseNames = (student: Student) =>
  student.enrollments.filter((e) => e.status === 'Active').map((e) => e.courseName).join(', ') || 'Not enrolled';

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onOpenAddStudent,
  onOpenRecordFee,
  onViewStudent,
  onSendMessage
}) => {
  const [query, setQuery] = useState('');
  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const settledCount = students.filter((student) => student.outstandingBalance <= 0).length;
  const owingCount = students.length - settledCount;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return students
      .filter((student) => {
        const matchesQuery = !needle
          || student.name.toLowerCase().includes(needle)
          || student.studentNumber.toLowerCase().includes(needle)
          || courseNames(student).toLowerCase().includes(needle);
        const matchesFee = feeFilter === 'all'
          || (feeFilter === 'owing' ? student.outstandingBalance > 0 : student.outstandingBalance <= 0);
        return matchesQuery && matchesFee;
      })
      .sort((a, b) => {
        if (sortKey === 'attendance') return b.overallAttendance - a.overallAttendance;
        if (sortKey === 'owed') return b.outstandingBalance - a.outstandingBalance;
        return a.name.localeCompare(b.name);
      });
  }, [students, query, feeFilter, sortKey]);

  return (
    <div className="pb-8">
      <header className="mb-4">
        <h1 className="display-lg">Students</h1>
        <p className="label mt-1">
          <span className="num">{students.length}</span> on the roll ·{' '}
          <span className="num">{owingCount}</span> owing fees
        </p>
      </header>

      <div className="card mb-4 space-y-3 p-3 md:p-4">
        <div className="relative">
          <label htmlFor="student-search" className="sr-only">Search students</label>
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-ink-3"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="student-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, ID, or course"
            className="field pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* The filter carries the counts, so the same numbers are not
              printed twice on the page. */}
          <div className="segmented" role="group" aria-label="Filter by fee status">
            <button type="button" onClick={() => setFeeFilter('all')} aria-pressed={feeFilter === 'all'}>
              All <span className="num ml-0.5 text-[11px]">{students.length}</span>
            </button>
            <button type="button" onClick={() => setFeeFilter('settled')} aria-pressed={feeFilter === 'settled'}>
              Settled <span className="num ml-0.5 text-[11px]">{settledCount}</span>
            </button>
            <button type="button" onClick={() => setFeeFilter('owing')} aria-pressed={feeFilter === 'owing'}>
              Owing <span className="num ml-0.5 text-[11px]">{owingCount}</span>
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="student-sort" className="label-xs">Sort by</label>
            <div className="relative">
              <select
                id="student-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="field min-h-9 w-auto py-1 pl-2.5 text-[12px]"
              >
                <option value="name">Name</option>
                <option value="attendance">Attendance</option>
                <option value="owed">Amount owed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <span className="material-symbols-outlined text-[28px] text-ink-3" aria-hidden="true">search_off</span>
          <p className="text-[13px] font-semibold text-ink">
            {students.length === 0 ? 'No students yet' : 'Nothing matches that'}
          </p>
          <p className="label max-w-72">
            {students.length === 0
              ? 'Add your first student and they appear on the roll.'
              : 'Try a different name, ID, or clear the fee filter.'}
          </p>
          {students.length === 0 && (
            <button type="button" onClick={onOpenAddStudent} className="btn btn-secondary btn-sm mt-1">
              Add student
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Phones get a scannable list — roughly a dozen students per screen
              instead of two cards. Row actions live in the student sheet. */}
          <ul className="card divide-y divide-line-2 overflow-hidden md:hidden">
            {visible.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => onViewStudent(student)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{student.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      <span className="num">{student.studentNumber}</span> · {courseNames(student)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {student.outstandingBalance > 0
                      ? <span className="chip chip-due num">{rupees(student.outstandingBalance)}</span>
                      : <span className="chip chip-settled">Settled</span>}
                    <span className="num text-[11px] text-ink-3">{student.overallAttendance}% present</span>
                  </span>
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-ink-3" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Course</th>
                    <th scope="col">Fees</th>
                    <th scope="col">Attendance</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((student) => {
                    const owing = student.outstandingBalance > 0;
                    return (
                      <tr key={student.id}>
                        <td>
                          <button
                            type="button"
                            onClick={() => onViewStudent(student)}
                            className="block max-w-[16rem] text-left"
                          >
                            <span className="block truncate text-[13px] font-medium text-ink">{student.name}</span>
                            <span className="num block text-[11px] text-ink-3">{student.studentNumber}</span>
                          </button>
                        </td>
                        <td className="max-w-[14rem] truncate text-[13px] text-ink-2" title={courseNames(student)}>
                          {courseNames(student)}
                        </td>
                        <td>
                          {owing
                            ? <span className="chip chip-due num">{rupees(student.outstandingBalance)}</span>
                            : <span className="chip chip-settled">Settled</span>}
                        </td>
                        <td>
                          <AttendanceMeter value={student.overallAttendance} />
                        </td>
                        <td>
                          {/* The name in the first column already opens the
                              student, so the row does not repeat that here. */}
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenRecordFee(student)}
                              disabled={!owing}
                              className="icon-btn"
                              title={owing ? 'Record a fee payment' : 'Nothing outstanding'}
                              aria-label={`Record fee for ${student.name}`}
                            >
                              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                                currency_rupee
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSendMessage(student)}
                              className="icon-btn"
                              title="Send a WhatsApp message"
                              aria-label={`Message ${student.name}`}
                            >
                              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">chat</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* 75% is the threshold the app already alerts on, so the meter turns at the
   same number rather than inventing a second definition of "low". */
function AttendanceMeter({ value }: { value: number }) {
  const low = value < 75;
  return (
    <span className="flex items-center gap-2">
      <span className={`num text-[13px] ${low ? 'text-kumkum' : 'text-ink'}`}>{value}%</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <span
          className={`block h-full rounded-full ${low ? 'bg-kumkum' : 'bg-leaf'}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </span>
    </span>
  );
}
