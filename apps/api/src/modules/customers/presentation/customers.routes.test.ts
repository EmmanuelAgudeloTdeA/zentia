import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, type InMemoryAuth } from '../../../test/in-memory-auth.js';

let auth: InMemoryAuth;

beforeEach(() => {
  auth = createInMemoryAuth();
});

async function bearer(role: Role): Promise<string> {
  const user = await auth.addUser({
    email: `${role.toLowerCase()}@empresa.co`,
    password: 'x',
    role,
  });
  return `Bearer ${await auth.accessTokens.sign(user.id)}`;
}

describe('customers routes', () => {
  it('lets any role create, read and edit customers', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const manager = await bearer('MANAGER');

    const created = await request(app)
      .post('/api/customers')
      .set('Authorization', seller)
      .send({ name: 'Acme SAS', documentId: '900.123.456-7', phone: '300 123 4567' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      documentId: '9001234567',
      phone: '573001234567',
      email: null,
      createdBy: { name: 'seller' },
    });

    const edited = await request(app)
      .patch(`/api/customers/${created.body.id}`)
      .set('Authorization', manager)
      .send({ email: 'Compras@Acme.co' });
    expect(edited.status).toBe(200);
    expect(edited.body.email).toBe('compras@acme.co');

    const fetched = await request(app)
      .get(`/api/customers/${created.body.id}`)
      .set('Authorization', seller);
    expect(fetched.body.name).toBe('Acme SAS');
  });

  it('answers the domain error codes', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const post = (body: object) =>
      request(app).post('/api/customers').set('Authorization', seller).send(body);

    await post({ name: 'A', documentId: '12345', email: 'a@b.co' });
    expect(
      (await post({ name: 'B', documentId: '1-2-3-4-5', email: 'b@b.co' })).body.error.code,
    ).toBe('CUSTOMER_DOCUMENT_TAKEN');
    expect((await post({ name: 'C', documentId: '55555' })).body.error.code).toBe(
      'CUSTOMER_CONTACT_REQUIRED',
    );
    expect((await post({ name: 'D', documentId: '66666', phone: '12' })).body.error.code).toBe(
      'INVALID_PHONE',
    );
    const missing = await request(app).get('/api/customers/nope').set('Authorization', seller);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('paginates and filters by status', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const ids: string[] = [];
    for (const [index, name] of ['Beta', 'Alfa', 'Gamma'].entries()) {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', seller)
        .send({ name, documentId: `1000${index}0`, email: `${index}@x.co` });
      ids.push(response.body.id);
    }
    await request(app)
      .patch(`/api/customers/${ids[2]}`)
      .set('Authorization', seller)
      .send({ isActive: false });

    const page = await request(app)
      .get('/api/customers')
      .query({ pageSize: '1', page: '2' })
      .set('Authorization', seller);
    expect(page.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(page.body.items[0].name).toBe('Beta');

    const all = await request(app)
      .get('/api/customers')
      .query({ status: 'all' })
      .set('Authorization', seller);
    expect(all.body.items.map((c: { name: string }) => c.name)).toEqual(['Alfa', 'Beta', 'Gamma']);
  });

  it('has no delete route, rejects a taken document on edit and long searches', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const post = (body: object) =>
      request(app).post('/api/customers').set('Authorization', seller).send(body);
    const first = await post({ name: 'A', documentId: '11111', email: 'a@b.co' });
    const second = await post({ name: 'B', documentId: '22222', email: 'b@b.co' });

    const removed = await request(app)
      .delete(`/api/customers/${first.body.id}`)
      .set('Authorization', seller);
    expect(removed.status).toBe(404);

    const taken = await request(app)
      .patch(`/api/customers/${second.body.id}`)
      .set('Authorization', seller)
      .send({ documentId: '1-1-1-1-1' });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('CUSTOMER_DOCUMENT_TAKEN');

    const longSearch = await request(app)
      .get('/api/customers')
      .query({ q: 'x'.repeat(101) })
      .set('Authorization', seller);
    expect(longSearch.status).toBe(400);
    expect(longSearch.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps a stable order between pages when names repeat', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    for (const index of [1, 2, 3]) {
      await request(app)
        .post('/api/customers')
        .set('Authorization', seller)
        .send({ name: 'Acme', documentId: `5000${index}0`, email: `${index}@x.co` });
    }
    const pageIds = async (page: number) =>
      (
        await request(app)
          .get('/api/customers')
          .query({ pageSize: '1', page: String(page) })
          .set('Authorization', seller)
      ).body.items.map((c: { id: string }) => c.id);

    const ids = [...(await pageIds(1)), ...(await pageIds(2)), ...(await pageIds(3))];
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual([...ids].sort());
  });

  it('finds possible duplicates in both directions for any role', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const manager = await bearer('MANAGER');
    for (const [name, documentId] of [
      ['Corto', '900123456'],
      ['Largo', '9009999999'],
      ['Otro', '800555444'],
    ]) {
      await request(app)
        .post('/api/customers')
        .set('Authorization', seller)
        .send({ name, documentId, email: `${documentId}@x.co` });
    }
    const matches = async (documentId: string, token = seller) => {
      const response = await request(app)
        .get('/api/customers/document-matches')
        .query({ documentId })
        .set('Authorization', token);
      expect(response.status).toBe(200);
      return response.body.items.map((c: { name: string }) => c.name);
    };

    expect(await matches('900.123.456-7', manager)).toEqual(['Corto']);
    expect(await matches('90099')).toEqual(['Largo']);
    expect(await matches('90012')).toEqual(['Corto']);
    expect(await matches('9001')).toEqual([]);
    expect(await matches('700000000')).toEqual([]);
  });

  it('requires authentication', async () => {
    expect((await request(createTestApp({ auth })).get('/api/customers')).status).toBe(401);
  });
});
