import type { ReactNode } from 'react';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
}

export function FilterChip({ active, onClick, children, count }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-body-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'border-primary-600 bg-primary-600 text-white'
          : 'border-neutral-200 bg-neutral-0 text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      {children}
      {count !== undefined ? <span className="tabular-nums opacity-80">{count}</span> : null}
    </button>
  );
}
