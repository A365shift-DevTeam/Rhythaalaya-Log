import React, { useState } from 'react';
import { Student } from '../types';

interface StudentsTabProps {
  students: Student[];
  onOpenAddStudent: () => void;
  onOpenRecordFee: (student?: Student) => void;
  onViewStudent: (student: Student) => void;
  onSendMessage: (student: Student) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  onOpenAddStudent,
  onOpenRecordFee,
  onViewStudent,
  onSendMessage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFeeStatus, setFilterFeeStatus] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'attendance'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterFeeStatus === 'All' ? true : s.feeStatus === filterFeeStatus;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'attendance') return b.overallAttendance - a.overallAttendance;
      return a.name.localeCompare(b.name);
    });

  const paidCount = students.filter((s) => s.feeStatus === 'Paid').length;
  const pendingCount = students.filter((s) => s.feeStatus === 'Pending').length;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {/* Header & Stats Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Roster
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage student enrollments, fee records, and WhatsApp contacts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-brand-200/60 dark:border-brand-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
            Total: {students.length}
          </div>
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Paid: {paidCount}
          </div>
          <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-200/60 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Pending: {pendingCount}
          </div>

          <button
            onClick={onOpenAddStudent}
            className="btn-brand ml-auto md:ml-2 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, course, or batch ID..."
              className="w-full pl-10 pr-10 py-2.5 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl font-sans text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Status Filter Pills */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setFilterFeeStatus('All')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'All'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterFeeStatus('Paid')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'Paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setFilterFeeStatus('Pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filterFeeStatus === 'Pending'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                }`}
              >
                Pending
              </button>
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortBy(sortBy === 'name' ? 'attendance' : 'name')}
              className="px-3 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl font-sans text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">sort</span>
              <span>Sort: {sortBy === 'name' ? 'Name' : 'Attendance'}</span>
            </button>

            {/* View Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-brand-500 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudents.map((student) => {
            const initials = student.name
              .split(' ')
              .map((n) => n[0])
              .join('');

            return (
              <div
                key={student.id}
                className="bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 rounded-2xl p-5 flex flex-col justify-between group hover:border-brand-300 dark:hover:border-brand-600 transition-all shadow-xs"
              >
                <div>
                  <div className="flex gap-3.5 items-start mb-4">
                    {student.avatar ? (
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-xl object-cover border border-brand-200 dark:border-brand-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-base shrink-0 shadow-xs">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white truncate">
                          {student.name}
                        </h3>
                        <button
                          onClick={() => onViewStudent(student)}
                          className="text-slate-400 hover:text-brand-500 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>
                      </div>
                      <p className="font-sans text-xs text-brand-500 dark:text-brand-400 font-semibold truncate mt-0.5">
                        {student.course}
                      </p>
                      <p className="font-sans text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {student.batch}
                      </p>
                    </div>
                  </div>

                  {/* Fee & Attendance Indicator */}
                  <div className="p-3 bg-brand-50/70 dark:bg-brand-900/40 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2 mb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Fee Status:</span>
                      {student.feeStatus === 'Paid' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Paid (${student.feeAmount})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          Pending (${student.feeAmount})
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Attendance:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                          {student.overallAttendance}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              student.overallAttendance >= 80 ? 'bg-emerald-500' : 'bg-brand-500'
                            }`}
                            style={{ width: `${student.overallAttendance}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onViewStudent(student)}
                    className="py-1.5 px-2 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors font-sans text-xs font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">visibility</span>
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => onOpenRecordFee(student)}
                    className={`py-1.5 px-2 flex items-center justify-center gap-1 rounded-lg transition-colors font-sans text-xs font-semibold ${
                      student.feeStatus === 'Pending'
                        ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/60 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    <span>Fee</span>
                  </button>

                  <button
                    onClick={() => onSendMessage(student)}
                    className="py-1.5 px-2 flex items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors font-sans text-xs font-semibold"
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
        /* Table View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4">Student</th>
                <th className="p-4">Course & Batch</th>
                <th className="p-4">Fee Status</th>
                <th className="p-4">Attendance</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                          {student.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                        <div className="text-[10px] text-slate-400">{student.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{student.course}</div>
                    <div className="text-[10px] text-slate-500">{student.batch}</div>
                  </td>
                  <td className="p-4">
                    {student.feeStatus === 'Paid' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                        Paid (${student.feeAmount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                        Pending (${student.feeAmount})
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{student.overallAttendance}%</span>
                      <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500" style={{ width: `${student.overallAttendance}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => onViewStudent(student)}
                      className="text-slate-600 hover:text-brand-500 font-semibold"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onOpenRecordFee(student)}
                      className="text-brand-500 font-bold hover:underline"
                    >
                      Record Fee
                    </button>
                    <button
                      onClick={() => onSendMessage(student)}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      Msg
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs">
          <span className="material-symbols-outlined text-4xl text-slate-400">group_off</span>
          <p className="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2">
            No students match query
          </p>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Try adjusting your search keywords or status filter.
          </p>
        </div>
      )}
    </div>
  );
};

