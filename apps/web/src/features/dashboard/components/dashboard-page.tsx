import {
  DASHBOARD_MAX_PERIOD_DAYS,
  periodPresets,
  type DashboardSummaryDto,
  type QuoteStatus,
} from '@zentia/shared';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import {
  daysBetween,
  formatCop,
  formatDay,
  formatPercent,
  todayInBogota,
} from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  CheckCircleIcon,
  ClockAlertIcon,
  Combobox,
  EmptyState,
  ErrorMessage,
  FileTextIcon,
  FilterChip,
  KpiCard,
  PercentIcon,
  SendIcon,
  Skeleton,
  TextField,
} from '../../../shared/ui';
import { DashboardSections } from '../../ai';
import {
  NEW_QUOTE_PATH,
  openQuotesWithFilters,
  QUOTES_PATH,
  QuoteStatusBadge,
  type SentPeriod,
} from '../../quotes';
import { usersService } from '../../users';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardFiltersStore, type PeriodPreset } from '../store/dashboard-filters.store';

const DashboardCharts = lazy(() => import('./dashboard-charts'));

/** `id: null` es la opción explícita "Todos". */
interface SellerOption {
  id: string | null;
  name: string;
}

const PRESETS: readonly PeriodPreset[] = ['thisMonth', 'lastMonth', 'last90Days', 'custom'];

function greetingKey(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  );
  return hour < 12 ? 'morning' : hour < 19 ? 'afternoon' : 'evening';
}

/** "Monto cotizado" suma la cohorte sin anuladas (los borradores no tienen primer envío). */
const QUOTED_STATUSES: readonly QuoteStatus[] = ['SENT', 'APPROVED', 'REJECTED', 'EXPIRED'];

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const seesAll = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const filters = useDashboardFiltersStore();
  const today = useMemo(() => todayInBogota(), []);
  const presets = useMemo(() => periodPresets(today), [today]);
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; error: unknown }
    | { status: 'ready'; data: DashboardSummaryDto }
  >({ status: 'loading' });
  const [version, setVersion] = useState(0);

  const custom = filters.preset === 'custom';
  const customError =
    custom && filters.customFrom && filters.customTo
      ? filters.customFrom > filters.customTo
        ? t('dashboard.period.invalidOrder')
        : daysBetween(filters.customFrom, filters.customTo) + 1 > DASHBOARD_MAX_PERIOD_DAYS
          ? t('dashboard.period.tooLong')
          : undefined
      : undefined;
  const preset = filters.preset;
  const period =
    preset === 'custom' ? { from: filters.customFrom, to: filters.customTo } : presets[preset];
  const ready = Boolean(period.from && period.to && !customError);
  const ownerId = seesAll ? filters.owner?.id : undefined;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setState((current) => (current.status === 'ready' ? current : { status: 'loading' }));
    dashboardService
      .summary({ from: period.from, to: period.to, ownerId }, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error });
      });
    return () => controller.abort();
  }, [ready, period.from, period.to, ownerId, version]);

  // Las cohortes abren la lista con el mismo período y vendedor para que los conteos coincidan.
  const openQuotes = (
    statuses: readonly QuoteStatus[],
    sentPeriod: SentPeriod | null,
    followUpPending = false,
  ) => {
    openQuotesWithFilters({
      statuses,
      owner: seesAll ? filters.owner : null,
      sentPeriod,
      followUpPending,
    });
    navigate(QUOTES_PATH);
  };

  const firstName = user?.name.split(' ')[0] ?? '';
  const data = state.status === 'ready' ? state.data : null;
  const periodTag = data
    ? t('dashboard.periodHint', {
        from: formatDay(data.period.from),
        to: formatDay(data.period.to),
      })
    : null;
  const pending = data?.current.pendingFollowUp ?? 0;
  const cohort = data ? { from: data.period.from, to: data.period.to } : null;

  return (
    <>
      <PageHeader
        title={t(`dashboard.greeting.${greetingKey(new Date())}`, { name: firstName })}
        description={
          data
            ? pending > 0
              ? t('dashboard.context.pending', { count: pending })
              : t('dashboard.context.allClear')
            : undefined
        }
      />

      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200/70 bg-neutral-0 p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              role="group"
              aria-label={t('dashboard.period.label')}
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {PRESETS.map((preset) => (
                <FilterChip
                  key={preset}
                  active={filters.preset === preset}
                  onClick={() => filters.setPreset(preset)}
                >
                  {t(`dashboard.period.${preset}`)}
                </FilterChip>
              ))}
            </div>
            {custom ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField
                  label={t('dashboard.period.from')}
                  type="date"
                  value={filters.customFrom}
                  onChange={(event) => filters.setCustom(event.target.value, filters.customTo)}
                  error={customError}
                />
                <TextField
                  label={t('dashboard.period.to')}
                  type="date"
                  value={filters.customTo}
                  onChange={(event) => filters.setCustom(filters.customFrom, event.target.value)}
                />
              </div>
            ) : null}
          </div>
          {seesAll ? (
            <Combobox<SellerOption>
              label={t('dashboard.seller.label')}
              placeholder={t('dashboard.seller.all')}
              className="lg:w-72"
              minChars={0}
              inputValue={filters.ownerInput}
              onInputChange={filters.setOwnerInput}
              loadOptions={async (query) => {
                const key = query.toLocaleLowerCase();
                const sellers = (await usersService.options()).filter((option) =>
                  option.name.toLocaleLowerCase().includes(key),
                );
                return [{ id: null, name: t('dashboard.seller.all') }, ...sellers];
              }}
              getOptionKey={(option) => option.id ?? 'all'}
              getOptionLabel={(option) => option.name}
              onSelect={(option) =>
                option.id === null
                  ? filters.clearOwner()
                  : filters.pickOwner({ id: option.id, label: option.name })
              }
              labels={{
                loading: t('common.combobox.loading'),
                noResults: t('common.combobox.noResults'),
                error: t('common.combobox.error'),
              }}
            />
          ) : null}
        </div>

        {state.status === 'error' ? (
          <ErrorMessage error={state.error} onRetry={() => setVersion((value) => value + 1)} />
        ) : !data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex snap-x gap-5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              <KpiCard
                label={t('dashboard.kpi.active')}
                value={data.current.active}
                icon={<SendIcon size={18} />}
                tag={t('dashboard.currentStateHint')}
                onClick={() => openQuotes(['SENT'], null)}
              />
              <KpiCard
                label={t('dashboard.kpi.pendingFollowUp')}
                value={data.current.pendingFollowUp}
                icon={<ClockAlertIcon size={18} />}
                hint={t('dashboard.kpi.pendingHint', { days: data.current.followUpDays })}
                tag={t('dashboard.currentStateHint')}
                onClick={() => openQuotes(['SENT'], null, true)}
              />
              <KpiCard
                label={t('dashboard.kpi.conversionRate')}
                value={
                  data.period.conversionRate
                    ? formatPercent(data.period.conversionRate)
                    : t('dashboard.noData')
                }
                icon={<PercentIcon size={18} />}
                hint={
                  data.period.closed > 0
                    ? t('dashboard.kpi.closedHint', { count: data.period.closed })
                    : t('dashboard.kpi.noClosedHint')
                }
                tag={periodTag}
              />
              <KpiCard
                label={t('dashboard.kpi.approvedAmount')}
                value={formatCop(data.period.approvedAmount)}
                icon={<CheckCircleIcon size={18} />}
                hint={t('dashboard.kpi.approvedHint', {
                  amount: formatCop(data.period.quotedAmount),
                })}
                tag={periodTag}
                onClick={() => openQuotes(['APPROVED'], cohort)}
              />
            </div>

            <div className="flex snap-x gap-5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
              {(['APPROVED', 'REJECTED', 'EXPIRED'] as const).map((status) => (
                <KpiCard
                  key={status}
                  label={<QuoteStatusBadge status={status} size="sm" />}
                  value={data.period[status.toLowerCase() as 'approved' | 'rejected' | 'expired']}
                  tag={periodTag}
                  onClick={() => openQuotes([status], cohort)}
                />
              ))}
              <KpiCard
                label={t('dashboard.kpi.quotedAmount')}
                value={formatCop(data.period.quotedAmount)}
                hint={t('dashboard.kpi.quotedHint')}
                tag={periodTag}
                onClick={() => openQuotes(QUOTED_STATUSES, cohort)}
              />
            </div>

            {data.current.active === 0 &&
            data.period.quotedAmount === '0' &&
            data.period.closed === 0 ? (
              <EmptyState
                icon={<FileTextIcon size={40} />}
                title={t('dashboard.empty.title')}
                action={
                  <Link
                    to={NEW_QUOTE_PATH}
                    className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-button text-white uppercase hover:bg-primary-700"
                  >
                    {t('quotes.new')}
                  </Link>
                }
              />
            ) : data.period.quotedAmount === '0' && data.period.closed === 0 ? (
              <p className="rounded-xl border border-neutral-200/70 bg-neutral-0 p-6 text-center text-body text-neutral-600">
                {t('dashboard.empty.period')}
              </p>
            ) : (
              <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
                <DashboardCharts period={data.period} />
              </Suspense>
            )}

            <DashboardSections sections={data.sections} showOwner={seesAll} />
          </>
        )}

        <Link
          to={QUOTES_PATH}
          className="inline-block text-body-sm font-medium text-primary-600 hover:underline"
        >
          {t('dashboard.viewQuotes')}
        </Link>
      </div>
    </>
  );
}
