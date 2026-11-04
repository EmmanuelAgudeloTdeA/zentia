import {
  conversionRate,
  resolvePeriod,
  type DashboardQuery,
  type DashboardSectionDto,
  type DashboardSummaryDto,
} from '@zentia/shared';
import type { Clock } from '../../../core/clock/index.js';
import { AppError } from '../../../core/http/index.js';
import { resolveScope, type Actor } from '../../auth/index.js';
import type { SettingsReader } from '../../company-settings/index.js';

export interface CurrentCounts {
  active: number;
  pendingFollowUp: number;
}

export interface PeriodStats {
  approved: number;
  rejected: number;
  expired: number;
  /** Sumas de `Decimal(15,0)` como texto, sin pasar por `number`. */
  quotedAmount: string;
  approvedAmount: string;
}

/** Repositorio de solo lectura (decisión 72): agrega sobre `Quote` sin escribir. */
export interface DashboardReadRepository {
  currentCounts(
    ownerId: string | null,
    today: string,
    followUpDays: number,
  ): Promise<CurrentCounts>;
  /** Cohorte por `firstSentAt` en `[fromUtc, toUtcExclusive)`. */
  periodStats(ownerId: string | null, fromUtc: Date, toUtcExclusive: Date): Promise<PeriodStats>;
}

export interface DashboardFilters {
  ownerId: string | null;
  from: string;
  to: string;
}

/** Punto de extensión: M9 agrega "Mayor probabilidad de cierre" (H9.3). */
export type DashboardSection = (
  actor: Actor,
  filters: DashboardFilters,
) => Promise<DashboardSectionDto | null>;

export interface DashboardInfrastructure {
  dashboard: DashboardReadRepository;
}

export interface DashboardDependencies extends DashboardInfrastructure {
  clock: Clock;
  settings: SettingsReader;
  sections: readonly DashboardSection[];
}

/** America/Bogota es UTC−5 todo el año (sin horario de verano): el día D empieza a las 05:00 UTC. */
export function bogotaDayStartUtc(day: string): Date {
  return new Date(`${day}T05:00:00.000Z`);
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** RN-36: activas y pendientes por estado actual; el resto por cohorte de `firstSentAt`. */
export class GetDashboardSummaryUseCase {
  constructor(private readonly deps: DashboardDependencies) {}

  async execute(actor: Actor, query: DashboardQuery): Promise<DashboardSummaryDto> {
    const period = resolvePeriod(query.from, query.to, this.deps.clock.today());
    if (!period) throw new AppError('DASHBOARD_INVALID_PERIOD', 400);
    // Un vendedor siempre ve solo lo suyo, aunque envíe otro `ownerId`.
    const ownerId = resolveScope(actor.role) === 'OWN' ? actor.id : (query.ownerId ?? null);
    const { followUpDays } = await this.deps.settings.getCommercialParameters();

    const [current, stats, sections] = await Promise.all([
      this.deps.dashboard.currentCounts(ownerId, this.deps.clock.today(), followUpDays),
      this.deps.dashboard.periodStats(
        ownerId,
        bogotaDayStartUtc(period.from),
        bogotaDayStartUtc(nextDay(period.to)),
      ),
      Promise.all(this.deps.sections.map((section) => section(actor, { ownerId, ...period }))),
    ]);
    return {
      scope: { ownerId },
      current: { ...current, followUpDays },
      period: {
        ...period,
        ...stats,
        closed: stats.approved + stats.rejected + stats.expired,
        conversionRate: conversionRate(stats.approved, stats.rejected, stats.expired),
      },
      sections: sections.filter((section): section is DashboardSectionDto => section !== null),
    };
  }
}
