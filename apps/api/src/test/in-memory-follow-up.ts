import { randomUUID } from 'node:crypto';
import type { FollowUpInfrastructure } from '../modules/follow-up/index.js';
import type {
  FollowUpReadRepository,
  InteractionRepository,
  JobLock,
  NotificationRepository,
} from '../modules/follow-up/application/index.js';

type Stored<T> = T & { id: string };

interface StoredNotification {
  id: string;
  userId: string;
  quoteId: string;
  type: 'QUOTE_EXPIRING' | 'QUOTE_NO_FOLLOW_UP';
  referenceDate: string;
  params: Record<string, string | number>;
  readAt: Date | null;
  createdAt: Date;
}

/** Fakes de follow-up para pruebas de rutas; las reglas SQL se prueban en integración. */
export function createInMemoryFollowUp(
  quoteInfo: (quoteId: string) => { number: number; status: string } = () => ({
    number: 1,
    status: 'SENT',
  }),
  ownerOf: (quoteId: string) => string | undefined = () => undefined,
) {
  const interactions: Stored<
    Parameters<InteractionRepository['create']>[0] & { createdAt: Date }
  >[] = [];
  const notifications: StoredNotification[] = [];
  const candidates: Awaited<ReturnType<FollowUpReadRepository['sentQuotesWithActiveOwner']>> = [];

  const interactionRepo: InteractionRepository = {
    async create(input) {
      const stored = { ...input, id: randomUUID(), createdAt: new Date() };
      interactions.push(stored);
      return {
        id: stored.id,
        customerId: stored.customerId,
        quote: stored.quoteId
          ? { id: stored.quoteId, number: quoteInfo(stored.quoteId).number }
          : null,
        type: stored.type,
        note: stored.note,
        occurredAt: stored.occurredAt,
        author: { id: stored.authorId, name: 'Autor' },
        createdAt: stored.createdAt,
      };
    },
    async list({ customerId, quoteId, withoutQuote, visibleToOwnerId, skip, take }) {
      const matches = interactions
        .filter(
          (item) =>
            (!customerId || item.customerId === customerId) &&
            (!quoteId || item.quoteId === quoteId) &&
            (!withoutQuote || item.quoteId === null) &&
            (!visibleToOwnerId ||
              item.quoteId === null ||
              ownerOf(item.quoteId) === visibleToOwnerId),
        )
        .sort(
          (a, b) =>
            b.occurredAt.getTime() - a.occurredAt.getTime() ||
            b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return {
        items: matches.slice(skip, skip + take).map((stored) => ({
          id: stored.id,
          customerId: stored.customerId,
          quote: stored.quoteId
            ? { id: stored.quoteId, number: quoteInfo(stored.quoteId).number }
            : null,
          type: stored.type,
          note: stored.note,
          occurredAt: stored.occurredAt,
          author: { id: stored.authorId, name: 'Autor' },
          createdAt: stored.createdAt,
        })),
        total: matches.length,
      };
    },
  };

  const notificationRepo: NotificationRepository = {
    async insertMany(batch) {
      let created = 0;
      for (const item of batch) {
        const duplicate = notifications.some(
          (n) =>
            n.quoteId === item.quoteId &&
            n.type === item.type &&
            n.referenceDate === item.referenceDate &&
            n.userId === item.userId,
        );
        if (duplicate) continue;
        notifications.push({ ...item, id: randomUUID(), readAt: null, createdAt: new Date() });
        created++;
      }
      return created;
    },
    async list(userId, { unreadOnly, skip, take }) {
      const matches = notifications
        .filter((n) => n.userId === userId && (!unreadOnly || !n.readAt))
        .reverse();
      return {
        items: matches.slice(skip, skip + take).map((n) => ({
          id: n.id,
          type: n.type,
          params: n.params,
          referenceDate: n.referenceDate,
          readAt: n.readAt,
          createdAt: n.createdAt,
          quote: { id: n.quoteId, ...quoteInfo(n.quoteId) },
        })),
        total: matches.length,
      };
    },
    async listAll(userId, { unreadOnly }) {
      return (await notificationRepo.list(userId, { unreadOnly, skip: 0, take: 1000 })).items;
    },
    async countUnread(userId) {
      return notifications.filter((n) => n.userId === userId && !n.readAt).length;
    },
    async markRead(id, userId, at) {
      const found = notifications.find((n) => n.id === id && n.userId === userId);
      if (!found) return false;
      found.readAt ??= at;
      return true;
    },
    async markAllRead(userId, at) {
      for (const n of notifications) if (n.userId === userId && !n.readAt) n.readAt = at;
    },
    async transferUnread(_client, quoteId, toUserId) {
      const owned = (n: StoredNotification) =>
        notifications.some(
          (t) =>
            t.userId === toUserId &&
            t.quoteId === n.quoteId &&
            t.type === n.type &&
            t.referenceDate === n.referenceDate,
        );
      for (let i = notifications.length - 1; i >= 0; i--) {
        const n = notifications[i];
        if (n && n.quoteId === quoteId && !n.readAt && n.userId !== toUserId && owned(n)) {
          notifications.splice(i, 1);
        }
      }
      for (const n of notifications) if (n.quoteId === quoteId && !n.readAt) n.userId = toUserId;
    },
  };

  const jobLock: JobLock = { withLock: (_name, fn) => fn() };

  const infrastructure: FollowUpInfrastructure = {
    interactions: interactionRepo,
    notifications: notificationRepo,
    followUpRead: { sentQuotesWithActiveOwner: async () => candidates },
    jobLock,
  };
  return { infrastructure, interactions, notifications, candidates };
}

export type InMemoryFollowUp = ReturnType<typeof createInMemoryFollowUp>;
