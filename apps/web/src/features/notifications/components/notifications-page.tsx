import { DEFAULT_PAGE_SIZE, type NotificationDto, type NotificationListDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { errorKey } from '../../../core/errors';
import { formatDateTime } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Alert,
  Button,
  BellIcon,
  EmptyState,
  ErrorMessage,
  FilterChip,
  Pagination,
  Select,
  Skeleton,
  toast,
} from '../../../shared/ui';
import { ProbabilityBadge } from '../../ai';
import { QuoteStatusBadge } from '../../quotes';
import {
  markNotificationRead,
  notificationsService,
  refreshUnreadCount,
  type NotificationSort,
} from '../services/notifications.service';
import { useNotificationText } from './notification-text';

export function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const text = useNotificationText();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NotificationSort>('probability');
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: NotificationListDto }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      setState({
        status: 'ready',
        data: await notificationsService.list({
          unreadOnly,
          sort,
          page,
          pageSize: DEFAULT_PAGE_SIZE,
        }),
      });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [unreadOnly, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (notification: NotificationDto) => {
    if (!notification.readAt) void markNotificationRead(notification.id);
    navigate(`/quotes/${notification.quote.id}`);
  };

  const markAll = async () => {
    try {
      await notificationsService.markAllRead();
    } catch (error) {
      toast.error(t(errorKey(error)));
      return;
    }
    await refreshUnreadCount();
    toast.success(t('notifications.markedAll'));
    void load();
  };

  const filter = (value: boolean) => {
    setUnreadOnly(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        actions={
          <Button variant="on-dark" onClick={() => void markAll()}>
            {t('notifications.markAllRead')}
          </Button>
        }
      />
      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 p-4">
          <div className="flex gap-2">
            <FilterChip active={!unreadOnly} onClick={() => filter(false)}>
              {t('notifications.all')}
            </FilterChip>
            <FilterChip active={unreadOnly} onClick={() => filter(true)}>
              {t('notifications.unreadOnly')}
            </FilterChip>
          </div>
          <Select
            label={t('notifications.sort.label')}
            className="sm:w-64"
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as NotificationSort);
              setPage(1);
            }}
            options={[
              { value: 'probability', label: t('notifications.sort.probability') },
              { value: 'date', label: t('notifications.sort.date') },
            ]}
          />
        </div>
        {state.status === 'ready' && sort === 'probability' && state.data.sort === 'date' ? (
          <div className="px-4 pt-4">
            <Alert tone="info">{t('notifications.sort.fallbackNotice')}</Alert>
          </div>
        ) : null}
        {state.status === 'loading' ? (
          <div className="space-y-3 p-4" aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={() => void load()} />
          </div>
        ) : state.data.items.length === 0 ? (
          <EmptyState
            icon={<BellIcon size={40} />}
            title={unreadOnly ? t('notifications.emptyUnread') : t('notifications.empty')}
            action={
              unreadOnly ? (
                <Button variant="secondary" onClick={() => filter(false)}>
                  {t('notifications.all')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-neutral-200">
              {state.data.items.map((item) => {
                const resolved = item.quote.status !== 'SENT';
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${
                        item.readAt ? '' : 'bg-primary-50'
                      } ${resolved ? 'opacity-60' : ''}`}
                    >
                      <span
                        className={`mt-2 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-primary-600'}`}
                        aria-label={item.readAt ? undefined : t('notifications.unread')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-body text-neutral-900">{text(item)}</span>
                        <span className="text-caption text-neutral-500">
                          {formatDateTime(item.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <QuoteStatusBadge status={item.quote.status} size="sm" />
                        {item.probability !== null ? (
                          <ProbabilityBadge
                            compact
                            probability={{
                              quoteId: item.quote.id,
                              probability: item.probability,
                              label: 'RULES_ESTIMATE',
                              factors: [],
                            }}
                          />
                        ) : null}
                        {resolved ? (
                          <span className="text-caption text-neutral-500">
                            {t('notifications.resolved')}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={state.data.page}
              pageSize={state.data.pageSize}
              total={state.data.total}
              onPageChange={setPage}
              summary={(range) => t('common.pagination', range)}
              previousLabel={t('common.previousPage')}
              nextLabel={t('common.nextPage')}
            />
          </>
        )}
      </section>
    </>
  );
}
