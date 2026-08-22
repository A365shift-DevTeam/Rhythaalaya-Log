import React, { useEffect, useMemo, useState } from 'react';
import { Batch, AttendanceStatus, WEEKDAY_LABELS, WEEKDAY_SHORT } from '../types';
import { api } from '../api';

interface LogTabProps {
  batches: Batch[];
  token: string;
  onOpenAddStudent: () => void;
}

interface RosterEntry {
  enrollmentId: string;
  studentId: string;
  studentName: string;
}

const MARKS: { key: AttendanceStatus; letter: string; word: string; className: string }[] = [
  { key: 'P', letter: 'P', word: 'Present', className: 'beat-on' },
  { key: 'A', letter: 'A', word: 'Absent', className: 'beat-miss' },
  { key: 'L', letter: 'L', word: 'Leave', className: 'beat-leave' }
];

export const LogTab: React.FC<LogTabProps> = ({ batches, token, onOpenAddStudent }) => {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatusMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    if (!selectedBatchId && batches[0]) setSelectedBatchId(batches[0].id);
  }, [batches, selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) { setRoster([]); setAttendance({}); setSaved({}); return; }
    setLoading(true);
    setStatusMessage(null);
    void api.attendance(token, selectedDate, selectedBatchId)
      .then((result) => {
        const nextRoster: RosterEntry[] = result.entries.map((entry: any) => ({
          enrollmentId: entry.enrollmentId,
          studentId: entry.studentId,
          studentName: entry.studentName
        }));
        const marks: Record<string, AttendanceStatus> = {};
        result.entries.forEach((entry: any) => {
          marks[entry.enrollmentId] = entry.status === 'Present' ? 'P' : entry.status === 'Absent' ? 'A' : 'L';
        });
        setRoster(nextRoster);
        setAttendance(marks);
        setSaved(marks);
      })
      .catch((error) => setStatusMessage({
        tone: 'bad',
        text: error instanceof Error ? error.message : 'The roster could not be loaded.'
      }))
      .finally(() => setLoading(false));
  }, [token, selectedDate, selectedBatchId]);

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  const meetsToday = selectedBatch
    ? selectedBatch.days.includes(WEEKDAY_LABELS[new Date(selectedDate + 'T00:00:00').getDay()])
    : true;

  const dirty = useMemo(
    () => roster.some((entry) => attendance[entry.enrollmentId] !== saved[entry.enrollmentId]),
    [roster, attendance, saved]
  );

  const counts = useMemo(() => {
    const values = roster.map((entry) => attendance[entry.enrollmentId] || 'P');
    return {
      present: values.filter((value) => value === 'P').length,
      absent: values.filter((value) => value === 'A').length,
      leave: values.filter((value) => value === 'L').length
    };
  }, [roster, attendance]);

  const setMark = (enrollmentId: string, mark: AttendanceStatus) => {
    setAttendance((previous) => ({ ...previous, [enrollmentId]: mark }));
    setStatusMessage(null);
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    roster.forEach((entry) => { next[entry.enrollmentId] = 'P'; });
    setAttendance(next);
    setStatusMessage(null);
  };

  const save = async () => {
    if (!selectedBatchId || roster.length === 0) return;
    setSaving(true);
    const entries = roster.map((entry) => ({
      enrollmentId: entry.enrollmentId,
      status: attendance[entry.enrollmentId] || 'P'
    }));
    try {
      await api.submitAttendance(token, selectedDate, selectedBatchId, entries);
      setSaved({ ...attendance });
      setStatusMessage({ tone: 'ok', text: 'Attendance saved.' });
    } catch (error) {
      setStatusMessage({
        tone: 'bad',
        text: error instanceof Error ? error.message : 'Attendance could not be saved.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (batches.length === 0) {
    return (
      <div className="space-y-5 pb-8">
        <h1 className="display-lg">Attendance</h1>
        <div className="empty">
          <span className="material-symbols-outlined text-[28px] text-ink-3" aria-hidden="true">event_note</span>
          <p className="text-[13px] font-semibold text-ink">No batches to take attendance for</p>
          <p className="label max-w-72">Create a batch and enrol students, then the roll appears here.</p>
          <button type="button" onClick={onOpenAddStudent} className="btn btn-secondary btn-sm mt-1">
            Add student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <header className="mb-4">
        <h1 className="display-lg">Attendance</h1>
        <p className="label mt-1">Mark the roll for one batch on one day.</p>
      </header>

      {/* Toolbar: which day, which batch, and the batch weekday cycle so it is
          obvious when you are marking a day the batch does not meet. */}
      <div className="card mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-end md:p-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="roll-date" className="label mb-1.5 block font-semibold text-ink">Date</label>
          <input
            id="roll-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="field num"
          />
        </div>

        <div className="min-w-0 flex-[1.5]">
          <label htmlFor="roll-batch" className="label mb-1.5 block font-semibold text-ink">Batch</label>
          <div className="relative">
            <select
              id="roll-batch"
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="field"
            >
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          </div>
        </div>

        {selectedBatch && (
          <div className="min-w-0">
            <span className="label mb-1.5 block font-semibold text-ink">Meets on</span>
            <WeekCycle days={selectedBatch.days} />
          </div>
        )}
      </div>

      {!meetsToday && selectedBatch && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-ctl border border-brass-line bg-brass-tint px-3 py-2.5 text-[13px] text-brass">
          <span className="material-symbols-outlined mt-px shrink-0 text-[18px]" aria-hidden="true">info</span>
          {selectedBatch.name} does not normally meet on this day. You can still record the roll.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section className="card overflow-hidden" aria-label="Roll">
          <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 md:px-4">
            <h2 className="title">
              Roll <span className="num text-[15px] font-medium text-ink-3">({roster.length})</span>
            </h2>
            {/* The three marks are a fixed cycle, so they get a fixed header. */}
            <div className="flex gap-1.5" aria-hidden="true">
              {MARKS.map((mark) => (
                <span key={mark.key} className="label-xs w-9 text-center" title={mark.word}>
                  {mark.letter}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="label p-4">Loading the roll…</p>
          ) : roster.length === 0 ? (
            <div className="p-3">
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">Nobody is enrolled in this batch</p>
                <p className="label max-w-72">Enrol a student in this batch and they show up on the roll.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line-2">
              {roster.map((entry) => {
                const current = attendance[entry.enrollmentId] || 'P';
                return (
                  <li key={entry.enrollmentId} className="flex items-center gap-3 px-3 py-2 md:px-4">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                      {entry.studentName}
                    </span>
                    <div
                      className="flex shrink-0 gap-1.5"
                      role="group"
                      aria-label={`Attendance for ${entry.studentName}`}
                    >
                      {MARKS.map((mark) => {
                        const on = current === mark.key;
                        return (
                          <button
                            key={mark.key}
                            type="button"
                            onClick={() => setMark(entry.enrollmentId, mark.key)}
                            aria-pressed={on}
                            aria-label={`${mark.word} — ${entry.studentName}`}
                            className={`beat h-9 w-9 text-[13px] transition-colors ${on ? mark.className : 'hover:border-ink-3'}`}
                          >
                            {mark.letter}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Desktop: the tally sticks alongside the roll.
            Mobile: it becomes a bar pinned above the navigation. */}
        <aside className="hidden lg:block">
          <div className="card sticky top-6 p-4">
            <h2 className="title">Tally</h2>
            <p className="num-lg mt-2">
              {counts.present}
              <span className="num text-[15px] font-medium text-ink-3"> / {roster.length}</span>
            </p>
            <p className="label-xs">present</p>

            <dl className="mt-3 space-y-1.5">
              <TallyRow label="Absent" value={counts.absent} className="text-kumkum" />
              <TallyRow label="On leave" value={counts.leave} className="text-ink-2" />
            </dl>

            <button
              type="button"
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="btn btn-secondary btn-sm mt-4 w-full"
            >
              Mark everyone present
            </button>
            <button
              type="button"
              onClick={save}
              disabled={roster.length === 0 || saving || !dirty}
              className="btn btn-primary mt-2 w-full"
            >
              {saving ? 'Saving…' : dirty ? 'Save attendance' : 'Saved'}
            </button>

            {status && (
              <p
                role="status"
                className={`mt-2.5 text-[12px] font-medium ${status.tone === 'ok' ? 'text-leaf-strong' : 'text-kumkum'}`}
              >
                {status.text}
              </p>
            )}
          </div>
        </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-3 pt-2.5 lg:hidden"
        style={{ paddingBottom: 'calc(4.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2.5">
          <p className="min-w-0 flex-1">
            <span className="num text-[15px] font-semibold text-ink">{counts.present}/{roster.length}</span>
            <span className="label-xs ml-1.5">present</span>
            {status && (
              <span
                role="status"
                className={`ml-2 text-[12px] font-medium ${status.tone === 'ok' ? 'text-leaf-strong' : 'text-kumkum'}`}
              >
                {status.text}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={markAllPresent}
            disabled={roster.length === 0}
            className="btn btn-secondary btn-sm shrink-0"
          >
            All present
          </button>
          <button
            type="button"
            onClick={save}
            disabled={roster.length === 0 || saving || !dirty}
            className="btn btn-primary btn-sm shrink-0"
          >
            {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Keeps the last roll row clear of the pinned save bar. */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  );
};

function TallyRow({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="label">{label}</dt>
      <dd className={`num text-[13px] font-semibold ${className}`}>{value}</dd>
    </div>
  );
}

/* The seven-day week is a cycle, so it is drawn as one: seven fixed slots,
   filled on the days the batch meets. */
export function WeekCycle({ days }: { days: string[] }) {
  return (
    <div className="flex gap-1" role="img" aria-label={`Meets on ${days.join(', ') || 'no days'}`}>
      {WEEKDAY_SHORT.map((short, index) => {
        const on = days.includes(WEEKDAY_LABELS[index]);
        return (
          <span key={short} className={`beat ${on ? 'beat-on' : ''}`} aria-hidden="true">
            {short.charAt(0)}
          </span>
        );
      })}
    </div>
  );
}
