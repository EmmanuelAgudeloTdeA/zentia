import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from '../../test/create-test-app.js';

describe('TRUST_PROXY', () => {
  it('rate-limits by the real client IP behind one proxy', async () => {
    const app = createTestApp({ env: { TRUST_PROXY: '1' } });
    const hit = (ip: string) => request(app).get('/api/health').set('X-Forwarded-For', ip);

    for (let i = 0; i < 60; i++) expect((await hit('203.0.113.1')).status).toBe(200);
    expect((await hit('203.0.113.1')).status).toBe(429);
    expect((await hit('203.0.113.2')).status).toBe(200);
  });
});
