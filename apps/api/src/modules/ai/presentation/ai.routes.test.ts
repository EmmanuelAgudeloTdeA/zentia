import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createFakeAi, type FakeAi } from '../../../test/in-memory-ai.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import {
  createInMemoryFollowUp,
  type InMemoryFollowUp,
} from '../../../test/in-memory-follow-up.js';
import type { LLMProvider } from '../application/index.js';
import type { FollowUpPromptInput } from '../domain/index.js';

let auth: InMemoryAuth;
let ai: FakeAi;
let followUp: InMemoryFollowUp;
let app: ReturnType<typeof createTestApp>;
const clock = () => new FixedClock(new Date('2026-11-03T15:00:00.000Z'));

function build(llm?: LLMProvider, timeoutMs?: number) {
  ai = createFakeAi({ ...(llm ? { llm } : {}), ...(timeoutMs ? { timeoutMs } : {}) });
  followUp = createInMemoryFollowUp();
  app = createTestApp({ auth, ai, followUp, clock: clock() });
}

beforeEach(() => {
  auth = createInMemoryAuth();
  build();
});

async function login(role: Role, email = `${role.toLowerCase()}@empresa.co`) {
  const user = await auth.addUser({ email, password: 'x', role });
  return { user, authorization: `Bearer ${await auth.accessTokens.sign(user.id)}` };
}

async function sentQuote() {
  const admin = await login('ADMIN');
  const seller = await login('SELLER', 'ana.gomez@empresa.co');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin.authorization)
    .send({ name: 'Portátil', category: 'Tecnología', price: '2500000', vatRate: 'GENERAL_19' });
  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', seller.authorization)
    .send({
      name: 'Industrias Ñandú SAS',
      documentId: '900.555.777-1',
      phone: '300 999 8877',
      email: 'compras@nandu.co',
    });
  const draft = await request(app)
    .post('/api/quotes')
    .set('Authorization', seller.authorization)
    .send({ customerId: customer.body.id, items: [{ productId: product.body.id, quantity: '2' }] });
  const sent = await request(app)
    .post(`/api/quotes/${draft.body.id}/send`)
    .set('Authorization', seller.authorization)
    .send({ updatedAt: draft.body.updatedAt });
  ai.signals.push({
    quoteId: sent.body.id,
    number: sent.body.number,
    status: 'SENT',
    ownerId: seller.user.id,
    ownerName: 'ana.gomez',
    customerName: 'Industrias Ñandú SAS',
    total: sent.body.total,
    sentDay: '2026-10-25',
    expiresAt: '2026-11-18',
    lastInteractionDay: null,
    interactedSinceSent: false,
    versionsAfterSend: 0,
  });
  return { admin, seller, quote: sent.body };
}

const suggest = (id: string, authorization: string) =>
  request(app).post(`/api/quotes/${id}/follow-up-message`).set('Authorization', authorization);

describe('follow-up message', () => {
  it('falls back to the template with real names when the LLM is not available', async () => {
    const { seller, quote } = await sentQuote();
    expect(quote.allowedActions).toContain('followUpAssistant');
    const response = await suggest(quote.id, seller.authorization);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: 'TEMPLATE',
      highlighted: true,
      daysWithoutFollowUp: 9,
      contact: { phone: '573009998877', email: 'compras@nandu.co' },
    });
    expect(response.body.message).toContain('Hola Industrias Ñandú SAS');
    expect(response.body.message).toContain('hace 9 días');
    expect(response.body.message).toContain('ana.gomez');
    expect(response.body.message).not.toContain('{{');
  });

  it('sends only anonymized signals to the LLM and cleans its answer', async () => {
    const inputs: FollowUpPromptInput[] = [];
    build({
      async generateFollowUp(input) {
        inputs.push(input);
        return 'Hola {{CLIENTE}}, ¿revisaste la propuesta? {{NIT}} Saludos, {{VENDEDOR}}';
      },
    });
    const { seller, quote } = await sentQuote();
    await request(app).post('/api/interactions').set('Authorization', seller.authorization).send({
      customerId: quote.customer.id,
      quoteId: quote.id,
      type: 'CALL',
      note: 'Nota privada: pidió 5 % más',
    });

    const response = await suggest(quote.id, seller.authorization);
    expect(response.body).toMatchObject({
      source: 'AI',
      message: 'Hola Industrias Ñandú SAS, ¿revisaste la propuesta?  Saludos, ana.gomez',
    });
    expect(inputs).toEqual([
      { daysWithoutReply: 9, amountBucket: '5M_20M', categories: ['Tecnología'], locale: 'es' },
    ]);
    const payload = JSON.stringify(inputs);
    for (const secret of [
      'Ñandú',
      '900555777',
      '9998877',
      'compras@nandu.co',
      'COT-0001',
      'Nota privada',
      'ana.gomez',
    ]) {
      expect(payload).not.toContain(secret);
    }
  });

  it('answers within the timeout with the template when the LLM hangs', async () => {
    build(
      {
        generateFollowUp: () =>
          new Promise((resolve) => setTimeout(() => resolve('tarde'), 10_000)),
      },
      300,
    );
    const { seller, quote } = await sentQuote();
    const startedAt = Date.now();
    const response = await suggest(quote.id, seller.authorization);
    expect(Date.now() - startedAt).toBeLessThan(5000);
    expect(response.body.source).toBe('TEMPLATE');
  });

  it('rejects quotes that are not sent, foreign quotes and too many requests', async () => {
    const { seller, quote } = await sentQuote();
    const other = await login('SELLER', 'otro@empresa.co');
    expect((await suggest(quote.id, other.authorization)).status).toBe(404);

    const draft = await request(app)
      .post('/api/quotes')
      .set('Authorization', seller.authorization)
      .send({
        customerId: quote.customer.id,
        items: [{ productId: quote.items[0].productId, quantity: '1' }],
      });
    expect((await suggest(draft.body.id, seller.authorization)).body.error.code).toBe(
      'QUOTE_INVALID_TRANSITION',
    );

    const statuses: number[] = [];
    for (let i = 0; i < 10; i++)
      statuses.push((await suggest(quote.id, seller.authorization)).status);
    expect(statuses.at(-1)).toBe(429);
    expect(statuses.filter((status) => status === 429)).toHaveLength(1);
  });
});

describe('probabilities and calibration', () => {
  it('returns rule-based probabilities only for own sent quotes', async () => {
    const { seller, quote } = await sentQuote();
    const other = await login('SELLER', 'otro@empresa.co');
    const own = await request(app)
      .get('/api/ai/probabilities')
      .query({ quoteIds: quote.id })
      .set('Authorization', seller.authorization);
    expect(own.body).toEqual([
      {
        quoteId: quote.id,
        probability: 20,
        label: 'RULES_ESTIMATE',
        factors: [
          { code: 'BASE', points: 40 },
          { code: 'NO_FOLLOW_UP', points: -20 },
        ],
      },
    ]);
    const foreign = await request(app)
      .get('/api/ai/probabilities')
      .query({ quoteIds: quote.id })
      .set('Authorization', other.authorization);
    expect(foreign.body).toEqual([]);

    const tooMany = Array.from({ length: 51 }, () => crypto.randomUUID()).join(',');
    const invalid = await request(app)
      .get('/api/ai/probabilities')
      .query({ quoteIds: tooMany })
      .set('Authorization', seller.authorization);
    expect(invalid.status).toBe(400);
  });

  it('shows the calibration status only to managers and admins', async () => {
    const manager = await login('MANAGER');
    const seller = await login('SELLER');
    ai.setClosed(31);
    const status = await request(app)
      .get('/api/ai/calibration-status')
      .set('Authorization', manager.authorization);
    expect(status.body).toEqual({ closedCount: 31, threshold: 30, readyForCalibration: true });
    expect(
      (
        await request(app)
          .get('/api/ai/calibration-status')
          .set('Authorization', seller.authorization)
      ).status,
    ).toBe(403);
  });

  it('sorts notifications by probability and leaves resolved quotes at the end', async () => {
    const { seller, quote } = await sentQuote();
    const second = crypto.randomUUID();
    ai.signals.push({
      ...ai.signals[0]!,
      quoteId: second,
      lastInteractionDay: '2026-11-02',
      interactedSinceSent: true,
    });
    await followUp.infrastructure.notifications.insertMany([
      {
        userId: seller.user.id,
        quoteId: quote.id,
        type: 'QUOTE_NO_FOLLOW_UP',
        referenceDate: '2026-10-25',
        params: {},
      },
      {
        userId: seller.user.id,
        quoteId: second,
        type: 'QUOTE_EXPIRING',
        referenceDate: '2026-11-18',
        params: {},
      },
      {
        userId: seller.user.id,
        quoteId: crypto.randomUUID(),
        type: 'QUOTE_EXPIRING',
        referenceDate: '2026-11-04',
        params: {},
      },
    ]);
    const list = await request(app)
      .get('/api/notifications')
      .set('Authorization', seller.authorization);
    expect(list.body.sort).toBe('probability');
    expect(list.body.items.map((item: { probability: number | null }) => item.probability)).toEqual(
      [55, 20, null],
    );

    const byDate = await request(app)
      .get('/api/notifications')
      .query({ sort: 'date' })
      .set('Authorization', seller.authorization);
    expect(byDate.body.sort).toBe('date');
  });
});
