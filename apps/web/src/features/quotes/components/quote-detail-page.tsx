import type { QuoteDto } from '@zentia/shared';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { isApiError } from '../../../core/errors';
import {
  formatCop,
  formatDate,
  formatPercent,
  formatQuantity,
  todayInBogota,
} from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  ActionMenu,
  Alert,
  BanIcon,
  Button,
  DataTable,
  EditIcon,
  EmptyState,
  ErrorMessage,
  FileTextIcon,
  SectionCard,
  SendIcon,
  Skeleton,
  toast,
  TotalsSummary,
  type ActionMenuItem,
  type DataTableColumn,
} from '../../../shared/ui';
import {
  FollowUpAssistantPanel,
  ProbabilityCell,
  useFollowUpHighlight,
  useProbabilities,
} from '../../ai';
import { FollowUpSection } from '../../follow-up';
import { QuoteOrderAction } from '../../orders';
import { useCommercialParameters } from '../hooks/use-commercial-parameters';
import { useQuote, useQuoteHistory } from '../hooks/use-quote';
import { quotesService } from '../services/quotes.service';
import {
  ChangeExpiryDialog,
  ReactivateDialog,
  ReassignDialog,
  SimpleActionDialog,
  VoidQuoteDialog,
  type QuoteDialog,
} from './quote-action-dialogs';
import { expiryLabel } from './quote-format';
import { DownloadPdfButton } from './download-pdf-button';
import { QuoteHistoryTimeline } from './quote-history-timeline';
import { SendQuoteDialog } from './send-quote-dialog';
import { editQuotePath, QUOTES_PATH } from './quote-paths';
import { QuoteStatusBadge } from './quote-status-badge';

const PRIMARY_BY_STATUS: Partial<Record<QuoteDto['status'], QuoteDialog>> = {
  DRAFT: 'send',
  SENT: 'approve',
  EXPIRED: 'reactivate',
  APPROVED: 'duplicate',
  REJECTED: 'duplicate',
};

const MENU_ACTIONS: readonly QuoteDialog[] = [
  'reject',
  'changeExpiry',
  'reassign',
  'duplicate',
  'send',
  'approve',
  'reactivate',
];

function addDaysTo(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-overline text-neutral-500 uppercase">{label}</dt>
      <dd className="mt-1 text-body text-neutral-900">{children}</dd>
    </div>
  );
}

export function QuoteDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { state, reload, replace } = useQuote(id);
  const history = useQuoteHistory(id);
  const params = useCommercialParameters();
  const today = useMemo(() => todayInBogota(), []);
  const [dialog, setDialog] = useState<QuoteDialog | null>(null);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [followUpVersion, setFollowUpVersion] = useState(0);
  const loaded = state.status === 'ready' ? state.data : null;
  const sentIds = useMemo(
    () => (loaded?.status === 'SENT' ? [loaded.id] : []),
    [loaded?.id, loaded?.status],
  );
  const probabilities = useProbabilities(sentIds);
  const highlight = useFollowUpHighlight(
    {
      id,
      customerId: loaded?.customer.id ?? '',
      status: loaded?.status ?? '',
      sentAt: loaded?.sentAt ?? null,
    },
    params.ready ? params.followUpDays : null,
    followUpVersion,
  );

  if (state.status === 'loading') {
    return (
      <div className="space-y-5" aria-busy="true">
        <PageHeader title={<Skeleton className="h-8 w-40 bg-white/20" />} backTo={QUOTES_PATH} />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.code === 'QUOTE_NOT_FOUND';
    return (
      <>
        <PageHeader title={t('quotes.title')} backTo={QUOTES_PATH} />
        {notFound ? (
          <EmptyState
            icon={<FileTextIcon size={40} />}
            title={t('quotes.detail.notFound')}
            action={
              <Link to={QUOTES_PATH} className="text-primary-600 hover:underline">
                {t('quotes.detail.backToList')}
              </Link>
            }
          />
        ) : (
          <ErrorMessage error={state.error} onRetry={() => void reload()} />
        )}
      </>
    );
  }

  const quote = state.data;
  const number = quote.displayNumber;
  const allowed = new Set(quote.allowedActions);
  const canShare = allowed.has('share');
  // Con M5, "Enviar" (canales) es la acción principal del Borrador y "Marcar como enviada" pasa al menú.
  // Con M5, "Enviar" es la acción principal del Borrador; con M7, "Convertir en pedido" la de una
  // Aprobada sin pedido (G3). La acción desplazada pasa a "Más acciones".
  const primary =
    (canShare && quote.status === 'DRAFT') || allowed.has('convertToOrder')
      ? undefined
      : PRIMARY_BY_STATUS[quote.status];
  const expiry = expiryLabel(t, quote.status, quote.expiresAt, today, params.expiringAlertDays);

  const reloadAll = () => {
    setDialog(null);
    setActionError(null);
    void reload();
    void history.reload();
  };

  const closeDialog = () => {
    setDialog(null);
    setActionError(null);
  };

  const run = async (action: () => Promise<QuoteDto>, message: (quote: QuoteDto) => string) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await action();
      replace(updated);
      void history.reload();
      toast.success(message(updated));
      setDialog(null);
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await quotesService.duplicate(quote.id);
      toast.success(t('quotes.toast.duplicated', { number: result.quote.displayNumber }));
      const omittedNames = quote.items
        .filter((item) => result.omittedProductIds.includes(item.productId))
        .map((item) => item.productName);
      navigate(editQuotePath(result.quote.id), {
        state: {
          duplicate: {
            number: result.quote.displayNumber,
            omittedNames,
            discountReset: result.discountReset,
          },
        },
      });
    } catch (error) {
      setActionError(error);
      setBusy(false);
    }
  };

  const actionLabel = (action: QuoteDialog) => t(`quotes.actions.${action}`);
  const menuItems: ActionMenuItem[] = MENU_ACTIONS.filter(
    (action) => action !== primary && allowed.has(action),
  ).map((action) => ({
    key: action,
    label: actionLabel(action),
    onSelect: () => setDialog(action),
  }));

  const lineColumns: DataTableColumn<QuoteDto['items'][number]>[] = [
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
      key: 'quantity',
      header: t('quotes.editor.quantity'),
      cell: (item) => formatQuantity(item.quantity),
      align: 'right',
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
      key: 'lineAmount',
      header: t('quotes.editor.lineAmount'),
      cell: (item) => formatCop(item.lineAmount),
      align: 'right',
    },
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{number}</span>
            <QuoteStatusBadge status={quote.status} />
            {quote.status === 'SENT' ? (
              <ProbabilityCell quoteId={quote.id} state={probabilities} />
            ) : null}
          </span>
        }
        description={quote.customer.name}
        backTo={QUOTES_PATH}
        actions={
          <>
            <QuoteOrderAction
              quoteId={quote.id}
              quoteNumber={quote.displayNumber}
              allowedActions={quote.allowedActions}
              onReload={reloadAll}
            />
            {canShare ? (
              <Button
                variant={quote.status === 'DRAFT' ? 'on-dark' : 'ghost-on-dark'}
                icon={<SendIcon size={16} />}
                onClick={() => setSharing(true)}
              >
                {t('quotes.actions.share')}
              </Button>
            ) : null}
            {primary && allowed.has(primary) ? (
              <Button variant="on-dark" onClick={() => setDialog(primary)}>
                {actionLabel(primary)}
              </Button>
            ) : null}
            {allowed.has('edit') ? (
              <Link
                to={editQuotePath(quote.id)}
                className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-button text-white/90 uppercase hover:bg-white/10 hover:text-white"
              >
                <EditIcon size={16} />
                {t('quotes.actions.edit')}
              </Link>
            ) : null}
            {allowed.has('void') ? (
              <Button
                variant="danger-outline"
                icon={<BanIcon size={16} />}
                onClick={() => setDialog('void')}
              >
                {t('quotes.actions.void')}
              </Button>
            ) : null}
            {allowed.has('downloadPdf') ? (
              <DownloadPdfButton
                quoteId={quote.id}
                displayNumber={quote.displayNumber}
                variant="ghost-on-dark"
              />
            ) : null}
            <ActionMenu label={t('quotes.detail.moreActions')} items={menuItems} tone="onDark" />
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="space-y-5">
          {quote.status === 'VOIDED' && quote.voidReason ? (
            <Alert tone="info" title={t('quotes.detail.voidReason')}>
              {quote.voidReason}
            </Alert>
          ) : null}
          <SectionCard title={t('quotes.detail.summary')}>
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <DataItem label={t('quotes.customer')}>{quote.customer.name}</DataItem>
              <DataItem label={t('quotes.owner')}>{quote.owner.name}</DataItem>
              <DataItem label={t('quotes.detail.createdAt')}>
                {formatDate(quote.createdAt)}
              </DataItem>
              <DataItem label={t('quotes.expiresAt')}>
                {expiry ? (
                  <span className={expiry.urgent ? 'font-medium text-warning-fg' : undefined}>
                    {expiry.text}
                  </span>
                ) : (
                  t('quotes.detail.noExpiry')
                )}
              </DataItem>
              {quote.firstSentAt ? (
                <DataItem label={t('quotes.detail.firstSentAt')}>
                  {formatDate(quote.firstSentAt)}
                </DataItem>
              ) : null}
              {quote.sentAt ? (
                <DataItem label={t('quotes.detail.sentAt')}>{formatDate(quote.sentAt)}</DataItem>
              ) : null}
              {quote.approvedAt ? (
                <DataItem label={t('quotes.detail.approvedAt')}>
                  {formatDate(quote.approvedAt)}
                </DataItem>
              ) : null}
              {quote.currentVersion > 0 ? (
                <DataItem label={t('quotes.detail.currentVersion')}>
                  {quote.currentVersion}
                </DataItem>
              ) : null}
            </dl>
          </SectionCard>

          <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
            <h2 className="px-5 pt-5 text-overline font-bold tracking-wider text-neutral-800 uppercase">
              {t('quotes.detail.lines')}
            </h2>
            <DataTable
              caption={t('quotes.detail.lines')}
              columns={lineColumns}
              rows={quote.items}
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

          <FollowUpSection
            key={followUpVersion}
            customerId={quote.customer.id}
            customerName={quote.customer.name}
            quote={{ id: quote.id, displayNumber: quote.displayNumber }}
          />

          <SectionCard title={t('history.title')}>
            <QuoteHistoryTimeline state={history.state} onRetry={() => void history.reload()} />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-4">
          {allowed.has('followUpAssistant') ? (
            <div className={highlight?.highlighted ? 'order-first' : 'order-last'}>
              <FollowUpAssistantPanel
                quote={quote}
                highlight={highlight}
                documentLocale={params.documentLocale}
                onStale={reloadAll}
                onInteractionSaved={() => {
                  setFollowUpVersion((value) => value + 1);
                  void history.reload();
                }}
              />
            </div>
          ) : null}
          <TotalsSummary
            rows={[
              {
                key: 'subtotal',
                label: t('quotes.totals.subtotal'),
                value: formatCop(quote.subtotal),
              },
              {
                key: 'discount',
                label: t('quotes.totals.discount', { pct: formatPercent(quote.discountPct) }),
                value: `− ${formatCop(quote.discountAmount)}`,
              },
              {
                key: 'linesVat',
                label: t('quotes.totals.linesVat'),
                value: formatCop(quote.linesVat),
              },
              {
                key: 'shipping',
                label: t('quotes.totals.shipping'),
                value: formatCop(quote.shippingAmount),
              },
              ...(quote.shippingTaxable
                ? [
                    {
                      key: 'shippingVat',
                      label: t('quotes.totals.shippingVat'),
                      value: formatCop(quote.shippingVat),
                    },
                  ]
                : []),
            ]}
            totalLabel={t('quotes.totals.total')}
            total={formatCop(quote.total)}
          />
        </div>
      </div>

      {dialog === 'send' ||
      dialog === 'approve' ||
      dialog === 'reject' ||
      dialog === 'duplicate' ? (
        <SimpleActionDialog
          kind={dialog}
          quote={quote}
          busy={busy}
          error={actionError}
          onReload={reloadAll}
          sendExpiresAt={addDaysTo(today, params.validityDays)}
          onCancel={closeDialog}
          onConfirm={() => {
            if (dialog === 'duplicate') void duplicate();
            else if (dialog === 'send')
              void run(
                () => quotesService.send(quote.id, quote.updatedAt),
                () => t('quotes.toast.sent', { number }),
              );
            else
              void run(
                () =>
                  quotesService.changeStatus(quote.id, {
                    to: dialog === 'approve' ? 'APPROVED' : 'REJECTED',
                    updatedAt: quote.updatedAt,
                  }),
                () =>
                  t(dialog === 'approve' ? 'quotes.toast.approved' : 'quotes.toast.rejected', {
                    number,
                  }),
              );
          }}
        />
      ) : null}
      {sharing ? (
        <SendQuoteDialog
          quote={quote}
          projectedExpiresAt={addDaysTo(today, params.validityDays)}
          onClose={() => setSharing(false)}
          onReload={() => {
            setSharing(false);
            reloadAll();
          }}
          onMarkSent={() => {
            setSharing(false);
            setDialog('send');
          }}
          onShared={(updated, channel, wasDraft) => {
            replace(updated);
            void history.reload();
            setSharing(false);
            toast.success(
              wasDraft
                ? t('quotes.send.sent', { number })
                : t('quotes.send.opened', { channel: t(`quotes.send.channels.${channel}`) }),
            );
          }}
        />
      ) : null}
      {dialog === 'void' ? (
        <VoidQuoteDialog
          quote={quote}
          busy={busy}
          error={actionError}
          onReload={reloadAll}
          onCancel={closeDialog}
          onConfirm={(reason) =>
            void run(
              () => quotesService.void(quote.id, { reason, updatedAt: quote.updatedAt }),
              () => t('quotes.toast.voided', { number }),
            )
          }
        />
      ) : null}
      {dialog === 'changeExpiry' ? (
        <ChangeExpiryDialog
          quote={quote}
          busy={busy}
          error={actionError}
          onReload={reloadAll}
          onCancel={closeDialog}
          onConfirm={(expiresAt) =>
            void run(
              () => quotesService.changeExpiry(quote.id, { expiresAt, updatedAt: quote.updatedAt }),
              () => t('quotes.toast.expiryChanged', { number }),
            )
          }
        />
      ) : null}
      {dialog === 'reassign' ? (
        <ReassignDialog
          quote={quote}
          busy={busy}
          error={actionError}
          onReload={reloadAll}
          onCancel={closeDialog}
          onConfirm={(owner) =>
            void run(
              () =>
                quotesService.reassign(quote.id, { ownerId: owner.id, updatedAt: quote.updatedAt }),
              () => t('quotes.toast.reassigned', { number, name: owner.name }),
            )
          }
        />
      ) : null}
      {dialog === 'reactivate' ? (
        <ReactivateDialog
          quote={quote}
          busy={busy}
          error={actionError}
          onReload={reloadAll}
          onCancel={closeDialog}
          onConfirm={(input) =>
            void run(
              async () =>
                (await quotesService.reactivate(quote.id, { ...input, updatedAt: quote.updatedAt }))
                  .quote,
              () => t('quotes.toast.reactivated', { number }),
            )
          }
        />
      ) : null}
    </>
  );
}
