import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  FollowUpInfrastructure,
  FollowUpReadRepository,
  InteractionRepository,
  InteractionSearch,
  JobLock,
  NewInteraction,
  NotificationRepository,
} from '../application/index.js';
import type {
  AlertCandidate,
  Interaction,
  NewNotification,
  Notification,
} from '../domain/index.js';

const interactionInclude = {
  author: { select: { id: true, name: true } },
  quote: { select: { id: true, number: true } },
} as const;

type InteractionRow = Prisma.InteractionGetPayload<{ include: typeof interactionInclude }>;

function toInteraction(row: InteractionRow): Interaction {
  return {
    id: row.id,
    customerId: row.customerId,
    quote: row.quote,
    type: row.type,
    note: row.note,
    occurredAt: row.occurredAt,
    author: row.author,
    createdAt: row.createdAt,
  };
}

const day = (value: Date) => value.toISOString().slice(0, 10);

export class PrismaInteractionRepository implements InteractionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(interaction: NewInteraction): Promise<Interaction> {
    return toInteraction(
      await this.db.interaction.create({ data: interaction, include: interactionInclude }),
    );
  }

  async list({
    customerId,
    quoteId,
    withoutQuote,
    visibleToOwnerId,
    skip,
    take,
  }: InteractionSearch) {
    const where: Prisma.InteractionWhereInput = {
      ...(customerId ? { customerId } : {}),
      ...(quoteId ? { quoteId } : withoutQuote ? { quoteId: null } : {}),
      ...(visibleToOwnerId
        ? { OR: [{ quoteId: null }, { quote: { ownerId: visibleToOwnerId } }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.interaction.findMany({
        where,
        include: interactionInclude,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.db.interaction.count({ where }),
    ]);
    return { items: rows.map(toInteraction), total };
  }
}

export class PrismaFollowUpReadRepository implements FollowUpReadRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Las fechas se pasan a America/Bogota en SQL; los timestamps de Prisma se guardan en UTC. */
  sentQuotesWithActiveOwner(): Promise<AlertCandidate[]> {
    return this.db.$queryRaw<AlertCandidate[]>`
      SELECT q."id" AS "quoteId", q."ownerId", q."number", c."name" AS "customerName",
        to_char(q."expiresAt", 'YYYY-MM-DD') AS "expiresAt",
        to_char((q."sentAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS "sentDay",
        to_char((
          SELECT max(i."occurredAt") FROM "Interaction" i
          WHERE i."quoteId" = q."id" OR (i."customerId" = q."customerId" AND i."quoteId" IS NULL)
        ) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS "lastInteractionDay"
      FROM "Quote" q
      JOIN "Customer" c ON c."id" = q."customerId"
      JOIN "User" u ON u."id" = q."ownerId"
      WHERE q."status" = 'SENT' AND u."isActive" = true
        AND q."expiresAt" IS NOT NULL AND q."sentAt" IS NOT NULL`;
  }
}

const notificationInclude = {
  quote: { select: { id: true, number: true, status: true } },
} as const;

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly db: PrismaClient) {}

  async insertMany(notifications: readonly NewNotification[]): Promise<number> {
    if (notifications.length === 0) return 0;
    const result = await this.db.notification.createMany({
      data: notifications.map((notification) => ({
        ...notification,
        referenceDate: new Date(`${notification.referenceDate}T00:00:00.000Z`),
        params: notification.params,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async list(
    userId: string,
    { unreadOnly, skip, take }: { unreadOnly: boolean; skip: number; take: number },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [rows, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.db.notification.count({ where }),
    ]);
    const items: Notification[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      params: row.params as Record<string, string | number>,
      referenceDate: day(row.referenceDate),
      readAt: row.readAt,
      createdAt: row.createdAt,
      quote: row.quote,
    }));
    return { items, total };
  }

  async listAll(userId: string, { unreadOnly }: { unreadOnly: boolean }): Promise<Notification[]> {
    const { items } = await this.list(userId, { unreadOnly, skip: 0, take: 1000 });
    return items;
  }

  countUnread(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(id: string, userId: string, at: Date): Promise<boolean> {
    const notification = await this.db.notification.findFirst({
      where: { id, userId },
      select: { readAt: true },
    });
    if (!notification) return false;
    if (!notification.readAt)
      await this.db.notification.update({ where: { id }, data: { readAt: at } });
    return true;
  }

  async markAllRead(userId: string, at: Date): Promise<void> {
    await this.db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: at },
    });
  }

  async transferUnread(
    transactionClient: unknown,
    quoteId: string,
    toUserId: string,
  ): Promise<void> {
    // Es el Prisma.TransactionClient de la reasignación (M4): el traspaso se revierte con ella.
    const client = transactionClient as Prisma.TransactionClient;
    // Si el destino ya tiene la alerta de ese ciclo (p. ej., A → B → A), la copia no leída sobra.
    await client.$executeRaw`
      DELETE FROM "Notification" n
      WHERE n."quoteId" = ${quoteId}::uuid AND n."readAt" IS NULL AND n."userId" <> ${toUserId}::uuid
        AND EXISTS (
          SELECT 1 FROM "Notification" t
          WHERE t."quoteId" = n."quoteId" AND t."type" = n."type"
            AND t."referenceDate" = n."referenceDate" AND t."userId" = ${toUserId}::uuid
        )`;
    await client.notification.updateMany({
      where: { quoteId, readAt: null },
      data: { userId: toUserId },
    });
  }
}

/** `pg_try_advisory_xact_lock`: el lock vive lo que dura la transacción y se libera solo. */
export class PostgresJobLock implements JobLock {
  constructor(private readonly db: PrismaClient) {}

  withLock(name: string, fn: () => Promise<number>): Promise<number | null> {
    return this.db.$transaction(
      async (tx) => {
        const [row] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtext(${name})) AS "locked"`;
        return row?.locked ? fn() : null;
      },
      { timeout: 10 * 60_000, maxWait: 10_000 },
    );
  }
}

export function createPrismaFollowUpInfrastructure(prisma: PrismaClient): FollowUpInfrastructure {
  return {
    interactions: new PrismaInteractionRepository(prisma),
    followUpRead: new PrismaFollowUpReadRepository(prisma),
    notifications: new PrismaNotificationRepository(prisma),
    jobLock: new PostgresJobLock(prisma),
  };
}
