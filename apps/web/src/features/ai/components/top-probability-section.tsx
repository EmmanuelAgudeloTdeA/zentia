import type { ProbabilityDto, TopProbabilityItem } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatCop, formatDay } from '../../../core/format';
import { DataTable, SectionCard, type DataTableColumn } from '../../../shared/ui';
import { ProbabilityBadge } from './probability-badge';

interface TopProbabilitySectionProps {
  items: readonly TopProbabilityItem[];
  showOwner: boolean;
}

/** El bloque solo trae el porcentaje; el badge muestra el rótulo sin factores. */
function asProbability(item: TopProbabilityItem): ProbabilityDto {
  return {
    quoteId: item.quoteId,
    probability: item.probability,
    label: 'RULES_ESTIMATE',
    factors: [],
  };
}

/** "Mayor probabilidad de cierre" del tablero (S9.3.2). */
export function TopProbabilitySection({ items, showOwner }: TopProbabilitySectionProps) {
  const { t } = useTranslation();
  const numberLink = (item: TopProbabilityItem) => (
    <Link
      to={`/quotes/${item.quoteId}`}
      className="font-mono font-medium text-primary-600 hover:underline"
    >
      {item.displayNumber}
    </Link>
  );
  const columns: DataTableColumn<TopProbabilityItem>[] = [
    { key: 'number', header: t('quotes.number'), cell: numberLink },
    { key: 'customer', header: t('quotes.customer'), cell: (item) => item.customerName },
    ...(showOwner
      ? [
          {
            key: 'owner',
            header: t('quotes.owner'),
            cell: (item: TopProbabilityItem) => item.ownerName,
            secondary: true,
          },
        ]
      : []),
    {
      key: 'total',
      header: t('quotes.total'),
      cell: (item) => formatCop(item.total),
      align: 'right',
    },
    {
      key: 'expiresAt',
      header: t('quotes.expiresAt'),
      cell: (item) => t('ai.top.expiresOn', { date: formatDay(item.expiresAt) }),
      secondary: true,
    },
    {
      key: 'probability',
      header: t('ai.probability.label'),
      cell: (item) => <ProbabilityBadge probability={asProbability(item)} compact />,
    },
  ];

  return (
    <SectionCard
      title={t('dashboard.sections.topProbability.title')}
      actions={
        <span className="text-caption font-medium text-primary-700">
          {t('dashboard.currentStateHint')}
        </span>
      }
    >
      <DataTable
        columns={columns}
        rows={items}
        rowKey={(item) => item.quoteId}
        empty={t('ai.top.empty')}
        mobileCard={(item) => (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              {numberLink(item)}
              <ProbabilityBadge probability={asProbability(item)} compact />
            </div>
            <p className="truncate text-body text-neutral-900">{item.customerName}</p>
            <p className="text-body-sm font-semibold tabular-nums">{formatCop(item.total)}</p>
          </div>
        )}
      />
    </SectionCard>
  );
}
