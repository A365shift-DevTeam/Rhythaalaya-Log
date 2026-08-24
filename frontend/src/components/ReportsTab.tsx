import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import React, { useMemo, useState } from 'react';
import { Batch, Course, Student } from '../types';

interface ReportsTabProps {
  students: Student[];
  batches: Batch[];
  courses: Course[];
  onViewStudent: (student: Student) => void;
}

type SortKey = 'name' | 'attendance' | 'outstanding' | 'won' | 'participated';
type StatusFilter = 'All' | 'Active' | 'Inactive';

const courseNames = (student: Student) =>
  student.enrollments.filter((e) => e.status === 'Active').map((e) => e.courseName).join(', ') || 'Not enrolled';
const batchNames = (student: Student) =>
  student.enrollments.filter((e) => e.status === 'Active').map((e) => e.batchName).join(', ') || '—';

export const ReportsTab: React.FC<ReportsTabProps> = ({ students, batches, courses, onViewStudent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const filtered = useMemo(() => students
    .filter((s) => {
      const matchesSearch = !searchQuery.trim()
        || s.name.toLowerCase().includes(searchQuery.toLowerCase())
        || s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase())
        || courseNames(s).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBatch = batchFilter === 'all' || s.enrollments.some((e) => e.status === 'Active' && e.batchId === batchFilter);
      const matchesCourse = courseFilter === 'all' || s.enrollments.some((e) => e.status === 'Active' && e.courseId === courseFilter);
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Active' ? s.isActive : !s.isActive);
      return matchesSearch && matchesBatch && matchesCourse && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'attendance': return b.overallAttendance - a.overallAttendance;
        case 'outstanding': return b.outstandingBalance - a.outstandingBalance;
        case 'won': return b.wonCount - a.wonCount;
        case 'participated': return b.participatedCount - a.participatedCount;
        default: return a.name.localeCompare(b.name);
      }
    }), [students, searchQuery, batchFilter, courseFilter, statusFilter, sortBy]);

  const totals = useMemo(() => filtered.reduce((acc, s) => ({
    outstanding: acc.outstanding + s.outstandingBalance,
    attendance: acc.attendance + s.overallAttendance,
    won: acc.won + s.wonCount,
    participated: acc.participated + s.participatedCount,
  }), { outstanding: 0, attendance: 0, won: 0, participated: 0 }), [filtered]);
  const avgAttendance = filtered.length === 0 ? 0 : Math.round((totals.attendance / filtered.length) * 10) / 10;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
          Reports
        </h2>
        <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-0.5">
          Attendance, fees, and achievements across every student — click a row for the full picture
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3.5 rounded-2xl border bg-white dark:bg-[#0b1422] border-[#dbdbdb]/80 dark:border-[#243244] text-[#212121] dark:text-white text-center shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Students</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{filtered.length}</div>
        </div>
        <div className="p-3.5 rounded-2xl border bg-white dark:bg-[#0b1422] border-[#dbdbdb]/80 dark:border-[#243244] text-[#212121] dark:text-white text-center shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Avg Attendance</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{avgAttendance}%</div>
        </div>
        <div className="p-3.5 rounded-2xl border bg-[#fef2f2] dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/50 text-[#ef4444] dark:text-rose-300 text-center">
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Outstanding</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">₹{totals.outstanding.toLocaleString('en-IN')}</div>
        </div>
        <div className="p-3.5 rounded-2xl border bg-[#f0fdf4] dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/50 text-[#22c55e] dark:text-emerald-300 text-center">
          <div className="text-xs font-bold uppercase tracking-wider opacity-90">Won / Participated</div>
          <div className="font-heading text-lg sm:text-2xl font-bold tabular-nums mt-0.5">{totals.won} / {totals.participated}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="premium-card p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="report-search" className="sr-only">Search students</label>
            <JisIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              search
            </JisIcon>
            <input
              id="report-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, course, or ID…"
              className="w-full min-h-11 pl-10 pr-3 py-2.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl font-sans text-xs sm:text-sm font-medium text-[#212121] dark:text-white placeholder:text-[#9e9e9e] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] transition-all"
            />
          </div>

          <div className="relative sm:w-56">
            <label htmlFor="report-batch" className="sr-only">Filter by batch</label>
            <select
              id="report-batch"
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full min-h-11 pl-3.5 pr-9 py-2 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-xs sm:text-sm font-bold text-[#212121] dark:text-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] outline-none appearance-none cursor-pointer truncate transition-all"
            >
              <option value="all">All batches</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
            <JisIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              expand_more
            </JisIcon>
          </div>

          <div className="relative sm:w-56">
            <label htmlFor="report-course" className="sr-only">Filter by course</label>
            <select
              id="report-course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full min-h-11 pl-3.5 pr-9 py-2 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-xs sm:text-sm font-bold text-[#212121] dark:text-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] outline-none appearance-none cursor-pointer truncate transition-all"
            >
              <option value="all">All courses</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
            </select>
            <JisIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              expand_more
            </JisIcon>
          </div>

          <div className="flex bg-[#f0f0f0] dark:bg-[#111c2b] p-1 rounded-2xl shrink-0" role="group" aria-label="Filter by status">
            {(['Active', 'Inactive', 'All'] as StatusFilter[]).map((option) => (
              <Button key={option} type="button" onClick={() => setStatusFilter(option)} aria-pressed={statusFilter === option}
                className={`min-h-9 px-3.5 py-1 text-xs font-bold rounded-xl transition-all ${
                  statusFilter === option
                    ? 'bg-white dark:bg-[#0b1422] text-[#212121] dark:text-white shadow-xs'
                    : 'text-[#6b6b6b] dark:text-[#94a3b8] hover:text-[#212121]'
                }`}>
                {option}
              </Button>
            ))}
          </div>

          <div className="relative sm:w-48">
            <label htmlFor="report-sort" className="sr-only">Sort by</label>
            <select
              id="report-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-full min-h-11 pl-3.5 pr-9 py-2 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-xs sm:text-sm font-bold text-[#212121] dark:text-white focus:ring-4 focus:ring-[#3fc073]/15 focus:border-[#3fc073] outline-none appearance-none cursor-pointer truncate transition-all"
            >
              <option value="name">Sort: Name</option>
              <option value="attendance">Sort: Attendance</option>
              <option value="outstanding">Sort: Outstanding</option>
              <option value="won">Sort: Won</option>
              <option value="participated">Sort: Participated</option>
            </select>
            <JisIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] pointer-events-none text-[18px]">
              expand_more
            </JisIcon>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[#dbdbdb]/80 dark:border-[#243244] bg-[#f0f0f0]/90 dark:bg-[#111c2b]/50 text-xs font-bold text-[#808080] dark:text-[#94a3b8] uppercase tracking-wider">
                <th className="p-4">Student</th>
                <th className="p-4">Batch</th>
                <th className="p-4">Attendance</th>
                <th className="p-4">Outstanding</th>
                <th className="p-4">Won</th>
                <th className="p-4">Participated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244] text-xs font-medium">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-[#808080] dark:text-[#94a3b8]">
                    <JisIcon className="text-4xl text-[#c2c2c2] dark:text-[#64748b] mb-2">person_search</JisIcon>
                    <p className="text-sm font-bold text-[#212121] dark:text-white">No students match these filters</p>
                  </td>
                </tr>
              )}
              {filtered.map((student) => (
                <tr key={student.id} onClick={() => onViewStudent(student)}
                  className="cursor-pointer hover:bg-[#f0f0f0]/60 dark:hover:bg-[#172435]/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#3fc073] to-[#35a160] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {student.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#212121] dark:text-white truncate">{student.name}</div>
                        <div className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">{student.studentNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-[#212121] dark:text-[#e2e8f0] truncate max-w-[200px]">{batchNames(student)}</div>
                  </td>
                  <td className="p-4">
                    <span className="font-bold">{student.overallAttendance}%</span>
                  </td>
                  <td className="p-4">
                    {student.outstandingBalance > 0 ? (
                      <span className="font-bold text-[#ef4444]">₹{student.outstandingBalance.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="font-bold text-[#22c55e]">Paid</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-bold text-[#35a160] dark:text-[#b3e6c7]">
                      <JisIcon className="text-[15px]">workspace_premium</JisIcon>{student.wonCount}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 font-bold text-[#575757] dark:text-[#cbd5e1]">
                      <JisIcon className="text-[15px]">how_to_reg</JisIcon>{student.participatedCount}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button type="button" onClick={(event) => { event.stopPropagation(); onViewStudent(student); }}
                      className="p-1.5 hover:bg-[#f0f0f0] dark:hover:bg-[#172435] rounded-xl text-[#808080] hover:text-[#3fc073]"
                      title="View student report">
                      <JisIcon className="text-[18px]">visibility</JisIcon>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
