import { z } from 'zod';

const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

export const percentString = z
  .string()
  .trim()
  .regex(PERCENT_PATTERN)
  .refine((value) => Number(value) <= 100, { error: 'too_big' });
