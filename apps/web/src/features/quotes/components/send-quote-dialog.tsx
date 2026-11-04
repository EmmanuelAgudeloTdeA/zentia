import type { QuoteDto, ShareChannel, ShareLinksDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCop, formatDay } from '../../../core/format';
import { Alert, Button, CheckIcon, Dialog, ErrorMessage, Skeleton } from '../../../shared/ui';
import { useCommercialParameters } from '../hooks/use-commercial-parameters';
import { documentsService } from '../services/documents.service';
import { DownloadPdfButton } from './download-pdf-button';
import { errorText } from './quote-format';

interface SendQuoteDialogProps {
  quote: QuoteDto;
  projectedExpiresAt: string;
  onClose: () => void;
  onShared: (quote: QuoteDto, channel: ShareChannel, wasDraft: boolean) => void;
  onMarkSent: () => void;
  onReload: () => void;
}

const CHANNELS: readonly {
  channel: ShareChannel;
  link: 'whatsappUrl' | 'emailUrl';
  missing: 'PHONE' | 'EMAIL';
}[] = [
  { channel: 'WHATSAPP', link: 'whatsappUrl', missing: 'PHONE' },
  { channel: 'EMAIL', link: 'emailUrl', missing: 'EMAIL' },
];

/** E2 del ui-brief de M5: 1) descargar el PDF limpio, 2) abrir el canal y registrar el envío. */
export function SendQuoteDialog({
  quote,
  projectedExpiresAt,
  onClose,
  onShared,
  onMarkSent,
  onReload,
}: SendQuoteDialogProps) {
  const { t } = useTranslation();
  const { documentLocale } = useCommercialParameters();
  const [links, setLinks] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: ShareLinksDto }
  >({ status: 'loading' });
  const [downloaded, setDownloaded] = useState(false);
  const [sharing, setSharing] = useState<ShareChannel | null>(null);
  const [shareError, setShareError] = useState<unknown>(null);
  const draft = quote.status === 'DRAFT';
  // Solo un Borrador con la acción permitida puede marcarse como enviada (en una Enviada, POST /send da 409).
  const canMarkSent = draft && quote.allowedActions.includes('send');

  const loadLinks = useCallback(async () => {
    setLinks({ status: 'loading' });
    try {
      setLinks({ status: 'ready', data: await documentsService.shareLinks(quote.id) });
    } catch (error) {
      setLinks({ status: 'error', error });
    }
  }, [quote.id]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  // El enlace se abre con el clic del usuario (sin bloqueo de ventanas); el registro va en paralelo.
  const share = async (channel: ShareChannel) => {
    setSharing(channel);
    setShareError(null);
    try {
      onShared(
        await documentsService.share(quote.id, { channel, updatedAt: quote.updatedAt }),
        channel,
        draft,
      );
    } catch (error) {
      setShareError(error);
    } finally {
      setSharing(null);
    }
  };

  const expiry = quote.expiresAt
    ? t('quotes.send.expires', { date: formatDay(quote.expiresAt) })
    : t('quotes.send.projected', { date: formatDay(projectedExpiresAt) });
  const available = links.status === 'ready' ? CHANNELS.filter(({ link }) => links.data[link]) : [];
  const unavailableReason = links.status === 'ready' ? links.data.unavailableReason : null;

  return (
    <Dialog
      size="md"
      title={t('quotes.send.title', { number: quote.displayNumber })}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-3 rounded-md bg-neutral-50 p-3 text-body-sm">
          <div>
            <dt className="text-neutral-500">{t('quotes.customer')}</dt>
            <dd className="font-medium text-neutral-900">{quote.customer.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">{t('quotes.total')}</dt>
            <dd className="font-semibold tabular-nums text-neutral-900">
              {formatCop(quote.total)}
            </dd>
          </div>
          <div className="col-span-2 text-neutral-700">{expiry}</div>
        </dl>
        <Alert tone="info">
          {t('quotes.send.language', { language: t(`enums.DocumentLocale.${documentLocale}`) })}
          {draft ? null : <p className="mt-1">{t('quotes.send.alreadySent')}</p>}
        </Alert>

        <section>
          <h3 className="text-h3 text-neutral-900">{t('quotes.send.step1')}</h3>
          <p className="mt-1 text-body-sm text-neutral-600">{t('quotes.send.step1Hint')}</p>
          <div className="mt-3 flex items-center gap-3">
            <DownloadPdfButton
              quoteId={quote.id}
              displayNumber={quote.displayNumber}
              purpose="send"
              onDownloaded={() => setDownloaded(true)}
            />
            {downloaded ? (
              <span className="inline-flex items-center gap-1 text-body-sm font-medium text-success-fg">
                <CheckIcon size={16} />
                {t('quotes.send.downloaded')}
              </span>
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="text-h3 text-neutral-900">{t('quotes.send.step2')}</h3>
          {links.status === 'loading' ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2" aria-busy="true">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : links.status === 'error' ? (
            <div className="mt-3">
              <ErrorMessage error={links.error} onRetry={() => void loadLinks()} />
            </div>
          ) : unavailableReason === 'CUSTOMER_INACTIVE' ? (
            <div className="mt-3">
              <Alert
                tone="warning"
                action={
                  <Button variant="secondary" size="sm" onClick={() => void loadLinks()}>
                    {t('quotes.send.reloadLinks')}
                  </Button>
                }
              >
                {t('quotes.send.customerInactive')}
              </Alert>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {CHANNELS.map(({ channel, link, missing }) => {
                const url = links.data[link];
                const label = t(
                  channel === 'WHATSAPP' ? 'quotes.send.whatsapp' : 'quotes.send.email',
                );
                return (
                  <div key={channel}>
                    {typeof url === 'string' ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void share(channel)}
                        aria-busy={sharing === channel || undefined}
                        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-button text-white uppercase hover:bg-primary-700"
                      >
                        {label}
                      </a>
                    ) : (
                      <>
                        <span
                          aria-disabled="true"
                          className="inline-flex h-10 w-full cursor-not-allowed items-center justify-center rounded-md bg-neutral-200 px-4 text-button text-neutral-500 uppercase"
                        >
                          {label}
                        </span>
                        <p className="mt-1 text-caption text-neutral-600">
                          {t(
                            missing === 'PHONE'
                              ? 'quotes.send.missingPhone'
                              : 'quotes.send.missingEmail',
                          )}{' '}
                          <a
                            href={`/customers/${quote.customer.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            {t('quotes.send.editCustomer')}
                          </a>
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {links.status === 'ready' && links.data.missing.length > 0 && !unavailableReason ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => void loadLinks()}>
              {t('quotes.send.reloadLinks')}
            </Button>
          ) : null}
        </section>

        {links.status === 'ready' && available.length === 0 && !unavailableReason && canMarkSent ? (
          <Alert
            tone="warning"
            action={
              <Button variant="secondary" size="sm" onClick={onMarkSent}>
                {t('quotes.actions.send')}
              </Button>
            }
          >
            {t('quotes.send.noChannels')}
          </Alert>
        ) : null}
        {shareError ? (
          <Alert
            tone="danger"
            action={
              <div className="flex flex-wrap gap-2">
                {canMarkSent ? (
                  <Button variant="secondary" size="sm" onClick={onMarkSent}>
                    {t('quotes.actions.send')}
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={onReload}>
                  {t('quotes.editor.reload')}
                </Button>
              </div>
            }
          >
            {errorText(t, shareError)}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
