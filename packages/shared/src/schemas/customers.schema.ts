import { z } from 'zod';
import { normalizeDocumentId } from '../normalize/index.js';
import {
  activeStatusFilterSchema,
  optionalText,
  paginationQueryShape,
} from './pagination.schema.js';

export const CUSTOMER_NAME_MAX_LENGTH = 150;
export const DOCUMENT_ID_LENGTH = { min: 5, max: 20 } as const;

export const documentIdSchema = z
  .string()
  .max(40)
  .transform(normalizeDocumentId)
  .pipe(z.string().min(DOCUMENT_ID_LENGTH.min).max(DOCUMENT_ID_LENGTH.max));

const customerEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .nullable()
  .transform((value) => (value ? value : null))
  .pipe(z.email().max(150).nullable());

const customerShape = {
  name: z.string().trim().min(1).max(CUSTOMER_NAME_MAX_LENGTH),
  documentId: documentIdSchema,
  /** Texto libre; el dominio lo normaliza y valida (`INVALID_PHONE`). */
  phone: optionalText(30),
  email: customerEmailSchema,
};

export const createCustomerRequestSchema = z.object({
  ...customerShape,
  phone: customerShape.phone.optional().transform((value) => value ?? null),
  email: customerShape.email.optional().transform((value) => value ?? null),
});

export type CreateCustomerRequest = z.input<typeof createCustomerRequestSchema>;
export type CustomerInput = z.output<typeof createCustomerRequestSchema>;

export const updateCustomerRequestSchema = z
  .object({ ...customerShape, isActive: z.boolean() })
  .partial();

export type UpdateCustomerRequest = z.input<typeof updateCustomerRequestSchema>;
export type CustomerChanges = z.output<typeof updateCustomerRequestSchema>;

export const listCustomersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: activeStatusFilterSchema.default('active'),
  ...paginationQueryShape,
});

export type ListCustomersQuery = z.input<typeof listCustomersQuerySchema>;
export type CustomerListFilter = z.output<typeof listCustomersQuerySchema>;

export const customerDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  documentId: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  createdBy: z.object({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CustomerDto = z.infer<typeof customerDtoSchema>;

export const customerListDtoSchema = z.object({
  items: z.array(customerDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type CustomerListDto = z.infer<typeof customerListDtoSchema>;
