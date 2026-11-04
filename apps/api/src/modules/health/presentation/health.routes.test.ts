import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { PrismaHealthCheck } from '../infrastructure/index.js';
import type { PrismaClient } from '@prisma/client';

describe('GET /api/health', () => {
  it('responds 503 without internal details when the database is down', async () => {
    const response = await request(
      createTestApp({ health: { isHealthy: () => Promise.resolve(false) } }),
    ).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error' });
  });
});

describe('PrismaHealthCheck', () => {
  const client = (query: () => Promise<unknown>) =>
    ({ $queryRaw: query }) as unknown as PrismaClient;

  it('is healthy when SELECT 1 answers', async () => {
    expect(
      await new PrismaHealthCheck(client(() => Promise.resolve([{ '?column?': 1 }]))).isHealthy(),
    ).toBe(true);
  });

  it('is unhealthy on error or after the timeout', async () => {
    expect(
      await new PrismaHealthCheck(client(() => Promise.reject(new Error('down')))).isHealthy(),
    ).toBe(false);
    const started = Date.now();
    const slow = new PrismaHealthCheck(
      client(() => new Promise(() => undefined)),
      50,
    );
    expect(await slow.isHealthy()).toBe(false);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
