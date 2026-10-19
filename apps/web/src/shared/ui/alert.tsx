import type { ReactNode } from 'react';
import { AlertCircleIcon, AlertTriangleIcon, CheckCircleIcon, CloseIcon, InfoIcon } from './icons';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_CLASSES: Record<AlertTone, string> = {
  info: 'border-info-border bg-info-bg text-info-fg',
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
};

const TONE_ICONS: Record<AlertTone, ReactNode> = {
  info: <InfoIcon size={18} />,
  success: <CheckCircleIcon size={18} />,
  warning: <AlertTriangleIcon size={18} />,
  danger: <AlertCircleIcon size={18} />,
};

interface AlertProps {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
}

export function Alert({ tone, title, children, action, onClose, closeLabel }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-md border border-l-4 px-4 py-3 ${TONE_CLASSES[tone]}`}
    >
      <span className="mt-px shrink-0">{TONE_ICONS[tone]}</span>
      <div className="min-w-0 flex-1 text-body">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5 text-neutral-700' : ''}>{children}</div> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-m-1 shrink-0 rounded-sm p-1 opacity-70 hover:opacity-100"
        >
          <CloseIcon size={16} />
        </button>
      ) : null}
    </div>
  );
}
