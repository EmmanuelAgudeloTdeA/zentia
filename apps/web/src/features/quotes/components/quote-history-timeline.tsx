import type { HistoryEntryDto, QuoteEventDto, QuoteStatus } from '@zentia/shared';
import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatCop,
  formatDateTime,
  formatDay,
  formatPercent,
  formatQuantity,
} from '../../../core/format';
import {
  ArrowRightIcon,
  CalendarIcon,
  ErrorMessage,
  GearIcon,
  PercentIcon,
  Skeleton,
  UsersIcon,
} from '../../../shared/ui';
import { QuoteStatusBadge } from './quote-status-badge';

type Actor = HistoryEntryDto['actor'];

function actorName(t: TFunction, actor: Actor) {
  return actor ? actor.name : t('history.actor.system');
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function personName(value: unknown): string {
  return typeof value === 'object' && value !== null && 'name' in value ? str(value.name) : '';
}

const EVENT_ICONS: Record<QuoteEventDto['type'], ReactNode> = {
  STATE_CHANGED: <ArrowRightIcon size={12} />,
  DISCOUNT_OVERRIDE: <PercentIcon size={12} />,
  EXPIRY_CHANGED: <CalendarIcon size={12} />,
  REASSIGNED: <UsersIcon size={12} />,
};

function EventDetail({ event }: { event: QuoteEventDto }) {
  const { t } = useTranslation();
  const { data } = event;
  switch (event.type) {
    case 'STATE_CHANGED':
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {t('history.events.STATE_CHANGED')}
          <QuoteStatusBadge status={str(data['from']) as QuoteStatus} size="sm" />
          <ArrowRightIcon size={12} className="text-neutral-400" />
          <QuoteStatusBadge status={str(data['to']) as QuoteStatus} size="sm" />
        </span>
      );
    case 'DISCOUNT_OVERRIDE':
      return t('history.events.DISCOUNT_OVERRIDE', {
        from: formatPercent(str(data['from'])),
        to: formatPercent(str(data['to'])),
        limit: formatPercent(str(data['sellerLimit'])),
      });
    case 'EXPIRY_CHANGED':
      return t('history.events.EXPIRY_CHANGED', {
        from: data['from'] ? formatDay(str(data['from'])) : '—',
        to: formatDay(str(data['to'])),
      });
    case 'REASSIGNED':
      return t('history.events.REASSIGNED', {
        from: personName(data['from']),
        to: personName(data['to']),
      });
  }
}

function EventLine({ event }: { event: QuoteEventDto }) {
  const { t } = useTranslation();
  return (
    <div className="text-body-sm text-neutral-800">
      <EventDetail event={event} />
      <p className="mt-0.5 flex items-center gap-1 text-caption text-neutral-500">
        {event.actor ? null : <GearIcon size={12} />}
        {t('history.by', { actor: actorName(t, event.actor), date: formatDateTime(event.at) })}
      </p>
      {event.note ? (
        <p className="mt-1 line-clamp-3 rounded-md bg-neutral-50 px-2 py-1 text-body-sm text-neutral-700">
          {event.note}
        </p>
      ) : null}
    </div>
  );
}

function ChangeList({ entry }: { entry: Extract<HistoryEntryDto, { kind: 'VERSION' }> }) {
  const { t } = useTranslation();
  const changes = entry.version.changes;
  if (!changes) return null;
  const items: string[] = [
    ...changes.added.map((line) =>
      t('history.changes.added', {
        name: line.productName,
        quantity: formatQuantity(line.quantity),
      }),
    ),
    ...changes.removed.map((line) => t('history.changes.removed', { name: line.productName })),
    ...changes.modified.flatMap((line) => [
      ...(line.quantity
        ? [
            t('history.changes.quantity', {
              name: line.productName,
              from: formatQuantity(line.quantity.from),
              to: formatQuantity(line.quantity.to),
            }),
          ]
        : []),
      ...(line.unitPrice
        ? [
            t('history.changes.price', {
              name: line.productName,
              from: formatCop(line.unitPrice.from),
              to: formatCop(line.unitPrice.to),
            }),
          ]
        : []),
    ]),
    ...(changes.discountPct
      ? [
          t('history.changes.discount', {
            from: formatPercent(changes.discountPct.from),
            to: formatPercent(changes.discountPct.to),
          }),
        ]
      : []),
    ...(changes.shippingAmount
      ? [
          t('history.changes.shipping', {
            from: formatCop(changes.shippingAmount.from),
            to: formatCop(changes.shippingAmount.to),
          }),
        ]
      : []),
    t('history.changes.total', {
      from: formatCop(changes.total.from),
      to: formatCop(changes.total.to),
    }),
  ];
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-body-sm text-neutral-700">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

interface QuoteHistoryTimelineProps {
  state:
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: HistoryEntryDto[] };
  onRetry: () => void;
}

/** Historial unificado: versiones con sus eventos agrupados y eventos sueltos, del más reciente al más antiguo. */
export function QuoteHistoryTimeline({ state, onRetry }: QuoteHistoryTimelineProps) {
  const { t } = useTranslation();
  if (state.status === 'loading') {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-14" />
        ))}
      </div>
    );
  }
  if (state.status === 'error') return <ErrorMessage error={state.error} onRetry={onRetry} />;
  if (state.data.length === 0) {
    return <p className="text-body-sm text-neutral-600">{t('history.empty')}</p>;
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-neutral-200 pl-6">
      {state.data.map((entry) =>
        entry.kind === 'VERSION' ? (
          <li key={`v${entry.version.number}`} className="relative">
            <span className="absolute top-0 -left-[39px] flex size-7 items-center justify-center rounded-full bg-primary-600 text-caption font-bold text-white">
              {entry.version.number}
            </span>
            <div className="rounded-lg border border-neutral-200 p-3">
              <p className="text-h3 text-neutral-900">
                {entry.version.number === 1
                  ? t('history.initialVersion')
                  : t('history.version', { number: entry.version.number })}
              </p>
              <p className="text-caption text-neutral-500">
                {t('history.by', {
                  actor: actorName(t, entry.actor),
                  date: formatDateTime(entry.at),
                })}
              </p>
              {entry.version.customerRequest ? (
                <div className="mt-2 rounded-md bg-neutral-50 px-3 py-2">
                  <p className="text-overline text-neutral-500 uppercase">
                    {t('history.customerRequest')}
                  </p>
                  <p className="line-clamp-3 text-body-sm text-neutral-800">
                    {entry.version.customerRequest}
                  </p>
                </div>
              ) : null}
              <ChangeList entry={entry} />
              {entry.events.length > 0 ? (
                <div className="mt-3 space-y-2 border-t border-neutral-100 pt-2">
                  {entry.events.map((event) => (
                    <EventLine key={event.id} event={event} />
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ) : (
          <li key={entry.event.id} className="relative">
            <span className="absolute top-0.5 -left-[35px] flex size-5 items-center justify-center rounded-full border-2 border-neutral-0 bg-neutral-200 text-neutral-700">
              {entry.actor ? EVENT_ICONS[entry.event.type] : <GearIcon size={12} />}
            </span>
            <EventLine event={entry.event} />
          </li>
        ),
      )}
    </ol>
  );
}
