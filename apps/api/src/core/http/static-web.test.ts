import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../test/create-test-app.js';

describe('static web', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'zentia-web-'));
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
    writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
    writeFileSync(path.join(dir, 'favicon.svg'), '<svg/>');
  });

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const app = () => createTestApp({ env: { WEB_DIST_DIR: dir } });

  it('serves index.html at / and on client routes without cache', async () => {
    for (const url of ['/', '/quotes/123', '/settings']) {
      const response = await request(app()).get(url).set('Accept', 'text/html');
      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
      expect(response.headers['cache-control']).toBe('no-cache');
    }
  });

  it('caches hashed assets for a year', async () => {
    const response = await request(app()).get('/assets/index-abc123.js');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const icon = await request(app()).get('/favicon.svg');
    expect(icon.headers['cache-control']).toBe('no-cache');
  });

  it('never captures /api routes', async () => {
    const response = await request(app()).get('/api/nope').set('Accept', 'text/html');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND' } });
  });

  it('is disabled without WEB_DIST_DIR', async () => {
    const response = await request(createTestApp()).get('/').set('Accept', 'text/html');
    expect(response.status).toBe(404);
  });
});
