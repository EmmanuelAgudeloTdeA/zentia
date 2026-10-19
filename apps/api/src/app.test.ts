import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test/create-test-app.js';

describe('API base', () => {
  it('GET /api/health responds 200 with status ok', async () => {
    const response = await request(createTestApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('unknown routes respond NOT_FOUND with the common error body', async () => {
    const response = await request(createTestApp()).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND' } });
  });

  it('malformed JSON responds MALFORMED_JSON', async () => {
    const response = await request(createTestApp())
      .post('/api/health')
      .set('content-type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'MALFORMED_JSON' } });
  });

  it('serves the OpenAPI document when docs are enabled', async () => {
    const response = await request(createTestApp()).get('/api/docs/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.paths).toHaveProperty('/health');
  });

  it('hides the docs when DOCS_ENABLED is false', async () => {
    const response = await request(createTestApp({ env: { DOCS_ENABLED: 'false' } })).get(
      '/api/docs/openapi.json',
    );
    expect(response.status).toBe(404);
  });
});
