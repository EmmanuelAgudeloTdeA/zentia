import { useId } from 'react';

interface ZentiaMarkProps {
  className?: string;
}

/** Isotipo de Zentia: se usa mientras la empresa no haya subido su logo. */
export function ZentiaMark({ className }: ZentiaMarkProps) {
  const id = useId();
  const top = `${id}-top`;
  const bottom = `${id}-bottom`;

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={top} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="[stop-color:var(--color-brand-blue)]" />
          <stop offset="1" className="[stop-color:var(--color-brand-teal)]" />
        </linearGradient>
        <linearGradient id={bottom} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="[stop-color:var(--color-brand-periwinkle)]" />
          <stop offset="1" className="[stop-color:var(--color-brand-violet)]" />
        </linearGradient>
      </defs>
      <path d="M58 33 H84 L44 69 H17 Z" className="fill-brand-indigo" />
      <path d="M33 13 H79 A10.5 10.5 0 0 1 79 34 H21 Z" fill={`url(#${top})`} />
      <path d="M22 66 H81 L69 87 H22 A10.5 10.5 0 0 1 22 66 Z" fill={`url(#${bottom})`} />
    </svg>
  );
}
