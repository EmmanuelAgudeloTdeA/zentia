import type { ReactNode } from 'react';

export type StatusTone = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'voided';

const TONE_CLASSES: Record<StatusTone, string> = {
  draft: 'border-status-draft-border bg-status-draft-bg text-status-draft-fg',
  sent: 'border-status-sent-border bg-status-sent-bg text-status-sent-fg',
  approved: 'border-status-approved-border bg-status-approved-bg text-status-approved-fg',
  rejected: 'border-status-rejected-border bg-status-rejected-bg text-status-rejected-fg',
  expired: 'border-status-expired-border bg-status-expired-bg text-status-expired-fg',
  voided: 'border-dashed border-status-voided-border bg-status-voided-bg text-status-voided-fg',
};

interface StatusBadgeProps {
  tone: StatusTone;
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md';
}

/** Badge de estado de solo lectura: color + icono + texto (el color nunca es la única señal). */
export function StatusBadge({ tone, icon, label, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 text-caption font-medium whitespace-nowrap ${
        size === 'sm' ? 'h-5' : 'h-6'
      } ${TONE_CLASSES[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}
