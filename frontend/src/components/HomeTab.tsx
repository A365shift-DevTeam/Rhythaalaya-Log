import React from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AppTab, Student, Batch, Transaction, FeeDue } from '../types';

const CHART_COLORS = [
  'var(--c-chart-1)',
  'var(--c-chart-3)',
  'var(--c-chart-4)',
  'var(--c-chart-5)',
  'var(--c-text-3)'
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const rupees = (value: number | null | undefined) => {
  const amount = Number(value || 0);
  return `${amount < 0 ? '−' : ''}₹${Math.abs(amount).toLocaleString('en-IN')}`;
};

const formatTime = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h)) return value;
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')}${period}`;
};

const minutesOf = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return Number.isNaN(h) ? 0 : h * 60 + (m || 0);
};

type SessionState = 'done' | 'now' | 'ahead';

interface DaySession {
  batch: Batch;
  state: SessionState;
}

interface HomeTabProps {
  students: Student[];
  batches: Batch[];
  transactions: Transaction[];
  outstandingDues: FeeDue[];
  setCurrentTab: (tab: AppTab) => void;
  onOpenAddStudent: () => void;
  onOpenAddBatch: () => void;
  onOpenRecordFee: (student?: Student) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  students,
  batches,
  transactions,
  outstandingDues,
  setCurrentTab,
  onOpenAddBatch,
  onOpenRecordFee
}) => {
  const reduceMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayName = WEEKDAYS[now.getDay()];

  /* ------------------------------------------------------------------
     The day as a cycle. Sessions in clock order; the one running right
     now — or the next one up — is sam, the beat the academy is on.
     ------------------------------------------------------------------ */
  const daySessions: DaySession[] = batches
    .filter((batch) => batch.isActive && batch.days.includes(todayName))
    .sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime))
    .map((batch) => {
      const start = minutesOf(batch.startTime);
      const end = minutesOf(batch.endTime);
      const state: SessionState = nowMinutes > end ? 'done' : nowMinutes >= start ? 'now' : 'ahead';
      return { batch, state };
    });

  const samIndex = (() => {
    const live = daySessions.findIndex((session) => session.state === 'now');
    if (live !== -1) return live;
    return daySessions.findIndex((session) => session.state === 'ahead');
  })();

  const doneCount = daySessions.filter((session) => session.state === 'done').length;
  const studentsToday = daySessions.reduce((sum, session) => sum + session.batch.enrolledCount, 0);

  const pendingStudents = students
    .filter((student) => student.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  const pendingCount = pendingStudents.length;
  const pendingTotal = pendingStudents.reduce((sum, student) => sum + student.outstandingBalance, 0);

  const totalCollected = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const averageAttendance = Math.round(
    students.reduce((sum, student) => sum + student.overallAttendance, 0) / (students.length || 1)
  );

  const newStudentsThisMonth = students.filter((student) => {
    if (!student.joinDate) return false;
    const joined = new Date(student.joinDate);
    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
  }).length;

  const overdueCount = outstandingDues.filter((due) => due.status === 'Overdue').length;

  const monthBuckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
      income: 0,
      expense: 0
    };
  });

  transactions.forEach((transaction) => {
    const date = new Date(transaction.occurredAt || transaction.date);
    if (Number.isNaN(date.getTime())) return;
    const bucket = monthBuckets.find((item) => item.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket[transaction.type] += transaction.amount;
  });

  const financialTrend = monthBuckets.map((item) => ({ ...item, net: item.income - item.expense }));
  const periodIncome = financialTrend.reduce((sum, item) => sum + item.income, 0);
  const periodExpenses = financialTrend.reduce((sum, item) => sum + item.expense, 0);
  const periodNet = periodIncome - periodExpenses;
  const hasFinancialData = periodIncome > 0 || periodExpenses > 0;
  const settledRate = students.length
    ? Math.round(((students.length - pendingCount) / students.length) * 100)
    : 0;

  const enrollmentCounts = new Map<string, number>();
  students.forEach((student) => {
    student.enrollments
      .filter((enrollment) => enrollment.status === 'Active')
      .forEach((enrollment) => {
        enrollmentCounts.set(enrollment.courseName, (enrollmentCounts.get(enrollment.courseName) || 0) + 1);
      });
  });
  const enrollmentEntries = Array.from(enrollmentCounts.entries()).sort((a, b) => b[1] - a[1]);
  const otherEnrollment = enrollmentEntries.slice(4).reduce((sum, entry) => sum + entry[1], 0);
  const enrollmentByCourse = [
    ...enrollmentEntries.slice(0, 4),
    ...(otherEnrollment ? [['Other courses', otherEnrollment] as [string, number]] : [])
  ].map(([label, value], index) => ({
    id: label,
    label,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));
  const totalEnrollments = enrollmentEntries.reduce((sum, entry) => sum + entry[1], 0);

  return (
    <div className="space-y-5 pb-8 md:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display-lg">Today</h1>
          <p className="label mt-1">
            <span className="num">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {' · '}
            {students.length} student{students.length === 1 ? '' : 's'} on the roll
          </p>
        </div>
        <button type="button" onClick={() => setCurrentTab('log')} className="btn btn-secondary btn-sm">
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">fact_check</span>
          Take attendance
        </button>
      </header>

      <TalaStrip
        sessions={daySessions}
        samIndex={samIndex}
        doneCount={doneCount}
        studentsToday={studentsToday}
        onOpenAddBatch={onOpenAddBatch}
        onTakeAttendance={() => setCurrentTab('log')}
      />

      <section aria-label="Academy at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Students"
          value={String(students.length)}
          note={newStudentsThisMonth ? `${newStudentsThisMonth} joined this month` : 'No joiners this month'}
          onClick={() => setCurrentTab('students')}
        />
        <StatCard
          label="Collected"
          value={rupees(totalCollected)}
          note="Year to date"
          onClick={() => setCurrentTab('finance')}
        />
        <StatCard
          label="Outstanding"
          value={rupees(pendingTotal)}
          note={pendingCount ? `${pendingCount} student${pendingCount === 1 ? '' : 's'}` : 'All settled'}
          tone={pendingTotal > 0 ? 'due' : 'settled'}
          onClick={() => setCurrentTab('finance')}
        />
        <StatCard
          label="Attendance"
          value={`${averageAttendance}%`}
          note="Average across the roll"
          onClick={() => setCurrentTab('log')}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <article className="card overflow-hidden xl:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3 md:p-5 md:pb-3">
            <div>
              <h2 className="title">Money in and out</h2>
              <p className="label-xs mt-0.5">Last six months</p>
            </div>
            <dl className="flex gap-4">
              <MiniStat label="Collected" value={rupees(periodIncome)} />
              <MiniStat label="Net" value={rupees(periodNet)} tone={periodNet < 0 ? 'due' : 'settled'} />
              <MiniStat label="Settled" value={`${settledRate}%`} />
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-2 md:px-5">
            <LegendKey shape="line" color="var(--c-chart-1)" label="Collected" />
            <LegendKey shape="bar" color="var(--c-chart-4)" label="Spent" />
          </div>

          <div
            className="h-[260px] w-full pb-3 pr-1 md:h-[300px]"
            role="img"
            aria-label={`Six-month money chart. Collected ${rupees(periodIncome)}, spent ${rupees(periodExpenses)}, net ${rupees(periodNet)}.`}
          >
            {hasFinancialData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={financialTrend} margin={{ top: 10, right: 14, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="collectedArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--c-chart-1)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--c-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--c-grid)" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                    tick={{ fill: 'var(--c-text-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tick={{ fill: 'var(--c-text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    tickFormatter={(value) => Math.abs(value) >= 1000 ? `${Math.round(value / 1000)}k` : String(value)}
                  />
                  <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'var(--c-line)', strokeWidth: 1 }} />
                  <Area
                    isAnimationActive={!reduceMotion}
                    type="monotone"
                    dataKey="income"
                    name="Collected"
                    stroke="var(--c-chart-1)"
                    strokeWidth={2}
                    fill="url(#collectedArea)"
                    activeDot={{ r: 4, fill: 'var(--c-chart-1)', stroke: 'var(--c-surface)', strokeWidth: 2 }}
                  />
                  <Bar
                    isAnimationActive={!reduceMotion}
                    dataKey="expense"
                    name="Spent"
                    fill="var(--c-chart-4)"
                    maxBarSize={16}
                    radius={[3, 3, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <p className="label text-center">
                  Money moves show up here once you record the first payment.
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="card overflow-hidden xl:col-span-2">
          <div className="flex items-start justify-between gap-3 p-4 pb-1 md:p-5 md:pb-1">
            <div>
              <h2 className="title">Who studies what</h2>
              <p className="label-xs mt-0.5">Active enrolments by course</p>
            </div>
            <span className="chip chip-neutral">
              <span className="num">{enrollmentEntries.length}</span>
              course{enrollmentEntries.length === 1 ? '' : 's'}
            </span>
          </div>

          {enrollmentByCourse.length > 0 ? (
            <div className="grid grid-cols-1 items-center gap-1 p-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div
                className="relative h-[190px] min-w-0"
                role="img"
                aria-label={`${totalEnrollments} active enrolments across ${enrollmentEntries.length} courses.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<EnrollmentTooltip />} />
                    <Pie
                      data={enrollmentByCourse}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="92%"
                      paddingAngle={3}
                      cornerRadius={4}
                      stroke="none"
                      isAnimationActive={!reduceMotion}
                    >
                      {enrollmentByCourse.map((item) => <Cell key={item.id} fill={item.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="num-lg">{totalEnrollments}</span>
                  <span className="label-xs mt-0.5">enrolled</span>
                </div>
              </div>

              <ul className="space-y-0.5 px-1">
                {enrollmentByCourse.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 rounded-ctl px-2 py-1.5">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate" title={item.label}>{item.label}</span>
                    </span>
                    <span className="num shrink-0 text-[13px] text-ink">
                      {item.value}
                      <span className="ml-1.5 text-[11px] text-ink-3">
                        {totalEnrollments ? Math.round(item.value / totalEnrollments * 100) : 0}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-3">
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">No enrolments yet</p>
                <p className="label max-w-64">Enrol a student in a batch and the split shows up here.</p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="card flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line-2 p-4 md:px-5">
            <div>
              <h2 className="title">Fees to chase</h2>
              <p className="label-xs mt-0.5">
                {pendingCount
                  ? `${rupees(pendingTotal)} across ${pendingCount} student${pendingCount === 1 ? '' : 's'}${overdueCount ? ` · ${overdueCount} overdue` : ''}`
                  : 'Every student is settled'}
              </p>
            </div>
            {pendingCount > 0 && (
              <button type="button" onClick={() => setCurrentTab('finance')} className="btn btn-ghost btn-sm shrink-0">
                See all
              </button>
            )}
          </div>

          {pendingCount === 0 ? (
            <div className="p-4">
              <div className="empty">
                <span className="material-symbols-outlined text-[26px] text-leaf" aria-hidden="true">task_alt</span>
                <p className="text-[13px] font-semibold text-ink">Nothing outstanding</p>
                <p className="label max-w-64">Every student on the roll has paid up.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line-2">
              {pendingStudents.slice(0, 5).map((student) => (
                <li key={student.id} className="flex items-center gap-3 px-4 py-2.5 md:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{student.name}</span>
                    <span className="num block text-[11px] text-ink-3">{student.studentNumber}</span>
                  </span>
                  <span className="num shrink-0 text-[13px] font-semibold text-kumkum">
                    {rupees(student.outstandingBalance)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenRecordFee(student)}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    Record
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-line-2 p-4 md:px-5">
            <div>
              <h2 className="title">Recent money</h2>
              <p className="label-xs mt-0.5">Latest payments and expenses</p>
            </div>
            {transactions.length > 0 && (
              <button type="button" onClick={() => setCurrentTab('finance')} className="btn btn-ghost btn-sm shrink-0">
                See all
              </button>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="p-4">
              <div className="empty">
                <p className="text-[13px] font-semibold text-ink">Nothing recorded yet</p>
                <p className="label max-w-64">Record a fee payment and it appears here.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line-2">
              {transactions.slice(0, 5).map((transaction) => (
                <li key={transaction.id} className="flex items-center gap-3 px-4 py-2.5 md:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{transaction.title}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      <span className="num">{transaction.date}</span> · {transaction.category}
                    </span>
                  </span>
                  <span
                    className={`num shrink-0 text-[13px] font-semibold ${
                      transaction.type === 'income' ? 'text-leaf-strong' : 'text-ink-2'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '−'}{rupees(transaction.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
};

/* ====================================================================
   The tala strip — the day laid out as one rhythmic cycle.
   Beats run left to right in clock order. Sessions already finished are
   hollow, the beat the academy is on right now is sam and carries the
   brass mark, and everything after it is waiting.
   ==================================================================== */
function TalaStrip({
  sessions,
  samIndex,
  doneCount,
  studentsToday,
  onOpenAddBatch,
  onTakeAttendance
}: {
  sessions: DaySession[];
  samIndex: number;
  doneCount: number;
  studentsToday: number;
  onOpenAddBatch: () => void;
  onTakeAttendance: () => void;
}) {
  const trackRef = React.useRef<HTMLOListElement>(null);
  const samRef = React.useRef<HTMLLIElement>(null);

  /* On a phone the strip is wider than the screen, and the classes already
     finished sit at the left. Open on sam so the first thing visible is the
     beat the academy is actually on. Sets scrollLeft directly rather than
     using scrollIntoView, which would also scroll the page. */
  React.useEffect(() => {
    const track = trackRef.current;
    const sam = samRef.current;
    if (!track || !sam) return;
    const offset = sam.offsetLeft - track.offsetLeft - 16;
    if (offset > 0) track.scrollLeft = offset;
  }, [samIndex, sessions.length]);

  if (sessions.length === 0) {
    return (
      <section className="card p-4 md:p-5" aria-labelledby="tala-title">
        <h2 id="tala-title" className="title">No classes today</h2>
        <p className="label mt-1 max-w-md">
          Nothing is scheduled for today. Add a batch to put it on the timetable.
        </p>
        <button type="button" onClick={onOpenAddBatch} className="btn btn-secondary btn-sm mt-3">
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>
          Add batch
        </button>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="tala-title">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4 md:px-5">
        <h2 id="tala-title" className="title">
          <span className="sam-mark mr-1.5" aria-hidden="true">|</span>
          The day
        </h2>
        <p className="label-xs">
          <span className="num">{sessions.length}</span> class{sessions.length === 1 ? '' : 'es'}
          {' · '}
          <span className="num">{doneCount}</span> done
          {' · '}
          <span className="num">{studentsToday}</span> student{studentsToday === 1 ? '' : 's'} expected
        </p>
      </div>

      {/* Horizontal cycle. Scrolls on narrow screens, snapping beat to beat. */}
      <ol ref={trackRef} className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-4 pt-1 md:px-5">
        {sessions.map((session, index) => {
          const isSam = index === samIndex;
          const isDone = session.state === 'done';
          const isLive = session.state === 'now';

          return (
            <li
              key={session.batch.id}
              ref={isSam ? samRef : undefined}
              className={`min-w-[10.5rem] flex-1 snap-start rounded-card border p-3 transition-colors ${
                isSam
                  ? 'border-brass-line bg-brass-tint'
                  : isDone
                    ? 'border-line-2 bg-surface-2'
                    : 'border-line bg-surface'
              }`}
              aria-current={isSam ? 'step' : undefined}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`beat h-5 w-5 text-[10px] ${
                    isSam ? 'beat-sam' : isDone ? '' : 'beat-on'
                  }`}
                  aria-hidden="true"
                >
                  {isDone ? '·' : isSam ? '|' : '○'}
                </span>
                <span className={`num text-[12px] font-semibold ${isDone ? 'text-ink-3' : 'text-ink'}`}>
                  {formatTime(session.batch.startTime)}
                </span>
                {isLive && <span className="chip chip-now ml-auto">Now</span>}
                {isDone && <span className="label-xs ml-auto">Done</span>}
              </div>

              <p
                className={`mt-2 truncate text-[13px] font-semibold ${isDone ? 'text-ink-3' : 'text-ink'}`}
                title={session.batch.name}
              >
                {session.batch.name}
              </p>
              <p className="truncate text-[11px] text-ink-3" title={session.batch.staffName}>
                {session.batch.staffName}
              </p>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="label-xs">
                  <span className="num">{session.batch.enrolledCount}</span> enrolled
                </span>
                {isSam && (
                  <button type="button" onClick={onTakeAttendance} className="btn btn-primary btn-sm">
                    Take roll
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = 'plain',
  onClick
}: {
  label: string;
  value: string;
  note: string;
  tone?: 'plain' | 'due' | 'settled';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="card-i p-3.5 text-left md:p-4">
      <span className="label block">{label}</span>
      <span
        className={`num-lg mt-1.5 block truncate ${
          tone === 'due' ? 'text-kumkum' : tone === 'settled' ? 'text-leaf-strong' : 'text-ink'
        }`}
        title={value}
      >
        {value}
      </span>
      <span className="label-xs mt-1 block truncate">{note}</span>
    </button>
  );
}

function MiniStat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'due' | 'settled' }) {
  return (
    <div className="min-w-0">
      <dt className="label-xs">{label}</dt>
      <dd
        className={`num mt-0.5 truncate text-[13px] font-semibold ${
          tone === 'due' ? 'text-kumkum' : tone === 'settled' ? 'text-leaf-strong' : 'text-ink'
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function LegendKey({ shape, color, label }: { shape: 'line' | 'bar'; color: string; label: string }) {
  return (
    <span className="label-xs inline-flex items-center gap-1.5">
      <span
        className={shape === 'line' ? 'h-0.5 w-4 rounded-full' : 'h-2.5 w-2.5 rounded-[2px]'}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

interface ChartTooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { color?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly ChartTooltipItem[];
  label?: string;
}

function MoneyTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-card border border-line bg-surface p-3 shadow-[var(--shadow-pop)]">
      <div className="label-xs mb-1.5">{label}</div>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || item.payload?.color || 'var(--c-chart-1)' }}
              />
              {item.name}
            </span>
            <span className="num font-semibold text-ink">{rupees(Number(item.value || 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnrollmentTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const count = Number(item.value || 0);

  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2 shadow-[var(--shadow-pop)]">
      <div className="text-[13px] font-semibold text-ink">{item.name}</div>
      <div className="label-xs mt-0.5">
        <span className="num">{count}</span> student{count === 1 ? '' : 's'}
      </div>
    </div>
  );
}
