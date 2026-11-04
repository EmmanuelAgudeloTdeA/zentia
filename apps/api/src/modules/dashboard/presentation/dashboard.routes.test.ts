import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import { createFakeDashboard } from '../../../test/in-memory-dashboard.js';

let auth: InMemoryAuth;
let dashboard: ReturnType<typeof createFakeDashboard>;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  auth = createInMemoryAuth();
  dashboard = createFakeDashboard();
  app = createTestApp({
    auth,
    dashboard,
    clock: new FixedClock(new Date('2026-11-03T15:00:00.000Z')),
  });
});

async function login(role: Role, email = `${role.toLowerCase()}@empresa.co`) {
  const user = await auth.addUser({ email, password: 'x', role });
  return { user, authorization: `Bearer ${await auth.accessTokens.sign(user.id)}` };
}

const OTHER = '0c6f2d6e-6a8f-4e1b-9f5a-2b8f3b1c1a22';

describe('GET /api/dashboard/summary', () => {
  it('returns the current month by default with amounts as strings and the conversion rate', async () => {
    const { authorization } = await login('MANAGER');
    const response = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', authorization);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      scope: { ownerId: null },
      current: { active: 4, pendingFollowUp: 1, followUpDays: 5 },
      period: {
        from: '2026-11-01',
        to: '2026-11-30',
        approved: 3,
        rejected: 4,
        expired: 1,
        closed: 8,
        quotedAmount: '12000000',
        approvedAmount: '5375000',
        conversionRate: '37.50',
      },
      sections: [],
    });
    expect(dashboard.calls[1]?.args).toEqual([
      new Date('2026-11-01T05:00:00.000Z'),
      new Date('2026-12-01T05:00:00.000Z'),
    ]);
  });

  it('limits a seller to their own quotes even if they send another owner', async () => {
    const { user, authorization } = await login('SELLER');
    const response = await request(app)
      .get('/api/dashboard/summary')
      .query({ ownerId: OTHER })
      .set('Authorization', authorization);
    expect(response.body.scope).toEqual({ ownerId: user.id });
    expect(dashboard.calls.every((call) => call.ownerId === user.id)).toBe(true);
  });

  it('lets managers filter by seller and rejects invalid periods', async () => {
    const { authorization } = await login('ADMIN');
    const filtered = await request(app)
      .get('/api/dashboard/summary')
      .query({ ownerId: OTHER, from: '2026-10-01', to: '2026-10-31' })
      .set('Authorization', authorization);
    expect(filtered.body.scope).toEqual({ ownerId: OTHER });
    expect(filtered.body.period).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });

    const reversed = await request(app)
      .get('/api/dashboard/summary')
      .query({ from: '2026-11-10', to: '2026-11-01' })
      .set('Authorization', authorization);
    expect(reversed.body.error.code).toBe('DASHBOARD_INVALID_PERIOD');
    const tooLong = await request(app)
      .get('/api/dashboard/summary')
      .query({ from: '2024-01-01', to: '2026-01-01' })
      .set('Authorization', authorization);
    expect(tooLong.status).toBe(400);
  });
});
