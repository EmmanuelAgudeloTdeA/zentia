import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  CurrentCounts,
  DashboardInfrastructure,
  DashboardReadRepository,
  PeriodStats,
} from '../application/index.js';

/** `timestamp` de Prisma guardado en UTC → fecha en America/Bogota. */
const bogotaDate = (column: Prisma.Sql) =>
  Prisma.sql`((${column}) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date`;

const ownerFilter = (ownerId: string | null) =>
  ownerId ? Prisma.sql`AND q."ownerId" = ${ownerId}::uuid` : Prisma.empty;

/** Fecha y hora UTC sin zona, como las guarda Prisma (`timestamp(3)`). */
const utcTimestamp = (date: Date) => date.toISOString().replace('T', ' ').replace('Z', '');

export class PrismaDashboardReadRepository implements DashboardReadRepository {
  constructor(private readonly db: PrismaClient) {}

  /** "Sin seguimiento" (M6): GREATEST ignora la interacción nula y usa el último envío. */
  async currentCounts(
    ownerId: string | null,
    today: string,
    followUpDays: number,
  ): Promise<CurrentCounts> {
    const lastInteraction = Prisma.sql`(
      SELECT max(i."occurredAt") FROM "Interaction" i
      WHERE i."quoteId" = q."id" OR (i."customerId" = q."customerId" AND i."quoteId" IS NULL))`;
    const [row] = await this.db.$queryRaw<CurrentCounts[]>`
      SELECT
        COUNT(*) FILTER (WHERE q."status" = 'SENT')::int AS "active",
        COUNT(*) FILTER (
          WHERE q."status" = 'SENT'
            AND GREATEST(${bogotaDate(lastInteraction)}, ${bogotaDate(Prisma.sql`q."sentAt"`)}) + ${followUpDays}::int
              <= ${today}::date
        )::int AS "pendingFollowUp"
      FROM "Quote" q
      WHERE true ${ownerFilter(ownerId)}`;
    return row ?? { active: 0, pendingFollowUp: 0 };
  }

  async periodStats(
    ownerId: string | null,
    fromUtc: Date,
    toUtcExclusive: Date,
  ): Promise<PeriodStats> {
    const [row] = await this.db.$queryRaw<PeriodStats[]>`
      SELECT
        COUNT(*) FILTER (WHERE q."status" = 'APPROVED')::int AS "approved",
        COUNT(*) FILTER (WHERE q."status" = 'REJECTED')::int AS "rejected",
        COUNT(*) FILTER (WHERE q."status" = 'EXPIRED')::int AS "expired",
        COALESCE(SUM(q."total") FILTER (WHERE q."status" <> 'VOIDED'), 0)::text AS "quotedAmount",
        COALESCE(SUM(q."total") FILTER (WHERE q."status" = 'APPROVED'), 0)::text AS "approvedAmount"
      FROM "Quote" q
      WHERE q."firstSentAt" >= ${utcTimestamp(fromUtc)}::timestamp
        AND q."firstSentAt" < ${utcTimestamp(toUtcExclusive)}::timestamp
        ${ownerFilter(ownerId)}`;
    return row ?? { approved: 0, rejected: 0, expired: 0, quotedAmount: '0', approvedAmount: '0' };
  }
}

export function createPrismaDashboardInfrastructure(prisma: PrismaClient): DashboardInfrastructure {
  return { dashboard: new PrismaDashboardReadRepository(prisma) };
}
