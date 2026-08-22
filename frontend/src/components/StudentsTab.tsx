import React, { useState } from 'react';
import { Student } from '../types';

interface StudentsTabProps {
  students: Student[];
  onOpenAddStudent: () => void;
  onOpenRecordFee: (student?: Student) => void;
  onViewStudent: (student: Student) => void;
  onSendMessage: (student: Student) => void;
}

const courseNames = (student: Student) =>
  student.enrollments.filter((e) => e.status === 'Active').map((e) => e.courseName).join(', ') || 'Not enrolled';

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onOpenAddStudent,
  onOpenRecordFee,
  onViewStudent,
  onSendMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFeeStatus, setFilterFeeStatus] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'attendance'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        courseNames(s).toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const feeStatus = s.outstandingBalance > 0 ? 'Pending' : 'Paid';
      const matchesStatus = filterFeeStatus === 'All' ? true : feeStatus === filterFeeStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'attendance') return b.overallAttendance - a.overallAttendance;
      return a.name.localeCompare(b.name);
    });

  const paidCount = students.filter((s) => s.outstandingBalance <= 0).length;
  const pendingCount = students.filter((s) => s.outstandingBalance > 0).length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Students
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage student enrollments, fee records, and WhatsApp contacts
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddStudent}
          className="btn-brand w-full sm:w-auto min-h-11 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add Student</span>
        </button>
      </div>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3 rounded-2xl border bg-white dark:bg-slate-900 border-brand-200/60 dark:border-brand-800 text-slate-900 dark:text-white text-center shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</div>
          <div className="font-heading text-lg sm:text-2xl font-extrabold tabular-nums mt-0.5">{students.length}</div>
        </div>

        <div className="p-3 rounded-2xl border bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200/60 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Paid</div>
          <div className="font-heading text-lg sm:text-2xl font-extrabold tabular-nums mt-0.5">{paidCount}</div>
        </div>

        <div className="p-3 rounded-2xl border bg-rose-50 dark:bg-rose-950/50 border-rose-200/60 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending</div>
          <div className="font-heading text-lg sm:text-2xl font-extrabold tabular-nums mt-0.5">{pendingCount}</div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="premium-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="student-search" className="sr-only">Search students</label>
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
              search
            </span>
            <input
              id="student-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, course, or ID…"
              className="w-full min-h-11 pl-10 pr-16 py-2.5 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl font-sans text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear student search"
                className="absolute right-2 top-1/2 min-h-8 -translate-y-1/2 rounded-lg px-2 text-xs font-semibold text-slate-500 hover:bg-white hover:text-slate-800 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0" role="group" aria-label="Filter by fee status">
              <button
                type="button"
                onClick={() => setFilterFeeStatus('All')}
                aria-pressed={filterFeeStatus === 'All'}
                className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'All'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterFeeStatus('Paid')}
                aria-pressed={filterFeeStatus === 'Paid'}
                className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'Paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => setFilterFeeStatus('Pending')}
                aria-pressed={filterFeeStatus === 'Pending'}
                className={`min-h-9 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'Pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Pending
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'name' ? 'attendance' : 'name')}
              className="min-h-9 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl font-sans text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">sort</span>
              <span>{sortBy === 'name' ? 'Name' : 'Attendance'}</span>
            </button>

            <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0" role="group" aria-label="Student view">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                aria-pressed={viewMode === 'table'}
                className={`w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Table View"
              >
                <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredStudents.length === 0 && (
            <div className="col-span-full premium-card p-10 text-center text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">person_search</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No students found</p>
              <p className="text-xs mt-1">Try changing your search query or filter options.</p>
            </div>
          )}

          {filteredStudents.map((student) => {
            const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
            const isPending = student.outstandingBalance > 0;

            return (
              <div key={student.id} className="premium-card-interactive p-4 sm:p-5 flex flex-col justify-between group">
                <div>
                  <div className="flex gap-3 items-start mb-3.5">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-sm sm:text-base shrink-0 shadow-sm shadow-brand-500/20">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white truncate">{student.name}</h3>
                        <button
                          type="button"
                          onClick={() => onViewStudent(student)}
                          aria-label={`Open details for ${student.name}`}
                          className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>
                      <p className="font-sans text-xs text-brand-600 dark:text-brand-400 font-semibold truncate mt-0.5">{courseNames(student)}</p>
                      <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 truncate">{student.studentNumber}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-brand-50/70 dark:bg-brand-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2 mb-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Fee Status:</span>
                      {!isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Pending (₹{student.outstandingBalance.toLocaleString('en-IN')})
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">{student.overallAttendance}%</span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${student.overallAttendance >= 80 ? 'bg-emerald-500' : 'bg-brand-500'}`}
                            style={{ width: `${student.overallAttendance}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onViewStudent(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors font-sans text-xs font-semibold active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenRecordFee(student)}
                    disabled={!isPending}
                    title={!isPending ? 'No outstanding fee' : 'Record fee payment'}
                    className={`min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 rounded-lg transition-colors font-sans text-xs font-semibold active:scale-95 ${
                      isPending
                        ? 'text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/60 font-bold hover:bg-brand-100'
                        : 'text-slate-400 bg-slate-50 dark:bg-slate-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>Fee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendMessage(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors font-sans text-xs font-semibold active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">forum</span>
                    <span>Msg</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Courses</th>
                  <th className="p-4">Fee Status</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                {filteredStudents.map((student) => {
                  const isPending = student.outstandingBalance > 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                            <div className="text-[10px] text-slate-400">{student.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{courseNames(student)}</div>
                      </td>
                      <td className="p-4">
                        {!isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            ₹{student.outstandingBalance.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold">{student.overallAttendance}%</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onViewStudent(student)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                            title="View student"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenRecordFee(student)}
                            disabled={!isPending}
                            className={`p-1.5 rounded-lg ${isPending ? 'text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800' : 'text-slate-300 opacity-40 cursor-not-allowed'}`}
                            title="Record fee"
                          >
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendMessage(student)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600 rounded-lg"
                            title="WhatsApp"
                          >
                            <span className="material-symbols-outlined text-[18px]">forum</span>
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
      )}
    </div>
  );
};
