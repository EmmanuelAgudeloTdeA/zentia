import express from 'express';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createTestApp } from '../../test/create-test-app.js';
import { createLogger } from '../logger/index.js';
import { errorHandler } from './error-handler.js';

function appWithRoute(handler: express.RequestHandler) {
  const app = express();
  app.use(pinoHttp({ logger: createLogger('silent') }));
  app.get('/boom', handler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('answers PAYLOAD_TOO_LARGE for a JSON body over 100 KB', async () => {
    const response = await request(createTestApp())
      .post('/api/auth/login')
      .send({ email: 'ana@empresa.co', password: 'x'.repeat(110 * 1024) });
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('answers a generic INTERNAL_ERROR without message or stack', async () => {
    const response = await request(
      appWithRoute(() => {
        throw new Error('db password leaked in message');
      }),
    ).get('/boom');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: 'INTERNAL_ERROR' } });
    expect(response.text).not.toContain('leaked');
    expect(response.text).not.toContain('at ');
  });

  it('maps a ZodError to VALIDATION_ERROR with path and code issues', async () => {
    const response = await request(
      appWithRoute(() => {
        z.object({ customer: z.object({ name: z.string() }) }).parse({ customer: {} });
      }),
    ).get('/boom');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        issues: [{ path: 'customer.name', code: 'invalid_type' }],
      },
    });
  });

  it('answers VALIDATION_ERROR for an unsupported charset instead of 500', async () => {
    const response = await request(createTestApp())
      .post('/api/auth/login')
      .set('content-type', 'application/json; charset=latin9')
      .send('{"email":"ana@empresa.co","password":"x"}');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'VALIDATION_ERROR' } });
  });
});
