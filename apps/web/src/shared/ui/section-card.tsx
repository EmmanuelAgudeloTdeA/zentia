import type { ReactNode } from 'react';

interface SectionCardProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <section
      className={[
        'rounded-xl border border-neutral-200/70 bg-neutral-0 p-5 shadow-sm sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-overline font-bold tracking-wider text-neutral-800 uppercase">
          <span
            aria-hidden="true"
            className="h-3.5 w-1 shrink-0 rounded-full bg-linear-to-b from-brand-teal to-brand-periwinkle"
          />
          {title}
        </h2>
        {actions}
      </div>
      {description ? <p className="mt-2 text-body-sm text-neutral-600">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
