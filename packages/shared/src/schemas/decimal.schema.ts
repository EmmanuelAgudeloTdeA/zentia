import { z } from 'zod';

const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** Porcentaje como string: 0–100, hasta 2 decimales, punto como separador. */
export const percentString = z
  .string()
  .trim()
  .regex(PERCENT_PATTERN)
  .refine((value) => Number(value) <= 100, { error: 'too_big' });
