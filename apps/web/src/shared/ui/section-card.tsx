import type { ReactNode } from 'react';

interface SectionCardProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <section
      className={[
        'rounded-lg border border-neutral-200 bg-neutral-0 p-5 shadow-sm sm:p-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <h2 className="border-l-3 border-primary-600 pl-3 text-overline text-neutral-500 uppercase">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
