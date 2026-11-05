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

const DEV_CORS_ORIGIN = 'http://localhost:5173';

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
      .optional()
      .transform((value) =>
        (value ?? '')
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
    /** Jobs diarios (vencimiento y alertas); con varias instancias, el advisory lock evita duplicar trabajo. */
    SCHEDULER_ENABLED: booleanString.default(false),
    /** Gemini Flash por defecto; sin `LLM_API_KEY` (o con `none`) usa siempre la plantilla de respaldo. */
    LLM_PROVIDER: z.enum(['gemini', 'none']).default('gemini'),
    LLM_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
    LLM_API_KEY: z.string().optional(),
    LLM_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(4000),
    /** Carpeta de la web compilada; sin ella la API no sirve estáticos (desarrollo con Vite). */
    WEB_DIST_DIR: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.CORS_ORIGIN.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'Required in production' });
    }
  })
  .transform((env) => ({
    ...env,
    CORS_ORIGIN: env.CORS_ORIGIN.length > 0 ? env.CORS_ORIGIN : [DEV_CORS_ORIGIN],
    DOCS_ENABLED: env.DOCS_ENABLED ?? env.NODE_ENV !== 'production',
  }));

export type Env = z.infer<typeof envSchema>;
