import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, type InMemoryAuth } from '../../../test/in-memory-auth.js';

let auth: InMemoryAuth;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  auth = createInMemoryAuth();
  app = createTestApp({ auth });
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
    });
  return { admin, seller, quote: quote.body, status: quote.status };
}

describe('quotes routes', () => {
  it('creates the PPI quote with amounts as strings', async () => {
    const { quote, status } = await setup();
    expect(status).toBe(201);
    expect(quote).toMatchObject({
      displayNumber: 'COT-0001',
      status: 'DRAFT',
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
