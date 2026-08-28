import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import { MobileSpeedDial } from './MobileSpeedDial';
import React, { useState } from 'react';
import { Student } from '../types';
import { SimpleSelect } from './ui/select';

interface StudentsTabProps {
  students: Student[];
  onOpenAddStudent: () => void;
  onOpenRecordFee: (student?: Student) => void;
  onViewStudent: (student: Student) => void;
  onSendMessage: (student: Student) => void;
}

const activeEnrollments = (student: Student) => student.enrollments.filter((e) => e.status === 'Active');

const courseNames = (student: Student) =>
  activeEnrollments(student).map((e) => `${e.courseName} ${e.batchName}`).join(', ') || 'Not enrolled';

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onOpenAddStudent,
  onOpenRecordFee,
  onViewStudent,
  onSendMessage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFeeStatus, setFilterFeeStatus] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [filterCourse, setFilterCourse] = useState('All');
  const [filterBatch, setFilterBatch] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'attendance'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const activeFilterCount =
    (filterFeeStatus !== 'All' ? 1 : 0) + (filterCourse !== 'All' ? 1 : 0) + (filterBatch !== 'All' ? 1 : 0);

  const clearAllFilters = () => {
    setFilterFeeStatus('All');
    setFilterCourse('All');
    setFilterBatch('All');
  };

  const courseOptions = Array.from(
    new Set<string>(students.flatMap((s) => activeEnrollments(s).map((e) => e.courseName)))
  ).sort((a, b) => a.localeCompare(b));

  const batchOptions = Array.from(
    new Set<string>(
      students.flatMap((s) =>
        activeEnrollments(s)
          .filter((e) => filterCourse === 'All' || e.courseName === filterCourse)
          .map((e) => e.batchName)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        courseNames(s).toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase());

      const feeStatus = s.outstandingBalance > 0 ? 'Pending' : 'Paid';
      const matchesStatus = filterFeeStatus === 'All' ? true : feeStatus === filterFeeStatus;

      const matchesCourse =
        filterCourse === 'All' || activeEnrollments(s).some((e) => e.courseName === filterCourse);

      const matchesBatch =
        filterBatch === 'All' ||
        activeEnrollments(s).some(
          (e) => (filterCourse === 'All' || e.courseName === filterCourse) && e.batchName === filterBatch
        );

      return matchesSearch && matchesStatus && matchesCourse && matchesBatch;
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

        <Button
          type="button"
          onClick={onOpenAddStudent}
          className="btn-brand w-full sm:w-auto min-h-11 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-2xl hidden md:flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
        >
          <JisIcon className="text-[18px]">person_add</JisIcon>
          <span>Add Student</span>
        </Button>
      </div>

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="premium-card p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#3fc073]/10 via-[#3fc073]/[0.03] to-transparent text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Total</div>
          <div className="font-heading text-xl sm:text-2xl font-bold text-[#35a160] dark:text-[#6bd194] tabular-nums mt-0.5">{students.length}</div>
        </div>

        <div className="premium-card p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#22c55e]/10 via-[#22c55e]/[0.03] to-transparent text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Paid</div>
          <div className="font-heading text-xl sm:text-2xl font-bold text-[#22c55e] dark:text-[#4ade80] tabular-nums mt-0.5">{paidCount}</div>
        </div>

        <div className="premium-card p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#ef4444]/10 via-[#ef4444]/[0.03] to-transparent text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Pending</div>
          <div className="font-heading text-xl sm:text-2xl font-bold text-[#ef4444] dark:text-[#f87171] tabular-nums mt-0.5">{pendingCount}</div>
        </div>
      </div>

      {/* Toolbar: Search, unified Filter & View Toggle */}
      <div className="premium-card p-3.5 sm:p-4 space-y-3">
        <div className="flex gap-2.5">
          <div className="relative flex-1 min-w-0">
            <label htmlFor="student-search" className="sr-only">Search students</label>
            <JisIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              search
            </JisIcon>
            <input
              id="student-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, course, batch, or ID…"
              className="w-full min-h-11 pl-10 pr-16 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl font-sans text-xs sm:text-sm font-medium text-[#212121] dark:text-white placeholder:text-[#9e9e9e] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] transition-all"
            />
            {searchQuery && (
              <Button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear student search"
                className="absolute right-2 top-1/2 min-h-8 -translate-y-1/2 rounded-xl px-2.5 text-xs font-semibold text-[#808080] hover:bg-[#f0f0f0] hover:text-[#212121] dark:hover:bg-[#172435]"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="hidden sm:flex bg-[#f0f0f0] dark:bg-[#111c2b] p-1 rounded-2xl shrink-0" role="group" aria-label="Student view">
            <Button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`w-9 h-9 inline-flex items-center justify-center rounded-xl transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-[#0b1422] text-[#3fc073] shadow-xs font-bold' : 'text-[#808080] hover:text-[#212121]'
              }`}
              title="Grid View"
            >
              <JisIcon className="text-[18px]">grid_view</JisIcon>
            </Button>
            <Button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
              className={`w-9 h-9 inline-flex items-center justify-center rounded-xl transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-[#0b1422] text-[#3fc073] shadow-xs font-bold' : 'text-[#808080] hover:text-[#212121]'
              }`}
              title="Table View"
            >
              <JisIcon className="text-[18px]">format_list_bulleted</JisIcon>
            </Button>
          </div>
        </div>

        {/* Unified filter pill bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1" role="group" aria-label="Filter and sort students">
          <div className="relative shrink-0">
            <label htmlFor="student-filter-fee" className="sr-only">Filter by fee status</label>
            <JisIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] ${
                filterFeeStatus === 'Paid' ? 'text-white' : filterFeeStatus === 'Pending' ? 'text-white' : 'text-[#9e9e9e]'
              }`}
            >
              payments
            </JisIcon>
            <SimpleSelect
              id="student-filter-fee"
              value={filterFeeStatus}
              onValueChange={(value) => setFilterFeeStatus(value as 'All' | 'Paid' | 'Pending')}
              className={`w-auto min-h-10 pl-9 py-1.5 rounded-full font-sans text-xs font-bold transition-all focus:ring-4 focus:ring-[#3fc073]/15 ${
                filterFeeStatus === 'Paid'
                  ? 'bg-[#22c55e] border-[#22c55e] text-white'
                  : filterFeeStatus === 'Pending'
                    ? 'bg-[#ef4444] border-[#ef4444] text-white'
                    : 'bg-[#f0f0f0] dark:bg-[#111c2b] border-[#dbdbdb] dark:border-[#243244] text-[#575757] dark:text-[#cbd5e1]'
              }`}
              options={[
                { value: 'All', label: 'All fees' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Pending', label: 'Pending' },
              ]}
            />
          </div>

          <div className="relative shrink-0">
            <label htmlFor="student-filter-course" className="sr-only">Filter by course</label>
            <JisIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] ${
                filterCourse !== 'All' ? 'text-[#35a160] dark:text-[#6bd194]' : 'text-[#9e9e9e]'
              }`}
            >
              school
            </JisIcon>
            <SimpleSelect
              id="student-filter-course"
              value={filterCourse}
              onValueChange={(value) => {
                setFilterCourse(value);
                setFilterBatch('All');
              }}
              className={`w-auto min-h-10 pl-9 py-1.5 rounded-full font-sans text-xs font-bold transition-all focus:ring-4 focus:ring-[#3fc073]/15 max-w-44 truncate ${
                filterCourse !== 'All'
                  ? 'bg-[#e9f7ee] dark:bg-[#3fc073]/20 border-[#3fc073]/40 text-[#35a160] dark:text-[#6bd194]'
                  : 'bg-[#f0f0f0] dark:bg-[#111c2b] border-[#dbdbdb] dark:border-[#243244] text-[#575757] dark:text-[#cbd5e1]'
              }`}
              options={[
                { value: 'All', label: 'All courses' },
                ...courseOptions.map((course) => ({ value: course, label: course })),
              ]}
            />
          </div>

          <div className="relative shrink-0">
            <label htmlFor="student-filter-batch" className="sr-only">Filter by batch</label>
            <JisIcon
              className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] ${
                filterBatch !== 'All' ? 'text-[#35a160] dark:text-[#6bd194]' : 'text-[#9e9e9e]'
              }`}
            >
              groups
            </JisIcon>
            <SimpleSelect
              id="student-filter-batch"
              value={filterBatch}
              onValueChange={setFilterBatch}
              className={`w-auto min-h-10 pl-9 py-1.5 rounded-full font-sans text-xs font-bold transition-all focus:ring-4 focus:ring-[#3fc073]/15 max-w-44 truncate ${
                filterBatch !== 'All'
                  ? 'bg-[#e9f7ee] dark:bg-[#3fc073]/20 border-[#3fc073]/40 text-[#35a160] dark:text-[#6bd194]'
                  : 'bg-[#f0f0f0] dark:bg-[#111c2b] border-[#dbdbdb] dark:border-[#243244] text-[#575757] dark:text-[#cbd5e1]'
              }`}
              options={[
                { value: 'All', label: 'All batches' },
                ...batchOptions.map((batch) => ({ value: batch, label: batch })),
              ]}
            />
          </div>

          <div className="relative shrink-0">
            <label htmlFor="student-sort" className="sr-only">Sort students</label>
            <JisIcon className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] text-[#9e9e9e]">
              sort
            </JisIcon>
            <SimpleSelect
              id="student-sort"
              value={sortBy}
              onValueChange={(value) => setSortBy(value as 'name' | 'attendance')}
              className="w-auto min-h-10 pl-9 py-1.5 rounded-full font-sans text-xs font-bold bg-[#f0f0f0] dark:bg-[#111c2b] border-[#dbdbdb] dark:border-[#243244] text-[#575757] dark:text-[#cbd5e1] transition-all focus:ring-4 focus:ring-[#3fc073]/15"
              options={[
                { value: 'name', label: 'By name' },
                { value: 'attendance', label: 'By attendance' },
              ]}
            />
          </div>

          {activeFilterCount > 0 && (
            <Button
              type="button"
              onClick={clearAllFilters}
              className="min-h-10 px-3.5 py-1.5 rounded-full font-sans text-xs font-bold text-[#808080] dark:text-[#94a3b8] hover:text-[#212121] dark:hover:text-white hover:bg-[#f0f0f0] dark:hover:bg-[#172435] border border-transparent transition-colors flex items-center gap-1 shrink-0"
            >
              <JisIcon className="text-[16px]">close</JisIcon>
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <>
          {filteredStudents.length === 0 && (
            <div className="premium-card p-10 text-center text-[#808080] dark:text-[#94a3b8]">
              <JisIcon className="text-4xl text-[#c2c2c2] dark:text-[#64748b] mb-2">person_search</JisIcon>
              <p className="text-sm font-bold text-[#212121] dark:text-white">No students found</p>
              <p className="text-xs mt-1">Try changing your search query or filter options.</p>
            </div>
          )}

          {/* Mobile: compact list — many students per screen; tap a row for full details */}
          {filteredStudents.length > 0 && (
            <div className="md:hidden premium-card overflow-hidden divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
              {filteredStudents.map((student) => {
                const initials = student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const isPending = student.outstandingBalance > 0;
                const enrollments = activeEnrollments(student);
                const primary = enrollments[0];
                const extra = enrollments.length - 1;

                return (
                  <div key={student.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => onViewStudent(student)}
                      aria-label={`Open details for ${student.name}`}
                      className="flex flex-1 min-w-0 items-center gap-3 text-left transition-opacity active:opacity-60"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#3fc073] to-[#35a160] font-heading text-xs font-bold text-white shadow-sm shadow-[#3fc073]/25">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-heading text-sm font-bold text-[#212121] dark:text-white">{student.name}</h3>
                          {isPending ? (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#ef4444] dark:text-rose-300">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />
                              ₹{student.outstandingBalance.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#22c55e] dark:text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                              Paid
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                          {primary ? (
                            <>
                              <span className="font-semibold text-[#3fc073]">{primary.courseName}</span>
                              {' · '}{primary.batchName}
                              {extra > 0 && <span className="text-[#9e9e9e]"> +{extra}</span>}
                            </>
                          ) : (
                            <span className="font-semibold text-[#3fc073]">Not enrolled</span>
                          )}
                          {' · '}{student.overallAttendance}% present
                        </p>
                      </div>
                    </button>

                    {isPending && (
                      <Button
                        type="button"
                        onClick={() => onOpenRecordFee(student)}
                        aria-label={`Record fee payment for ${student.name}`}
                        className="min-h-8 shrink-0 rounded-xl bg-[#e9f7ee] px-3 text-xs font-bold text-[#35a160] transition-all hover:bg-[#cbecd8] active:scale-95 dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]"
                      >
                        Pay
                      </Button>
                    )}
                    <JisIcon className="shrink-0 text-[18px] text-[#c2c2c2] dark:text-[#64748b]">chevron_right</JisIcon>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop / tablet: full cards */}
          <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">

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
                        <Button
                          type="button"
                          onClick={() => onViewStudent(student)}
                          aria-label={`Open details for ${student.name}`}
                          className="-mr-1.5 -mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9e9e9e] hover:text-[#3fc073] hover:bg-[#f0f0f0] dark:hover:bg-[#172435] transition-colors"
                        >
                          <JisIcon className="text-[18px]">more_vert</JisIcon>
                        </Button>
                      </div>
                      {activeEnrollments(student).length === 0 ? (
                        <p className="font-sans text-xs text-[#3fc073] font-semibold truncate mt-0.5">Not enrolled</p>
                      ) : (
                        activeEnrollments(student).map((e) => (
                          <p key={e.id} className="font-sans text-xs truncate mt-0.5">
                            <span className="text-[#3fc073] font-semibold">{e.courseName}</span>
                            <span className="text-[#808080] dark:text-[#94a3b8]"> · {e.batchName}</span>
                          </p>
                        ))
                      )}
                      <p className="font-sans text-xs text-[#808080] dark:text-[#94a3b8] truncate">{student.studentNumber}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-[#f0f0f0] dark:bg-[#111c2b]/60 rounded-2xl border border-[#dbdbdb]/70 dark:border-[#243244] space-y-2 mb-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#808080] dark:text-[#94a3b8] font-medium">Fee Status:</span>
                      {!isPending ? (
                        <span className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#22c55e] dark:text-emerald-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-[#ef4444] dark:text-rose-300 text-xs font-bold">
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
                  <Button
                    type="button"
                    onClick={() => onViewStudent(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-[#575757] dark:text-[#cbd5e1] hover:text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 rounded-xl transition-colors font-sans text-xs font-semibold active:scale-95"
                  >
                    <JisIcon className="text-[16px]">visibility</JisIcon>
                    <span>View</span>
                  </Button>
                  <Button
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
                    <JisIcon className="text-[16px]">receipt_long</JisIcon>
                    <span>Fee</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onSendMessage(student)}
                    className="min-h-10 py-1.5 px-2 flex items-center justify-center gap-1 text-[#575757] dark:text-[#cbd5e1] hover:text-[#22c55e] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors font-sans text-xs font-semibold active:scale-95"
                  >
                    <JisIcon className="text-[16px]">forum</JisIcon>
                    <span>Msg</span>
                  </Button>
                </div>
              </div>
            );
          })}
          </div>
        </>
      ) : (
        <div className="premium-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#dbdbdb]/80 dark:border-[#243244] bg-[#f0f0f0]/90 dark:bg-[#111c2b]/50 text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider">
                  <th className="p-4">Student</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Batch</th>
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
                        {activeEnrollments(student).length === 0 ? (
                          <div className="font-semibold text-[#212121] dark:text-[#e2e8f0]">Not enrolled</div>
                        ) : (
                          <div className="space-y-1.5">
                            {activeEnrollments(student).map((e) => (
                              <div key={e.id} className="font-semibold text-[#212121] dark:text-[#e2e8f0]">{e.courseName}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {activeEnrollments(student).length === 0 ? (
                          <div className="text-[#808080] dark:text-[#94a3b8]">—</div>
                        ) : (
                          <div className="space-y-1.5">
                            {activeEnrollments(student).map((e) => (
                              <div key={e.id} className="text-[#575757] dark:text-[#cbd5e1]">{e.batchName}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {!isPending ? (
                          <span className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#22c55e] dark:text-emerald-300 text-xs font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center whitespace-nowrap gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-[#ef4444] dark:text-rose-300 text-xs font-bold">
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
                          <Button
                            type="button"
                            onClick={() => onViewStudent(student)}
                            className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-xl text-[#808080] hover:text-[#3fc073]"
                            title="View student"
                          >
                            <JisIcon className="text-[18px]">visibility</JisIcon>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => onOpenRecordFee(student)}
                            disabled={!isPending}
                            className={`p-1.5 rounded-xl ${isPending ? 'text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20' : 'text-[#c2c2c2] dark:text-[#64748b] opacity-40 cursor-not-allowed'}`}
                            title="Record fee"
                          >
                            <JisIcon className="text-[18px]">receipt_long</JisIcon>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => onSendMessage(student)}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[#808080] hover:text-[#22c55e] rounded-xl"
                            title="WhatsApp"
                          >
                            <JisIcon className="text-[18px]">forum</JisIcon>
                          </Button>
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

      {/* Mobile quick-add: single action, so the button opens Add Student directly */}
      <MobileSpeedDial
        openLabel="Add student"
        actions={[
          { label: 'Add student', icon: 'person_add', tone: 'from-[#3fc073] to-[#35a160] shadow-[#3fc073]/35', onClick: onOpenAddStudent },
        ]}
      />
    </div>
  );
};
