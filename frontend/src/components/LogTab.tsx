import React, { useEffect, useMemo, useState } from 'react';
import { Student, Batch, AttendanceStatus } from '../types';
import { api } from '../api';

interface LogTabProps {
  students: Student[];
  batches: Batch[];
  token: string;
  onOpenAddStudent: () => void;
}

interface RosterEntry {
  enrollmentId: string;
  studentId: string;
  studentName: string;
}

type RollCallStatus = Extract<AttendanceStatus, 'P' | 'A'>;

export const LogTab: React.FC<LogTabProps> = ({ batches, token, onOpenAddStudent }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, RollCallStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'P' | 'A'>('ALL');

  useEffect(() => {
    if (!selectedBatchId && batches[0]) setSelectedBatchId(batches[0].id);
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) { setRoster([]); setAttendance({}); return; }
    setLoading(true);
    void api.attendance(token, selectedDate, selectedBatchId).then(result => {
      const nextRoster: RosterEntry[] = result.entries.map((entry: any) => ({
        enrollmentId: entry.enrollmentId, studentId: entry.studentId, studentName: entry.studentName
      }));
      const nextAttendance: Record<string, RollCallStatus> = {};
      result.entries.forEach((entry: any) => {
        nextAttendance[entry.enrollmentId] = entry.status === 'Present' ? 'P' : 'A';
      });
      setRoster(nextRoster);
      setAttendance(nextAttendance);
    }).catch(error => setToastMessage(error instanceof Error ? error.message : 'Unable to load attendance.'))
      .finally(() => setLoading(false));
  }, [token, selectedDate, selectedBatchId]);

  const setStatus = (enrollmentId: string, status: RollCallStatus) => {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  const markAllPresent = () => {
    const next: Record<string, RollCallStatus> = {};
    roster.forEach((entry) => { next[entry.enrollmentId] = 'P'; });
    setAttendance(next);
    setToastMessage('Marked all students as Present!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const markAllAbsent = () => {
    const next: Record<string, RollCallStatus> = {};
    roster.forEach((entry) => { next[entry.enrollmentId] = 'A'; });
    setAttendance(next);
    setToastMessage('Marked all students as Absent.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'P').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'A').length;
  const totalStudents = roster.length || 1;
  const presentPct = roster.length ? Math.round((presentCount / roster.length) * 100) : 0;

  const filteredRoster = useMemo(() => {
    return roster.filter((entry) => {
      const matchesSearch = !searchQuery.trim() || entry.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const current = attendance[entry.enrollmentId] || 'P';
      const matchesFilter = filterStatus === 'ALL' || current === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [roster, searchQuery, filterStatus, attendance]);

  const todayIso = new Date().toISOString().split('T')[0];

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDisplayDate = (iso: string) => {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const isToday = iso === todayIso;
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
      const formatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return isToday ? `Today (${formatted})` : `${dayName}, ${formatted}`;
    } catch {
      return iso;
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatchId || roster.length === 0 || saving) return;
    setSaving(true);
    const entries = roster.map((entry) => ({ enrollmentId: entry.enrollmentId, status: attendance[entry.enrollmentId] || 'P' }));
    try {
      await api.submitAttendance(token, selectedDate, selectedBatchId, entries);
      setToastMessage('Attendance saved successfully!');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-12 relative">
      {toastMessage && (
        <div className="fixed top-16 md:top-20 right-3 sm:right-6 md:right-8 z-50 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-brand-500/40 backdrop-blur-md animate-bounce">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
          <span className="font-sans text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="premium-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Attendance Log
            </h2>
            <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Record daily student attendance and track trends
            </p>
          </div>
        </div>

        {/* Responsive Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Enhanced Large Date Selector */}
          <div className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl p-1 flex-1 lg:max-w-xs shadow-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              title="Previous day"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_left</span>
            </button>

            <label className="relative flex-1 flex items-center justify-center gap-2 px-2 py-1.5 cursor-pointer min-h-9 select-none rounded-lg hover:bg-white/70 dark:hover:bg-slate-800/70 transition-colors">
              <span className="material-symbols-outlined text-brand-600 dark:text-brand-400 text-[22px] shrink-0">
                calendar_month
              </span>
              <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {formatDisplayDate(selectedDate)}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                aria-label="Select date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            <button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              title="Next day"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0 active:scale-95"
            >
              <span className="material-symbols-outlined text-[22px]">chevron_right</span>
            </button>

            {selectedDate !== todayIso && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-800/60 hover:bg-brand-200 dark:hover:bg-brand-700/60 rounded-lg transition-colors shrink-0 active:scale-95"
                title="Jump to today"
              >
                Today
              </button>
            )}
          </div>

          {/* Batch Selector */}
          <div className="relative flex-1 lg:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] pointer-events-none">
              groups
            </span>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              aria-label="Select attendance batch"
              className="w-full min-h-11 pl-10 pr-9 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none appearance-none cursor-pointer truncate transition-all"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.enrolledCount} enrolled)
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">
              expand_more
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-auto">
            <button
              type="button"
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="flex-1 lg:flex-initial min-h-11 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-sans text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>All Present</span>
            </button>
            <button
              type="button"
              onClick={markAllAbsent}
              disabled={roster.length === 0}
              className="flex-1 lg:flex-initial min-h-11 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-sans text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              <span>All Absent</span>
            </button>
          </div>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="premium-card text-center py-12 px-4">
          <span className="material-symbols-outlined text-4xl text-slate-400">calendar_add_on</span>
          <p className="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2">No batches yet</p>
          <p className="font-sans text-xs text-slate-500 mt-1 max-w-sm mx-auto">Create a batch first, then enroll students to take attendance.</p>
          <button type="button" onClick={onOpenAddStudent} className="btn-brand mt-4 rounded-xl px-4 py-2.5 text-xs font-bold">
            Add student
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Quick Stats Summary (Visible on mobile/tablet) */}
          <div className="lg:hidden grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'P' ? 'ALL' : 'P')}
              className={`rounded-2xl p-3 sm:p-4 text-center transition-all border ${
                filterStatus === 'P'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Present</div>
              <div className="font-heading text-xl sm:text-2xl font-extrabold tabular-nums mt-0.5">{presentCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'A' ? 'ALL' : 'A')}
              className={`rounded-2xl p-3 sm:p-4 text-center transition-all border ${
                filterStatus === 'A'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/30'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Absent</div>
              <div className="font-heading text-xl sm:text-2xl font-extrabold tabular-nums mt-0.5">{absentCount}</div>
            </button>

            <div className="bg-brand-50 dark:bg-brand-950/40 border border-brand-200/70 dark:border-brand-800/40 rounded-2xl p-3 sm:p-4 text-center text-brand-900 dark:text-brand-200 flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Rate</div>
              <div className="font-heading text-xl sm:text-2xl font-extrabold tabular-nums mt-0.5 text-brand-600 dark:text-brand-300">{presentPct}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Student List Section */}
            <div className="lg:col-span-2 space-y-3">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Attendance List
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {roster.length}
                  </span>
                </div>

                {roster.length > 4 && (
                  <div className="relative flex-1 sm:max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student…"
                      className="w-full min-h-9 pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Roster Cards List */}
              <div className="premium-card overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading && (
                    <div className="p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[18px] text-brand-500">progress_activity</span>
                      <span>Loading attendance roster…</span>
                    </div>
                  )}

                  {!loading && roster.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No active students enrolled in this batch yet.
                    </div>
                  )}

                  {!loading && roster.length > 0 && filteredRoster.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No students match the selected filter.
                    </div>
                  )}

                  {!loading && filteredRoster.map((entry) => {
                    const currentStatus = attendance[entry.enrollmentId] || 'P';
                    const isPresent = currentStatus === 'P';
                    const initials = entry.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <div
                        key={entry.enrollmentId}
                        className={`p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                          isPresent
                            ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                            : 'bg-rose-50/25 dark:bg-rose-950/20 hover:bg-rose-50/40 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        {/* Student Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-heading font-bold text-xs shrink-0 shadow-xs transition-colors ${
                              isPresent ? 'bg-brand-500' : 'bg-rose-500'
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-sans text-sm font-bold text-slate-900 dark:text-white truncate">
                              {entry.studentName}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 sm:hidden">
                              {isPresent ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Present</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">Absent</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Attendance Toggle Control */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`hidden sm:inline-block min-w-16 text-right font-sans text-xs font-bold transition-colors ${
                              isPresent ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isPresent ? 'Present' : 'Absent'}
                          </span>

                          <label className="inline-flex min-h-11 items-center cursor-pointer p-1 -m-1">
                            <input
                              type="checkbox"
                              role="switch"
                              aria-label={`Mark ${entry.studentName} present`}
                              checked={isPresent}
                              onChange={(event) => setStatus(entry.enrollmentId, event.target.checked ? 'P' : 'A')}
                              className="sr-only peer"
                            />
                            <span className="relative h-7 w-12 shrink-0 rounded-full bg-rose-500 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900" />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Desktop Session Summary Sidebar */}
            <div className="hidden lg:flex flex-col gap-5">
              <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-[#63c06a] text-white rounded-2xl p-6 shadow-lg shadow-brand-500/15 flex flex-col gap-4 relative overflow-hidden sticky top-6">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <h3 className="font-heading text-lg font-bold opacity-90">Session Summary</h3>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-5xl font-extrabold leading-none tabular-nums">{presentCount}</span>
                  <span className="font-heading text-lg font-bold opacity-70 mb-1 tabular-nums">/ {roster.length}</span>
                </div>
                <div className="flex items-center gap-2 font-sans text-xs font-bold bg-white/20 w-max px-3 py-1 rounded-full backdrop-blur-md">
                  <span className="material-symbols-outlined text-[16px]">trending_up</span>
                  <span>{presentPct}% Present Today</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                    <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-0.5">Present</div>
                    <div className="font-heading text-xl font-extrabold text-emerald-200 tabular-nums">{presentCount}</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                    <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-0.5">Absent</div>
                    <div className="font-heading text-xl font-extrabold text-rose-300 tabular-nums">{absentCount}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={roster.length === 0 || saving}
                  className="w-full mt-2 bg-white text-brand-600 font-sans text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-brand-50 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'cloud_upload'}</span>
                  <span>{saving ? 'Saving…' : 'Submit Attendance Log'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Mobile Bottom Sticky Action Bar */}
          {roster.length > 0 && (
            <div className="lg:hidden fixed bottom-16 sm:bottom-20 left-3 right-3 z-50 animate-fadeIn">
              <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="min-w-0 pl-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold">
                    <span className="text-emerald-400">{presentCount} Present</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-rose-400">{absentCount} Absent</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {presentPct}% present in {batches.find(b => b.id === selectedBatchId)?.name || 'batch'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={saving}
                  className="btn-brand min-h-11 px-4 py-2 rounded-xl text-xs font-bold shrink-0 shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">{saving ? 'progress_activity' : 'check_circle'}</span>
                  <span>{saving ? 'Saving…' : 'Submit'}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
