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

type Session = Awaited<ReturnType<typeof login>>;

async function approvedQuote() {
  const admin = await login('ADMIN');
  const seller = await login('SELLER');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin.authorization)
    .send({ name: 'Portátil', category: 'Tecnología', price: '2500000', vatRate: 'GENERAL_19' });
  const quote = await approveFor(seller, product.body.id, 'Acme SAS', '9001234567');
  return { admin, seller, product: product.body, quote };
}

async function approveFor(seller: Session, productId: string, name: string, documentId: string) {
  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', seller.authorization)
    .send({ name, documentId, email: 'a@acme.co' });
  const draft = await request(app)
    .post('/api/quotes')
    .set('Authorization', seller.authorization)
    .send({
      customerId: customer.body.id,
      items: [{ productId, quantity: '2' }],
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
  return approved.body;
}

async function convert(session: Session, quoteId: string) {
  return request(app)
    .post(`/api/quotes/${quoteId}/order`)
    .set('Authorization', session.authorization);
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

  it('hides foreign quotes and orders from another seller', async () => {
    const { seller, quote } = await approvedQuote();
    const other = await login('SELLER', 'otro@empresa.co');

    const foreignConvert = await convert(other, quote.id);
    expect(foreignConvert.status).toBe(404);
    expect(foreignConvert.body.error.code).toBe('QUOTE_NOT_FOUND');

    const order = (await convert(seller, quote.id)).body;
    const foreignChange = await request(app)
      .post(`/api/orders/${order.id}/status`)
      .set('Authorization', other.authorization)
      .send({ to: 'IN_PROGRESS', updatedAt: order.updatedAt });
    expect(foreignChange.status).toBe(404);
    expect(foreignChange.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('lets a manager convert and move the order of another seller', async () => {
    const { quote } = await approvedQuote();
    const manager = await login('MANAGER');

    const order = await convert(manager, quote.id);
    expect(order.status).toBe(201);
    expect(order.body.createdBy.id).toBe(manager.user.id);
    const change = (body: object) =>
      request(app)
        .post(`/api/orders/${order.body.id}/status`)
        .set('Authorization', manager.authorization)
        .send(body);

    const started = await change({ to: 'IN_PROGRESS', updatedAt: order.body.updatedAt });
    expect(started.body.status).toBe('IN_PROGRESS');
    const delivered = await change({ to: 'DELIVERED', updatedAt: started.body.updatedAt });
    expect(delivered.body).toMatchObject({ status: 'DELIVERED', cancelledAt: null });
    expect(delivered.body.deliveredAt).not.toBeNull();
  });

  it('sets cancelledAt and limits the reason to 500 characters', async () => {
    const { seller, quote } = await approvedQuote();
    const order = (await convert(seller, quote.id)).body;
    const change = (body: object) =>
      request(app)
        .post(`/api/orders/${order.id}/status`)
        .set('Authorization', seller.authorization)
        .send(body);

    const tooLong = await change({
      to: 'CANCELLED',
      reason: 'x'.repeat(501),
      updatedAt: order.updatedAt,
    });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR');

    const cancelled = await change({ to: 'CANCELLED', updatedAt: order.updatedAt });
    expect(cancelled.body).toMatchObject({
      status: 'CANCELLED',
      cancelReason: null,
      deliveredAt: null,
    });
    expect(cancelled.body.cancelledAt).not.toBeNull();
  });

  it('filters by status CSV, searches by customer name and paginates', async () => {
    const { seller, product, quote } = await approvedQuote();
    const first = (await convert(seller, quote.id)).body;
    const beta = await approveFor(seller, product.id, 'Beta Ltda', '800111222');
    await convert(seller, beta.id);
    const gamma = await approveFor(seller, product.id, 'Gamma SAS', '800333444');
    const third = (await convert(seller, gamma.id)).body;
    await request(app)
      .post(`/api/orders/${first.id}/status`)
      .set('Authorization', seller.authorization)
      .send({ to: 'IN_PROGRESS', updatedAt: first.updatedAt });
    await request(app)
      .post(`/api/orders/${third.id}/status`)
      .set('Authorization', seller.authorization)
      .send({ to: 'CANCELLED', updatedAt: third.updatedAt });
    const list = (query: Record<string, string>) =>
      request(app).get('/api/orders').query(query).set('Authorization', seller.authorization);

    const byStatus = await list({ status: 'IN_PROGRESS,CANCELLED' });
    expect(byStatus.body.total).toBe(2);
    expect(byStatus.body.items.map((o: { status: string }) => o.status).sort()).toEqual([
      'CANCELLED',
      'IN_PROGRESS',
    ]);

    const byName = await list({ q: 'beta' });
    expect(byName.body.total).toBe(1);
    expect(byName.body.items[0].customer.name).toBe('Beta Ltda');

    const page = await list({ page: '2', pageSize: '2' });
    expect(page.body).toMatchObject({ total: 3, page: 2, pageSize: 2 });
    expect(page.body.items).toHaveLength(1);

    const invalid = await list({ status: 'SHIPPED' });
    expect(invalid.status).toBe(400);
  });

  it('keeps the snapshot of category, VAT and totals after the product changes', async () => {
    const { admin, seller, product, quote } = await approvedQuote();
    const order = (await convert(seller, quote.id)).body;
    await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Authorization', admin.authorization)
      .send({ category: 'Oficina', price: '3000000', vatRate: 'REDUCED_5' });

    const detail = await request(app)
      .get(`/api/orders/${order.id}`)
      .set('Authorization', seller.authorization);
    expect(detail.body).toMatchObject({
      linesVat: order.linesVat,
      total: order.total,
      items: [{ category: 'Tecnología', vatRate: 'GENERAL_19', unitPrice: '2500000' }],
    });
  });
});
