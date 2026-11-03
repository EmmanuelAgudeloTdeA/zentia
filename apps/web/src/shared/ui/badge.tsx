import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'neutral' | 'info' | 'warning' | 'danger';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'border-success-border bg-success-bg text-success-fg',
  neutral: 'border-neutral-300 bg-neutral-100 text-neutral-700',
  info: 'border-info-border bg-info-bg text-info-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
};

interface BadgeProps {
  tone: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({ tone, icon, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-caption font-medium whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
