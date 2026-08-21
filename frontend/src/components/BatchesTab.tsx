import React, { useMemo, useState } from 'react';
import { Batch } from '../types';

interface BatchesTabProps {
  batches: Batch[];
  onOpenAddBatch: () => void;
}

export const BatchesTab: React.FC<BatchesTabProps> = ({ batches, onOpenAddBatch }) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');

  const courses = useMemo(() =>
    Array.from(new Set(batches.map((batch) => batch.course))).sort(), [batches]);

  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || batch.name.toLowerCase().includes(term)
      || batch.course.toLowerCase().includes(term)
      || batch.instructor.toLowerCase().includes(term)
      || batch.schedule.toLowerCase().includes(term);
    return matchesSearch && (courseFilter === 'All' || batch.course === courseFilter);
  }), [batches, search, courseFilter]);

  const totalStudents = batches.reduce((sum, batch) => sum + batch.enrolledCount, 0);
  const instructors = new Set(batches.map((batch) => batch.instructor)).size;

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-700 text-white p-6 md:p-8 shadow-xl shadow-brand-900/10">
        <div className="absolute -right-12 -top-16 w-64 h-64 rounded-full bg-brand-300/15 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[11px] font-semibold text-brand-100 mb-3">
              <span className="material-symbols-outlined text-[15px]">calendar_view_week</span>
              Class operations
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Batches & schedules</h2>
            <p className="text-xs md:text-sm text-brand-100/80 mt-2 max-w-xl">
              Organize courses, class timings, instructors, and student capacity from one place.
            </p>
          </div>
          <button type="button" onClick={onOpenAddBatch}
            className="btn-brand rounded-xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create batch
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BatchStat icon="calendar_view_week" label="Total batches" value={batches.length} color="brand" />
        <BatchStat icon="school" label="Students enrolled" value={totalStudents} color="blue" />
        <BatchStat icon="co_present" label="Instructors" value={instructors} color="violet" />
        <BatchStat icon="menu_book" label="Courses" value={courses.length} color="amber" />
      </section>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-brand-200/60 dark:border-brand-800 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">All batches</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {filteredBatches.length} of {batches.length} batches shown
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search batch, course, instructor…"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined text-[17px]">close</span>
                </button>}
              </div>
              <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-400">
                <option value="All">All courses</option>
                {courses.map((course) => <option key={course} value={course}>{course}</option>)}
              </select>
            </div>
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <div className="text-center py-14 px-5">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">{batches.length ? 'search_off' : 'calendar_add_on'}</span>
            </div>
            <h4 className="font-heading font-bold text-slate-900 dark:text-white mt-4">
              {batches.length ? 'No batches match your filters' : 'Create your first batch'}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {batches.length ? 'Try a different search or course.' : 'Add a course schedule and assign its lead instructor.'}
            </p>
            {!batches.length && <button type="button" onClick={onOpenAddBatch}
              className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold mt-4">Create batch</button>}
          </div>
        ) : (
          <div className="p-4 md:p-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBatches.map((batch) => <BatchCard key={batch.id} batch={batch} />)}
          </div>
        )}
      </section>
    </div>
  );
};

function BatchCard({ batch }: { batch: Batch; key?: React.Key }) {
  return (
    <article className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-lg hover:shadow-brand-500/5 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">calendar_view_week</span>
        </div>
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
        </span>
      </div>

      <div className="mt-4">
        <h4 className="font-heading font-extrabold text-base text-slate-900 dark:text-white leading-snug">{batch.name}</h4>
        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1">{batch.course}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        <BatchInfo icon="event" label="Schedule" value={batch.schedule} />
        <BatchInfo icon="person" label="Instructor" value={batch.instructor} />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="text-[11px] text-slate-500">Enrollment</div>
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-xs font-bold">
          <span className="material-symbols-outlined text-[16px]">groups</span>
          {batch.enrolledCount} student{batch.enrolledCount === 1 ? '' : 's'}
        </div>
      </div>
    </article>
  );
}

function BatchInfo({ icon, label, value }: { icon: string; label: string; value: string }) {
  return <div className="flex items-start gap-2.5">
    <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5">{icon}</span>
    <div className="min-w-0"><div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</div>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 break-words">{value}</div></div>
  </div>;
}

function BatchStat({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: 'brand' | 'blue' | 'violet' | 'amber';
}) {
  const colors = {
    brand: 'bg-brand-100 text-brand-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700'
  };
  return <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
    <div className={'w-9 h-9 rounded-xl flex items-center justify-center ' + colors[color]}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">{value}</div>
    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</div>
  </div>;
}
