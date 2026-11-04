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

async function draftQuote() {
  const admin = await bearer('ADMIN');
  const seller = await bearer('SELLER');
  const product = await request(app)
    .post('/api/products')
    .set('Authorization', admin)
    .send({ name: 'Portátil', category: 'Tecnología', price: '2500000', vatRate: 'GENERAL_19' });
  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', seller)
    .send({ name: 'Acme SAS', documentId: '9001234567', phone: '300 123 4567' });
  const quote = await request(app)
    .post('/api/quotes')
    .set('Authorization', seller)
    .send({ customerId: customer.body.id, items: [{ productId: product.body.id, quantity: '1' }] });
  return { seller, quote: quote.body };
}

describe('documents routes', () => {
  it('adds downloadPdf and share to allowedActions', async () => {
    const { quote } = await draftQuote();
    expect(quote.allowedActions).toEqual(expect.arrayContaining(['downloadPdf', 'share']));
  });

  it('downloads the PDF as an attachment and hides foreign quotes', async () => {
    const { seller, quote } = await draftQuote();
    const pdf = await request(app)
      .get(`/api/quotes/${quote.id}/pdf`)
      .query({ purpose: 'send' })
      .set('Authorization', seller)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toBe('attachment; filename="COT-0001.pdf"');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const other = await bearer('SELLER', 'otro@empresa.co');
    const foreign = await request(app)
      .get(`/api/quotes/${quote.id}/pdf`)
      .set('Authorization', other);
    expect(foreign.status).toBe(404);
  });

  it('shares by WhatsApp, sending the draft, and rejects the missing email channel', async () => {
    const { seller, quote } = await draftQuote();
    const links = await request(app)
      .get(`/api/quotes/${quote.id}/share-links`)
      .set('Authorization', seller);
    expect(links.body).toMatchObject({ emailUrl: null, missing: ['EMAIL'] });
    expect(links.body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/573001234567/);

    const email = await request(app)
      .post(`/api/quotes/${quote.id}/share`)
      .set('Authorization', seller)
      .send({ channel: 'EMAIL', updatedAt: quote.updatedAt });
    expect(email.body.error.code).toBe('SHARE_CHANNEL_UNAVAILABLE');

    const shared = await request(app)
      .post(`/api/quotes/${quote.id}/share`)
      .set('Authorization', seller)
      .send({ channel: 'WHATSAPP', updatedAt: quote.updatedAt });
    expect(shared.body).toMatchObject({ status: 'SENT', currentVersion: 1 });

    const again = await request(app)
      .post(`/api/quotes/${quote.id}/share`)
      .set('Authorization', seller)
      .send({ channel: 'WHATSAPP', updatedAt: shared.body.updatedAt });
    expect(again.body).toMatchObject({ status: 'SENT', sentAt: shared.body.sentAt });
  });
});
