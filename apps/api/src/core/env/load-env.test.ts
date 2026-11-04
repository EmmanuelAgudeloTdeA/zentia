import { describe, expect, it } from 'vitest';
import { EnvValidationError, loadEnv } from './load-env.js';

const base = {
  DATABASE_URL: 'postgresql://zentia:zentia@localhost:5432/zentia',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

const production = { NODE_ENV: 'production', CORS_ORIGIN: 'https://zentia.example.co' };

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.TZ).toBe('America/Bogota');
    expect(env.DOCS_ENABLED).toBe(true);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.ACCESS_TOKEN_TTL).toBe(900);
    expect(env.REFRESH_TOKEN_TTL).toBe(604_800);
    expect(env.BCRYPT_COST).toBe(12);
  });

  it('requires a JWT secret of at least 32 characters', () => {
    expect(() => loadEnv({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(EnvValidationError);
  });

  it('disables docs by default in production', () => {
    expect(loadEnv({ ...base, ...production }).DOCS_ENABLED).toBe(false);
  });

  it('requires CORS_ORIGIN in production', () => {
    try {
      loadEnv({ ...base, NODE_ENV: 'production' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).variables).toEqual(['CORS_ORIGIN']);
    }
    expect(
      loadEnv({ ...base, NODE_ENV: 'production', CORS_ORIGIN: 'https://a.co, https://b.co' })
        .CORS_ORIGIN,
    ).toEqual(['https://a.co', 'https://b.co']);
  });

  it('defaults CORS_ORIGIN to the Vite dev server outside production', () => {
    expect(loadEnv(base).CORS_ORIGIN).toEqual(['http://localhost:5173']);
  });

  it('defaults LLM_PROVIDER to gemini (Gemini Flash)', () => {
    const env = loadEnv(base);
    expect(env.LLM_PROVIDER).toBe('gemini');
    expect(env.LLM_MODEL).toBe('gemini-2.5-flash');
    expect(env.LLM_API_KEY).toBeUndefined();
  });

  it('names invalid variables without exposing their values', () => {
    const secret = 'mysql://user:secret@host/db';
    try {
      loadEnv({ DATABASE_URL: secret, TRUST_PROXY: 'maybe' });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const { variables, message } = error as EnvValidationError;
      expect(variables).toEqual(expect.arrayContaining(['DATABASE_URL', 'TRUST_PROXY']));
      expect(message).not.toContain('secret');
    }
  });
});
