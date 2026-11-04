import { z } from 'zod';

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** 503 cuando la base no responde; nunca incluye detalles internos. */
export const healthErrorResponseSchema = z.object({
  status: z.literal('error'),
});

export type HealthErrorResponse = z.infer<typeof healthErrorResponseSchema>;
