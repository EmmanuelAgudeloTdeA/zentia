import type { InteractionType, NotificationType } from '@zentia/shared';

export interface Person {
  id: string;
  name: string;
}

export interface Interaction {
  id: string;
  customerId: string;
  quote: { id: string; number: number } | null;
  type: InteractionType;
  note: string;
  occurredAt: Date;
  author: Person;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: NotificationType;
  params: Record<string, string | number>;
  referenceDate: string;
  readAt: Date | null;
  createdAt: Date;
  quote: { id: string; number: number; status: string };
}

/** Cotización Enviada con dueño activo y las fechas que usan las reglas de alerta (en Bogotá). */
export interface AlertCandidate {
  quoteId: string;
  ownerId: string;
  number: number;
  customerName: string;
  expiresAt: string;
  sentDay: string;
  lastInteractionDay: string | null;
}
