import { z } from 'zod';
import { ORDER_STATUSES } from '../enums/index.js';
import { vatRateSchema } from './company-settings.schema.js';
import { paginationQueryShape } from './pagination.schema.js';

export const ORDER_CANCEL_REASON_MAX_LENGTH = 500;

export const orderStatusSchema = z.enum(ORDER_STATUSES);

export const changeOrderStatusRequestSchema = z.object({
  to: z.enum(['IN_PROGRESS', 'DELIVERED', 'CANCELLED']),
  /** Solo al cancelar; opcional. */
  reason: z.string().trim().max(ORDER_CANCEL_REASON_MAX_LENGTH).optional(),
  updatedAt: z.iso.datetime(),
});

export type ChangeOrderStatusRequest = z.infer<typeof changeOrderStatusRequestSchema>;

export const listOrdersQuerySchema = z.object({
  /** CSV de estados: `PENDING,IN_PROGRESS`. */
  status: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').filter(Boolean) : []))
    .pipe(z.array(orderStatusSchema)),
  q: z.string().trim().max(100).optional(),
  ...paginationQueryShape,
});

export type ListOrdersQuery = z.input<typeof listOrdersQuerySchema>;
export type OrderListFilter = z.output<typeof listOrdersQuerySchema>;

const person = z.object({ id: z.uuid(), name: z.string() });

export const orderSummaryDtoSchema = z.object({
  id: z.uuid(),
  displayNumber: z.string(),
  status: orderStatusSchema,
  quote: z.object({ id: z.uuid(), displayNumber: z.string() }),
  customer: person,
  owner: person,
  total: z.string(),
  createdAt: z.iso.datetime(),
});

export type OrderSummaryDto = z.infer<typeof orderSummaryDtoSchema>;

export const orderItemDtoSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  category: z.string(),
  unitPrice: z.string(),
  vatRate: vatRateSchema,
  quantity: z.string(),
  lineAmount: z.string(),
});

export type OrderItemDto = z.infer<typeof orderItemDtoSchema>;

export const orderDtoSchema = orderSummaryDtoSchema.extend({
  items: z.array(orderItemDtoSchema),
  discountPct: z.string(),
  discountAmount: z.string(),
  subtotal: z.string(),
  linesVat: z.string(),
  shippingAmount: z.string(),
  shippingVat: z.string(),
  inProgressAt: z.iso.datetime().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  cancelReason: z.string().nullable(),
  createdBy: person,
  allowedActions: z.array(z.string()),
  updatedAt: z.iso.datetime(),
});

export type OrderDto = z.infer<typeof orderDtoSchema>;

export const orderListDtoSchema = z.object({
  items: z.array(orderSummaryDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type OrderListDto = z.infer<typeof orderListDtoSchema>;
