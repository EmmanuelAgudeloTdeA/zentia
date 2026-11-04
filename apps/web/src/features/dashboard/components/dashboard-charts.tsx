import type { DashboardSummaryDto } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCop } from '../../../core/format';

const STATUS_COLORS = {
  approved: 'var(--color-status-approved-fg)',
  rejected: 'var(--color-status-rejected-fg)',
  expired: 'var(--color-status-expired-fg)',
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-200/70 bg-neutral-0 p-5 shadow-sm">
      <h2 className="mb-3 text-overline font-bold tracking-wider text-neutral-800 uppercase">
        {title}
      </h2>
      <div className="h-60">{children}</div>
    </section>
  );
}

/** Se carga en diferido (`React.lazy`): `recharts` va en su propio chunk. */
export default function DashboardCharts({ period }: { period: DashboardSummaryDto['period'] }) {
  const { t } = useTranslation();
  const closing = [
    { key: 'approved', label: t('dashboard.kpi.approved'), value: period.approved },
    { key: 'rejected', label: t('dashboard.kpi.rejected'), value: period.rejected },
    { key: 'expired', label: t('dashboard.kpi.expired'), value: period.expired },
  ] as const;
  // Recharts trabaja con `number`; los montos en COP sin centavos caben de sobra en un `number`.
  const amounts = [
    {
      label: t('dashboard.kpi.quotedAmount'),
      value: Number(period.quotedAmount),
      color: 'var(--color-primary-300)',
    },
    {
      label: t('dashboard.kpi.approvedAmount'),
      value: Number(period.approvedAmount),
      color: 'var(--color-status-approved-fg)',
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title={t('dashboard.charts.closing')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...closing]} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} width={32} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--color-neutral-50)' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
              {closing.map((item) => (
                <Cell key={item.key} fill={STATUS_COLORS[item.key]} />
              ))}
              <LabelList dataKey="value" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title={t('dashboard.charts.amounts')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={amounts} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(value) => formatCop(String(value))}
              cursor={{ fill: 'var(--color-neutral-50)' }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={72}>
              {amounts.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => formatCop(String(value))}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
