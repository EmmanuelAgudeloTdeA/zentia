import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const SEARCH_MAX_LENGTH = 100;

export const ACTIVE_STATUS_FILTERS = ['active', 'inactive', 'all'] as const;

export type ActiveStatusFilter = (typeof ACTIVE_STATUS_FILTERS)[number];

export const activeStatusFilterSchema = z.enum(ACTIVE_STATUS_FILTERS);

export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

/** Texto vacío equivale a `null` (borra el valor). */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value ? value : null));
}
