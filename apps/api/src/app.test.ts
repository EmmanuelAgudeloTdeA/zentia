import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test/create-test-app.js';

describe('API base', () => {
  it('GET /api/health responds 200 with status ok', async () => {
    const response = await request(createTestApp()).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('tags every response with a unique x-request-id for the logs', async () => {
    const app = createTestApp();
    const first = await request(app).get('/api/health');
    const second = await request(app).get('/api/does-not-exist');
    expect(first.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
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
    for (const path of [
      '/quotes/{id}/pdf',
      '/quotes/{id}/share-links',
      '/quotes/{id}/share',
      '/quotes/{id}/order',
      '/orders',
      '/orders/{id}',
      '/orders/{id}/status',
    ]) {
      expect(response.body.paths).toHaveProperty([path]);
    }
  });

  it('hides the docs when DOCS_ENABLED is false', async () => {
    const response = await request(createTestApp({ env: { DOCS_ENABLED: 'false' } })).get(
      '/api/docs/openapi.json',
    );
    expect(response.status).toBe(404);
  });

  it('documents the common error body as the ApiError component', async () => {
    const response = await request(createTestApp()).get('/api/docs/openapi.json');
    expect(response.body.components.schemas).toHaveProperty('ApiError');
  });

  it('serves the Swagger UI when docs are enabled', async () => {
    const response = await request(createTestApp()).get('/api/docs/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger-ui');
  });

  it('answers 404 for the Swagger UI when docs are disabled', async () => {
    const response = await request(createTestApp({ env: { DOCS_ENABLED: 'false' } })).get(
      '/api/docs/',
    );
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND' } });
  });
});
