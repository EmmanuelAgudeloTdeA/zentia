import {
  ORDER_CANCEL_REASON_MAX_LENGTH,
  type ChangeOrderStatusRequest,
  type OrderDto,
} from '@zentia/shared';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { errorKey, isApiError } from '../../../core/errors';
import { formatCop, formatDateTime, formatPercent, formatQuantity } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Alert,
  BanIcon,
  BoxIcon,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorMessage,
  SectionCard,
  Skeleton,
  TextArea,
  toast,
  TotalsSummary,
  type DataTableColumn,
} from '../../../shared/ui';
import { ordersService } from '../services/orders.service';
import { OrderStatusBadge } from './order-status-badge';

const ORDERS_PATH = '/orders';

type Pending = 'deliver' | 'cancel' | null;

function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-overline text-neutral-500 uppercase">{label}</dt>
      <dd className="mt-1 text-body text-neutral-900">{children}</dd>
    </div>
  );
}

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; order: OrderDto }
  >({ status: 'loading' });
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    setActionError(null);
    try {
      setState({ status: 'ready', order: await ordersService.get(id) });
    } catch (error) {
      setState({ status: 'error', error });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === 'loading') {
    return (
      <div className="space-y-5" aria-busy="true">
        <PageHeader title={<Skeleton className="h-8 w-40 bg-white/20" />} backTo={ORDERS_PATH} />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.code === 'ORDER_NOT_FOUND';
    return (
      <>
        <PageHeader title={t('orders.title')} backTo={ORDERS_PATH} />
        {notFound ? (
          <EmptyState
            icon={<BoxIcon size={40} />}
            title={t('orders.notFound')}
            action={
              <Link to={ORDERS_PATH} className="text-primary-600 hover:underline">
                {t('orders.backToList')}
              </Link>
            }
          />
        ) : (
          <ErrorMessage error={state.error} onRetry={() => void load()} />
        )}
      </>
    );
  }

  const order = state.order;
  const number = order.displayNumber;
  const allowed = new Set(order.allowedActions);

  const change = async (to: ChangeOrderStatusRequest['to'], message: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await ordersService.changeStatus(order.id, {
        to,
        updatedAt: order.updatedAt,
        ...(to === 'CANCELLED' && reason.trim() ? { reason: reason.trim() } : {}),
      });
      setState({ status: 'ready', order: updated });
      setPending(null);
      setReason('');
      toast.success(message);
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const closeCancel = () => {
    setPending(null);
    setActionError(null);
  };

  const conflict = isApiError(actionError) && actionError.code === 'ORDER_CONFLICT';
  const errorAlert = actionError ? (
    conflict ? (
      <Alert
        tone="warning"
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            {t('orders.reload')}
          </Button>
        }
      >
        {t('orders.conflict')}
      </Alert>
    ) : (
      <Alert tone="danger">{t(errorKey(actionError))}</Alert>
    )
  ) : null;

  const lineColumns: DataTableColumn<OrderDto['items'][number]>[] = [
    {
      key: 'product',
      header: t('quotes.editor.product'),
      cell: (item) => (
        <span>
          <span className="block font-medium text-neutral-900">{item.productName}</span>
          <span className="text-body-sm text-neutral-500">{item.category}</span>
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: t('quotes.editor.unitPrice'),
      cell: (item) => formatCop(item.unitPrice),
      align: 'right',
    },
    {
      key: 'vatRate',
      header: t('quotes.editor.vatRate'),
      cell: (item) => t(`enums.VatRate.${item.vatRate}`),
      align: 'right',
      secondary: true,
    },
    {
      key: 'quantity',
      header: t('quotes.editor.quantity'),
      cell: (item) => formatQuantity(item.quantity),
      align: 'right',
    },
    {
      key: 'lineAmount',
      header: t('quotes.editor.lineAmount'),
      cell: (item) => formatCop(item.lineAmount),
      align: 'right',
    },
  ];

  const dates: [string, string | null][] = [
    [t('orders.dates.createdAt'), order.createdAt],
    [t('orders.dates.inProgressAt'), order.inProgressAt],
    [t('orders.dates.deliveredAt'), order.deliveredAt],
    [t('orders.dates.cancelledAt'), order.cancelledAt],
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{number}</span>
            <OrderStatusBadge status={order.status} />
          </span>
        }
        description={order.customer.name}
        backTo={ORDERS_PATH}
        actions={
          <>
            {allowed.has('startProgress') ? (
              <Button
                variant="on-dark"
                loading={busy}
                onClick={() => void change('IN_PROGRESS', t('orders.toast.inProgress', { number }))}
              >
                {t('orders.actions.startProgress')}
              </Button>
            ) : null}
            {allowed.has('deliver') ? (
              <Button variant="on-dark" onClick={() => setPending('deliver')}>
                {t('orders.actions.deliver')}
              </Button>
            ) : null}
            {allowed.has('cancel') ? (
              <Button
                variant="danger-outline"
                icon={<BanIcon size={16} />}
                onClick={() => setPending('cancel')}
              >
                {t('orders.actions.cancel')}
              </Button>
            ) : null}
            <Link
              to={`/quotes/${order.quote.id}`}
              className="inline-flex h-10 items-center rounded-md px-4 text-button text-white/90 uppercase hover:bg-white/10 hover:text-white"
            >
              {t('orders.actions.viewQuote')}
            </Link>
          </>
        }
      />

      <div className="space-y-5">
        {pending === null ? errorAlert : null}
        <Alert tone="info">{t('orders.noInventoryNotice')}</Alert>
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div className="space-y-5">
            <SectionCard title={t('quotes.detail.summary')}>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DataItem label={t('orders.sourceQuote')}>
                  <Link
                    to={`/quotes/${order.quote.id}`}
                    className="font-mono text-primary-600 hover:underline"
                  >
                    {order.quote.displayNumber}
                  </Link>
                </DataItem>
                <DataItem label={t('orders.customer')}>{order.customer.name}</DataItem>
                <DataItem label={t('orders.owner')}>{order.owner.name}</DataItem>
                {dates
                  .filter(([, value]) => value !== null)
                  .map(([label, value]) => (
                    <DataItem key={label} label={label}>
                      {formatDateTime(value ?? '')}
                    </DataItem>
                  ))}
                {order.status === 'CANCELLED' ? (
                  <DataItem label={t('orders.cancelReason')}>
                    {order.cancelReason ?? t('orders.noReason')}
                  </DataItem>
                ) : null}
              </dl>
            </SectionCard>
            <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
              <h2 className="px-5 pt-5 text-overline font-bold tracking-wider text-neutral-800 uppercase">
                {t('orders.lines')}
              </h2>
              <DataTable
                caption={t('orders.lines')}
                columns={lineColumns}
                rows={order.items}
                rowKey={(item) => item.id}
                mobileCard={(item) => (
                  <div className="flex justify-between gap-3">
                    <span>
                      <span className="block font-medium">{item.productName}</span>
                      <span className="text-body-sm text-neutral-500">
                        {formatQuantity(item.quantity)} × {formatCop(item.unitPrice)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatCop(item.lineAmount)}</span>
                  </div>
                )}
              />
            </section>
          </div>
          <TotalsSummary
            rows={[
              {
                key: 'subtotal',
                label: t('quotes.totals.subtotal'),
                value: formatCop(order.subtotal),
              },
              {
                key: 'discount',
                label: t('quotes.totals.discount', { pct: formatPercent(order.discountPct) }),
                value: `− ${formatCop(order.discountAmount)}`,
              },
              {
                key: 'linesVat',
                label: t('quotes.totals.linesVat'),
                value: formatCop(order.linesVat),
              },
              {
                key: 'shipping',
                label: t('quotes.totals.shipping'),
                value: formatCop(order.shippingAmount),
              },
              ...(order.shippingVat !== '0'
                ? [
                    {
                      key: 'shippingVat',
                      label: t('quotes.totals.shippingVat'),
                      value: formatCop(order.shippingVat),
                    },
                  ]
                : []),
            ]}
            totalLabel={t('quotes.totals.total')}
            total={formatCop(order.total)}
          />
        </div>
      </div>

      {pending === 'deliver' ? (
        <ConfirmDialog
          title={t('orders.deliver.title', { number })}
          description={t('orders.deliver.description')}
          confirmLabel={t('orders.actions.deliver')}
          confirmVariant="primary"
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={errorAlert}
          onConfirm={() => void change('DELIVERED', t('orders.toast.delivered', { number }))}
          onCancel={() => {
            setPending(null);
            setActionError(null);
          }}
        />
      ) : null}
      {pending === 'cancel' ? (
        <Dialog
          size="sm"
          title={t('orders.cancel.title', { number })}
          description={t('orders.cancel.description', { number, quote: order.quote.displayNumber })}
          onClose={closeCancel}
          closeLabel={t('common.close')}
          footer={
            <>
              <Button variant="secondary" onClick={closeCancel} disabled={busy}>
                {t('orders.cancel.back')}
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={() => void change('CANCELLED', t('orders.toast.cancelled', { number }))}
              >
                {t('orders.actions.cancel')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <TextArea
              label={t('orders.cancel.reason')}
              rows={3}
              maxLength={ORDER_CANCEL_REASON_MAX_LENGTH}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              hint={`${reason.length} / ${ORDER_CANCEL_REASON_MAX_LENGTH}`}
            />
            {errorAlert}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
