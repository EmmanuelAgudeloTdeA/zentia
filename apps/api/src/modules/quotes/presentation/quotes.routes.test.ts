import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';

let auth: InMemoryAuth;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  auth = createInMemoryAuth();
  app = createTestApp({ auth, clock: new FixedClock(new Date('2026-11-03T15:00:00.000Z')) });
});

async function bearer(role: Role, email = `${role.toLowerCase()}@empresa.co`): Promise<string> {
  const user = await auth.addUser({ email, password: 'x', role });
  return `Bearer ${await auth.accessTokens.sign(user.id)}`;
}

async function setup() {
  const admin = await bearer('ADMIN');
  const seller = await bearer('SELLER');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin)
    .send({ name: 'Portátil', category: 'Tecnología', price: '2500000', vatRate: 'GENERAL_19' });
  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', seller)
    .send({ name: 'Acme SAS', documentId: '9001234567', email: 'compras@acme.co' });
  const quote = await request(app)
    .post('/api/quotes')
    .set('Authorization', seller)
    .send({
      customerId: customer.body.id,
      items: [{ productId: product.body.id, quantity: '2' }],
      discountPct: '10',
      shippingAmount: '20000',
      // Totales enviados por el cliente: el back los ignora y recalcula.
      subtotal: '1',
      total: '1',
    });
  return { admin, seller, quote: quote.body, status: quote.status };
}

describe('quotes routes', () => {
  it('creates the PPI quote with amounts as strings, ignoring client totals', async () => {
    const { quote, status } = await setup();
    expect(status).toBe(201);
    expect(quote).toMatchObject({
      displayNumber: 'COT-0001',
      status: 'DRAFT',
      subtotal: '5000000',
      total: '5375000',
      discountPct: '10',
      items: [{ quantity: '2', unitPrice: '2500000' }],
    });
  });

  it('hides foreign quotes from another seller and validates ids', async () => {
    const { quote } = await setup();
    const other = await bearer('SELLER', 'otro@empresa.co');
    const foreign = await request(app).get(`/api/quotes/${quote.id}`).set('Authorization', other);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe('QUOTE_NOT_FOUND');
    const list = await request(app).get('/api/quotes').set('Authorization', other);
    expect(list.body.total).toBe(0);
    const invalid = await request(app).get('/api/quotes/abc').set('Authorization', other);
    expect(invalid.status).toBe(404);
  });

  it('detects concurrent edits with updatedAt', async () => {
    const { quote, seller } = await setup();
    const sent = await request(app)
      .post(`/api/quotes/${quote.id}/send`)
      .set('Authorization', seller)
      .send({ updatedAt: quote.updatedAt });
    expect(sent.body).toMatchObject({ status: 'SENT', currentVersion: 1 });
    const stale = await request(app)
      .post(`/api/quotes/${quote.id}/void`)
      .set('Authorization', seller)
      .send({ reason: 'Error', updatedAt: quote.updatedAt });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('QUOTE_CONFLICT');
  });

  it('restricts reassign to managers and filters by status CSV', async () => {
    const { quote, seller, admin } = await setup();
    const denied = await request(app)
      .post(`/api/quotes/${quote.id}/reassign`)
      .set('Authorization', seller)
      .send({ ownerId: quote.owner.id, updatedAt: quote.updatedAt });
    expect(denied.status).toBe(403);

    const drafts = await request(app)
      .get('/api/quotes')
      .query({ status: 'DRAFT,SENT' })
      .set('Authorization', admin);
    expect(drafts.body.total).toBe(1);
    const approved = await request(app)
      .get('/api/quotes')
      .query({ status: 'APPROVED' })
      .set('Authorization', admin);
    expect(approved.body.total).toBe(0);
  });

  it('requires a reason to void', async () => {
    const { quote, seller } = await setup();
    for (const payload of [{}, { reason: '   ' }]) {
      const response = await request(app)
        .post(`/api/quotes/${quote.id}/void`)
        .set('Authorization', seller)
        .send({ ...payload, updatedAt: quote.updatedAt });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('answers 400 instead of 500 when the amounts overflow Decimal(15,0)', async () => {
    const { admin, seller, quote } = await setup();
    const huge = await request(app).post('/api/products').set('Authorization', admin).send({
      name: 'Enorme',
      category: 'Tecnología',
      price: '999999999999999',
      vatRate: 'EXEMPT',
    });
    const response = await request(app)
      .post('/api/quotes')
      .set('Authorization', seller)
      .send({ customerId: quote.customer.id, items: [{ productId: huge.body.id, quantity: '3' }] });
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'QUOTE_AMOUNT_TOO_LARGE',
      params: { maxDigits: 15 },
    });
  });

  it('accepts followUp=pending and rejects other values', async () => {
    const { admin } = await setup();
    const ok = await request(app)
      .get('/api/quotes')
      .query({ followUp: 'pending' })
      .set('Authorization', admin);
    expect(ok.status).toBe(200);
    expect(ok.body.total).toBe(0);
    const invalid = await request(app)
      .get('/api/quotes')
      .query({ followUp: 'all' })
      .set('Authorization', admin);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filters by first-sent date (sentFrom/sentTo) and validates the range', async () => {
    const { quote, seller, admin } = await setup();
    await request(app)
      .post(`/api/quotes/${quote.id}/send`)
      .set('Authorization', seller)
      .send({ updatedAt: quote.updatedAt });
    const totalFor = async (query: Record<string, string>) =>
      (await request(app).get('/api/quotes').query(query).set('Authorization', admin)).body.total;
    expect(await totalFor({ sentFrom: '2026-11-03', sentTo: '2026-11-03' })).toBe(1);
    expect(await totalFor({ sentFrom: '2026-11-04' })).toBe(0);
    expect(await totalFor({ sentTo: '2026-11-02' })).toBe(0);
    const invalid = await request(app)
      .get('/api/quotes')
      .query({ sentFrom: '2026-11-30', sentTo: '2026-11-01' })
      .set('Authorization', admin);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    const malformed = await request(app)
      .get('/api/quotes')
      .query({ sentFrom: '03/11/2026' })
      .set('Authorization', admin);
    expect(malformed.status).toBe(400);
  });

  it('returns the unified history', async () => {
    const { quote, seller } = await setup();
    await request(app)
      .post(`/api/quotes/${quote.id}/send`)
      .set('Authorization', seller)
      .send({ updatedAt: quote.updatedAt });
    const history = await request(app)
      .get(`/api/quotes/${quote.id}/history`)
      .set('Authorization', seller);
    expect(history.body).toMatchObject([
      {
        kind: 'VERSION',
        actor: { name: 'seller' },
        version: { number: 1 },
        events: [{ type: 'STATE_CHANGED' }],
      },
    ]);
  });
});
