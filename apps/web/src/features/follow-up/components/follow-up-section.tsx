import type { InteractionDto } from '@zentia/shared';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDateTime } from '../../../core/format';
import { Button, ErrorMessage, PlusIcon, SectionCard, Skeleton, toast } from '../../../shared/ui';
import { interactionsService } from '../services/interactions.service';
import { InteractionDialog } from './interaction-dialog';

const PAGE_SIZE = 10;

interface FollowUpSectionProps {
  customerId: string;
  customerName: string;
  /** En el detalle de la cotización solo se muestran sus interacciones (G1 del ui-brief). */
  quote?: { id: string; displayNumber: string };
  canRegister?: boolean;
}

function InteractionItem({
  interaction,
  showQuote,
}: {
  interaction: InteractionDto;
  showQuote: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const long = interaction.note.length > 240 || interaction.note.split('\n').length > 3;
  return (
    <li className="relative">
      <span className="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-neutral-0 bg-primary-500" />
      <p className="flex flex-wrap items-center gap-2 text-body-sm">
        <span className="font-semibold text-neutral-900">
          {t(`enums.InteractionType.${interaction.type}`)}
        </span>
        <span className="text-neutral-500">
          {t('interactions.by', {
            author: interaction.author.name,
            date: formatDateTime(interaction.occurredAt),
          })}
        </span>
        {showQuote ? (
          interaction.quote ? (
            <Link
              to={`/quotes/${interaction.quote.id}`}
              className="font-mono text-primary-600 hover:underline"
            >
              {interaction.quote.displayNumber}
            </Link>
          ) : (
            <span className="text-caption text-neutral-500">{t('interactions.none')}</span>
          )
        ) : null}
      </p>
      <p
        className={`mt-1 text-body whitespace-pre-line text-neutral-800 ${expanded ? '' : 'line-clamp-3'}`}
      >
        {interaction.note}
      </p>
      {long && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-body-sm text-primary-600 hover:underline"
        >
          {t('interactions.showMore')}
        </button>
      ) : null}
    </li>
  );
}

/** Sección "Seguimiento" de los detalles de cliente y cotización (H6.1). */
export function FollowUpSection({
  customerId,
  customerName,
  quote,
  canRegister = true,
}: FollowUpSectionProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<InteractionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<unknown>(null);
  const [dialog, setDialog] = useState(false);

  const load = useCallback(
    async (nextPage: number) => {
      if (nextPage === 1) setStatus('loading');
      try {
        const result = await interactionsService.list({
          ...(quote ? { quoteId: quote.id } : { customerId }),
          page: nextPage,
          pageSize: PAGE_SIZE,
        });
        setItems((current) => (nextPage === 1 ? result.items : [...current, ...result.items]));
        setTotal(result.total);
        setPage(nextPage);
        setStatus('ready');
      } catch (loadError) {
        setError(loadError);
        setStatus('error');
      }
    },
    [customerId, quote],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const registerButton = canRegister ? (
    <Button
      variant="secondary"
      size="sm"
      icon={<PlusIcon size={16} />}
      onClick={() => setDialog(true)}
    >
      {t('interactions.new')}
    </Button>
  ) : null;

  return (
    <SectionCard title={t('interactions.title')} actions={registerButton}>
      {status === 'loading' ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : status === 'error' ? (
        <ErrorMessage error={error} onRetry={() => void load(1)} />
      ) : items.length === 0 ? (
        <p className="text-body-sm text-neutral-600">
          {quote ? t('interactions.emptyQuote') : t('interactions.empty')}
        </p>
      ) : (
        <>
          <ol className="space-y-4 border-l-2 border-neutral-200 pl-6">
            {items.map((interaction) => (
              <InteractionItem key={interaction.id} interaction={interaction} showQuote={!quote} />
            ))}
          </ol>
          {items.length < total ? (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => void load(page + 1)}>
              {t('interactions.loadOlder')}
            </Button>
          ) : null}
        </>
      )}
      {quote ? (
        <Link
          to={`/customers/${customerId}`}
          className="mt-4 inline-block text-body-sm text-primary-600 hover:underline"
        >
          {t('interactions.customerHistory')}
        </Link>
      ) : null}
      {dialog ? (
        <InteractionDialog
          customerId={customerId}
          customerName={customerName}
          {...(quote ? { quote } : {})}
          onClose={() => setDialog(false)}
          onSaved={() => {
            setDialog(false);
            toast.success(t('interactions.saved'));
            void load(1);
          }}
        />
      ) : null}
    </SectionCard>
  );
}
