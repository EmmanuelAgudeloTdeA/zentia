import type { ReactNode } from 'react';

export interface TotalsRow {
  key: string;
  label: ReactNode;
  value: string;
}

interface TotalsSummaryProps {
  title?: ReactNode;
  rows: readonly TotalsRow[];
  totalLabel: ReactNode;
  total: string;
  footer?: ReactNode;
}

/** Totales con montos a la derecha y el total destacado. */
export function TotalsSummary({ title, rows, totalLabel, total, footer }: TotalsSummaryProps) {
  return (
    <section className="rounded-xl border border-neutral-200/70 bg-neutral-0 p-5 shadow-sm">
      {title ? (
        <h2 className="mb-3 text-overline font-bold tracking-wider text-neutral-800 uppercase">
          {title}
        </h2>
      ) : null}
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-4 text-body">
            <dt className="text-neutral-600">{row.label}</dt>
            <dd className="text-neutral-900 tabular-nums">{row.value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 border-t border-neutral-200 pt-3">
          <dt className="text-h3 text-neutral-900">{totalLabel}</dt>
          <dd
            className="text-h2 font-bold text-neutral-900 tabular-nums"
            data-testid="totals-total"
          >
            {total}
          </dd>
        </div>
      </dl>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}
