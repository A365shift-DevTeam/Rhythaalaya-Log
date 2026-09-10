import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { confirmAction } from '../lib/confirm';
import { JisIcon } from './JisIcon';
import { MobileSpeedDial } from './MobileSpeedDial';
import { SimpleSelect } from './ui/select';
import { Spinner } from './ui/spinner';
import { toast } from '../lib/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../api';
import { Student, Transaction } from '../types';

type RangePreset = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'all' | 'custom';

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last3Months', label: 'Last 3 months' },
  { value: 'thisYear', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function presetRange(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'thisMonth': return { from: isoLocal(new Date(y, m, 1)), to: isoLocal(now) };
    case 'lastMonth': return { from: isoLocal(new Date(y, m - 1, 1)), to: isoLocal(new Date(y, m, 0)) };
    case 'last3Months': return { from: isoLocal(new Date(y, m - 2, 1)), to: isoLocal(now) };
    case 'thisYear': return { from: isoLocal(new Date(y, 0, 1)), to: isoLocal(now) };
    case 'all': return { from: '2000-01-01', to: isoLocal(now) };
  }
}

/**
 * The equal-length window immediately before the active one, so every headline figure can be
 * read against its own precedent. "All time" has no precedent, so it returns null and the
 * comparison is simply not shown rather than being faked against a wrong baseline.
 */
function priorWindow(from: string, to: string, preset: RangePreset): { from: string; to: string } | null {
  if (preset === 'all') return null;
  const start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const priorTo = new Date(start);
  priorTo.setDate(priorTo.getDate() - 1);
  const priorFrom = new Date(priorTo);
  priorFrom.setDate(priorFrom.getDate() - days + 1);
  return { from: isoLocal(priorFrom), to: isoLocal(priorTo) };
}

const fmtShort = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const rupees = (value: number) => Math.abs(value).toLocaleString('en-IN');

const CATEGORICAL_LIGHT = ['#3fc073', '#6bd194', '#22c55e', '#f59e0b', '#b3e6c7', '#2b824e', '#a855f7', '#ec4899'];
const CATEGORICAL_DARK = ['#6bd194', '#b3e6c7', '#4ade80', '#fbbf24', '#cbecd8', '#3fc073', '#c084fc', '#f472b6'];

type TypeFilter = 'all' | 'income' | 'expense';
type SortKey = 'date' | 'amount';

interface FinanceTabProps {
  transactions: Transaction[];
  token: string;
  canManage: boolean;
  darkMode: boolean;
  onOpenRecordFee: (student?: Student) => void;
  onOpenAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
  /** Opens the printable receipt for a fee collection. Only rows carrying a payment id have one. */
  onOpenReceipt: (paymentId: string) => void;
  onOpenAddCharge: () => void;
}

/** Rows shown in the history table before the "show all" toggle kicks in. */
const LOG_PAGE_SIZE = 12;

export const FinanceTab: React.FC<FinanceTabProps> = ({
  transactions: allTransactions,
  token,
  canManage,
  darkMode,
  onOpenRecordFee,
  onOpenAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onOpenReceipt,
  onOpenAddCharge,
}) => {
  const categorical = darkMode ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  const [showAllLogs, setShowAllLogs] = React.useState(false);

  // Date-range filter driving every view on this page: the position band, the category
  // breakdown and the history table. `draft` is what the filter bar edits; `applied` is what
  // actually drives the server fetch and the labels — nothing changes until "Apply" is pressed.
  const [showFilter, setShowFilter] = React.useState(false);
  const initialRange = presetRange('thisYear');
  const defaultFilter = { preset: 'thisYear' as RangePreset, from: initialRange.from, to: initialRange.to };
  const [applied, setApplied] = React.useState(defaultFilter);
  const [draft, setDraft] = React.useState(defaultFilter);

  const labelFor = (f: typeof applied) =>
    f.preset === 'thisYear' ? `${new Date(f.from).getFullYear()}`
    : f.preset === 'all' ? 'All time'
    : f.preset === 'last3Months' ? 'Last 3 months'
    : f.preset === 'thisMonth' || f.preset === 'lastMonth'
      ? new Date(f.from + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : `${fmtShort(f.from)} – ${fmtShort(f.to)}`;
  const range = { from: applied.from, to: applied.to };
  const rangeLabel = labelFor(applied);
  const filterActive = applied.preset !== 'thisYear';

  const draftInvalid = !draft.from || !draft.to || draft.from > draft.to;
  const draftDirty = draft.preset !== applied.preset || draft.from !== applied.from || draft.to !== applied.to;

  const pickDraftPreset = (value: RangePreset) => {
    if (value === 'custom') { setDraft((d) => ({ ...d, preset: 'custom' })); return; }
    const r = presetRange(value);
    setDraft({ preset: value, from: r.from, to: r.to });
  };
  const applyFilter = () => { if (!draftInvalid) setApplied(draft); };
  const resetFilter = () => { setDraft(defaultFilter); setApplied(defaultFilter); };

  // Transactions for the active window are fetched from the server; the year-to-date list from
  // the app shell is only the fallback until the first response lands.
  const [rangeRows, setRangeRows] = React.useState<Transaction[] | null>(null);
  const [rangeLoading, setRangeLoading] = React.useState(false);
  React.useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    let ignore = false;
    setRangeLoading(true);
    api.finance(token, range.from, range.to)
      .then((rows) => { if (!ignore) setRangeRows(rows); })
      .catch(() => { if (!ignore) setRangeRows(null); })
      .finally(() => { if (!ignore) setRangeLoading(false); });
    return () => { ignore = true; };
    // allTransactions changes whenever an entry is added, edited or deleted: refetch the window
    // so the list and totals reflect it without a reload.
  }, [token, range.from, range.to, allTransactions]);
  const transactions = rangeRows ?? allTransactions;

  // The preceding window, fetched only to compute the three comparisons. A failure here leaves
  // the figures standing on their own rather than blocking the page.
  const prior = React.useMemo(
    () => priorWindow(range.from, range.to, applied.preset),
    [range.from, range.to, applied.preset]
  );
  const [priorRows, setPriorRows] = React.useState<Transaction[] | null>(null);
  React.useEffect(() => {
    if (!prior) { setPriorRows(null); return; }
    let ignore = false;
    api.finance(token, prior.from, prior.to)
      .then((rows) => { if (!ignore) setPriorRows(rows); })
      .catch(() => { if (!ignore) setPriorRows(null); });
    return () => { ignore = true; };
  }, [token, prior, allTransactions]);

  const sumBy = (rows: Transaction[], type: 'income' | 'expense') =>
    rows.filter((t) => t.type === type).reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = sumBy(transactions, 'income');
  const totalExpense = sumBy(transactions, 'expense');
  const incomeCount = transactions.filter((t) => t.type === 'income').length;
  const expenseCount = transactions.length - incomeCount;
  const netProfit = totalIncome - totalExpense;
  const marginPercentage = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
  const isNetLoss = netProfit < 0;
  const marginBarWidth = Math.min(100, Math.abs(marginPercentage));

  const priorIncome = priorRows ? sumBy(priorRows, 'income') : null;
  const priorExpense = priorRows ? sumBy(priorRows, 'expense') : null;
  const priorNet = priorIncome !== null && priorExpense !== null ? priorIncome - priorExpense : null;
  const priorLabel = prior ? `${fmtShort(prior.from)} – ${fmtShort(prior.to)}` : '';

  // ---- History table: search, type filter and sort all run client-side over the fetched window.
  const [query, setQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [sortKey, setSortKey] = React.useState<SortKey>('date');
  const [sortAsc, setSortAsc] = React.useState(false);

  const historyRows = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    let rows = transactions;
    if (typeFilter !== 'all') rows = rows.filter((t) => t.type === typeFilter);
    if (term) {
      rows = rows.filter((t) =>
        t.title.toLowerCase().includes(term) || t.category.toLowerCase().includes(term));
    }
    const dir = sortAsc ? 1 : -1;
    // `date` is a display string, so ordering has to run on the raw timestamp instead.
    return rows.slice().sort((a, b) => (sortKey === 'amount'
      ? Math.abs(a.amount) - Math.abs(b.amount)
      : (a.occurredAt ?? '').localeCompare(b.occurredAt ?? '')) * dir);
  }, [transactions, query, typeFilter, sortKey, sortAsc]);

  const visibleHistory = showAllLogs ? historyRows : historyRows.slice(0, LOG_PAGE_SIZE);
  const filteredIn = sumBy(historyRows, 'income');
  const filteredOut = sumBy(historyRows, 'expense');
  const filteredNet = filteredIn - filteredOut;
  const historyFiltered = typeFilter !== 'all' || query.trim() !== '';

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) { setSortAsc((v) => !v); return; }
    setSortKey(key);
    setSortAsc(false);
  };

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const removeTransaction = async (item: Transaction) => {
    const ok = await confirmAction({
      title: 'Delete this entry?',
      text: `"${item.title}" for ₹${rupees(item.amount)} will be removed from the ledger.`,
      confirmText: 'Delete entry',
      tone: 'destructive',
    });
    if (!ok) return;
    setDeletingId(item.id);
    try {
      await onDeleteTransaction(item.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Could not delete that entry');
    } finally {
      setDeletingId(null);
    }
  };

  const expenseCategoryTotals = new Map<string, number>();
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expenseCategoryTotals.set(t.category, (expenseCategoryTotals.get(t.category) || 0) + t.amount);
    });
  const expenseEntries = Array.from(expenseCategoryTotals.entries()).sort((a, b) => b[1] - a[1]);
  const topExpenseEntries = expenseEntries.slice(0, 7);
  const otherExpense = expenseEntries.slice(7).reduce((sum, [, value]) => sum + value, 0);
  const expenseByCategory = [
    ...topExpenseEntries,
    ...(otherExpense ? ([['Other', otherExpense]] as [string, number][]) : []),
  ].map(([label, value], index) => ({
    id: label,
    label,
    value,
    color: index < categorical.length ? categorical[index] : '#9e9e9e',
  }));
  const topExpenseCategory = expenseEntries[0];
  const topExpenseShare = topExpenseCategory && totalExpense ? Math.round((topExpenseCategory[1] / totalExpense) * 100) : 0;

  return (
    <div className="space-y-4 pb-12 sm:space-y-5">
      {/* Ledger header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold tracking-tight text-[#212121] md:text-3xl dark:text-white">
            Financial ledger
          </h2>
          <p className="mt-1 font-sans text-xs text-[#808080] md:text-sm dark:text-[#94a3b8]">
            {transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} recorded in {rangeLabel.toLowerCase()}
            {rangeLoading && <span className="ml-2 text-[#3fc073]">Updating…</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            aria-expanded={showFilter}
            className={`relative min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 font-sans text-xs font-bold transition-colors active:scale-95 sm:flex-initial ${
              showFilter || filterActive
                ? 'border-[#3fc073] bg-[#e9f7ee] text-[#2b824e] dark:border-[#3fc073] dark:bg-[#3fc073]/20 dark:text-[#b3e6c7]'
                : 'border-[#dbdbdb] bg-white text-[#575757] hover:bg-[#f0f0f0] dark:border-[#243244] dark:bg-[#0b1422] dark:text-[#cbd5e1] dark:hover:bg-[#172435]'
            } flex`}
          >
            <JisIcon className="text-[17px]">tune</JisIcon>
            <span>{rangeLabel}</span>
          </Button>
          {canManage && (
            <Button
              type="button"
              onClick={onOpenAddCharge}
              title="Add a one-off charge like a costume or exam fee"
              className="hidden min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#dbdbdb] bg-white px-3.5 font-sans text-xs font-bold text-[#575757] transition-colors hover:bg-[#f0f0f0] active:scale-95 md:flex dark:border-[#243244] dark:bg-[#0b1422] dark:text-[#cbd5e1] dark:hover:bg-[#172435]"
            >
              <JisIcon className="text-[17px]">post_add</JisIcon>
              <span>Charge</span>
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onOpenRecordFee()}
            className="hidden min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#dbdbdb] bg-white px-3.5 font-sans text-xs font-bold text-[#575757] transition-colors hover:bg-[#f0f0f0] active:scale-95 md:flex dark:border-[#243244] dark:bg-[#0b1422] dark:text-[#cbd5e1] dark:hover:bg-[#172435]"
          >
            <JisIcon className="text-[17px]">payments</JisIcon>
            <span>Collect fee</span>
          </Button>
          {canManage && (
            <Button
              type="button"
              onClick={onOpenAddTransaction}
              className="btn-brand hidden min-h-10 items-center justify-center gap-1.5 rounded-xl px-4 font-sans text-xs font-bold active:scale-95 md:flex"
            >
              <JisIcon className="text-[17px]">add</JisIcon>
              <span>Record entry</span>
            </Button>
          )}
        </div>
      </div>

      {showFilter && (
        <div className="premium-card flex flex-col gap-3 p-3.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4 sm:p-4">
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">Period</label>
            <SimpleSelect aria-label="Period" value={draft.preset}
              onValueChange={(v) => pickDraftPreset(v as RangePreset)} options={RANGE_OPTIONS} />
          </div>
          <div className="flex-1 sm:max-w-[180px]">
            <label htmlFor="finance-from" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">From</label>
            <input id="finance-from" type="date" value={draft.from} max={draft.to || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, preset: 'custom', from: e.target.value }))}
              className="settings-input min-h-10" />
          </div>
          <div className="flex-1 sm:max-w-[180px]">
            <label htmlFor="finance-to" className="mb-1 block text-xs font-semibold text-[#575757] dark:text-[#cbd5e1]">To</label>
            <input id="finance-to" type="date" value={draft.to} min={draft.from || undefined}
              onChange={(e) => setDraft((d) => ({ ...d, preset: 'custom', to: e.target.value }))}
              className="settings-input min-h-10" />
          </div>
          <div className="flex items-center gap-2 sm:pb-1">
            {rangeLoading && <Spinner size="xs" inline text="Updating…" />}
            {filterActive && (
              <Button type="button" onClick={resetFilter}
                className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-[#575757] hover:bg-[#f0f0f0] dark:text-[#cbd5e1] dark:hover:bg-[#172435]">
                Reset
              </Button>
            )}
            <Button type="button" onClick={applyFilter} disabled={draftInvalid || !draftDirty}
              className="btn-brand min-h-10 shrink-0 rounded-xl px-4 text-xs font-bold disabled:opacity-50">
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Position band — three figures on one ruled surface, read left to right as a statement. */}
      <section className="premium-card overflow-hidden rounded-3xl">
        <div className="grid grid-cols-1 divide-y divide-[#dbdbdb]/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-[#243244]">
          <Figure
            label="Revenue collected"
            amount={totalIncome}
            tone="positive"
            current={totalIncome}
            prior={priorIncome}
            priorLabel={priorLabel}
            betterWhen="up"
            caption={`${incomeCount} ${incomeCount === 1 ? "entry" : "entries"}`}
          />
          <Figure
            label="Operating costs"
            amount={totalExpense}
            tone="negative"
            current={totalExpense}
            prior={priorExpense}
            priorLabel={priorLabel}
            betterWhen="down"
            caption={`${expenseCount} ${expenseCount === 1 ? 'entry' : 'entries'}`}
          />
          <Figure
            label={isNetLoss ? 'Net loss' : 'Net position'}
            amount={netProfit}
            tone={isNetLoss ? 'negative' : 'positive'}
            signed
            current={netProfit}
            prior={priorNet}
            priorLabel={priorLabel}
            betterWhen="up"
          >
            <div className="mt-3 space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f0] dark:bg-[#111c2b]">
                <div
                  className={`h-1.5 rounded-full transition-all ${isNetLoss ? 'bg-[#ef4444]' : 'bg-[#3fc073]'}`}
                  style={{ width: `${marginBarWidth}%` }}
                />
              </div>
              <div className="flex justify-between font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                <span>Margin</span>
                <span className={`font-bold tabular-nums ${isNetLoss ? 'text-[#ef4444]' : 'text-[#2b824e] dark:text-[#6bd194]'}`}>
                  {marginPercentage}%
                </span>
              </div>
            </div>
          </Figure>
        </div>
      </section>

      {/* Cost composition */}
      {expenseByCategory.length > 0 && (
        <section className="premium-card overflow-hidden rounded-3xl">
          <div className="flex items-baseline justify-between gap-4 border-b border-[#dbdbdb]/60 p-4 sm:p-5 dark:border-[#243244]">
            <h3 className="font-heading text-base font-bold text-[#212121] sm:text-lg dark:text-white">
              Where the money goes
            </h3>
            <span className="shrink-0 font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
              {expenseEntries.length} {expenseEntries.length === 1 ? 'category' : 'categories'}
            </span>
          </div>

          <div className="grid grid-cols-1 items-center gap-1 p-3 sm:grid-cols-[210px_minmax(0,1fr)] sm:gap-6 sm:p-5">
            <div
              className="relative h-[190px] min-w-0 sm:h-[210px]"
              role="img"
              aria-label={`Spending across ${expenseEntries.length} categories. ${topExpenseCategory?.[0] || 'No category'} is the largest at ${topExpenseShare} percent.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CategoryTooltip />} />
                  <Pie data={expenseByCategory} dataKey="value" nameKey="label" cx="50%" cy="50%"
                    innerRadius="70%" outerRadius="92%" paddingAngle={3} cornerRadius={6} stroke="none">
                    {expenseByCategory.map((item) => (
                      <Cell key={item.id} fill={item.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-xl font-bold tabular-nums text-[#212121] sm:text-2xl dark:text-white">
                  ₹{totalExpense >= 1000 ? `${Math.round(totalExpense / 1000)}k` : totalExpense}
                </span>
                <span className="mt-0.5 font-sans text-xs text-[#9e9e9e]">Total spend</span>
              </div>
            </div>

            {/* The share column right-aligns to the same edge as every other figure on the page. */}
            <div className="min-w-0">
              <Table>
                <TableBody>
                  {expenseByCategory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="py-2">
                        <span className="flex min-w-0 items-center gap-2 font-sans text-xs text-[#575757] dark:text-[#cbd5e1]">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="truncate" title={item.label}>{item.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right font-sans text-xs font-bold tabular-nums text-[#212121] dark:text-white">
                        ₹{rupees(item.value)}
                      </TableCell>
                      <TableCell className="w-12 py-2 text-right font-sans text-xs tabular-nums text-[#9e9e9e]">
                        {totalExpense ? Math.round((item.value / totalExpense) * 100) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}

      {/* Transaction history */}
      <section className="premium-card overflow-hidden rounded-3xl">
        <div className="flex flex-col gap-3 border-b border-[#dbdbdb]/60 p-4 sm:p-5 dark:border-[#243244]">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-heading text-base font-bold text-[#212121] sm:text-lg dark:text-white">
              Transaction history
            </h3>
            <span className="shrink-0 font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
              {historyFiltered
                ? `${historyRows.length} of ${transactions.length} shown`
                : `${transactions.length} ${transactions.length === 1 ? 'entry' : 'entries'}`}
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <JisIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#9e9e9e]">
                search
              </JisIcon>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowAllLogs(false); }}
                placeholder="Search entry or category"
                aria-label="Search transaction history"
                className="min-h-10 w-full rounded-xl border border-[#dbdbdb] bg-[#f0f0f0] py-2 pl-9 pr-9 font-sans text-xs text-[#212121] outline-none transition-all focus:border-[#3fc073] focus:bg-white focus:ring-4 focus:ring-[#3fc073]/15 dark:border-[#243244] dark:bg-[#0b1422] dark:text-white"
              />
              {query && (
                <Button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#808080] hover:text-[#212121] dark:hover:text-white"
                >
                  <JisIcon className="text-[16px]">close</JisIcon>
                </Button>
              )}
            </div>

            {/* Segmented type filter */}
            <div className="flex shrink-0 rounded-xl border border-[#dbdbdb] bg-[#f0f0f0] p-0.5 dark:border-[#243244] dark:bg-[#0b1422]">
              {([['all', 'All'], ['income', 'Income'], ['expense', 'Expense']] as const).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  onClick={() => { setTypeFilter(value); setShowAllLogs(false); }}
                  aria-pressed={typeFilter === value}
                  className={`min-h-9 flex-1 rounded-lg px-3 font-sans text-xs font-bold transition-colors sm:flex-initial ${
                    typeFilter === value
                      ? 'bg-white text-[#212121] shadow-xs dark:bg-[#172435] dark:text-white'
                      : 'text-[#808080] hover:text-[#212121] dark:text-[#94a3b8] dark:hover:text-white'
                  }`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f0f0] text-[#808080] dark:bg-[#111c2b]">
              <JisIcon className="text-[24px]">{historyFiltered ? 'search_off' : 'receipt_long'}</JisIcon>
            </span>
            <h4 className="mt-3 font-heading font-bold text-[#212121] dark:text-white">
              {historyFiltered ? 'Nothing matches those filters' : 'No entries in this period'}
            </h4>
            <p className="mx-auto mt-1 max-w-xs font-sans text-xs text-[#808080]">
              {historyFiltered
                ? 'Clear the search or switch back to All to see every entry.'
                : 'Widen the period, or record an entry to start the ledger.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: the data grid */}
            <div className="hidden px-2 pb-2 sm:block sm:px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <SortHeader label="Date" active={sortKey === 'date'} asc={sortAsc} onClick={() => toggleSort('date')} />
                    <TableHead>Entry</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <SortHeader label="Amount" align="right" active={sortKey === 'amount'} asc={sortAsc} onClick={() => toggleSort('amount')} />
                    <TableHead className="w-[7.5rem] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleHistory.map((item) => {
                    const income = item.type === 'income' && item.amount >= 0;
                    // Fee collections are owned by the payments ledger: they can be opened as a
                    // receipt, but never edited or deleted from here.
                    const linkedToPayment = Boolean(item.feePaymentId);
                    const mutable = canManage && !linkedToPayment;
                    return (
                      <TableRow key={item.id} className={deletingId === item.id ? 'opacity-50' : undefined}>
                        <TableCell className="whitespace-nowrap font-sans text-sm text-[#808080] dark:text-[#94a3b8]">
                          {item.date}
                        </TableCell>
                        <TableCell className="max-w-[20rem] truncate font-sans text-sm font-bold text-[#212121] dark:text-white" title={item.title}>
                          {item.title}
                        </TableCell>
                        <TableCell className="font-sans text-sm text-[#575757] dark:text-[#cbd5e1]">{item.category}</TableCell>
                        <TableCell>
                          <Badge size="sm" variant={income ? 'success' : 'destructive'}>
                            {income ? 'Income' : 'Expense'}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-sans text-sm font-bold tabular-nums ${
                            income ? 'text-[#2b824e] dark:text-[#6bd194]' : 'text-[#ef4444]'
                          }`}
                        >
                          {income ? '+' : '−'}₹{rupees(item.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            {linkedToPayment && (
                              <RowAction
                                icon="receipt_long"
                                label={`Open receipt for ${item.title}`}
                                title="Open receipt"
                                onClick={() => onOpenReceipt(item.feePaymentId!)}
                              />
                            )}
                            {mutable && (
                              <RowAction
                                icon="edit"
                                label={`Edit ${item.title}`}
                                title="Edit entry"
                                onClick={() => onEditTransaction(item)}
                              />
                            )}
                            {mutable && (
                              <RowAction
                                icon="delete"
                                label={`Delete ${item.title}`}
                                title="Delete entry"
                                destructive
                                disabled={deletingId === item.id}
                                onClick={() => removeTransaction(item)}
                              />
                            )}
                            {!linkedToPayment && !mutable && (
                              <span className="font-sans text-xs text-[#c2c2c2] dark:text-[#475569]">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableCell colSpan={4} className="font-sans text-xs font-bold text-[#808080] dark:text-[#94a3b8]">
                      {historyFiltered ? 'Net of shown entries' : `Net for ${rangeLabel}`}
                    </TableCell>
                    <TableCell
                      className={`text-right font-sans text-sm font-bold tabular-nums ${
                        filteredNet < 0 ? 'text-[#ef4444]' : 'text-[#2b824e] dark:text-[#6bd194]'
                      }`}
                    >
                      {filteredNet < 0 ? '−' : '+'}₹{rupees(filteredNet)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Mobile: one card per entry, actions on a second line */}
            <div className="divide-y divide-[#dbdbdb]/60 sm:hidden dark:divide-[#243244]">
              {visibleHistory.map((item) => {
                const income = item.type === 'income' && item.amount >= 0;
                const linkedToPayment = Boolean(item.feePaymentId);
                const mutable = canManage && !linkedToPayment;
                return (
                  <div key={item.id} className={`px-4 py-3 ${deletingId === item.id ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-sans text-xs font-bold text-[#212121] dark:text-white">{item.title}</div>
                        <div className="mt-0.5 truncate font-sans text-xs text-[#808080] dark:text-[#94a3b8]">
                          {item.date} · {item.category}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-sans text-xs font-bold tabular-nums ${
                          income ? 'text-[#2b824e] dark:text-[#6bd194]' : 'text-[#ef4444]'
                        }`}
                      >
                        {income ? '+' : '−'}₹{rupees(item.amount)}
                      </span>
                    </div>
                    {(linkedToPayment || mutable) && (
                      <div className="mt-2 flex items-center gap-1">
                        {linkedToPayment && (
                          <RowAction icon="receipt_long" label={`Open receipt for ${item.title}`} title="Receipt"
                            onClick={() => onOpenReceipt(item.feePaymentId!)} />
                        )}
                        {mutable && (
                          <RowAction icon="edit" label={`Edit ${item.title}`} title="Edit"
                            onClick={() => onEditTransaction(item)} />
                        )}
                        {mutable && (
                          <RowAction icon="delete" label={`Delete ${item.title}`} title="Delete" destructive
                            disabled={deletingId === item.id} onClick={() => removeTransaction(item)} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {historyRows.length > LOG_PAGE_SIZE && (
              <div className="border-t border-[#dbdbdb]/60 p-3 text-center dark:border-[#243244]">
                <Button
                  type="button"
                  onClick={() => setShowAllLogs((v) => !v)}
                  className="min-h-9 rounded-xl px-3 font-sans text-xs font-bold text-[#3fc073] hover:bg-[#e9f7ee] dark:text-[#b3e6c7] dark:hover:bg-[#3fc073]/20"
                >
                  {showAllLogs
                    ? `Show first ${LOG_PAGE_SIZE}`
                    : `Show all ${historyRows.length} entries`}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Mobile quick actions: header + charge buttons live behind one floating button */}
      <MobileSpeedDial
        openLabel="Collect fee, record entry or add charge"
        actions={[
          ...(canManage ? [
            { label: 'Add charge', icon: 'post_add', tone: 'from-[#f5b041] to-[#f59e0b] shadow-[#f59e0b]/35', onClick: onOpenAddCharge },
            { label: 'Record entry', icon: 'receipt_long', tone: 'from-[#4fb3dc] to-[#379fc8] shadow-[#379fc8]/35', onClick: onOpenAddTransaction },
          ] : []),
          { label: 'Collect fee', icon: 'payments', tone: 'from-[#3fc073] to-[#35a160] shadow-[#3fc073]/35', onClick: () => onOpenRecordFee() },
        ]}
      />
    </div>
  );
};

/**
 * One column of the position band. The rupee sign is set smaller and muted so the digits, not
 * the symbol, form the vertical rhythm shared with every other figure on the page.
 */
function Figure({
  label, amount, tone, signed = false, current, prior, priorLabel, betterWhen, caption, children,
}: {
  label: string;
  amount: number;
  tone: 'positive' | 'negative';
  signed?: boolean;
  current: number;
  prior: number | null;
  priorLabel: string;
  betterWhen: 'up' | 'down';
  caption?: string;
  children?: React.ReactNode;
}) {
  const color = tone === 'positive'
    ? 'text-[#2b824e] dark:text-[#6bd194]'
    : 'text-[#ef4444] dark:text-[#f87171]';

  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-sans text-xs font-semibold text-[#808080] dark:text-[#94a3b8]">{label}</span>
        <Delta current={current} prior={prior} priorLabel={priorLabel} betterWhen={betterWhen} />
      </div>
      <div className="mt-2.5 flex items-baseline gap-0.5">
        <span className={`font-heading text-lg font-semibold opacity-70 sm:text-xl ${color}`}>
          {signed && amount < 0 ? '−₹' : '₹'}
        </span>
        <span className={`font-heading text-2xl font-bold tracking-tight tabular-nums sm:text-3xl ${color}`}>
          {rupees(amount)}
        </span>
      </div>
      {caption && <p className="mt-1.5 font-sans text-xs text-[#9e9e9e]">{caption}</p>}
      {children}
    </div>
  );
}

/** Period-over-period movement. Renders nothing when there is no comparable prior window. */
function Delta({ current, prior, priorLabel, betterWhen }: {
  current: number; prior: number | null; priorLabel: string; betterWhen: 'up' | 'down';
}) {
  if (prior === null || prior === 0) return null;
  const change = Math.round(((current - prior) / Math.abs(prior)) * 100);
  if (change === 0) {
    return <span className="font-sans text-xs text-[#9e9e9e]" title={`No change from ${priorLabel}`}>No change</span>;
  }
  const rising = change > 0;
  const good = betterWhen === 'up' ? rising : !rising;
  return (
    <span
      title={`${rising ? 'Up' : 'Down'} ${Math.abs(change)}% from ${priorLabel}`}
      className={`inline-flex shrink-0 items-center gap-0.5 font-sans text-xs font-bold tabular-nums ${
        good ? 'text-[#2b824e] dark:text-[#6bd194]' : 'text-[#ef4444] dark:text-[#f87171]'
      }`}
    >
      <JisIcon className="text-[14px]">{rising ? 'trending_up' : 'trending_down'}</JisIcon>
      {Math.abs(change)}%
    </span>
  );
}

/** A sortable column head. The arrow only appears on the column actually driving the order. */
function SortHeader({ label, active, asc, onClick, align = 'left' }: {
  label: string; active: boolean; asc: boolean; onClick: () => void; align?: 'left' | 'right';
}) {
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Sort by ${label.toLowerCase()}, ${active && asc ? 'descending' : 'ascending'}`}
        className={`inline-flex items-center gap-1 rounded-md transition-colors hover:text-[#212121] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3fc073]/40 dark:hover:text-white ${
          active ? 'text-[#212121] dark:text-white' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {active && <JisIcon className="text-[14px]">{asc ? 'arrow_upward' : 'arrow_downward'}</JisIcon>}
      </button>
    </TableHead>
  );
}

/** A single icon action on a history row. */
function RowAction({ icon, label, title, onClick, destructive = false, disabled = false }: {
  icon: string; label: string; title: string; onClick: () => void; destructive?: boolean; disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#9e9e9e] transition-colors active:scale-95 disabled:opacity-40 ${
        destructive
          ? 'hover:bg-rose-50 hover:text-[#ef4444] dark:hover:bg-rose-950/40'
          : 'hover:bg-[#e9f7ee] hover:text-[#2b824e] dark:hover:bg-[#172435] dark:hover:text-[#b3e6c7]'
      }`}
    >
      <JisIcon className="text-[17px]">{icon}</JisIcon>
    </Button>
  );
}

function CategoryTooltip({ active, payload }: { active?: boolean; payload?: readonly { name?: string; value?: number | string }[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const amount = Number(item.value || 0);

  return (
    <div className="rounded-xl border border-[#dbdbdb] bg-white/95 px-3 py-2 shadow-xl backdrop-blur-xl dark:border-[#243244] dark:bg-[#0b1422]/95">
      <div className="font-sans text-xs font-bold text-[#212121] dark:text-white">{item.name}</div>
      <div className="mt-0.5 font-sans text-xs text-[#808080] dark:text-[#94a3b8]">₹{amount.toLocaleString('en-IN')}</div>
    </div>
  );
}
