import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import {
  createInMemoryCompanySettings,
  type InMemoryCompanySettings,
} from '../../../test/in-memory-company-settings.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);

let auth: InMemoryAuth;
let company: InMemoryCompanySettings;

beforeEach(() => {
  auth = createInMemoryAuth();
  company = createInMemoryCompanySettings();
});

function app() {
  return createTestApp({ auth, companySettings: company });
}

async function tokenFor(role: Role): Promise<string> {
  const user = await auth.addUser({
    email: `${role.toLowerCase()}@empresa.co`,
    password: 'x',
    role,
  });
  return `Bearer ${await auth.accessTokens.sign(user.id)}`;
}

function logoBody(bytes: Buffer, mimeType = 'image/png') {
  return { mimeType, data: bytes.toString('base64') };
}

describe('GET /api/company/settings', () => {
  it('is readable by any authenticated user and never includes the logo', async () => {
    await company.settings.update({
      logoDataUrl: `data:image/png;base64,${PNG.toString('base64')}`,
    });
    const response = await request(app())
      .get('/api/company/settings')
      .set('Authorization', await tokenFor('SELLER'));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      hasLogo: true,
      validityDays: 15,
      discountLimitSeller: '10',
      documentLocale: 'es',
    });
    expect(response.body).not.toHaveProperty('logoDataUrl');
  });

  it('requires authentication', async () => {
    const response = await request(app()).get('/api/company/settings');
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/company/profile', () => {
  it('updates only the sent fields (ADMIN)', async () => {
    await company.settings.update({ phone: '6041234567' });
    const response = await request(app())
      .patch('/api/company/profile')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ name: ' Acme SAS ', email: 'Ventas@Acme.co', documentLocale: 'en' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: 'Acme SAS',
      email: 'ventas@acme.co',
      documentLocale: 'en',
      phone: '6041234567',
    });
  });

  it('saves city, website and bank accounts and clears them with an empty string', async () => {
    const admin = await tokenFor('ADMIN');
    const bankAccounts = 'Cuenta corriente Bancolombia | 557 000 10172\nAhorros | 236 279 66075';
    const saved = await request(app())
      .patch('/api/company/profile')
      .set('Authorization', admin)
      .send({ city: 'Medellín - Antioquia', website: 'www.acme.co', bankAccounts });
    expect(saved.body).toMatchObject({
      city: 'Medellín - Antioquia',
      website: 'www.acme.co',
      bankAccounts,
    });

    const cleared = await request(app())
      .patch('/api/company/profile')
      .set('Authorization', admin)
      .send({ website: '' });
    expect(cleared.body).toMatchObject({ website: null, city: 'Medellín - Antioquia' });
  });

  it('answers VALIDATION_ERROR for bad formats', async () => {
    const response = await request(app())
      .patch('/api/company/profile')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ email: 'no-es-correo' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.issues[0].path).toBe('email');
  });

  it('is forbidden for MANAGER and SELLER', async () => {
    for (const role of ['MANAGER', 'SELLER'] as const) {
      const response = await request(app())
        .patch('/api/company/profile')
        .set('Authorization', await tokenFor(role))
        .send({ name: 'X' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('PATCH /api/company/parameters', () => {
  it('updates parameters and returns limits as percent strings', async () => {
    const response = await request(app())
      .patch('/api/company/parameters')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ discountLimitSeller: '12.5', shippingTaxable: true, followUpDays: 7 });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      discountLimitSeller: '12.5',
      shippingTaxable: true,
      followUpDays: 7,
      validityDays: 15,
    });
  });

  it('validates X < N over the combined values with the issue on the field', async () => {
    const response = await request(app())
      .patch('/api/company/parameters')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ validityDays: 3 });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      issues: [{ path: 'expiringAlertDays', code: 'custom' }],
    });
    expect((await company.settings.get()).validityDays).toBe(15);
  });

  it('rejects out-of-range values', async () => {
    const response = await request(app())
      .patch('/api/company/parameters')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ coldStartThreshold: 60, discountLimitAdmin: '100.5' });
    expect(response.status).toBe(400);
    expect(response.body.error.issues.map((issue: { path: string }) => issue.path).sort()).toEqual([
      'coldStartThreshold',
      'discountLimitAdmin',
    ]);
  });
});

describe('logo', () => {
  it('uploads, serves with ETag and deletes idempotently', async () => {
    const admin = await tokenFor('ADMIN');
    const server = app();

    const upload = await request(server)
      .put('/api/company/logo')
      .set('Authorization', admin)
      .send(logoBody(PNG));
    expect(upload.status).toBe(200);
    expect(upload.body).toEqual({ hasLogo: true, logoVersion: 1 });

    const logo = await request(server).get('/api/company/logo');
    expect(logo.status).toBe(200);
    expect(logo.headers['content-type']).toBe('image/png');
    expect(logo.headers['cache-control']).toBe('public, max-age=300');
    expect(logo.headers.etag).toBe('"logo-1"');
    expect(Buffer.compare(logo.body as Buffer, PNG)).toBe(0);

    const cached = await request(server).get('/api/company/logo').set('If-None-Match', '"logo-1"');
    expect(cached.status).toBe(304);

    const branding = await request(server).get('/api/company/branding');
    expect(branding.body).toEqual({ name: null, hasLogo: true, logoVersion: 1 });

    expect(
      (await request(server).delete('/api/company/logo').set('Authorization', admin)).status,
    ).toBe(204);
    expect(
      (await request(server).delete('/api/company/logo').set('Authorization', admin)).status,
    ).toBe(204);
    expect((await company.settings.get()).logoVersion).toBe(2);

    const missing = await request(server).get('/api/company/logo');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: 'LOGO_NOT_FOUND' } });
    expect((await request(server).get('/api/company/branding')).body).toEqual({
      name: null,
      hasLogo: false,
      logoVersion: 2,
    });
  });

  it('rejects unsupported types and signatures that do not match the mimeType', async () => {
    const admin = await tokenFor('ADMIN');
    for (const body of [
      logoBody(PNG, 'image/gif'),
      logoBody(JPEG, 'image/png'),
      logoBody(Buffer.from('<svg/>'), 'image/png'),
    ]) {
      const response = await request(app())
        .put('/api/company/logo')
        .set('Authorization', admin)
        .send(body);
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: { code: 'LOGO_INVALID_TYPE' } });
    }
  });

  it('answers LOGO_TOO_LARGE above 512 KB and PAYLOAD_TOO_LARGE above 1 MB of body', async () => {
    const admin = await tokenFor('ADMIN');
    const big = Buffer.concat([JPEG, Buffer.alloc(512 * 1024, 3)]);
    const tooLarge = await request(app())
      .put('/api/company/logo')
      .set('Authorization', admin)
      .send(logoBody(big, 'image/jpeg'));
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body).toEqual({ error: { code: 'LOGO_TOO_LARGE' } });

    const huge = Buffer.concat([JPEG, Buffer.alloc(800 * 1024, 3)]);
    const payload = await request(app())
      .put('/api/company/logo')
      .set('Authorization', admin)
      .send(logoBody(huge, 'image/jpeg'));
    expect(payload.status).toBe(413);
    expect(payload.body).toEqual({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('keeps the 100 KB limit on every other route', async () => {
    const response = await request(app())
      .patch('/api/company/profile')
      .set('Authorization', await tokenFor('ADMIN'))
      .send({ commercialTerms: 'x'.repeat(150 * 1024) });
    expect(response.status).toBe(413);
  });

  it('only ADMIN can upload or delete', async () => {
    const manager = await tokenFor('MANAGER');
    expect(
      (
        await request(app())
          .put('/api/company/logo')
          .set('Authorization', manager)
          .send(logoBody(PNG))
      ).status,
    ).toBe(403);
    expect(
      (await request(app()).delete('/api/company/logo').set('Authorization', manager)).status,
    ).toBe(403);
  });
});

describe('GET /api/company/branding', () => {
  it('is public and returns only name, hasLogo and logoVersion', async () => {
    await company.settings.update({ name: 'Acme SAS', taxId: '900123456' });
    const response = await request(app()).get('/api/company/branding');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'Acme SAS', hasLogo: false, logoVersion: 0 });
  });

  it('is documented in OpenAPI along with the other company routes', async () => {
    const response = await request(app()).get('/api/docs/openapi.json');
    expect(Object.keys(response.body.paths)).toEqual(
      expect.arrayContaining([
        '/company/branding',
        '/company/logo',
        '/company/settings',
        '/company/profile',
        '/company/parameters',
      ]),
    );
  });
});
