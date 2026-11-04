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

async function login(role: Role, email = `${role.toLowerCase()}@empresa.co`) {
  const user = await auth.addUser({ email, password: 'x', role });
  return { user, authorization: `Bearer ${await auth.accessTokens.sign(user.id)}` };
}

async function approvedQuote() {
  const admin = await login('ADMIN');
  const seller = await login('SELLER');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin.authorization)
    .send({ name: 'Portátil', category: 'Tecnología', price: '2500000', vatRate: 'GENERAL_19' });
  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', seller.authorization)
    .send({ name: 'Acme SAS', documentId: '9001234567', email: 'a@acme.co' });
  const draft = await request(app)
    .post('/api/quotes')
    .set('Authorization', seller.authorization)
    .send({
      customerId: customer.body.id,
      items: [{ productId: product.body.id, quantity: '2' }],
      discountPct: '10',
      shippingAmount: '20000',
    });
  const sent = await request(app)
    .post(`/api/quotes/${draft.body.id}/send`)
    .set('Authorization', seller.authorization)
    .send({ updatedAt: draft.body.updatedAt });
  const approved = await request(app)
    .post(`/api/quotes/${draft.body.id}/status`)
    .set('Authorization', seller.authorization)
    .send({ to: 'APPROVED', updatedAt: sent.body.updatedAt });
  return { admin, seller, quote: approved.body };
}

describe('orders routes', () => {
  it('converts an approved quote once, copying its totals', async () => {
    const { seller, quote } = await approvedQuote();
    expect(quote.allowedActions).toContain('convertToOrder');

    const order = await request(app)
      .post(`/api/quotes/${quote.id}/order`)
      .set('Authorization', seller.authorization);
    expect(order.status).toBe(201);
    expect(order.body).toMatchObject({
      displayNumber: 'PED-0001',
      status: 'PENDING',
      total: '5375000',
      discountPct: '10',
      quote: { displayNumber: 'COT-0001' },
      items: [{ quantity: '2', unitPrice: '2500000' }],
      allowedActions: ['startProgress', 'cancel'],
    });

    const again = await request(app)
      .post(`/api/quotes/${quote.id}/order`)
      .set('Authorization', seller.authorization);
    expect(again.body.error.code).toBe('ORDER_ALREADY_EXISTS');

    const detail = await request(app)
      .get(`/api/quotes/${quote.id}`)
      .set('Authorization', seller.authorization);
    expect(detail.body.allowedActions).toContain('viewOrder');
    expect(detail.body.allowedActions).not.toContain('convertToOrder');
    const byQuote = await request(app)
      .get(`/api/quotes/${quote.id}/order`)
      .set('Authorization', seller.authorization);
    expect(byQuote.body.displayNumber).toBe('PED-0001');
  });

  it('rejects quotes that are not approved', async () => {
    const seller = await login('SELLER');
    const admin = await login('ADMIN');
    const product = await request(app)
      .post('/api/products')
      .set('Authorization', admin.authorization)
      .send({ name: 'X', category: 'Y', price: '10', vatRate: 'EXEMPT' });
    const customer = await request(app)
      .post('/api/customers')
      .set('Authorization', seller.authorization)
      .send({ name: 'C', documentId: '12345', email: 'c@c.co' });
    const draft = await request(app)
      .post('/api/quotes')
      .set('Authorization', seller.authorization)
      .send({
        customerId: customer.body.id,
        items: [{ productId: product.body.id, quantity: '1' }],
      });
    const result = await request(app)
      .post(`/api/quotes/${draft.body.id}/order`)
      .set('Authorization', seller.authorization);
    expect(result.body.error.code).toBe('QUOTE_NOT_APPROVED');
  });

  it('moves through the states, records reasons and rejects stale or invalid changes', async () => {
    const { seller, quote } = await approvedQuote();
    const order = (
      await request(app)
        .post(`/api/quotes/${quote.id}/order`)
        .set('Authorization', seller.authorization)
    ).body;
    const change = (body: object) =>
      request(app)
        .post(`/api/orders/${order.id}/status`)
        .set('Authorization', seller.authorization)
        .send(body);

    const started = await change({ to: 'IN_PROGRESS', updatedAt: order.updatedAt });
    expect(started.body).toMatchObject({
      status: 'IN_PROGRESS',
      allowedActions: ['deliver', 'cancel'],
    });
    expect(started.body.inProgressAt).not.toBeNull();

    const stale = await change({ to: 'DELIVERED', updatedAt: order.updatedAt });
    expect(stale.body.error.code).toBe('ORDER_CONFLICT');

    const cancelled = await change({
      to: 'CANCELLED',
      reason: 'El cliente desistió',
      updatedAt: started.body.updatedAt,
    });
    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'El cliente desistió',
      allowedActions: [],
    });

    const invalid = await change({ to: 'DELIVERED', updatedAt: cancelled.body.updatedAt });
    expect(invalid.body.error.code).toBe('ORDER_INVALID_TRANSITION');

    const reconvert = await request(app)
      .post(`/api/quotes/${quote.id}/order`)
      .set('Authorization', seller.authorization);
    expect(reconvert.body.error.code).toBe('ORDER_ALREADY_EXISTS');
  });

  it('scopes orders by the current owner of the quote', async () => {
    const { admin, seller, quote } = await approvedQuote();
    const order = (
      await request(app)
        .post(`/api/quotes/${quote.id}/order`)
        .set('Authorization', seller.authorization)
    ).body;
    const other = await login('SELLER', 'otro@empresa.co');

    expect(
      (await request(app).get(`/api/orders/${order.id}`).set('Authorization', other.authorization))
        .status,
    ).toBe(404);
    expect(
      (await request(app).get('/api/orders').set('Authorization', other.authorization)).body.total,
    ).toBe(0);

    const fresh = await request(app)
      .get(`/api/quotes/${quote.id}`)
      .set('Authorization', admin.authorization);
    await request(app)
      .post(`/api/quotes/${quote.id}/reassign`)
      .set('Authorization', admin.authorization)
      .send({ ownerId: other.user.id, updatedAt: fresh.body.updatedAt });

    const list = await request(app)
      .get('/api/orders')
      .query({ q: 'PED-0001' })
      .set('Authorization', other.authorization);
    expect(list.body.items[0]).toMatchObject({
      displayNumber: 'PED-0001',
      owner: { id: other.user.id },
    });
    expect(
      (await request(app).get(`/api/orders/${order.id}`).set('Authorization', seller.authorization))
        .status,
    ).toBe(404);
  });
});
