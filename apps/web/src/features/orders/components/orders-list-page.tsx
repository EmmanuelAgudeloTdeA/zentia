import {
  DEFAULT_PAGE_SIZE,
  ORDER_STATUSES,
  type OrderListDto,
  type OrderSummaryDto,
} from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { formatCop, formatDate } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Alert,
  BoxIcon,
  Button,
  DataTable,
  EmptyState,
  ErrorMessage,
  EyeIcon,
  FilterChip,
  Pagination,
  RowActionLink,
  SearchIcon,
  TextField,
  type DataTableColumn,
} from '../../../shared/ui';
import { useDebouncedValue } from '../../../shared/lib';
import { ordersService } from '../services/orders.service';
import { useOrdersFiltersStore } from '../store/orders-filters.store';
import { OrderStatusBadge } from './order-status-badge';

export function OrdersListPage() {
  const { t } = useTranslation();
  const role = useSessionStore((state) => state.user?.role);
  const seesAll = role === 'MANAGER' || role === 'ADMIN';
  const filters = useOrdersFiltersStore();
  const search = useDebouncedValue(filters.q.trim(), 250);
  const statusKey = filters.statuses.join(',');
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: OrderListDto }
  >({ status: 'loading' });

  const load = useCallback(async () => {
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    try {
      const data = await ordersService.list({
        statuses: statusKey ? (statusKey.split(',') as typeof filters.statuses) : [],
        q: search || undefined,
        page: filters.page,
        pageSize: DEFAULT_PAGE_SIZE,
      });
      setState({ status: 'ready', data });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [statusKey, search, filters.page]);

  useEffect(() => {
    void load();
  }, [load]);

  const navigate = useNavigate();
  const filtered = filters.statuses.length > 0 || filters.q.trim() !== '';
  const numberLink = (order: OrderSummaryDto) => (
    <Link
      to={`/orders/${order.id}`}
      className="font-mono font-medium text-primary-600 hover:underline"
    >
      {order.displayNumber}
    </Link>
  );

  const columns: DataTableColumn<OrderSummaryDto>[] = [
    { key: 'number', header: t('orders.number'), cell: numberLink },
    {
      key: 'quote',
      header: t('orders.sourceQuote'),
      cell: (order) => (
        <Link
          to={`/quotes/${order.quote.id}`}
          className="font-mono text-body-sm text-neutral-700 hover:underline"
        >
          {order.quote.displayNumber}
        </Link>
      ),
      secondary: true,
    },
    { key: 'customer', header: t('orders.customer'), cell: (order) => order.customer.name },
    ...(seesAll
      ? [
          {
            key: 'owner',
            header: t('orders.owner'),
            cell: (order: OrderSummaryDto) => order.owner.name,
            secondary: true,
          },
        ]
      : []),
    {
      key: 'total',
      header: t('orders.total'),
      cell: (order) => formatCop(order.total),
      align: 'right',
    },
    {
      key: 'createdAt',
      header: t('orders.createdAt'),
      cell: (order) => formatDate(order.createdAt),
      secondary: true,
    },
    {
      key: 'status',
      header: t('orders.status'),
      cell: (order) => <OrderStatusBadge status={order.status} />,
    },
  ];

  return (
    <>
      <PageHeader title={t('orders.title')} />
      <div className="mb-4">
        <Alert tone="info">{t('orders.noInventoryNotice')}</Alert>
      </div>
      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div
            role="group"
            aria-label={t('orders.filters.status')}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            <FilterChip active={filters.statuses.length === 0} onClick={filters.clearStatuses}>
              {t('orders.filters.all')}
            </FilterChip>
            {ORDER_STATUSES.map((status) => (
              <FilterChip
                key={status}
                active={filters.statuses.includes(status)}
                onClick={() => filters.toggleStatus(status)}
              >
                {t(`enums.OrderStatus.${status}`)}
              </FilterChip>
            ))}
          </div>
          <TextField
            label={t('orders.filters.search')}
            type="search"
            className="lg:w-80"
            value={filters.q}
            onChange={(event) => filters.setQ(event.target.value)}
            endAdornment={<SearchIcon size={16} className="mr-2 text-neutral-400" />}
          />
        </div>
        {state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={() => void load()} />
          </div>
        ) : (
          <DataTable
            caption={t('orders.tableCaption')}
            columns={columns}
            rows={state.status === 'ready' ? state.data.items : []}
            rowKey={(order) => order.id}
            onRowClick={(order) => navigate(`/orders/${order.id}`)}
            actionsHeader={t('common.actions.rowActions')}
            rowActions={(order) => (
              <RowActionLink
                to={`/orders/${order.id}`}
                label={t('common.actions.viewDetail')}
                icon={<EyeIcon size={16} />}
              />
            )}
            loading={state.status === 'loading'}
            skeletonRows={8}
            mobileCard={(order) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  {numberLink(order)}
                  <OrderStatusBadge status={order.status} size="sm" />
                </div>
                <p className="truncate text-body text-neutral-900">{order.customer.name}</p>
                <p className="text-right font-semibold tabular-nums">{formatCop(order.total)}</p>
              </div>
            )}
            empty={
              filtered ? (
                <EmptyState
                  icon={<SearchIcon size={40} />}
                  title={t('orders.empty.filteredTitle')}
                  action={
                    <Button variant="secondary" onClick={filters.reset}>
                      {t('common.actions.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={<BoxIcon size={40} />} title={t('orders.empty.title')} />
              )
            }
          />
        )}
        {state.status === 'ready' ? (
          <Pagination
            page={state.data.page}
            pageSize={state.data.pageSize}
            total={state.data.total}
            onPageChange={filters.setPage}
            summary={(range) => t('common.pagination', range)}
            previousLabel={t('common.previousPage')}
            nextLabel={t('common.nextPage')}
          />
        ) : null}
      </section>
    </>
  );
}
