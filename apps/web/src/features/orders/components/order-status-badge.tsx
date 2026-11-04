import type { OrderStatus } from '@zentia/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BanIcon,
  BoxIcon,
  ClockAlertIcon,
  GearIcon,
  StatusBadge,
  type StatusTone,
} from '../../../shared/ui';

/** Misma paleta que las cotizaciones (sistema de diseño, "Estados de cotización"). */
const STYLE: Record<OrderStatus, { tone: StatusTone; icon: ReactNode }> = {
  PENDING: { tone: 'draft', icon: <ClockAlertIcon size={14} /> },
  IN_PROGRESS: { tone: 'sent', icon: <GearIcon size={14} /> },
  DELIVERED: { tone: 'approved', icon: <BoxIcon size={14} /> },
  CANCELLED: { tone: 'voided', icon: <BanIcon size={14} /> },
};

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const { tone, icon } = STYLE[status];
  return (
    <StatusBadge
      tone={tone}
      icon={icon}
      label={t(`enums.OrderStatus.${status}`)}
      {...(size ? { size } : {})}
    />
  );
}
