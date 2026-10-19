import { z } from 'zod';
import { parseDurationSeconds } from './duration.js';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const trustProxy = z
  .string()
  .default('false')
  .transform((value, ctx) => {
    if (value === 'false') return false;
    if (value === 'true') return true;
    const hops = Number(value);
    if (Number.isInteger(hops) && hops >= 0) return hops;
    ctx.addIssue({ code: 'custom', message: 'TRUST_PROXY must be true, false or a hop count' });
    return z.NEVER;
  });

const durationSeconds = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value, ctx) => {
      const seconds = parseDurationSeconds(value);
      if (seconds !== null) return seconds;
      ctx.addIssue({ code: 'custom', message: 'Expected a duration like 15m or 7d' });
      return z.NEVER;
    });

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    TZ: z.literal('America/Bogota').default('America/Bogota'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    DOCS_ENABLED: booleanString.optional(),
    TRUST_PROXY: trustProxy,
    JWT_ACCESS_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL: durationSeconds('15m'),
    REFRESH_TOKEN_TTL: durationSeconds('7d'),
    BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  })
  .transform((env) => ({
    ...env,
    DOCS_ENABLED: env.DOCS_ENABLED ?? env.NODE_ENV !== 'production',
  }));

export type Env = z.infer<typeof envSchema>;
