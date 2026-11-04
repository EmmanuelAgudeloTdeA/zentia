import type { NotificationDto } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { formatDay } from '../../../core/format';

/** El back guarda tipo + parámetros; el texto se arma aquí en el idioma de la interfaz. */
export function useNotificationText() {
  const { t } = useTranslation();
  return (notification: NotificationDto) => {
    const { params } = notification;
    const expiresAt = typeof params['expiresAt'] === 'string' ? formatDay(params['expiresAt']) : '';
    return t(`notifications.${notification.type}`, { ...params, expiresAt });
  };
}
