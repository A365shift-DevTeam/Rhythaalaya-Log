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
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
            Students
          </h2>
          <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-0.5">
            Manage student enrollments, fee records, and WhatsApp contacts
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddStudent}
          className="btn-brand w-full sm:w-auto min-h-11 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add Student</span>
        </button>
      </div>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="p-3.5 rounded-2xl border bg-white dark:bg-[#0b1422] border-[#dbdbdb]/80 dark:border-[#243244] text-[#212121] dark:text-white text-center shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Total</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{students.length}</div>
        </div>

        <div className="p-3.5 rounded-2xl border bg-[#f0fdf4] dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/50 text-[#22c55e] dark:text-emerald-300 text-center">
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Paid</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{paidCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl border bg-[#fef2f2] dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/50 text-[#ef4444] dark:text-rose-300 text-center">
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Pending</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{pendingCount}</div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="premium-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="student-search" className="sr-only">Search students</label>
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              search
            </span>
            <input
              id="student-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, course, or ID…"
              className="w-full min-h-11 pl-10 pr-16 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl font-sans text-xs sm:text-sm font-medium text-[#212121] dark:text-white placeholder:text-[#9e9e9e] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear student search"
                className="absolute right-2 top-1/2 min-h-8 -translate-y-1/2 rounded-xl px-2.5 text-xs font-semibold text-[#808080] hover:bg-[#f0f0f0] hover:text-[#212121] dark:hover:bg-[#172435]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex bg-[#f0f0f0] dark:bg-[#111c2b] p-1 rounded-2xl shrink-0" role="group" aria-label="Filter by fee status">
              <button
                type="button"
                onClick={() => setFilterFeeStatus('All')}
                aria-pressed={filterFeeStatus === 'All'}
                className={`min-h-9 px-3.5 py-1 text-xs font-bold rounded-xl transition-all ${
                  filterFeeStatus === 'All'
                    ? 'bg-white dark:bg-[#0b1422] text-[#212121] dark:text-white shadow-xs'
                    : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:text-[#212121]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterFeeStatus('Paid')}
                aria-pressed={filterFeeStatus === 'Paid'}
                className={`min-h-9 px-3.5 py-1 text-xs font-bold rounded-xl transition-all ${
                  filterFeeStatus === 'Paid'
                    ? 'bg-[#22c55e] text-white shadow-xs'
                    : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:text-[#212121]'
                }`}
              >
                Paid
              </button>
              <button
                type="button"
                onClick={() => setFilterFeeStatus('Pending')}
                aria-pressed={filterFeeStatus === 'Pending'}
                className={`min-h-9 px-3.5 py-1 text-xs font-bold rounded-xl transition-all ${
                  filterFeeStatus === 'Pending'
                    ? 'bg-[#ef4444] text-white shadow-xs'
                    : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:text-[#212121]'
                }`}
              >
                Pending
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSortBy(sortBy === 'name' ? 'attendance' : 'name')}
              className="min-h-10 px-3.5 py-1.5 bg-[#f0f0f0] dark:bg-[#111c2b] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl font-sans text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] hover:bg-[#f0f0f0] dark:hover:bg-[#223148] transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">sort</span>
              <span>{sortBy === 'name' ? 'Name' : 'Attendance'}</span>
            </button>

            <div className="hidden sm:flex bg-[#f0f0f0] dark:bg-[#111c2b] p-1 rounded-2xl shrink-0" role="group" aria-label="Student view">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                className={`w-9 h-9 inline-flex items-center justify-center rounded-xl transition-all ${
                  viewMode === 'grid' ? 'bg-white dark:bg-[#0b1422] text-[#3fc073] shadow-xs font-bold' : 'text-[#808080] hover:text-[#212121]'
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
                className={`w-9 h-9 inline-flex items-center justify-center rounded-xl transition-all ${
                  viewMode === 'table' ? 'bg-white dark:bg-[#0b1422] text-[#3fc073] shadow-xs font-bold' : 'text-[#808080] hover:text-[#212121]'
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
            <div className="col-span-full premium-card p-10 text-center text-[#808080] dark:text-[#94a3b8]">
              <span className="material-symbols-outlined text-4xl text-[#c2c2c2] dark:text-[#64748b] mb-2">person_search</span>
              <p className="text-sm font-bold text-[#212121] dark:text-white">No students found</p>
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
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-heading font-bold text-sm sm:text-base shrink-0 shadow-sm shadow-[#3fc073]/25">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-heading text-base font-bold text-[#212121] dark:text-white truncate">{student.name}</h3>
                        <button
                          type="button"
                          onClick={() => onViewStudent(student)}
                          aria-label={`Open details for ${student.name}`}
                          className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9e9e9e] hover:text-[#3fc073] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>
                      <p className="font-sans text-xs text-[#3fc073] font-semibold truncate mt-0.5">{courseNames(student)}</p>
                      <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] truncate">{student.studentNumber}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f0f0f0] dark:bg-[#111c2b]/60 rounded-2xl border border-[#dbdbdb]/70 dark:border-[#243244] space-y-2 mb-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#808080] dark:text-[#94a3b8] font-medium">Fee Status:</span>
                      {!isPending ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#22c55e] dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-[#ef4444] dark:text-rose-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse"></span>
                          Pending (₹{student.outstandingBalance.toLocaleString('en-IN')})
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#808080] dark:text-[#94a3b8] font-medium">Attendance:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#212121] dark:text-white text-xs">{student.overallAttendance}%</span>
                        <div className="w-16 h-1.5 bg-[#dbdbdb] dark:bg-[#172435] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${student.overallAttendance >= 80 ? 'bg-[#22c55e]' : 'bg-[#3fc073]'}`}
                            style={{ width: `${student.overallAttendance}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#dbdbdb]/60 dark:border-[#243244]">
                  <button
                    type="button"
                    onClick={() => onViewStudent(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-[#575757] dark:text-[#cbd5e1] hover:text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 rounded-xl transition-colors font-sans text-xs font-semibold active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenRecordFee(student)}
                    disabled={!isPending}
                    title={!isPending ? 'No outstanding fee' : 'Record fee payment'}
                    className={`min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 rounded-xl transition-colors font-sans text-xs font-semibold active:scale-95 ${
                      isPending
                        ? 'text-[#35a160] dark:text-[#b3e6c7] bg-[#e9f7ee] dark:bg-[#3fc073]/20 font-bold hover:bg-[#cbecd8]'
                        : 'text-[#9e9e9e] bg-[#f0f0f0] dark:bg-[#111c2b] cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>Fee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSendMessage(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-[#575757] dark:text-[#cbd5e1] hover:text-[#22c55e] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors font-sans text-xs font-semibold active:scale-95"
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
                <tr className="border-b border-[#dbdbdb]/80 dark:border-[#243244] bg-[#f0f0f0]/90 dark:bg-[#111c2b]/50 text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Courses</th>
                  <th className="p-4">Fee Status</th>
                  <th className="p-4">Attendance</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244] text-xs font-medium">
                {filteredStudents.map((student) => {
                  const isPending = student.outstandingBalance > 0;
                  return (
                    <tr key={student.id} className="hover:bg-[#f0f0f0]/60 dark:hover:bg-[#172435]/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-xs">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#212121] dark:text-white">{student.name}</div>
                            <div className="text-xs text-[#808080] dark:text-[#94a3b8]">{student.studentNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[#212121] dark:text-[#e2e8f0]">{courseNames(student)}</div>
                      </td>
                      <td className="p-4">
                        {!isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#22c55e] dark:text-emerald-300 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-[#ef4444] dark:text-rose-300 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>
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
                            className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-xl text-[#808080] hover:text-[#3fc073]"
                            title="View student"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenRecordFee(student)}
                            disabled={!isPending}
                            className={`p-1.5 rounded-xl ${isPending ? 'text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20' : 'text-[#c2c2c2] dark:text-[#64748b] opacity-40 cursor-not-allowed'}`}
                            title="Record fee"
                          >
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSendMessage(student)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[#808080] hover:text-[#22c55e] rounded-xl"
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
