import { z } from 'zod';

export const PROBABILITY_FACTORS = [
  'BASE',
  'RECENT_INTERACTION',
  'VERSION_AFTER_SEND',
  'NO_FOLLOW_UP',
  'VALIDITY_CONSUMED',
] as const;
export type ProbabilityFactorCode = (typeof PROBABILITY_FACTORS)[number];

export const AMOUNT_BUCKETS = ['LT_1M', '1M_5M', '5M_20M', '20M_100M', 'GTE_100M'] as const;
export type AmountBucket = (typeof AMOUNT_BUCKETS)[number];

export const PROBABILITIES_MAX_IDS = 50;

export const followUpMessageDtoSchema = z.object({
  message: z.string(),
  source: z.enum(['AI', 'TEMPLATE']),
  /** Cumple la regla de Y días de M6 (RN-33): el front destaca el asistente. */
  highlighted: z.boolean(),
  daysWithoutFollowUp: z.int(),
  contact: z.object({ phone: z.string().nullable(), email: z.string().nullable() }),
});

export type FollowUpMessageDto = z.infer<typeof followUpMessageDtoSchema>;

export const probabilitiesQuerySchema = z.object({
  /** CSV de ids (máximo 50). */
  quoteIds: z
    .string()
    .transform((value) => [...new Set(value.split(',').filter(Boolean))])
    .pipe(z.array(z.uuid()).min(1).max(PROBABILITIES_MAX_IDS)),
});

export const probabilityFactorSchema = z.object({
  code: z.enum(PROBABILITY_FACTORS),
  points: z.int(),
});

export const probabilityDtoSchema = z.object({
  quoteId: z.uuid(),
  probability: z.int(),
  label: z.literal('RULES_ESTIMATE'),
  factors: z.array(probabilityFactorSchema),
});

export type ProbabilityDto = z.infer<typeof probabilityDtoSchema>;

export const calibrationStatusDtoSchema = z.object({
  closedCount: z.int(),
  threshold: z.int(),
  readyForCalibration: z.boolean(),
});

export type CalibrationStatusDto = z.infer<typeof calibrationStatusDtoSchema>;

/** Fila del bloque "Mayor probabilidad de cierre" del tablero. */
export const topProbabilityItemSchema = z.object({
  quoteId: z.uuid(),
  displayNumber: z.string(),
  customerName: z.string(),
  ownerName: z.string(),
  total: z.string(),
  expiresAt: z.iso.date(),
  probability: z.int(),
});

export type TopProbabilityItem = z.infer<typeof topProbabilityItemSchema>;
