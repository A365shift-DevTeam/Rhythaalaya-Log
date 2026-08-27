import { Button } from './ui/button';
import { JisIcon } from './JisIcon';
import { MobileSpeedDial } from './MobileSpeedDial';
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
  onRestoreCourse: (course: Course) => Promise<void>;
  onRestoreBatch: (batch: Batch) => Promise<void>;
}

const formatTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};
const formatDays = (days: string[]) =>
  days.map((d) => WEEKDAY_SHORT[['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(d)]).join(', ');

export const BatchesTab: React.FC<BatchesTabProps> = ({
  batches,
  courses,
  staff,
  canManage,
  onOpenAddBatch,
  onEditBatch,
  onOpenAddCourse,
  onEditCourse,
  onOpenAddStaff,
  onEditStaff,
  onRestoreCourse,
  onRestoreBatch,
}) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Archived courses and batches live only in the Archive section below, never in the main lists.
  const activeCourses = useMemo(() => courses.filter((c) => c.isActive), [courses]);
  const archivedCourses = useMemo(() => courses.filter((c) => !c.isActive), [courses]);
  const activeBatches = useMemo(() => batches.filter((b) => b.isActive), [batches]);
  const archivedBatches = useMemo(() => batches.filter((b) => !b.isActive), [batches]);
  const archivedCount = archivedCourses.length + archivedBatches.length;

  const filteredBatches = useMemo(
    () =>
      activeBatches.filter((batch) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          batch.name.toLowerCase().includes(term) ||
          batch.courseName.toLowerCase().includes(term) ||
          batch.staffName.toLowerCase().includes(term);
        return matchesSearch && (courseFilter === 'All' || batch.courseName === courseFilter);
      }),
    [activeBatches, search, courseFilter]
  );

  const totalStudents = activeBatches.reduce((sum, batch) => sum + batch.enrolledCount, 0);

  const handleRestore = async (id: string, restore: () => Promise<void>) => {
    setRestoringId(id);
    try {
      await restore();
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-12">
      {/* KPI Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <BatchStat icon="calendar_view_week" label="Total batches" value={activeBatches.length} color="blue" />
        <BatchStat icon="school" label="Students enrolled" value={totalStudents} color="indigo" />
        <BatchStat icon="co_present" label="Staff / mentors" value={staff.length} color="violet" />
        <BatchStat icon="menu_book" label="Courses" value={activeCourses.length} color="amber" />
      </section>

      {/* Courses & Staff side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Courses Section */}
        <section className="premium-card rounded-3xl overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#dbdbdb]/60 dark:border-[#243244]">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">Courses</h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8]">{activeCourses.length} active programs</p>
            </div>
            {canManage && (
              <Button
                type="button"
                onClick={onOpenAddCourse}
                className="btn-brand min-h-10 rounded-2xl px-3.5 text-xs font-semibold hidden md:flex items-center gap-1 active:scale-95"
              >
                <JisIcon className="text-[16px]">add</JisIcon>
                <span>Add course</span>
              </Button>
            )}
          </div>
          <div className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244] max-h-72 overflow-y-auto">
            {activeCourses.length === 0 && (
              <p className="p-5 text-xs text-[#808080]">
                No courses yet. {canManage ? 'Create one to start scheduling batches.' : 'Ask your admin to add one.'}
              </p>
            )}
            {activeCourses.map((course) => (
              <Button
                key={course.id}
                type="button"
                onClick={() => canManage && onEditCourse(course)}
                disabled={!canManage}
                className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left hover:bg-[#f0f0f0]/70 dark:hover:bg-[#172435]/60 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-[#212121] dark:text-white truncate">{course.name}</div>
                  <div className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">{course.description || 'No description'}</div>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${course.isActive
                      ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-[#f0f0f0] text-[#808080] dark:bg-[#111c2b]'
                    }`}
                >
                  {course.batchCount} batch{course.batchCount === 1 ? '' : 'es'}
                </span>
              </Button>
            ))}
          </div>
        </section>

        {/* Staff & Mentors Section */}
        <section className="premium-card rounded-3xl overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#dbdbdb]/60 dark:border-[#243244]">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">Staff & mentors</h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8]">{staff.length} instructors</p>
            </div>
            {canManage && (
              <Button
                type="button"
                onClick={onOpenAddStaff}
                className="btn-brand min-h-10 rounded-2xl px-3.5 text-xs font-semibold hidden md:flex items-center gap-1 active:scale-95"
              >
                <JisIcon className="text-[16px]">add</JisIcon>
                <span>Add staff</span>
              </Button>
            )}
          </div>
          <div className="divide-y divide-[#dbdbdb]/60 dark:divide-[#243244] max-h-72 overflow-y-auto">
            {staff.length === 0 && (
              <p className="p-5 text-xs text-[#808080]">
                No staff yet. {canManage ? 'Add a mentor to assign to batches.' : 'Ask your admin to add one.'}
              </p>
            )}
            {staff.map((member) => (
              <Button
                key={member.id}
                type="button"
                onClick={() => canManage && onEditStaff(member)}
                disabled={!canManage}
                className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left hover:bg-[#f0f0f0]/70 dark:hover:bg-[#172435]/60 disabled:cursor-default disabled:hover:bg-transparent transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-[#212121] dark:text-white truncate">{member.name}</div>
                  <div className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">{member.phone || member.email || 'No contact on file'}</div>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${member.isActive
                      ? 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-[#f0f0f0] text-[#808080] dark:bg-[#111c2b]'
                    }`}
                >
                  {member.batchCount} batch{member.batchCount === 1 ? '' : 'es'}
                </span>
              </Button>
            ))}
          </div>
        </section>
      </div>

      {/* All Batches Section */}
      <section className="premium-card rounded-3xl overflow-hidden">
        <div className="p-4 sm:p-5 md:p-6 border-b border-[#dbdbdb]/60 dark:border-[#243244]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-[#212121] dark:text-white">All batches</h3>
              <p className="text-xs text-[#808080] dark:text-[#94a3b8] mt-0.5">{filteredBatches.length} of {activeBatches.length} batches shown</p>
            </div>

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
              {canManage && (
                <Button
                  type="button"
                  onClick={onOpenAddBatch}
                  className="btn-brand min-h-11 rounded-2xl px-4 text-xs font-bold hidden md:flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <JisIcon className="text-[17px]">add</JisIcon>
                  <span>Add batch</span>
                </Button>
              )}

              <div className="relative flex-1 sm:w-64">
                <JisIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9e9e9e] text-[18px] pointer-events-none">
                  search
                </JisIcon>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search batch, course, staff…"
                  className="w-full rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#0b1422] pl-10 pr-9 py-2.5 min-h-11 text-xs text-[#212121] dark:text-white outline-none focus:border-[#3fc073] focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 transition-all"
                />
                {search && (
                  <Button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#808080] hover:text-[#212121]"
                  >
                    <JisIcon className="text-[17px]">close</JisIcon>
                  </Button>
                )}
              </div>

              <select
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
                aria-label="Filter by course"
                className="rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-[#f0f0f0] dark:bg-[#0b1422] px-3.5 py-2.5 min-h-11 text-xs font-semibold text-[#212121] dark:text-[#e2e8f0] outline-none focus:border-[#3fc073] cursor-pointer"
              >
                <option value="All">All courses</option>
                {activeCourses.map((course) => (
                  <option key={course.id} value={course.name}>{course.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] text-[#808080] mx-auto flex items-center justify-center">
              <JisIcon className="text-[24px]">
                {batches.length ? 'search_off' : 'calendar_add_on'}
              </JisIcon>
            </div>
            <h4 className="font-heading font-bold text-[#212121] dark:text-white mt-3">
              {batches.length ? 'No batches match your filters' : 'Create your first batch'}
            </h4>
            <p className="text-xs text-[#808080] mt-1 max-w-xs mx-auto">
              {batches.length
                ? 'Try a different search or course filter.'
                : canManage
                  ? 'Add a course and staff member, then schedule a batch.'
                  : 'Ask your admin to schedule one.'}
            </p>
          </div>
        ) : (
          <div className="p-3.5 sm:p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} canManage={canManage} onEdit={onEditBatch} />
            ))}
          </div>
        )}
      </section>

      {/* Archive: removed courses and batches live here, out of the way but restorable */}
      {archivedCount > 0 && (
        <section className="premium-card rounded-3xl overflow-hidden">
          <button
            type="button"
            onClick={() => setArchiveOpen((open) => !open)}
            aria-expanded={archiveOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-[#f0f0f0]/50 dark:hover:bg-[#172435]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-2xl bg-[#f0f0f0] dark:bg-[#111c2b] text-[#808080] inline-flex items-center justify-center">
                <JisIcon className="text-[18px]">inventory_2</JisIcon>
              </span>
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-[#212121] dark:text-white">Archive</h3>
                <p className="text-xs text-[#808080] dark:text-[#94a3b8]">
                  {archivedCourses.length} {archivedCourses.length === 1 ? 'course' : 'courses'} · {archivedBatches.length} {archivedBatches.length === 1 ? 'batch' : 'batches'}
                </p>
              </div>
            </div>
            <JisIcon className="text-[20px] text-[#9e9e9e]">{archiveOpen ? 'expand_less' : 'expand_more'}</JisIcon>
          </button>

          {archiveOpen && (
            <div className="border-t border-[#dbdbdb]/60 dark:border-[#243244] divide-y divide-[#dbdbdb]/50 dark:divide-[#243244]/60">
              {archivedCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between gap-3 p-3.5 sm:px-5">
                  <div className="min-w-0 opacity-60">
                    <div className="text-xs sm:text-sm font-bold text-[#212121] dark:text-white truncate">{course.name}</div>
                    <div className="text-xs text-[#808080] dark:text-[#94a3b8]">Course · {course.batchCount} batch{course.batchCount === 1 ? '' : 'es'}</div>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      disabled={restoringId !== null}
                      onClick={() => handleRestore(course.id, () => onRestoreCourse(course))}
                      className="min-h-9 shrink-0 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-3.5 text-xs font-bold text-[#3fc073] dark:text-[#b3e6c7] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors disabled:opacity-50"
                    >
                      {restoringId === course.id ? 'Restoring…' : 'Restore'}
                    </Button>
                  )}
                </div>
              ))}
              {archivedBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between gap-3 p-3.5 sm:px-5">
                  <div className="min-w-0 opacity-60">
                    <div className="text-xs sm:text-sm font-bold text-[#212121] dark:text-white truncate">{batch.name}</div>
                    <div className="text-xs text-[#808080] dark:text-[#94a3b8] truncate">
                      Batch · {batch.courseName} · {formatDays(batch.days)} {formatTime(batch.startTime)}
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      disabled={restoringId !== null}
                      onClick={() => handleRestore(batch.id, () => onRestoreBatch(batch))}
                      className="min-h-9 shrink-0 rounded-2xl border border-[#dbdbdb] dark:border-[#243244] bg-white dark:bg-[#0b1422] px-3.5 text-xs font-bold text-[#3fc073] dark:text-[#b3e6c7] hover:bg-[#e9f7ee] dark:hover:bg-[#3fc073]/20 transition-colors disabled:opacity-50"
                    >
                      {restoringId === batch.id ? 'Restoring…' : 'Restore'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Mobile quick-add: the three add actions live behind one floating button */}
      {canManage && (
        <MobileSpeedDial
          openLabel="Add batch, course or staff"
          actions={[
            { label: 'Add staff', icon: 'person_add', tone: 'from-[#4fb3dc] to-[#379fc8] shadow-[#379fc8]/35', onClick: onOpenAddStaff },
            { label: 'Add course', icon: 'menu_book', tone: 'from-[#f5b041] to-[#f59e0b] shadow-[#f59e0b]/35', onClick: onOpenAddCourse },
            { label: 'Add batch', icon: 'calendar_add_on', tone: 'from-[#3fc073] to-[#35a160] shadow-[#3fc073]/35', onClick: onOpenAddBatch },
          ]}
        />
      )}
    </div>
  );
};

function BatchCard({ batch, canManage, onEdit }: { batch: Batch; canManage: boolean; onEdit: (batch: Batch) => void; key?: React.Key }) {
  return (
    <article className="premium-card-interactive group p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#3fc073] dark:text-[#b3e6c7] flex items-center justify-center shrink-0">
            <JisIcon className="text-[20px]">calendar_view_week</JisIcon>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold inline-flex items-center gap-1.5 ${batch.isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-[#22c55e] dark:text-emerald-300'
                  : 'bg-[#f0f0f0] dark:bg-[#111c2b] text-[#808080]'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${batch.isActive ? 'bg-[#22c55e]' : 'bg-[#9e9e9e]'}`} />
              {batch.isActive ? 'Active' : 'Inactive'}
            </span>
            {canManage && (
              <Button
                type="button"
                onClick={() => onEdit(batch)}
                aria-label={`Edit ${batch.name}`}
                className="w-8 h-8 inline-flex items-center justify-center rounded-xl text-[#9e9e9e] hover:text-[#3fc073] hover:bg-[#e9f7ee] dark:hover:bg-[#172435] transition-colors"
              >
                <JisIcon className="text-[18px]">edit</JisIcon>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <h4 className="font-heading font-bold text-base text-[#212121] dark:text-white leading-snug">{batch.name}</h4>
          <p className="text-xs font-semibold text-[#3fc073] mt-0.5">{batch.courseName}</p>
        </div>

        <div className="mt-3.5 space-y-2">
          <BatchInfo
            icon="event"
            label="Schedule"
            value={`${formatDays(batch.days)} · ${formatTime(batch.startTime)} – ${formatTime(batch.endTime)}`}
          />
          <BatchInfo icon="person" label="Staff / mentor" value={batch.staffName} />
          <BatchInfo
            icon="date_range"
            label="Active"
            value={`${new Date(batch.startDate).toLocaleDateString('en-IN')}${batch.endDate ? ' – ' + new Date(batch.endDate).toLocaleDateString('en-IN') : ' onward'
              }`}
          />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#dbdbdb]/60 dark:border-[#243244] flex items-center justify-between">
        <div className="text-xs text-[#808080] font-medium">Enrollment</div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f7ee] dark:bg-[#3fc073]/20 text-[#35a160] dark:text-[#b3e6c7] px-2.5 py-0.5 text-xs font-bold">
          <JisIcon className="text-[15px]">groups</JisIcon>
          {batch.enrolledCount} student{batch.enrolledCount === 1 ? '' : 's'}
        </div>
      </div>
    </article>
  );
}

function BatchInfo({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <JisIcon className="text-[16px] text-[#9e9e9e] mt-0.5 shrink-0">{icon}</JisIcon>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wider font-bold text-[#9e9e9e]">{label}</div>
        <div className="text-xs font-semibold text-[#575757] dark:text-[#cbd5e1] break-words">{value}</div>
      </div>
    </div>
  );
}

function BatchStat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: 'blue' | 'indigo' | 'violet' | 'amber';
}) {
  const cardGradients = {
    blue: 'bg-gradient-to-r from-[#3fc073]/10 via-[#3fc073]/[0.03] to-transparent',
    indigo: 'bg-gradient-to-r from-[#379fc8]/10 via-[#379fc8]/[0.03] to-transparent',
    violet: 'bg-gradient-to-r from-[#22c55e]/10 via-[#22c55e]/[0.03] to-transparent',
    amber: 'bg-gradient-to-r from-[#f59e0b]/10 via-[#f59e0b]/[0.03] to-transparent',
  };
  const colors = {
    blue: 'bg-[#e9f7ee] text-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]',
    indigo: 'bg-sky-50 text-[#379fc8] dark:bg-sky-950/60 dark:text-sky-400',
    violet: 'bg-emerald-50 text-[#22c55e] dark:bg-emerald-950/60 dark:text-emerald-400',
    amber: 'bg-amber-50 text-[#f59e0b] dark:bg-amber-950/60 dark:text-amber-400',
  };
  const textColors = {
    blue: 'text-[#35a160] dark:text-[#6bd194]',
    indigo: 'text-[#379fc8] dark:text-[#64b7d8]',
    violet: 'text-[#22c55e] dark:text-[#4ade80]',
    amber: 'text-[#f59e0b] dark:text-[#fbbf24]',
  };
  return (
    <div className={`premium-card p-3.5 sm:p-4 flex flex-col justify-between ${cardGradients[color]}`}>
      <div className={'w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center ' + colors[color]}>
        <JisIcon className="text-[18px] sm:text-[20px]">{icon}</JisIcon>
      </div>
      <div className={`text-xl sm:text-2xl font-bold ${textColors[color]} mt-2 sm:mt-3 tabular-nums`}>{value}</div>
      <div className="text-xs sm:text-xs font-semibold text-[#808080] dark:text-[#94a3b8] mt-0.5 truncate">{label}</div>
    </div>
  );
}
