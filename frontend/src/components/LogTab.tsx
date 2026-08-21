import React, { useEffect, useState } from 'react';
import { Student, Batch, AttendanceStatus } from '../types';
import { api } from '../api';

interface LogTabProps {
  students: Student[];
  batches: Batch[];
  token: string;
  onOpenAddStudent: () => void;
}

export const LogTab: React.FC<LogTabProps> = ({ students, batches, token, onOpenAddStudent }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedBatch, setSelectedBatch] = useState<string>(
    batches[0]?.name || 'Morning Batch - Yoga 101'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  const filteredStudents = students.filter(
    (s) => s.batch === selectedBatch
  );

  const displayList = filteredStudents;

  useEffect(() => {
    const batch = batches.find(x => x.name === selectedBatch);
    if (!batch) return;
    void api.attendance(token, selectedDate, batch.id).then(result => {
      const next: Record<string, AttendanceStatus> = {};
      result.entries.forEach((entry: any) => {
        next[entry.studentId] = entry.status === 'Present' ? 'P' : entry.status === 'Absent' ? 'A' : 'L';
      });
      setAttendance(next);
    }).catch(error => setToastMessage(error instanceof Error ? error.message : 'Unable to load attendance.'));
  }, [token, selectedDate, selectedBatch, batches]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    displayList.forEach((s) => {
      next[s.id] = 'P';
    });
    setAttendance(next);
    setToastMessage('Marked all students as Present!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'P').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'A').length;
  const leaveCount = Object.values(attendance).filter((s) => s === 'L').length;
  const totalStudents = displayList.length || 1;
  const presentPct = Math.round((presentCount / totalStudents) * 100);

  const handleSubmitAttendance = async () => {
    const batch = batches.find(x => x.name === selectedBatch);
    if (!batch || displayList.length === 0) return;
    const entries = { ...attendance };
    displayList.forEach(student => { if (!entries[student.id]) entries[student.id] = 'P'; });
    try {
      await api.submitAttendance(token, selectedDate, batch.id, entries);
      setToastMessage('Attendance saved successfully.');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to save attendance.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 md:right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-brand-500/40 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-sans text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Batch Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Log
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Record daily student roll call and track attendance trends
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Selector */}
          <div className="relative flex-1 md:w-44">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              calendar_today
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
            />
          </div>

          {/* Batch Selector */}
          <div className="relative flex-1 md:w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              class
            </span>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none appearance-none cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>

          <button
            onClick={markAllPresent}
            className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-sans text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition-all flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            <span>All Present</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Roll List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              Roll List ({displayList.length})
            </h3>
            <span className="font-sans text-xs text-slate-500 font-medium">
              Click P (Present), A (Absent), L (Leave)
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayList.map((student) => {
                const currentStatus = attendance[student.id] || 'P';
                const initials = student.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('');

                return (
                  <div
                    key={student.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      {student.avatar ? (
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-10 h-10 rounded-xl object-cover border border-brand-200 dark:border-brand-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-sm shrink-0">
                          {initials}
                        </div>
                      )}
                      <div>
                        <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">
                          {student.name}
                        </div>
                        <div className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{student.course}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {student.overallAttendance}% Avg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Segmented Buttons */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-60">
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, 'P')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'P'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        <span>P</span>
                        <span className="text-[10px] font-normal opacity-80">Present</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, 'A')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'A'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        <span>A</span>
                        <span className="text-[10px] font-normal opacity-80">Absent</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(student.id, 'L')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                          currentStatus === 'L'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                        }`}
                      >
                        <span>L</span>
                        <span className="text-[10px] font-normal opacity-80">Leave</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel (Summary & Trends) */}
        <div className="flex flex-col gap-5">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-[#63c06a] text-white rounded-2xl p-6 shadow-lg shadow-brand-500/15 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <h3 className="font-heading text-lg font-bold opacity-90">Session Summary</h3>
            
            <div className="flex items-end gap-2">
              <span className="font-heading text-5xl font-extrabold leading-none">{presentCount}</span>
              <span className="font-heading text-lg font-bold opacity-70 mb-1">/ {totalStudents}</span>
            </div>

            <div className="flex items-center gap-2 font-sans text-xs font-bold bg-white/20 w-max px-3 py-1 rounded-full backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>{presentPct}% Present Today</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-0.5">
                  Absent
                </div>
                <div className="font-heading text-xl font-extrabold text-rose-300">{absentCount}</div>
              </div>
              <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-0.5">
                  On Leave
                </div>
                <div className="font-heading text-xl font-extrabold text-amber-300">{leaveCount}</div>
              </div>
            </div>

            <button
              onClick={handleSubmitAttendance}
              className="w-full mt-2 bg-white text-brand-600 font-sans text-xs font-bold uppercase tracking-wider py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-xs active:scale-[0.98]"
            >
              Submit Attendance Log
            </button>
          </div>

          {/* Trend Chart Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-200/60 dark:border-brand-800 shadow-xs p-6 flex flex-col gap-4">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              30-Day Roll Trend
            </h3>

            {/* Sparkline Chart */}
            <div className="h-40 w-full relative border-b border-l border-slate-200 dark:border-slate-800 flex items-end pt-4 pr-2 pl-8">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-slate-400 font-mono pb-6">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
              </div>

              {/* SVG Sparkline */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  fill="none"
                  stroke="#45b080"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,20 10,15 20,25 30,10 40,30 50,20 60,15 70,25 80,10 90,5 100,10"
                />

                <polygon
                  fill="url(#sparkGradient)"
                  opacity="0.15"
                  points="0,100 0,20 10,15 20,25 30,10 40,30 50,20 60,15 70,25 80,10 90,5 100,10 100,100"
                />

                <defs>
                  <linearGradient id="sparkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#45b080" stopOpacity="1" />
                    <stop offset="100%" stopColor="#45b080" stopOpacity="0" />
                  </linearGradient>
                </defs>

                <circle cx="100" cy="10" r="4" fill="#45b080" />
              </svg>

              {/* X-axis labels */}
              <div className="absolute bottom-0 left-8 right-0 flex justify-between text-[10px] text-slate-400 translate-y-full pt-1.5 font-sans">
                <span>Oct 1</span>
                <span>Oct 12</span>
                <span className="font-bold text-brand-500 dark:text-brand-400">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
