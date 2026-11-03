import type { QuoteStatus } from '@zentia/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BanIcon,
  CheckCircleIcon,
  ClockAlertIcon,
  EditIcon,
  SendIcon,
  StatusBadge,
  XCircleIcon,
  type StatusTone,
} from '../../../shared/ui';

const STYLE: Record<QuoteStatus, { tone: StatusTone; icon: ReactNode }> = {
  DRAFT: { tone: 'draft', icon: <EditIcon size={14} /> },
  SENT: { tone: 'sent', icon: <SendIcon size={14} /> },
  APPROVED: { tone: 'approved', icon: <CheckCircleIcon size={14} /> },
  REJECTED: { tone: 'rejected', icon: <XCircleIcon size={14} /> },
  EXPIRED: { tone: 'expired', icon: <ClockAlertIcon size={14} /> },
  VOIDED: { tone: 'voided', icon: <BanIcon size={14} /> },
};

export function QuoteStatusBadge({ status, size }: { status: QuoteStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const { tone, icon } = STYLE[status];
  return (
    <StatusBadge
      tone={tone}
      icon={icon}
      label={t(`enums.QuoteStatus.${status}`)}
      {...(size ? { size } : {})}
    />
  );
}
