import { z } from 'zod';
import { ERROR_CODES } from '../constants/index.js';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    params: z.record(z.string(), z.unknown()).optional(),
    issues: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
  }),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
