import React, { useMemo, useState } from 'react';
import { Batch, Course, Staff, WEEKDAY_SHORT } from '../types';

interface BatchesTabProps {
  batches: Batch[];
  courses: Course[];
  staff: Staff[];
  canManage: boolean;
  onOpenAddBatch: () => void;
  onEditBatch: (batch: Batch) => void;
  onOpenAddCourse: () => void;
  onEditCourse: (course: Course) => void;
  onOpenAddStaff: () => void;
  onEditStaff: (member: Staff) => void;
}

const formatTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};
const formatDays = (days: string[]) => days.map((d) => WEEKDAY_SHORT[['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(d)]).join(', ');

export const BatchesTab: React.FC<BatchesTabProps> = ({
  batches, courses, staff, canManage, onOpenAddBatch, onEditBatch, onOpenAddCourse, onEditCourse, onOpenAddStaff, onEditStaff
}) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');

  const filteredBatches = useMemo(() => batches.filter((batch) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || batch.name.toLowerCase().includes(term)
      || batch.courseName.toLowerCase().includes(term)
      || batch.staffName.toLowerCase().includes(term);
    return matchesSearch && (courseFilter === 'All' || batch.courseName === courseFilter);
  }), [batches, search, courseFilter]);

  const totalStudents = batches.reduce((sum, batch) => sum + batch.enrolledCount, 0);

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
            <h2 className="font-heading text-2xl md:text-3xl font-extrabold">Courses, staff & batches</h2>
            <p className="text-xs md:text-sm text-brand-100/80 mt-2 max-w-xl">
              Set up courses and mentors, then schedule batches with their days, timing, and enrollment window.
            </p>
          </div>
          {canManage && <button type="button" onClick={onOpenAddBatch}
            className="btn-brand rounded-xl px-5 py-3 text-sm font-bold flex items-center justify-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Create batch
          </button>}
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BatchStat icon="calendar_view_week" label="Total batches" value={batches.length} color="brand" />
        <BatchStat icon="school" label="Students enrolled" value={totalStudents} color="blue" />
        <BatchStat icon="co_present" label="Staff / mentors" value={staff.length} color="violet" />
        <BatchStat icon="menu_book" label="Courses" value={courses.length} color="amber" />
      </section>

      {/* Courses & Staff side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="premium-card rounded-3xl overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">Courses</h3>
            {canManage && <button type="button" onClick={onOpenAddCourse} className="min-h-10 rounded-xl px-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>New course
            </button>}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {courses.length === 0 && <p className="p-5 text-xs text-slate-500">No courses yet. {canManage ? 'Create one to start scheduling batches.' : 'Ask your admin to add one.'}</p>}
            {courses.map((course) => (
              <button key={course.id} type="button" onClick={() => canManage && onEditCourse(course)} disabled={!canManage}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:cursor-default disabled:hover:bg-transparent">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{course.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{course.description || 'No description'}</div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${course.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  {course.batchCount} batch{course.batchCount === 1 ? '' : 'es'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="premium-card rounded-3xl overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-heading text-lg font-extrabold text-slate-900 dark:text-white">Staff & mentors</h3>
            {canManage && <button type="button" onClick={onOpenAddStaff} className="min-h-10 rounded-xl px-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/50 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">add</span>New staff
            </button>}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {staff.length === 0 && <p className="p-5 text-xs text-slate-500">No staff yet. {canManage ? 'Add a mentor to assign to batches.' : 'Ask your admin to add one.'}</p>}
            {staff.map((member) => (
              <button key={member.id} type="button" onClick={() => canManage && onEditStaff(member)} disabled={!canManage}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 disabled:cursor-default disabled:hover:bg-transparent">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{member.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{member.phone || member.email || 'No contact on file'}</div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${member.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  {member.batchCount} batch{member.batchCount === 1 ? '' : 'es'}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="premium-card rounded-3xl overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-xl font-extrabold text-slate-900 dark:text-white">All batches</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{filteredBatches.length} of {batches.length} batches shown</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search batch, course, staff…"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-9 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined text-[17px]">close</span>
                </button>}
              </div>
              <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-400">
                <option value="All">All courses</option>
                {courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}
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
              {batches.length ? 'Try a different search or course.' : canManage ? 'Add a course and a staff member, then schedule a batch.' : 'Ask your admin to schedule one.'}
            </p>
            {!batches.length && canManage && <button type="button" onClick={onOpenAddBatch} className="btn-brand rounded-xl px-4 py-2.5 text-xs font-bold mt-4">Create batch</button>}
          </div>
        ) : (
          <div className="p-4 md:p-6 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBatches.map((batch) => <BatchCard key={batch.id} batch={batch} canManage={canManage} onEdit={onEditBatch} />)}
          </div>
        )}
      </section>
    </div>
  );
};

function BatchCard({ batch, canManage, onEdit }: { batch: Batch; canManage: boolean; onEdit: (batch: Batch) => void; key?: React.Key }) {
  return (
    <article className="premium-card-interactive group p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[22px]">calendar_view_week</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1.5 ${batch.isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${batch.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />{batch.isActive ? 'Active' : 'Inactive'}
          </span>
          {canManage && <button type="button" onClick={() => onEdit(batch)} aria-label={`Edit ${batch.name}`}
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-heading font-extrabold text-base text-slate-900 dark:text-white leading-snug">{batch.name}</h4>
        <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1">{batch.courseName}</p>
      </div>

      <div className="mt-4 space-y-2.5">
        <BatchInfo icon="event" label="Schedule" value={`${formatDays(batch.days)} · ${formatTime(batch.startTime)} – ${formatTime(batch.endTime)}`} />
        <BatchInfo icon="person" label="Staff / mentor" value={batch.staffName} />
        <BatchInfo icon="date_range" label="Runs" value={`${new Date(batch.startDate).toLocaleDateString('en-IN')}${batch.endDate ? ' – ' + new Date(batch.endDate).toLocaleDateString('en-IN') : ' onward'}`} />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="text-[11px] text-slate-500">Enrollment</div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-1 text-xs font-bold">
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
  return <div className="premium-card p-4">
    <div className={'w-9 h-9 rounded-xl flex items-center justify-center ' + colors[color]}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <div className="text-2xl font-black text-slate-900 dark:text-white mt-3">{value}</div>
    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{label}</div>
  </div>;
}
