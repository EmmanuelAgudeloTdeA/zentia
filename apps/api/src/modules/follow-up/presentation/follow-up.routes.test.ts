import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import {
  createInMemoryFollowUp,
  type InMemoryFollowUp,
} from '../../../test/in-memory-follow-up.js';

let auth: InMemoryAuth;
let followUp: InMemoryFollowUp;
let app: ReturnType<typeof createTestApp>;

beforeEach(() => {
  auth = createInMemoryAuth();
  followUp = createInMemoryFollowUp();
  app = createTestApp({
    auth,
    followUp,
    clock: new FixedClock(new Date('2026-11-03T15:00:00.000Z')),
  });
});

async function login(role: Role, email = `${role.toLowerCase()}@empresa.co`) {
  const user = await auth.addUser({ email, password: 'x', role });
  return { user, authorization: `Bearer ${await auth.accessTokens.sign(user.id)}` };
}

async function setup() {
  const admin = await login('ADMIN');
  const seller = await login('SELLER');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin.authorization)
    .send({ name: 'Portátil', category: 'Tecnología', price: '1000', vatRate: 'GENERAL_19' });
  const customer = async (documentId: string) =>
    (
      await request(app)
        .post('/api/customers')
        .set('Authorization', seller.authorization)
        .send({ name: `Cliente ${documentId}`, documentId, email: `${documentId}@x.co` })
    ).body;
  const acme = await customer('11111');
  const other = await customer('22222');
  const quote = (
    await request(app)
      .post('/api/quotes')
      .set('Authorization', seller.authorization)
      .send({ customerId: acme.id, items: [{ productId: product.body.id, quantity: '1' }] })
  ).body;
  return { admin, seller, acme, other, quote };
}

describe('interactions', () => {
  it('registers an interaction linked to an own quote and lists it', async () => {
    const { seller, acme, quote } = await setup();
    const created = await request(app)
      .post('/api/interactions')
      .set('Authorization', seller.authorization)
      .send({ customerId: acme.id, quoteId: quote.id, type: 'CALL', note: 'Pidió descuento' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ type: 'CALL', quote: { displayNumber: 'COT-0001' } });

    const list = await request(app)
      .get('/api/interactions')
      .query({ customerId: acme.id })
      .set('Authorization', seller.authorization);
    expect(list.body.total).toBe(1);
  });

  it('rejects future dates, quotes of another customer and foreign quotes', async () => {
    const { seller, acme, other, quote } = await setup();
    const post = (body: object, authorization = seller.authorization) =>
      request(app).post('/api/interactions').set('Authorization', authorization).send(body);

    const future = await post({
      customerId: acme.id,
      type: 'CALL',
      note: 'x',
      occurredAt: '2026-11-04T15:00:00.000Z',
    });
    expect(future.body.error.code).toBe('INTERACTION_FUTURE_DATE');
    const mismatch = await post({
      customerId: other.id,
      quoteId: quote.id,
      type: 'CALL',
      note: 'x',
    });
    expect(mismatch.body.error.code).toBe('INTERACTION_QUOTE_MISMATCH');
    const stranger = await login('SELLER', 'otro@empresa.co');
    const foreign = await post(
      { customerId: acme.id, quoteId: quote.id, type: 'CALL', note: 'x' },
      stranger.authorization,
    );
    expect(foreign.status).toBe(404);
    const missing = await request(app)
      .get('/api/interactions')
      .set('Authorization', seller.authorization);
    expect(missing.status).toBe(400);
  });
});

describe('notifications', () => {
  it('lists, counts and marks only the own notifications', async () => {
    const { seller, quote } = await setup();
    const other = await login('SELLER', 'otro@empresa.co');
    await followUp.infrastructure.notifications.insertMany([
      {
        userId: seller.user.id,
        quoteId: quote.id,
        type: 'QUOTE_EXPIRING',
        referenceDate: '2026-11-05',
        params: { quoteNumber: 'COT-0001' },
      },
      {
        userId: seller.user.id,
        quoteId: quote.id,
        type: 'QUOTE_NO_FOLLOW_UP',
        referenceDate: '2026-10-29',
        params: { days: 5 },
      },
    ]);
    const get = (path: string, authorization = seller.authorization) =>
      request(app).get(`/api/notifications${path}`).set('Authorization', authorization);

    expect((await get('/unread-count')).body).toEqual({ count: 2 });
    expect((await get('/unread-count', other.authorization)).body).toEqual({ count: 0 });
    const list = await get('');
    expect(list.body.items[0]).toMatchObject({
      type: 'QUOTE_NO_FOLLOW_UP',
      quote: { displayNumber: 'COT-0001' },
    });

    const id = list.body.items[0].id as string;
    const foreign = await request(app)
      .post(`/api/notifications/${id}/read`)
      .set('Authorization', other.authorization);
    expect(foreign.status).toBe(404);
    for (let i = 0; i < 2; i++) {
      const read = await request(app)
        .post(`/api/notifications/${id}/read`)
        .set('Authorization', seller.authorization);
      expect(read.status).toBe(204);
    }
    expect((await get('/unread-count')).body).toEqual({ count: 1 });
    expect((await get('?unreadOnly=true')).body.total).toBe(1);
    await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', seller.authorization);
    expect((await get('/unread-count')).body).toEqual({ count: 0 });
  });

  it('moves unread notifications to the new owner when the quote is reassigned', async () => {
    const { admin, seller, quote } = await setup();
    const target = await login('SELLER', 'nuevo@empresa.co');
    await followUp.infrastructure.notifications.insertMany([
      {
        userId: seller.user.id,
        quoteId: quote.id,
        type: 'QUOTE_EXPIRING',
        referenceDate: '2026-11-05',
        params: {},
      },
    ]);
    const reassigned = await request(app)
      .post(`/api/quotes/${quote.id}/reassign`)
      .set('Authorization', admin.authorization)
      .send({ ownerId: target.user.id, updatedAt: quote.updatedAt });
    expect(reassigned.status).toBe(200);
    expect(followUp.notifications.map((n) => n.userId)).toEqual([target.user.id]);
  });
});
