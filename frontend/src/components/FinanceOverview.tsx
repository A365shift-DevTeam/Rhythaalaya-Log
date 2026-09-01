import React, { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { JisIcon } from './JisIcon';
import { Spinner } from './ui/spinner';
import { api } from '../api';
import { CollectionReport, FinanceDashboard } from '../types';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgoStart = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n, 1); return isoDate(d); };
const monthLabel = (period: string) => {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

export const FinanceOverview: React.FC<{ token: string }> = ({ token }) => {
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [trend, setTrend] = useState<CollectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setFailed(false);
    Promise.all([
      api.financeDashboard(token),
      api.collectionReport(token, monthsAgoStart(5), isoDate(new Date()), 'Month'),
    ])
      .then(([d, t]) => { if (!ignore) { setDashboard(d); setTrend(t); } })
      .catch(() => { if (!ignore) setFailed(true); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [token]);

  if (loading) return <div className="premium-card p-6"><Spinner size="xs" inline text="Loading finance overview…" /></div>;
  if (failed || !dashboard) return null;

  const kpis: { label: string; value: number; tone: 'green' | 'red' | 'amber' | 'sky' | 'muted'; icon: string }[] = [
    { label: 'Collected (all time)', value: dashboard.totalCollected, tone: 'green', icon: 'payments' },
    { label: 'Pending', value: dashboard.totalPending, tone: 'amber', icon: 'schedule' },
    { label: 'Overdue', value: dashboard.totalOverdue, tone: 'red', icon: 'warning' },
    { label: 'Collected this month', value: dashboard.collectionThisMonth, tone: 'green', icon: 'calendar_month' },
    { label: 'Student credit', value: dashboard.totalStudentCredit, tone: 'sky', icon: 'account_balance_wallet' },
    { label: 'Written off', value: dashboard.totalWrittenOff, tone: 'muted', icon: 'money_off' },
  ];
  const toneClass: Record<string, string> = {
    green: 'text-[#22c55e]', red: 'text-[#ef4444]', amber: 'text-[#b45309] dark:text-amber-300',
    sky: 'text-[#0369a1] dark:text-sky-300', muted: 'text-[#575757] dark:text-[#cbd5e1]',
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <JisIcon className="text-[20px] text-[#3fc073]">insights</JisIcon>
        <h3 className="font-heading text-lg font-bold text-[#212121] dark:text-white">Fee collection</h3>
        <span className="text-xs text-[#9e9e9e]">Today {inr(dashboard.collectionToday)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="premium-card p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">{kpi.label}</span>
              <JisIcon className="text-[15px] text-[#9e9e9e]">{kpi.icon}</JisIcon>
            </div>
            <div className={`mt-1.5 font-heading text-lg font-bold tabular-nums ${toneClass[kpi.tone]}`}>{inr(kpi.value)}</div>
          </div>
        ))}
      </div>

      {trend && trend.points.length > 0 && (
        <div className="premium-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#808080] dark:text-[#94a3b8]">Net collection · last 6 months</span>
            <span className="text-xs font-bold tabular-nums text-[#22c55e]">{inr(trend.totalNet)}</span>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend.points.map((p) => ({ label: monthLabel(p.period), net: p.net }))}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9e9e9e' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(63,192,115,0.08)' }}
                  formatter={(value: number) => [inr(value), 'Net']}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #dbdbdb' }}
                />
                <Bar dataKey="net" fill="#3fc073" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
};
