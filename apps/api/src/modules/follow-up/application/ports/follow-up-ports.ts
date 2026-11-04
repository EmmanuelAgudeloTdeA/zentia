import type {
  AlertCandidate,
  Interaction,
  NewNotification,
  Notification,
} from '../../domain/index.js';

export interface NewInteraction {
  customerId: string;
  quoteId: string | null;
  type: Interaction['type'];
  note: string;
  occurredAt: Date;
  authorId: string;
}

export interface InteractionSearch {
  customerId?: string | undefined;
  quoteId?: string | undefined;
  /** Para un vendedor: solo las sin cotización o de cotizaciones propias. */
  visibleToOwnerId?: string | undefined;
  skip: number;
  take: number;
}

export interface InteractionRepository {
  create(interaction: NewInteraction): Promise<Interaction>;
  list(search: InteractionSearch): Promise<{ items: Interaction[]; total: number }>;
}

/** Repositorio de solo lectura (decisión 72): cotizaciones Enviadas con dueño activo. */
export interface FollowUpReadRepository {
  sentQuotesWithActiveOwner(): Promise<AlertCandidate[]>;
}

export interface NotificationRepository {
  /** Inserta ignorando duplicados de `(quoteId, type, referenceDate)`; devuelve cuántas creó. */
  insertMany(notifications: readonly NewNotification[]): Promise<number>;
  list(
    userId: string,
    options: { unreadOnly: boolean; skip: number; take: number },
  ): Promise<{ items: Notification[]; total: number }>;
  countUnread(userId: string): Promise<number>;
  /** false si no existe o no es del usuario. */
  markRead(id: string, userId: string, at: Date): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<void>;
  /** Pasa las no leídas de la cotización al nuevo dueño usando el cliente de la transacción de M4. */
  transferUnread(transactionClient: unknown, quoteId: string, toUserId: string): Promise<void>;
}

export interface JobLock {
  /** Ejecuta `fn` solo si consigue el lock; si otra instancia lo tiene, devuelve `null`. */
  withLock(name: string, fn: () => Promise<number>): Promise<number | null>;
}
