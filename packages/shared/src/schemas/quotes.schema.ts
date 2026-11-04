import { z } from 'zod';
import { QUOTE_EVENT_TYPES, QUOTE_MAX_ITEMS, QUOTE_STATUSES } from '../enums/index.js';
import { vatRateSchema } from './company-settings.schema.js';
import { moneyString, percentString, quantityString } from './decimal.schema.js';
import { paginationQueryShape } from './pagination.schema.js';

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);
export const quoteEventTypeSchema = z.enum(QUOTE_EVENT_TYPES);

export const CUSTOMER_REQUEST_MAX_LENGTH = 1000;
export const VOID_REASON_MAX_LENGTH = 500;

const updatedAtSchema = z.iso.datetime();
const customerRequestSchema = z.string().trim().max(CUSTOMER_REQUEST_MAX_LENGTH);

const newItemSchema = z.object({ productId: z.uuid(), quantity: quantityString });

export const createQuoteRequestSchema = z.object({
  customerId: z.uuid(),
  items: z.array(newItemSchema).min(1).max(QUOTE_MAX_ITEMS),
  discountPct: percentString.default('0'),
  shippingAmount: moneyString.default('0'),
});

export type CreateQuoteRequest = z.input<typeof createQuoteRequestSchema>;
export type CreateQuoteInput = z.output<typeof createQuoteRequestSchema>;

export const updateQuoteRequestSchema = z.object({
  customerId: z.uuid().optional(),
  /** Las líneas con `id` conservan su snapshot de precio; las nuevas toman el vigente. */
  items: z
    .array(newItemSchema.extend({ id: z.uuid().optional() }))
    .min(1)
    .max(QUOTE_MAX_ITEMS)
    .optional(),
  discountPct: percentString.optional(),
  shippingAmount: moneyString.optional(),
  /** Obligatorio al editar una Enviada (`CUSTOMER_REQUEST_REQUIRED`). */
  customerRequest: customerRequestSchema.optional(),
  updatedAt: updatedAtSchema,
});

export type UpdateQuoteRequest = z.input<typeof updateQuoteRequestSchema>;
export type UpdateQuoteInput = z.output<typeof updateQuoteRequestSchema>;

export const quoteMutationSchema = z.object({ updatedAt: updatedAtSchema });

export const changeQuoteStatusRequestSchema = z.object({
  to: z.enum(['APPROVED', 'REJECTED']),
  updatedAt: updatedAtSchema,
});

export const voidQuoteRequestSchema = z.object({
  reason: z.string().trim().min(1).max(VOID_REASON_MAX_LENGTH),
  updatedAt: updatedAtSchema,
});

export const changeExpiryRequestSchema = z.object({
  expiresAt: z.iso.date(),
  updatedAt: updatedAtSchema,
});

export const reassignQuoteRequestSchema = z.object({
  ownerId: z.uuid(),
  updatedAt: updatedAtSchema,
});

export const reactivateQuoteRequestSchema = z.object({
  customerRequest: customerRequestSchema.optional(),
  updatePrices: z.boolean(),
  updatedAt: updatedAtSchema,
});

export type ChangeQuoteStatusRequest = z.infer<typeof changeQuoteStatusRequestSchema>;
export type VoidQuoteRequest = z.infer<typeof voidQuoteRequestSchema>;
export type ChangeExpiryRequest = z.infer<typeof changeExpiryRequestSchema>;
export type ReassignQuoteRequest = z.infer<typeof reassignQuoteRequestSchema>;
export type ReactivateQuoteRequest = z.infer<typeof reactivateQuoteRequestSchema>;

export const listQuotesQuerySchema = z
  .object({
    /** CSV de estados: `DRAFT,SENT`. */
    status: z
      .string()
      .optional()
      .transform((value) => (value ? value.split(',').filter(Boolean) : []))
      .pipe(z.array(quoteStatusSchema)),
    customerId: z.uuid().optional(),
    ownerId: z.uuid().optional(),
    q: z.string().trim().max(100).optional(),
    /** Cohorte por `firstSentAt` en días de America/Bogota, ambos extremos incluidos (como el tablero). */
    sentFrom: z.iso.date().optional(),
    sentTo: z.iso.date().optional(),
    ...paginationQueryShape,
  })
  .refine((query) => !query.sentFrom || !query.sentTo || query.sentFrom <= query.sentTo, {
    path: ['sentTo'],
    message: 'sentFrom must be on or before sentTo',
  });

export type ListQuotesQuery = z.input<typeof listQuotesQuerySchema>;
export type QuoteListFilter = z.output<typeof listQuotesQuerySchema>;

const personSchema = z.object({ id: z.uuid(), name: z.string() });

export const quoteItemDtoSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  category: z.string(),
  unitPrice: z.string(),
  vatRate: vatRateSchema,
  quantity: z.string(),
  lineAmount: z.string(),
});

export type QuoteItemDto = z.infer<typeof quoteItemDtoSchema>;

export const quoteSummaryDtoSchema = z.object({
  id: z.uuid(),
  number: z.int(),
  displayNumber: z.string(),
  status: quoteStatusSchema,
  customer: personSchema,
  owner: personSchema,
  total: z.string(),
  expiresAt: z.iso.date().nullable(),
  updatedAt: z.iso.datetime(),
});

export type QuoteSummaryDto = z.infer<typeof quoteSummaryDtoSchema>;

export const quoteDtoSchema = quoteSummaryDtoSchema.extend({
  customer: personSchema.extend({ documentId: z.string(), isActive: z.boolean() }),
  createdBy: personSchema,
  items: z.array(quoteItemDtoSchema),
  discountPct: z.string(),
  discountAmount: z.string(),
  shippingAmount: z.string(),
  shippingTaxable: z.boolean(),
  subtotal: z.string(),
  linesVat: z.string(),
  shippingVat: z.string(),
  sentAt: z.iso.datetime().nullable(),
  firstSentAt: z.iso.datetime().nullable(),
  approvedAt: z.iso.datetime().nullable(),
  currentVersion: z.int(),
  voidReason: z.string().nullable(),
  /** Acciones de M4 (`QUOTE_ACTIONS`) más las que aporten otros módulos. */
  allowedActions: z.array(z.string()),
  createdAt: z.iso.datetime(),
});

export type QuoteDto = z.infer<typeof quoteDtoSchema>;

export const quoteListDtoSchema = z.object({
  items: z.array(quoteSummaryDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type QuoteListDto = z.infer<typeof quoteListDtoSchema>;

const changedLineSchema = z.object({
  productId: z.uuid(),
  productName: z.string(),
  quantity: z.string(),
  unitPrice: z.string(),
});

const fromToSchema = z.object({ from: z.string(), to: z.string() });

export const quoteChangesSchema = z.object({
  added: z.array(changedLineSchema),
  removed: z.array(changedLineSchema),
  modified: z.array(
    z.object({
      productId: z.uuid(),
      productName: z.string(),
      quantity: fromToSchema.nullable(),
      unitPrice: fromToSchema.nullable(),
    }),
  ),
  discountPct: fromToSchema.nullable(),
  shippingAmount: fromToSchema.nullable(),
  total: fromToSchema,
});

export type QuoteChanges = z.infer<typeof quoteChangesSchema>;

export const quoteEventDtoSchema = z.object({
  id: z.uuid(),
  type: quoteEventTypeSchema,
  at: z.iso.datetime(),
  actor: personSchema.nullable(),
  note: z.string().nullable(),
  data: z.record(z.string(), z.unknown()),
});

export type QuoteEventDto = z.infer<typeof quoteEventDtoSchema>;

export const historyEntryDtoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('VERSION'),
    at: z.iso.datetime(),
    actor: personSchema.nullable(),
    version: z.object({
      number: z.int(),
      changes: quoteChangesSchema.nullable(),
      customerRequest: z.string().nullable(),
      total: z.string(),
    }),
    /** Eventos de la misma operación (por ejemplo, `STATE_CHANGED` del envío). */
    events: z.array(quoteEventDtoSchema),
  }),
  z.object({
    kind: z.literal('EVENT'),
    at: z.iso.datetime(),
    actor: personSchema.nullable(),
    event: quoteEventDtoSchema,
  }),
]);

export type HistoryEntryDto = z.infer<typeof historyEntryDtoSchema>;

export const updateQuoteResultSchema = z.object({
  quote: quoteDtoSchema,
  changed: z.boolean(),
  versionNumber: z.int().nullable(),
});

export type UpdateQuoteResult = z.infer<typeof updateQuoteResultSchema>;

export const reactivationPreviewSchema = z.object({
  newExpiresAt: z.iso.date(),
  lines: z.array(
    z.object({
      itemId: z.uuid(),
      productId: z.uuid(),
      productName: z.string(),
      quantity: z.string(),
      currentPrice: z.string(),
      catalogPrice: z.string(),
      productActive: z.boolean(),
    }),
  ),
});

export type ReactivationPreview = z.infer<typeof reactivationPreviewSchema>;

export const reactivateQuoteResultSchema = z.object({
  quote: quoteDtoSchema,
  versionNumber: z.int().nullable(),
  keptInactiveProductIds: z.array(z.uuid()),
});

export type ReactivateQuoteResult = z.infer<typeof reactivateQuoteResultSchema>;

export const duplicateQuoteResultSchema = z.object({
  quote: quoteDtoSchema,
  omittedProductIds: z.array(z.uuid()),
  discountReset: z.boolean(),
});

export type DuplicateQuoteResult = z.infer<typeof duplicateQuoteResultSchema>;
