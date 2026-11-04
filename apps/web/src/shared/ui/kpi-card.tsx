import type { ReactNode } from 'react';

interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  /** Línea secundaria (monto o explicación). */
  hint?: ReactNode;
  /** Marca de universo: "Estado actual" o el período. */
  tag?: ReactNode;
  onClick?: () => void;
}

/** Tarjeta de indicador del sistema de diseño (`KpiCard`). */
export function KpiCard({ label, value, icon, hint, tag, onClick }: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-overline font-semibold tracking-wider text-neutral-500 uppercase">
          {label}
        </span>
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-kpi font-bold text-neutral-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-body-sm text-neutral-500">{hint}</p> : null}
      {tag ? <p className="mt-2 text-caption font-medium text-primary-700">{tag}</p> : null}
    </>
  );
  const classes =
    'block min-w-56 rounded-xl border border-neutral-200/70 border-b-[3px] border-b-primary-200 bg-neutral-0 p-5 text-left shadow-sm';
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${classes} transition-shadow hover:shadow-md`}
    >
      {content}
    </button>
  ) : (
    <div className={classes}>{content}</div>
  );
}
