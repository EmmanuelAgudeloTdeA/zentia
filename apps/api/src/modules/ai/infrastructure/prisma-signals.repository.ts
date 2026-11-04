import { Prisma, type PrismaClient } from '@prisma/client';
import type { ProbabilitySignalsReader } from '../application/index.js';
import type { QuoteSignals } from '../domain/index.js';

const bogotaDay = (column: Prisma.Sql) =>
  Prisma.sql`to_char((${column}) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')`;

type Row = Omit<QuoteSignals, 'interactedSinceSent'> & { interactedSinceSent: boolean | null };

/** Solo lectura (decisión 72): conteos y fechas; nunca texto libre (RN-37, RN-40). */
export class PrismaProbabilitySignalsReader implements ProbabilitySignalsReader {
  constructor(private readonly db: PrismaClient) {}

  private async query(where: Prisma.Sql): Promise<QuoteSignals[]> {
    const relevant = Prisma.sql`(i."quoteId" = q."id" OR (i."customerId" = q."customerId" AND i."quoteId" IS NULL))`;
    const rows = await this.db.$queryRaw<Row[]>`
      SELECT q."id" AS "quoteId", q."number", q."status"::text AS "status", q."ownerId",
        u."name" AS "ownerName", c."name" AS "customerName", q."total"::text AS "total",
        ${bogotaDay(Prisma.sql`q."sentAt"`)} AS "sentDay",
        to_char(q."expiresAt", 'YYYY-MM-DD') AS "expiresAt",
        ${bogotaDay(Prisma.sql`(SELECT max(i."occurredAt") FROM "Interaction" i WHERE ${relevant})`)} AS "lastInteractionDay",
        EXISTS (
          SELECT 1 FROM "Interaction" i WHERE ${relevant} AND i."occurredAt" >= q."sentAt"
        ) AS "interactedSinceSent",
        (SELECT count(*)::int FROM "QuoteVersion" v WHERE v."quoteId" = q."id" AND v."number" >= 2) AS "versionsAfterSend"
      FROM "Quote" q
      JOIN "User" u ON u."id" = q."ownerId"
      JOIN "Customer" c ON c."id" = q."customerId"
      WHERE ${where}`;
    return rows.map((row) => ({ ...row, interactedSinceSent: row.interactedSinceSent ?? false }));
  }

  getSignals(quoteIds: readonly string[], ownerId: string | null): Promise<QuoteSignals[]> {
    if (quoteIds.length === 0) return Promise.resolve([]);
    const owner = ownerId ? Prisma.sql`AND q."ownerId" = ${ownerId}::uuid` : Prisma.empty;
    return this.query(
      Prisma.sql`q."id" IN (${Prisma.join(quoteIds.map((id) => Prisma.sql`${id}::uuid`))}) ${owner}`,
    );
  }

  sentSignals(ownerId: string | null): Promise<QuoteSignals[]> {
    const owner = ownerId ? Prisma.sql`AND q."ownerId" = ${ownerId}::uuid` : Prisma.empty;
    return this.query(Prisma.sql`q."status" = 'SENT' ${owner}`);
  }

  /** Los datos sintéticos (RN-41) se reconocen por el documento `DEMO…` del cliente. */
  async countClosed(): Promise<number> {
    const [row] = await this.db.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS "count" FROM "Quote" q
      JOIN "Customer" c ON c."id" = q."customerId"
      WHERE q."status" IN ('APPROVED', 'REJECTED', 'EXPIRED') AND c."documentId" NOT LIKE 'DEMO%'`;
    return row?.count ?? 0;
  }
}
