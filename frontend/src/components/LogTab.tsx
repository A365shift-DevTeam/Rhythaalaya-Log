import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RescheduleClassModal } from './modals/RescheduleClassModal';
import { toast } from '../lib/toast';
import React, { useEffect, useMemo, useState } from 'react';
import { Student, Batch, AttendanceStatus } from '../types';
import { api } from '../api';
import {
  addDaysToIso, isBatchScheduledOn, matchesBatchPattern, nextSessionDate, sessionMovedOnto,
  todayIsoDate, weekdayLabelFor,
} from '../lib/schedule';

interface LogTabProps {
  students: Student[];
  batches: Batch[];
  token: string;
  onOpenAddStudent: () => void;
  isAdmin: boolean;
  onAddSessionOverride: (batchId: string, body: {
    originalDate: string; newDate: string | null; reason: string | null;
  }) => Promise<Batch>;
  onRemoveSessionOverride: (batchId: string, overrideId: string) => Promise<Batch>;
}

interface RosterEntry {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  /// false = the student was removed; the row is read-only history
  isActive: boolean;
  attendedDays: number;
  hasRecord: boolean;
  recordStatus: RollCallStatus;
}

type RollCallStatus = Extract<AttendanceStatus, 'P' | 'A'>;

export const LogTab: React.FC<LogTabProps> = ({
  batches, token, onOpenAddStudent, isAdmin, onAddSessionOverride, onRemoveSessionOverride,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayIsoDate());
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, RollCallStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'P' | 'A'>('ALL');

  // Reschedule-this-session controls (admin only).
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [undoBusy, setUndoBusy] = useState(false);

  // Only batches that actually hold a class on the selected date can be rolled.
  const scheduledBatches = useMemo(
    () => batches.filter((b) => isBatchScheduledOn(b, selectedDate)), [batches, selectedDate]);

  // Keep the selection inside that list: fall to the day's first class, or to nothing
  // at all on a day no batch runs, so the selector never shows a batch it cannot offer.
  useEffect(() => {
    const stillOffered = scheduledBatches.some((b) => b.id === selectedBatchId);
    if (stillOffered) return;
    setSelectedBatchId(scheduledBatches[0]?.id || '');
  }, [scheduledBatches, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) { setRoster([]); setAttendance({}); return; }
    setLoading(true);
    void api.attendance(token, selectedDate, selectedBatchId).then(result => {
      const nextRoster: RosterEntry[] = result.entries.map((entry: any) => ({
        enrollmentId: entry.enrollmentId, studentId: entry.studentId, studentName: entry.studentName,
        isActive: entry.studentIsActive ?? true, attendedDays: entry.attendedDays ?? 0,
        hasRecord: entry.hasRecord ?? true, recordStatus: entry.status === 'Present' ? 'P' as const : 'A' as const,
      }));
      const nextAttendance: Record<string, RollCallStatus> = {};
      result.entries.forEach((entry: any) => {
        if (entry.studentIsActive ?? true) nextAttendance[entry.enrollmentId] = entry.status === 'Present' ? 'P' : 'A';
      });
      setRoster(nextRoster);
      setAttendance(nextAttendance);
    }).catch(error => toast.error(error instanceof Error ? error.message : 'Unable to load attendance.'))
      .finally(() => setLoading(false));
  }, [token, selectedDate, selectedBatchId]);

  const setStatus = (enrollmentId: string, status: RollCallStatus) => {
    setAttendance((prev) => ({ ...prev, [enrollmentId]: status }));
  };

  // Removed students stay visible as faded history but take no part in the roll call.
  const activeRoster = useMemo(() => roster.filter((entry) => entry.isActive), [roster]);

  const markAllPresent = () => {
    const next: Record<string, RollCallStatus> = {};
    activeRoster.forEach((entry) => { next[entry.enrollmentId] = 'P'; });
    setAttendance(next);
    toast.success('Marked all students as Present!');
  };

  const markAllAbsent = () => {
    const next: Record<string, RollCallStatus> = {};
    activeRoster.forEach((entry) => { next[entry.enrollmentId] = 'A'; });
    setAttendance(next);
    toast.success('Marked all students as Absent.');
  };

  const presentCount = Object.values(attendance).filter((s) => s === 'P').length;
  const absentCount = Object.values(attendance).filter((s) => s === 'A').length;
  const presentPct = activeRoster.length ? Math.round((presentCount / activeRoster.length) * 100) : 0;

  const filteredRoster = useMemo(() => {
    return roster.filter((entry) => {
      const matchesSearch = !searchQuery.trim() || entry.studentName.toLowerCase().includes(searchQuery.trim().toLowerCase());
      if (!entry.isActive) return matchesSearch && filterStatus === 'ALL';
      const current = attendance[entry.enrollmentId] || 'P';
      const matchesFilter = filterStatus === 'ALL' || current === filterStatus;
      return matchesSearch && matchesFilter;
    })
      // removed students always sit below every active one (stable sort keeps names ordered)
      .sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }, [roster, searchQuery, filterStatus, attendance]);

  const todayIso = todayIsoDate();

  // When the selected class landed on this date via a reschedule, surface where it came from.
  const movedOnto = useMemo(() => {
    const batch = scheduledBatches.find((b) => b.id === selectedBatchId);
    return batch ? sessionMovedOnto(batch, selectedDate) : undefined;
  }, [scheduledBatches, selectedBatchId, selectedDate]);

  // Classes that would normally meet on this date but were postponed or cancelled — shown on the
  // otherwise-empty day so an admin who just rescheduled sees it took effect.
  const movedAway = useMemo(() =>
    batches
      .filter((b) => b.isActive && matchesBatchPattern(b, selectedDate))
      .map((b) => ({
        batch: b,
        override: (b.sessionOverrides ?? []).find((o) => o.originalDate.slice(0, 10) === selectedDate.slice(0, 10)),
      }))
      .filter((x): x is { batch: typeof x.batch; override: NonNullable<typeof x.override> } => Boolean(x.override)),
    [batches, selectedDate]);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId), [batches, selectedBatchId]);

  // A genuine recurring session for this batch on this date (not itself a transplant) — the only
  // thing it makes sense to move. Cancelled/postponed dates fall out of `scheduledBatches` first.
  const canReschedule = Boolean(
    isAdmin && selectedBatch && !movedOnto && matchesBatchPattern(selectedBatch, selectedDate));

  // Don't leave the dialog open over a session that changed out from under it.
  useEffect(() => { setRescheduleOpen(false); }, [selectedDate, selectedBatchId]);

  const handleReschedule = async ({ newDate, reason }: { newDate: string | null; reason: string | null }) => {
    if (!selectedBatch) return;
    await onAddSessionOverride(selectedBatch.id, { originalDate: selectedDate, newDate, reason });
    toast.success(newDate ? 'Class rescheduled.' : 'Class cancelled for this date.');
  };

  const handleUndoReschedule = async () => {
    if (!selectedBatch || !movedOnto || undoBusy) return;
    setUndoBusy(true);
    try {
      await onRemoveSessionOverride(selectedBatch.id, movedOnto.id);
      toast.success('Reschedule undone — the class is back on its original date.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not undo the reschedule.');
    } finally {
      setUndoBusy(false);
    }
  };

  // Soonest day any batch runs, used to get out of an empty day in one click.
  const nextClassDate = useMemo(() => {
    if (batches.length === 0) return null;
    const soonest = batches
      .map((b) => nextSessionDate(b, addDaysToIso(selectedDate, 1), 400))
      .filter((iso): iso is string => iso !== null)
      .sort();
    return soonest[0] || null;
  }, [batches, selectedDate]);

  // Step one calendar day; the batch selector re-homes itself to that day's classes.
  const handlePrevDay = () => setSelectedDate(addDaysToIso(selectedDate, -1));
  const handleNextDay = () => setSelectedDate(addDaysToIso(selectedDate, 1));

  const formatDisplayDate = (iso: string) => {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const isToday = iso === todayIso;
      const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
      const formatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return isToday ? `Today · ${dayName}, ${formatted}` : `${dayName}, ${formatted}`;
    } catch {
      return iso;
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatchId || activeRoster.length === 0 || saving) return;
    setSaving(true);
    const entries = activeRoster.map((entry) => ({ enrollmentId: entry.enrollmentId, status: attendance[entry.enrollmentId] || 'P' }));
    try {
      await api.submitAttendance(token, selectedDate, selectedBatchId, entries);
      toast.success('Attendance saved successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-12 relative">

      {/* Top Header Card */}
      <div className="premium-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-[#212121] dark:text-white tracking-tight">
              Attendance Log
            </h2>
            <p className="font-sans text-xs md:text-sm text-[#808080] dark:text-[#94a3b8] mt-0.5">
              Record daily student attendance and track trends
            </p>
          </div>
        </div>

        {/* Responsive Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 pt-1 border-t border-[#dbdbdb]/60 dark:border-[#243244]">
          {/* Enhanced Large Date Selector */}
          <div className="flex items-center gap-1 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl p-1 flex-1 lg:max-w-xs shadow-xs">
            <Button
              type="button"
              onClick={handlePrevDay}
              aria-label="Previous day"
              title="Previous day"
              className="h-9 w-9 flex items-center justify-center rounded-xl text-[#808080] hover:text-[#3fc073] hover:bg-white dark:hover:bg-[#172435] transition-colors shrink-0 active:scale-95"
            >
              <JisIcon className="text-[22px]">chevron_left</JisIcon>
            </Button>

            <label className="relative flex-1 flex items-center justify-center gap-2 px-2 py-1.5 cursor-pointer min-h-9 select-none rounded-xl hover:bg-white/80 dark:hover:bg-[#172435]/80 transition-colors">
              <JisIcon className="text-[#3fc073] text-[22px] shrink-0">
                calendar_month
              </JisIcon>
              <span className="font-heading font-bold text-xs sm:text-sm text-[#212121] dark:text-white truncate">
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

            <Button
              type="button"
              onClick={handleNextDay}
              aria-label="Next day"
              title="Next day"
              className="h-9 w-9 flex items-center justify-center rounded-xl text-[#808080] hover:text-[#3fc073] hover:bg-white dark:hover:bg-[#172435] transition-colors shrink-0 active:scale-95"
            >
              <JisIcon className="text-[22px]">chevron_right</JisIcon>
            </Button>

            {selectedDate !== todayIso && (
              <Button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className="px-2.5 py-1 text-xs font-bold text-[#35a160] dark:text-[#b3e6c7] bg-[#e9f7ee] dark:bg-[#3fc073]/20 hover:bg-[#cbecd8] rounded-xl transition-colors shrink-0 active:scale-95"
                title="Jump to today"
              >
                Today
              </Button>
            )}
          </div>

          {/* Batch Selector */}
          <div className="relative flex-1 lg:max-w-xs">
            <JisIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] text-[20px] pointer-events-none">
              groups
            </JisIcon>
            <Select
              value={selectedBatchId}
              onValueChange={setSelectedBatchId}
              disabled={scheduledBatches.length === 0}
            >
              <SelectTrigger
                aria-label="Select attendance batch"
                className="w-full pl-10 py-2 dark:bg-[#0b1422] text-xs sm:text-sm font-bold focus:ring-4 focus:ring-[#3fc073]/15 truncate transition-all"
              >
                <SelectValue placeholder={`No class on ${weekdayLabelFor(selectedDate)}`} />
              </SelectTrigger>
              <SelectContent>
                {scheduledBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.enrolledCount} enrolled)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:col-span-2 lg:col-auto">
            <Button
              type="button"
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="flex-1 lg:flex-initial min-h-11 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] hover:bg-emerald-100 font-sans text-xs font-bold rounded-2xl border border-emerald-200/70 dark:border-emerald-900/50 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
            >
              <JisIcon className="text-[16px]">done_all</JisIcon>
              <span>All Present</span>
            </Button>
            <Button
              type="button"
              onClick={markAllAbsent}
              disabled={roster.length === 0}
              className="flex-1 lg:flex-initial min-h-11 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 text-[#ef4444] hover:bg-rose-100 font-sans text-xs font-bold rounded-2xl border border-rose-200/70 dark:border-rose-900/50 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
            >
              <JisIcon className="text-[16px]">close</JisIcon>
              <span>All Absent</span>
            </Button>
            {canReschedule && (
              <Button
                type="button"
                onClick={() => setRescheduleOpen(true)}
                className="flex-1 lg:flex-initial min-h-11 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/50 text-[#b45309] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/70 font-sans text-xs font-bold rounded-2xl border border-amber-200/70 dark:border-amber-900/50 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
              >
                <JisIcon className="text-[16px]">event_repeat</JisIcon>
                <span>Reschedule</span>
              </Button>
            )}
          </div>
        </div>

        {movedOnto && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-semibold text-[#b45309] dark:text-amber-300">
            <JisIcon className="text-[16px] shrink-0">event_repeat</JisIcon>
            <span className="flex-1 min-w-0">
              Rescheduled from {formatDisplayDate(movedOnto.originalDate)}
              {movedOnto.reason ? ` — ${movedOnto.reason}` : ''}
            </span>
            {isAdmin && (
              <Button
                type="button"
                onClick={handleUndoReschedule}
                disabled={undoBusy}
                className="shrink-0 rounded-xl bg-white dark:bg-[#0b1422] px-2.5 py-1 text-xs font-bold text-[#b45309] dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors disabled:opacity-50"
              >
                {undoBusy ? 'Undoing…' : 'Undo'}
              </Button>
            )}
          </div>
        )}

      </div>

      {batches.length === 0 ? (
        <div className="premium-card text-center py-12 px-4">
          <JisIcon className="text-4xl text-[#9e9e9e]">calendar_add_on</JisIcon>
          <p className="font-heading text-lg font-bold text-[#212121] dark:text-white mt-2">No batches yet</p>
          <p className="font-sans text-xs text-[#808080] mt-1 max-w-sm mx-auto">Create a batch first, then enroll students to take attendance.</p>
          <Button type="button" onClick={onOpenAddStudent} className="btn-brand mt-4 rounded-2xl px-4 py-2.5 text-xs font-bold">
            Add student
          </Button>
        </div>
      ) : scheduledBatches.length === 0 ? (
        <div className="premium-card text-center py-12 px-4">
          <JisIcon className="text-4xl text-[#9e9e9e]">{movedAway.length ? 'event_repeat' : 'event_busy'}</JisIcon>
          <p className="font-heading text-lg font-bold text-[#212121] dark:text-white mt-2">
            No class on {weekdayLabelFor(selectedDate)}
          </p>
          <p className="font-sans text-xs text-[#808080] mt-1 max-w-sm mx-auto">
            None of your batches meet on {formatDisplayDate(selectedDate)}. Pick a day a class runs to take the roll.
          </p>

          {movedAway.length > 0 && (
            <div className="mx-auto mt-4 max-w-sm space-y-2 text-left">
              {movedAway.map(({ batch, override }) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-1.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[#b45309] dark:text-amber-300">
                    <JisIcon className="text-[16px] shrink-0">event_repeat</JisIcon>
                    <span className="truncate">{batch.name}</span>
                  </div>
                  <p className="font-sans text-xs text-[#92400e] dark:text-amber-200/80">
                    {override.newDate
                      ? `Moved to ${formatDisplayDate(override.newDate)}`
                      : 'Cancelled — no class this day'}
                    {override.reason ? ` · ${override.reason}` : ''}
                  </p>
                  {override.newDate && (
                    <Button
                      type="button"
                      onClick={() => setSelectedDate(override.newDate!)}
                      className="mt-0.5 self-start rounded-xl bg-white dark:bg-[#0b1422] px-3 py-1.5 text-xs font-bold text-[#b45309] dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors active:scale-95"
                    >
                      Go to {formatDisplayDate(override.newDate)}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {nextClassDate && (
            <Button
              type="button"
              onClick={() => setSelectedDate(nextClassDate)}
              className="btn-brand mt-4 rounded-2xl px-4 py-2.5 text-xs font-bold"
            >
              Go to {formatDisplayDate(nextClassDate)}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Quick Stats Summary */}
          <div className="lg:hidden grid grid-cols-3 gap-2 sm:gap-3">
            <Button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'P' ? 'ALL' : 'P')}
              className={`rounded-2xl p-3 sm:p-4 text-center transition-all border ${
                filterStatus === 'P'
                  ? 'bg-[#22c55e] text-white border-[#22c55e] shadow-md ring-2 ring-[#22c55e]/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-800/40 text-[#22c55e] dark:text-emerald-300'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Present</div>
              <div className="font-heading text-xl sm:text-2xl font-bold tabular-nums mt-0.5">{presentCount}</div>
            </Button>

            <Button
              type="button"
              onClick={() => setFilterStatus(filterStatus === 'A' ? 'ALL' : 'A')}
              className={`rounded-2xl p-3 sm:p-4 text-center transition-all border ${
                filterStatus === 'A'
                  ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-md ring-2 ring-[#ef4444]/30'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/70 dark:border-rose-800/40 text-[#ef4444] dark:text-rose-300'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Absent</div>
              <div className="font-heading text-xl sm:text-2xl font-bold tabular-nums mt-0.5">{absentCount}</div>
            </Button>

            <div className="bg-[#e9f7ee] dark:bg-[#3fc073]/20 border border-[#cbecd8] dark:border-[#3fc073]/30 rounded-2xl p-3 sm:p-4 text-center text-[#35a160] dark:text-[#b3e6c7] flex flex-col justify-center">
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Rate</div>
              <div className="font-heading text-xl sm:text-2xl font-bold tabular-nums mt-0.5">{presentPct}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Student List Section */}
            <div className="lg:col-span-2 space-y-3">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">
                    Attendance List
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0f0f0] dark:bg-[#111c2b] text-[#6b6b6b] dark:text-[#cbd5e1]">
                    {activeRoster.length}
                  </span>
                </div>

                {roster.length > 4 && (
                  <div className="relative flex-1 sm:max-w-xs">
                    <JisIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e] text-[16px] pointer-events-none">
                      search
                    </JisIcon>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student…"
                      className="w-full min-h-10 pl-8 pr-3 py-1.5 bg-[#f0f0f0] dark:bg-[#0b1422] border border-[#dbdbdb] dark:border-[#243244] rounded-2xl text-xs font-medium text-[#212121] dark:text-white outline-none focus:border-[#3fc073]"
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#212121] text-xs font-bold"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Roster Cards List */}
              <div className="premium-card overflow-hidden">
                <div className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244]">
                  {loading && (
                    <div className="p-8 text-center text-xs font-semibold text-[#808080] dark:text-[#94a3b8] flex items-center justify-center gap-2">
                      <JisIcon className="animate-spin text-[18px] text-[#3fc073]">progress_activity</JisIcon>
                      <span>Loading attendance roster…</span>
                    </div>
                  )}

                  {!loading && roster.length === 0 && (
                    <div className="p-8 text-center text-xs text-[#808080] dark:text-[#94a3b8]">
                      No active students enrolled in this batch yet.
                    </div>
                  )}

                  {!loading && roster.length > 0 && filteredRoster.length === 0 && (
                    <div className="p-8 text-center text-xs text-[#808080] dark:text-[#94a3b8]">
                      No students match the selected filter.
                    </div>
                  )}

                  {!loading && filteredRoster.map((entry) => {
                    const currentStatus = attendance[entry.enrollmentId] || 'P';
                    const isPresent = currentStatus === 'P';
                    const initials = entry.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                    // Removed student: faded, read-only history row — shows their track record
                    // (days attended) and this date's saved status, with no toggle.
                    if (!entry.isActive) {
                      return (
                        <div key={entry.enrollmentId} className="p-3 sm:p-4 flex items-center justify-between gap-3 opacity-50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-[#9e9e9e] text-white flex items-center justify-center font-heading font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="font-sans text-sm font-bold text-[#212121] dark:text-white truncate">
                                {entry.studentName}
                              </div>
                              <div className="text-xs font-semibold text-[#808080] dark:text-[#94a3b8]">
                                Removed · attended {entry.attendedDays} {entry.attendedDays === 1 ? 'day' : 'days'}
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 font-sans text-xs font-bold text-[#808080]">
                            {entry.hasRecord ? (entry.recordStatus === 'P' ? 'Present' : 'Absent') : '—'}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={entry.enrollmentId}
                        className={`p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                          isPresent
                            ? 'hover:bg-[#f0f0f0]/60 dark:hover:bg-[#172435]/40'
                            : 'bg-rose-50/25 dark:bg-rose-950/20 hover:bg-rose-50/40 dark:hover:bg-rose-950/30'
                        }`}
                      >
                        {/* Student Details */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center font-heading font-bold text-xs shrink-0 shadow-xs transition-colors ${
                              isPresent ? 'bg-gradient-to-b from-[#3fc073] to-[#35a160]' : 'bg-[#ef4444]'
                            }`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-sans text-sm font-bold text-[#212121] dark:text-white truncate">
                              {entry.studentName}
                            </div>
                            <div className="text-xs font-semibold text-[#9e9e9e] sm:hidden">
                              {isPresent ? (
                                <span className="text-[#22c55e] font-bold">Present</span>
                              ) : (
                                <span className="text-[#ef4444] font-bold">Absent</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Attendance Toggle Control */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`hidden sm:inline-block min-w-16 text-right font-sans text-xs font-bold transition-colors ${
                              isPresent ? 'text-[#22c55e]' : 'text-[#ef4444]'
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
                            <span className="relative h-7 w-12 shrink-0 rounded-full bg-[#ef4444] transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-[#22c55e] peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-[#3fc073]/20" />
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
              <div className="bg-gradient-to-br from-[#3fc073] via-[#35a160] to-[#2b824e] text-white rounded-3xl p-6 shadow-xl shadow-[#3fc073]/20 flex flex-col gap-4 relative overflow-hidden sticky top-6">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <h3 className="font-heading text-lg font-bold opacity-90">Session Summary</h3>
                <div className="flex items-end gap-2">
                  <span className="font-heading text-5xl font-bold leading-none tabular-nums">{presentCount}</span>
                  <span className="font-heading text-lg font-bold opacity-70 mb-1 tabular-nums">/ {activeRoster.length}</span>
                </div>
                <div className="flex items-center gap-2 font-sans text-xs font-bold bg-white/20 w-max px-3 py-1 rounded-full backdrop-blur-md">
                  <JisIcon className="text-[16px]">trending_up</JisIcon>
                  <span>{presentPct}% Present Today</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="bg-black/20 rounded-2xl p-3 border border-white/10">
                    <div className="text-xs uppercase tracking-wider opacity-70 font-bold mb-0.5">Present</div>
                    <div className="font-heading text-xl font-bold text-emerald-200 tabular-nums">{presentCount}</div>
                  </div>
                  <div className="bg-black/20 rounded-2xl p-3 border border-white/10">
                    <div className="text-xs uppercase tracking-wider opacity-70 font-bold mb-0.5">Absent</div>
                    <div className="font-heading text-xl font-bold text-rose-200 tabular-nums">{absentCount}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={roster.length === 0 || saving}
                  className="w-full mt-2 bg-white text-[#35a160] font-sans text-xs font-bold uppercase tracking-wider py-3.5 rounded-2xl hover:bg-[#f4fbf7] transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <JisIcon className="text-[18px]">{saving ? 'progress_activity' : 'cloud_upload'}</JisIcon>
                  <span>{saving ? 'Saving…' : 'Submit Attendance Log'}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Mobile Bottom Sticky Action Bar */}
          {roster.length > 0 && (
            <div className="lg:hidden fixed bottom-16 sm:bottom-20 left-3 right-3 z-50 animate-fadeIn">
              <div className="bg-[#212121]/95 text-white backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-[#333333] flex items-center justify-between gap-3">
                <div className="min-w-0 pl-1">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="text-[#22c55e]">{presentCount} Present</span>
                    <span className="text-[#808080]">·</span>
                    <span className="text-[#ef4444]">{absentCount} Absent</span>
                  </div>
                  <div className="text-xs text-[#9e9e9e] truncate mt-0.5">
                    {presentPct}% present in {batches.find(b => b.id === selectedBatchId)?.name || 'batch'}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={saving}
                  className="btn-brand min-h-11 px-4 py-2 rounded-2xl text-xs font-bold shrink-0 shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <JisIcon className="text-[18px]">{saving ? 'progress_activity' : 'check_circle'}</JisIcon>
                  <span>{saving ? 'Saving…' : 'Submit'}</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedBatch && (
        <RescheduleClassModal
          isOpen={rescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
          batchName={selectedBatch.name}
          sessionLabel={formatDisplayDate(selectedDate).replace(/^Today · /, '')}
          onSubmit={handleReschedule}
        />
      )}
    </div>
  );
};
