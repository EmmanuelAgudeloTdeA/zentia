import { z } from 'zod';
import { INTERACTION_TYPES, NOTIFICATION_TYPES } from '../enums/index.js';
import { paginationQueryShape } from './pagination.schema.js';
import { quoteStatusSchema } from './quotes.schema.js';

export const INTERACTION_NOTE_MAX_LENGTH = 2000;

export const interactionTypeSchema = z.enum(INTERACTION_TYPES);
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const createInteractionRequestSchema = z.object({
  customerId: z.uuid(),
  quoteId: z.uuid().nullable().optional(),
  type: interactionTypeSchema,
  note: z.string().trim().min(1).max(INTERACTION_NOTE_MAX_LENGTH),
  /** Por defecto, ahora; no puede ser futura (`INTERACTION_FUTURE_DATE`). */
  occurredAt: z.iso.datetime({ offset: true }).optional(),
});

export type CreateInteractionRequest = z.input<typeof createInteractionRequestSchema>;
export type CreateInteractionInput = z.output<typeof createInteractionRequestSchema>;

export const listInteractionsQuerySchema = z
  .object({
    customerId: z.uuid().optional(),
    quoteId: z.uuid().optional(),
    ...paginationQueryShape,
  })
  .refine((query) => query.customerId || query.quoteId, {
    path: ['customerId'],
    error: 'required',
  });

export type ListInteractionsQuery = z.input<typeof listInteractionsQuerySchema>;
export type InteractionListFilter = z.output<typeof listInteractionsQuerySchema>;

const person = z.object({ id: z.uuid(), name: z.string() });

export const interactionDtoSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  quote: z.object({ id: z.uuid(), displayNumber: z.string() }).nullable(),
  type: interactionTypeSchema,
  note: z.string(),
  occurredAt: z.iso.datetime(),
  author: person,
  createdAt: z.iso.datetime(),
});

export type InteractionDto = z.infer<typeof interactionDtoSchema>;

export const interactionListDtoSchema = z.object({
  items: z.array(interactionDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type InteractionListDto = z.infer<typeof interactionListDtoSchema>;

export const listNotificationsQuerySchema = z.object({
  /** Con M9, por defecto por probabilidad de cierre (desc) y luego por fecha. */
  sort: z.enum(['probability', 'date']).default('probability'),
  unreadOnly: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ...paginationQueryShape,
});

export type ListNotificationsQuery = z.input<typeof listNotificationsQuerySchema>;
export type NotificationListFilter = z.output<typeof listNotificationsQuerySchema>;

export const notificationDtoSchema = z.object({
  id: z.uuid(),
  type: notificationTypeSchema,
  /** `quoteNumber`, `customerName` y `expiresAt` o `days`, para armar el texto en el front. */
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  referenceDate: z.iso.date(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  quote: z.object({ id: z.uuid(), displayNumber: z.string(), status: quoteStatusSchema }),
  /** Probabilidad de cierre si la cotización sigue Enviada y M9 está activo. */
  probability: z.int().nullable(),
});

export type NotificationDto = z.infer<typeof notificationDtoSchema>;

export const notificationListDtoSchema = z.object({
  /** Orden aplicado: `date` si se pidió así o si no se pudo calcular la probabilidad. */
  sort: z.enum(['probability', 'date']),
  items: z.array(notificationDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type NotificationListDto = z.infer<typeof notificationListDtoSchema>;

export const unreadCountDtoSchema = z.object({ count: z.int() });
export type UnreadCountDto = z.infer<typeof unreadCountDtoSchema>;
