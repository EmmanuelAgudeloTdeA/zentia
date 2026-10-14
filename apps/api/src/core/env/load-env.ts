import { envSchema, type Env } from './env.schema.js';

export class EnvValidationError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid environment variables: ${variables.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new EnvValidationError(variables);
  }
  return result.data;
}
