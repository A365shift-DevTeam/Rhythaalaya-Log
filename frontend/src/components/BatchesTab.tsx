import React, { useMemo, useState } from 'react';
import { Batch, Course, Staff } from '../types';
import { WeekCycle } from './LogTab';

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
  if (Number.isNaN(h)) return value;
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')}${period}`;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric'
});

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
  onEditStaff
}) => {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('All');

  const visible = useMemo(() => batches.filter((batch) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || batch.name.toLowerCase().includes(term)
      || batch.courseName.toLowerCase().includes(term)
      || batch.staffName.toLowerCase().includes(term);
    return matchesSearch && (courseFilter === 'All' || batch.courseName === courseFilter);
  }), [batches, search, courseFilter]);

  const enrolled = batches.reduce((sum, batch) => sum + batch.enrolledCount, 0);

  return (
    <div className="space-y-5 pb-8 md:space-y-6">
      <header>
        <h1 className="display-lg">Batches</h1>
        <p className="label mt-1">
          <span className="num">{batches.length}</span> batch{batches.length === 1 ? '' : 'es'} ·{' '}
          <span className="num">{enrolled}</span> enrolment{enrolled === 1 ? '' : 's'} ·{' '}
          <span className="num">{courses.length}</span> course{courses.length === 1 ? '' : 's'}
        </p>
      </header>

      <div className="card flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center md:p-4">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="batch-search" className="sr-only">Search batches</label>
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-ink-3"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="batch-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search batch, course, or teacher"
            className="field pl-10"
          />
        </div>

        <div className="relative shrink-0">
          <label htmlFor="batch-course" className="sr-only">Filter by course</label>
          <select
            id="batch-course"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            className="field sm:w-52"
          >
            <option value="All">All courses</option>
            {courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <span className="material-symbols-outlined text-[28px] text-ink-3" aria-hidden="true">
            {batches.length ? 'search_off' : 'event_note'}
          </span>
          <p className="text-[13px] font-semibold text-ink">
            {batches.length ? 'Nothing matches that' : 'No batches yet'}
          </p>
          <p className="label max-w-80">
            {batches.length
              ? 'Try a different search, or show all courses.'
              : canManage
                ? 'Add a course and a teacher first, then schedule a batch.'
                : 'Your admin schedules batches.'}
          </p>
          {!batches.length && canManage && (
            <button type="button" onClick={onOpenAddBatch} className="btn btn-secondary btn-sm mt-1">
              Add batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((batch) => (
            <BatchCard key={batch.id} batch={batch} canManage={canManage} onEdit={onEditBatch} />
          ))}
        </div>
      )}

      {/* Courses and teachers are set up once and rarely touched, so they sit
          below the batches that get looked at every day. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListPanel
          title="Courses"
          addLabel="Add course"
          canManage={canManage}
          onAdd={onOpenAddCourse}
          emptyText={canManage ? 'Add a course before scheduling batches.' : 'Your admin sets up courses.'}
          items={courses.map((course) => ({
            id: course.id,
            title: course.name,
            subtitle: course.description || 'No description',
            meta: `${course.batchCount} batch${course.batchCount === 1 ? '' : 'es'}`,
            inactive: !course.isActive,
            onOpen: () => onEditCourse(course)
          }))}
        />

        <ListPanel
          title="Teachers"
          addLabel="Add teacher"
          canManage={canManage}
          onAdd={onOpenAddStaff}
          emptyText={canManage ? 'Add a teacher to assign to a batch.' : 'Your admin adds teachers.'}
          items={staff.map((member) => ({
            id: member.id,
            title: member.name,
            subtitle: member.phone || member.email || 'No contact on file',
            meta: `${member.batchCount} batch${member.batchCount === 1 ? '' : 'es'}`,
            inactive: !member.isActive,
            onOpen: () => onEditStaff(member)
          }))}
        />
      </div>
    </div>
  );
};

function BatchCard({
  batch,
  canManage,
  onEdit
}: {
  batch: Batch;
  canManage: boolean;
  onEdit: (batch: Batch) => void;
  key?: React.Key;
}) {
  return (
    <article className="card-i flex flex-col p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="title truncate" title={batch.name}>{batch.name}</h2>
          <p className="label-xs mt-0.5 truncate">{batch.courseName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!batch.isActive && <span className="chip chip-neutral">Paused</span>}
          {canManage && (
            <button
              type="button"
              onClick={() => onEdit(batch)}
              className="icon-btn"
              aria-label={`Edit ${batch.name}`}
              title="Edit batch"
            >
              <span className="material-symbols-outlined text-[19px]" aria-hidden="true">edit</span>
            </button>
          )}
        </div>
      </div>

      {/* The weekly pattern is a cycle, so it is drawn as one rather than
          spelled out as "Mon, Wed, Fri". */}
      <div className="mt-3">
        <WeekCycle days={batch.days} />
      </div>

      <dl className="mt-3 space-y-1.5 border-t border-line-2 pt-3">
        <Row label="Time">
          <span className="num">{formatTime(batch.startTime)}–{formatTime(batch.endTime)}</span>
        </Row>
        <Row label="Teacher">{batch.staffName}</Row>
        <Row label="Runs">
          <span className="num">
            {formatDate(batch.startDate)}{batch.endDate ? ` – ${formatDate(batch.endDate)}` : ' onward'}
          </span>
        </Row>
        <Row label="Enrolled">
          <span className="num">{batch.enrolledCount}</span>
        </Row>
      </dl>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label-xs shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[12px] text-ink">{children}</dd>
    </div>
  );
}

interface PanelItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  inactive: boolean;
  onOpen: () => void;
}

function ListPanel({
  title,
  addLabel,
  canManage,
  onAdd,
  emptyText,
  items
}: {
  title: string;
  addLabel: string;
  canManage: boolean;
  onAdd: () => void;
  emptyText: string;
  items: PanelItem[];
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 md:px-4">
        <h2 className="title">
          {title} <span className="num text-[15px] font-medium text-ink-3">({items.length})</span>
        </h2>
        {canManage && (
          <button type="button" onClick={onAdd} className="btn btn-ghost btn-sm text-leaf">
            <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
            {addLabel}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="label p-4">{emptyText}</p>
      ) : (
        <ul className="max-h-72 divide-y divide-line-2 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onOpen}
                disabled={!canManage}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent md:px-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-ink">{item.title}</span>
                    {item.inactive && <span className="chip chip-neutral shrink-0">Paused</span>}
                  </span>
                  <span className="block truncate text-[11px] text-ink-3">{item.subtitle}</span>
                </span>
                <span className="num shrink-0 text-[11px] text-ink-3">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
