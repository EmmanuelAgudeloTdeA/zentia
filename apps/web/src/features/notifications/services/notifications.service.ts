import type { NotificationListDto, UnreadCountDto } from '@zentia/shared';
import { request } from '../../../core/http-client';
import { useNotificationsStore } from '../../../core/notifications';

export const notificationsService = {
  list: (query: { unreadOnly?: boolean; page: number; pageSize: number }) =>
    request<NotificationListDto>('GET', '/notifications', { query }),
  unreadCount: () => request<UnreadCountDto>('GET', '/notifications/unread-count'),
  markRead: (id: string) => request<undefined>('POST', `/notifications/${id}/read`),
  markAllRead: () => request<undefined>('POST', '/notifications/read-all'),
};

/** Actualiza el contador de la campana; si falla, la campana queda sin contador. */
export async function refreshUnreadCount(): Promise<void> {
  try {
    const { count } = await notificationsService.unreadCount();
    useNotificationsStore.getState().setUnreadCount(count);
  } catch {
    useNotificationsStore.getState().setUnreadCount(null);
  }
}
