import { QUOTE_STATUSES, type QuoteSummaryDto, type UserOptionDto } from '@zentia/shared';
import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { formatCop, formatDay, todayInBogota } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Button,
  CloseIcon,
  Combobox,
  DataTable,
  EmptyState,
  ErrorMessage,
  FileTextIcon,
  FilterChip,
  Pagination,
  PlusIcon,
  SearchIcon,
  TextField,
  type DataTableColumn,
} from '../../../shared/ui';
import { ProbabilityCell, useProbabilities } from '../../ai';
import { customersService } from '../../customers';
import { usersService } from '../../users';
import { useCommercialParameters } from '../hooks/use-commercial-parameters';
import { useQuotes } from '../hooks/use-quotes';
import {
  hasQuoteFilters,
  useQuoteFiltersStore,
  type SentPeriod,
} from '../store/quote-filters.store';
import { expiryLabel } from './quote-format';
import { QuoteRowActions } from './quote-row-actions';
import { QuoteStatusBadge } from './quote-status-badge';
import { NEW_QUOTE_PATH, quotePath } from './quote-paths';

function sentPeriodText(t: TFunction, period: SentPeriod | null): string | null {
  if (period?.from && period.to) {
    return t('quotes.filters.sentPeriod', {
      from: formatDay(period.from),
      to: formatDay(period.to),
    });
  }
  if (period?.from) return t('quotes.filters.sentFromOnly', { from: formatDay(period.from) });
  if (period?.to) return t('quotes.filters.sentToOnly', { to: formatDay(period.to) });
  return null;
}

export function QuotesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useSessionStore((state) => state.user?.role);
  const seesAll = role === 'MANAGER' || role === 'ADMIN';
  const filters = useQuoteFiltersStore();
  const { state, reload } = useQuotes();
  const { expiringAlertDays } = useCommercialParameters();
  const today = useMemo(() => todayInBogota(), []);
  const sentIds = useMemo(
    () =>
      state.status === 'ready'
        ? state.data.items.filter((quote) => quote.status === 'SENT').map((quote) => quote.id)
        : [],
    [state],
  );
  const probabilities = useProbabilities(sentIds);
  const probability = (quote: QuoteSummaryDto) =>
    quote.status === 'SENT' ? (
      <ProbabilityCell quoteId={quote.id} state={probabilities} />
    ) : (
      <span className="text-neutral-400">—</span>
    );
  const sentPeriodLabel = sentPeriodText(t, filters.sentPeriod);
  const removableChips = [
    ...(sentPeriodLabel
      ? [{ key: 'sentPeriod', label: sentPeriodLabel, onRemove: filters.clearSentPeriod }]
      : []),
    ...(filters.followUpPending
      ? [
          {
            key: 'followUpPending',
            label: t('quotes.filters.followUpPending'),
            onRemove: filters.clearFollowUpPending,
          },
        ]
      : []),
  ];
  const comboboxLabels = {
    loading: t('common.combobox.loading'),
    noResults: t('common.combobox.noResults'),
    error: t('common.combobox.error'),
  };

  const expiry = (quote: QuoteSummaryDto) => {
    const label = expiryLabel(t, quote.status, quote.expiresAt, today, expiringAlertDays);
    if (!label) return <span className="text-neutral-400">—</span>;
    return (
      <span className={label.urgent ? 'font-medium text-warning-fg' : 'text-neutral-700'}>
        {label.text}
      </span>
    );
  };

  const numberLink = (quote: QuoteSummaryDto) => (
    <Link
      to={quotePath(quote.id)}
      className="font-mono font-medium text-primary-600 hover:underline"
    >
      {quote.displayNumber}
    </Link>
  );

  const columns: DataTableColumn<QuoteSummaryDto>[] = [
    { key: 'number', header: t('quotes.number'), cell: numberLink },
    { key: 'customer', header: t('quotes.customer'), cell: (quote) => quote.customer.name },
    ...(seesAll
      ? [
          {
            key: 'owner',
            header: t('quotes.owner'),
            cell: (quote: QuoteSummaryDto) => quote.owner.name,
            secondary: true,
          },
        ]
      : []),
    {
      key: 'total',
      header: t('quotes.total'),
      cell: (quote) => formatCop(quote.total),
      align: 'right',
    },
    { key: 'expiresAt', header: t('quotes.expiresAt'), cell: expiry, secondary: true },
    {
      key: 'status',
      header: t('quotes.status'),
      cell: (quote) => <QuoteStatusBadge status={quote.status} />,
    },
    { key: 'probability', header: t('ai.probability.label'), cell: probability, secondary: true },
  ];

  const mobileCard = (quote: QuoteSummaryDto) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        {numberLink(quote)}
        <QuoteStatusBadge status={quote.status} size="sm" />
      </div>
      <p className="truncate text-body text-neutral-900">{quote.customer.name}</p>
      <div className="flex items-center justify-between gap-3 text-body-sm">
        {expiry(quote)}
        {quote.status === 'SENT' ? probability(quote) : null}
        <span className="font-semibold tabular-nums">{formatCop(quote.total)}</span>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('quotes.title')}
        description={t('quotes.description')}
        actions={
          <Link
            to={NEW_QUOTE_PATH}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-0 px-4 text-button text-primary-900 uppercase shadow-sm hover:bg-primary-50"
          >
            <PlusIcon size={16} />
            {t('quotes.new')}
          </Link>
        }
      />

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="space-y-3 border-b border-neutral-200 p-4">
          <div
            role="group"
            aria-label={t('quotes.filters.status')}
            className="flex gap-2 overflow-x-auto pb-1"
          >
            <FilterChip active={filters.statuses.length === 0} onClick={filters.clearStatuses}>
              {t('quotes.filters.all')}
            </FilterChip>
            {QUOTE_STATUSES.map((status) => (
              <FilterChip
                key={status}
                active={filters.statuses.includes(status)}
                onClick={() => filters.toggleStatus(status)}
              >
                {t(`enums.QuoteStatus.${status}`)}
              </FilterChip>
            ))}
          </div>
          {removableChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {removableChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={t('quotes.filters.removeFilter', { label: chip.label })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary-600 bg-primary-50 px-3 text-body-sm font-medium text-primary-900 hover:bg-primary-100"
                >
                  {chip.label}
                  <CloseIcon size={14} />
                </button>
              ))}
            </div>
          ) : null}
          <div className={`grid gap-3 ${seesAll ? 'lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <TextField
              label={t('quotes.filters.search')}
              type="search"
              value={filters.q}
              onChange={(event) => filters.setQ(event.target.value)}
              endAdornment={<SearchIcon size={16} className="mr-2 text-neutral-400" />}
            />
            <Combobox<{ id: string; name: string; documentId: string }>
              label={t('quotes.filters.customer')}
              placeholder={t('quotes.filters.allCustomers')}
              inputValue={filters.customerInput}
              onInputChange={filters.setCustomerInput}
              loadOptions={async (query, signal) =>
                (
                  await customersService.list(
                    { q: query, status: 'all', page: 1, pageSize: 8 },
                    signal,
                  )
                ).items
              }
              getOptionKey={(customer) => customer.id}
              getOptionLabel={(customer) => customer.name}
              renderOption={(customer) => (
                <span className="flex justify-between gap-3">
                  {customer.name}
                  <span className="font-mono text-body-sm text-neutral-500">
                    {customer.documentId}
                  </span>
                </span>
              )}
              onSelect={(customer) =>
                filters.pickCustomer({ id: customer.id, label: customer.name })
              }
              labels={comboboxLabels}
            />
            {seesAll ? (
              <Combobox<UserOptionDto>
                label={t('quotes.filters.owner')}
                placeholder={t('quotes.filters.allOwners')}
                inputValue={filters.ownerInput}
                onInputChange={filters.setOwnerInput}
                minChars={1}
                loadOptions={async (query) => {
                  const key = query.toLocaleLowerCase();
                  return (await usersService.options(true)).filter((user) =>
                    user.name.toLocaleLowerCase().includes(key),
                  );
                }}
                getOptionKey={(user) => user.id}
                getOptionLabel={(user) => user.name}
                renderOption={(user) =>
                  user.isActive ? user.name : t('quotes.filters.inactiveOwner', { name: user.name })
                }
                onSelect={(user) => filters.pickOwner({ id: user.id, label: user.name })}
                labels={comboboxLabels}
              />
            ) : null}
          </div>
        </div>

        {state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            caption={t('quotes.tableCaption')}
            columns={columns}
            rows={state.status === 'ready' ? state.data.items : []}
            rowKey={(quote) => quote.id}
            onRowClick={(quote) => navigate(quotePath(quote.id))}
            actionsHeader={t('common.actions.rowActions')}
            rowActions={(quote) => <QuoteRowActions quote={quote} />}
            loading={state.status === 'loading'}
            skeletonRows={8}
            mobileCard={mobileCard}
            empty={
              hasQuoteFilters(filters) ? (
                <EmptyState
                  icon={<SearchIcon size={40} />}
                  title={t('quotes.empty.filteredTitle')}
                  action={
                    <Button variant="secondary" onClick={filters.reset}>
                      {t('common.actions.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<FileTextIcon size={40} />}
                  title={t('quotes.empty.title')}
                  action={
                    <Link
                      to={NEW_QUOTE_PATH}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-button text-white uppercase hover:bg-primary-700"
                    >
                      <PlusIcon size={16} />
                      {t('quotes.new')}
                    </Link>
                  }
                />
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
