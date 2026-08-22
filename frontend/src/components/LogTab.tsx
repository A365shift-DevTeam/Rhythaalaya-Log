import React, { useEffect, useState } from 'react';
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

  const presentCount = Object.values(attendance).filter((s) => s === 'P').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'A').length;
  const totalStudents = roster.length || 1;
  const presentPct = Math.round((presentCount / totalStudents) * 100);

  const handleSubmitAttendance = async () => {
    if (!selectedBatchId || roster.length === 0) return;
    const entries = roster.map((entry) => ({ enrollmentId: entry.enrollmentId, status: attendance[entry.enrollmentId] || 'P' }));
    try {
      await api.submitAttendance(token, selectedDate, selectedBatchId, entries);
      setToastMessage('Attendance saved successfully.');
    } catch (error) {
      setToastMessage(error instanceof Error ? error.message : 'Unable to save attendance.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12 relative">
      {toastMessage && (
        <div className="fixed top-20 right-4 md:right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-brand-500/40 animate-bounce">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="font-sans text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="premium-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5">
        <div>
          <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance Log</h2>
          <p className="font-sans text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Record daily student attendance and track trends</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-44">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">calendar_today</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none" />
          </div>

          <div className="relative flex-1 md:w-56">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">class</span>
            <select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}
              aria-label="Select attendance batch" className="w-full min-h-11 pl-9 pr-8 py-2 bg-brand-50 dark:bg-brand-900/50 border border-brand-200 dark:border-brand-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none appearance-none cursor-pointer">
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
          </div>

          <button type="button" onClick={markAllPresent} disabled={roster.length === 0}
            className="min-h-11 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-sans text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 transition-all flex items-center gap-1 shrink-0 disabled:opacity-50">
            <span className="material-symbols-outlined text-[16px]">done_all</span><span>All Present</span>
          </button>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="premium-card text-center py-14">
          <span className="material-symbols-outlined text-4xl text-slate-400">calendar_add_on</span>
          <p className="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2">No batches yet</p>
          <p className="font-sans text-xs text-slate-500 mt-1">Create a batch first, then enroll students to take attendance.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Roll List ({roster.length})</h3>
            <span className="font-sans text-xs text-slate-500 font-medium">Toggle each student between Present and Absent</span>
          </div>

          <div className="premium-card overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <div className="p-6 text-xs text-slate-500">Loading roster…</div>}
              {!loading && roster.length === 0 && <div className="p-6 text-xs text-slate-500">No active students enrolled in this batch yet.</div>}
              {roster.map((entry) => {
                const currentStatus = attendance[entry.enrollmentId] || 'P';
                const initials = entry.studentName.split(' ').map((n) => n[0]).join('');

                return (
                  <div key={entry.enrollmentId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-heading font-bold text-sm shrink-0">{initials}</div>
                      <div className="font-sans text-sm font-bold text-slate-900 dark:text-white">{entry.studentName}</div>
                    </div>

                    <label className="inline-flex min-h-11 w-full sm:w-auto items-center justify-end gap-3 cursor-pointer">
                      <span className={`min-w-14 text-right font-sans text-xs font-bold transition-colors ${currentStatus === 'P' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                        {currentStatus === 'P' ? 'Present' : 'Absent'}
                      </span>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={`Mark ${entry.studentName} present`}
                        checked={currentStatus === 'P'}
                        onChange={(event) => setStatus(entry.enrollmentId, event.target.checked ? 'P' : 'A')}
                        className="sr-only peer"
                      />
                      <span className="relative h-7 w-12 shrink-0 rounded-full bg-rose-500 transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900" />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-gradient-to-br from-brand-400 via-brand-500 to-[#63c06a] text-white rounded-2xl p-6 shadow-lg shadow-brand-500/15 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <h3 className="font-heading text-lg font-bold opacity-90">Session Summary</h3>
            <div className="flex items-end gap-2">
              <span className="font-heading text-5xl font-extrabold leading-none tabular-nums">{presentCount}</span>
              <span className="font-heading text-lg font-bold opacity-70 mb-1 tabular-nums">/ {roster.length}</span>
            </div>
            <div className="flex items-center gap-2 font-sans text-xs font-bold bg-white/20 w-max px-3 py-1 rounded-full backdrop-blur-md">
              <span className="material-symbols-outlined text-[16px]">trending_up</span><span>{presentPct}% Present Today</span>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-1">
              <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold mb-0.5">Absent</div>
                <div className="font-heading text-xl font-extrabold text-rose-300 tabular-nums">{absentCount}</div>
              </div>
            </div>
            <button onClick={handleSubmitAttendance} disabled={roster.length === 0}
              className="w-full mt-2 bg-white text-brand-600 font-sans text-xs font-bold uppercase tracking-wider py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-xs active:scale-[0.98] disabled:opacity-50">
              Submit Attendance Log
            </button>
          </div>
        </div>
      </div>
      )}

      {batches.length === 0 && (
        <div className="text-center">
          <button type="button" onClick={onOpenAddStudent} className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold">Add student</button>
        </div>
      )}
    </div>
  );
};
