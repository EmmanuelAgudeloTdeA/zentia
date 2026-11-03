import { z } from 'zod';

const PERCENT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

export const percentString = z
  .string()
  .trim()
  .regex(PERCENT_PATTERN)
  .refine((value) => Number(value) <= 100, { error: 'too_big' });

/** Monto COP sin centavos como string canónico (sin ceros a la izquierda), hasta 15 dígitos. */
export const moneyString = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,14})$/);

export const positiveMoneyString = z
  .string()
  .trim()
  .regex(/^[1-9]\d{0,14}$/);
