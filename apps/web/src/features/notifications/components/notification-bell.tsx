import type { NotificationDto } from '@zentia/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { formatDateTime } from '../../../core/format';
import { NOTIFICATIONS_PATH, useNotificationsStore } from '../../../core/notifications';
import { BellIcon, Button, Skeleton } from '../../../shared/ui';
import { notificationsService, refreshUnreadCount } from '../services/notifications.service';
import { useNotificationText } from './notification-text';

const POLL_MS = 60_000;

/** Campana del encabezado: contador por polling (60 s con la pestaña visible), sin push (RN-34). */
export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSessionStore((state) => state.user);
  const count = useNotificationsStore((state) => state.unreadCount);
  const text = useNotificationText();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const enabled = Boolean(user && !user.mustChangePassword);

  useEffect(() => {
    if (enabled) void refreshUnreadCount();
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshUnreadCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    setFailed(false);
    notificationsService
      .list({ page: 1, pageSize: 10 })
      .then((result) => setItems(result.items))
      .catch(() => setFailed(true));
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!enabled) return null;

  const openNotification = async (notification: NotificationDto) => {
    setOpen(false);
    if (!notification.readAt) {
      useNotificationsStore.getState().decrement();
      void notificationsService.markRead(notification.id).catch(() => undefined);
    }
    navigate(`/quotes/${notification.quote.id}`);
  };

  const markAll = async () => {
    await notificationsService.markAllRead();
    useNotificationsStore.getState().setUnreadCount(0);
    setItems(
      (current) =>
        current?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })) ??
        null,
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t('notifications.bellLabel', { count: count ?? 0 })}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10"
      >
        <BellIcon />
        {count ? (
          <span
            data-testid="unread-count"
            className="absolute -top-0.5 -right-0.5 min-w-5 rounded-full bg-danger-solid px-1 text-center text-caption font-semibold text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-neutral-200 bg-neutral-0 shadow-md sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3">
            <p className="text-h3 text-neutral-900">{t('notifications.title')}</p>
            {count ? (
              <Button variant="ghost" size="sm" onClick={() => void markAll()}>
                {t('notifications.markAllRead')}
              </Button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {failed ? (
              <p className="p-4 text-body-sm text-danger-fg">{t('notifications.loadError')}</p>
            ) : items === null ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-10" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="p-4 text-body-sm text-neutral-600">{t('notifications.empty')}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(item)}
                      className={`flex w-full gap-2 px-4 py-3 text-left hover:bg-neutral-50 ${
                        item.readAt ? '' : 'bg-primary-50'
                      } ${item.quote.status === 'SENT' ? '' : 'opacity-60'}`}
                    >
                      {item.readAt ? null : (
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-600"
                          aria-label={t('notifications.unread')}
                        />
                      )}
                      <span className="min-w-0">
                        <span className="block text-body-sm text-neutral-900">{text(item)}</span>
                        <span className="text-caption text-neutral-500">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            to={NOTIFICATIONS_PATH}
            onClick={() => setOpen(false)}
            className="block border-t border-neutral-200 px-4 py-3 text-center text-body-sm font-medium text-primary-600 hover:bg-neutral-50"
          >
            {t('notifications.viewAll')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
