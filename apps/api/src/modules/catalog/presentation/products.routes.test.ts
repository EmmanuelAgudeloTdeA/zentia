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

const product = {
  name: 'Portátil',
  category: 'Tecnología',
  price: '1550000',
  vatRate: 'GENERAL_19',
};

describe('products routes', () => {
  it('only lets ADMIN write', async () => {
    const app = createTestApp({ auth });
    const seller = await bearer('SELLER');
    const manager = await bearer('MANAGER');
    const admin = await bearer('ADMIN');

    expect(
      (await request(app).post('/api/products').set('Authorization', seller).send(product)).status,
    ).toBe(403);
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', admin)
      .send(product);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ price: '1550000', vatRate: 'GENERAL_19', isActive: true });

    const patch = await request(app)
      .patch(`/api/products/${created.body.id}`)
      .set('Authorization', manager)
      .send({ price: '1' });
    expect(patch.status).toBe(403);
  });

  it('never shows inactive products to a SELLER but keeps them readable by id', async () => {
    const app = createTestApp({ auth });
    const admin = await bearer('ADMIN');
    const seller = await bearer('SELLER');
    const created = await request(app)
      .post('/api/products')
      .set('Authorization', admin)
      .send(product);
    await request(app)
      .patch(`/api/products/${created.body.id}`)
      .set('Authorization', admin)
      .send({ isActive: false });

    const list = await request(app)
      .get('/api/products')
      .query({ status: 'inactive' })
      .set('Authorization', seller);
    expect(list.body.total).toBe(0);

    const byId = await request(app)
      .get(`/api/products/${created.body.id}`)
      .set('Authorization', seller);
    expect(byId.body.isActive).toBe(false);

    const adminList = await request(app)
      .get('/api/products')
      .query({ status: 'inactive' })
      .set('Authorization', admin);
    expect(adminList.body.total).toBe(1);
  });

  it('validates the price and suggests categories', async () => {
    const app = createTestApp({ auth });
    const admin = await bearer('ADMIN');
    const invalid = await request(app)
      .post('/api/products')
      .set('Authorization', admin)
      .send({ ...product, price: '0' });
    expect(invalid.status).toBe(400);

    await request(app).post('/api/products').set('Authorization', admin).send(product);
    const categories = await request(app)
      .get('/api/products/categories')
      .query({ q: 'tecno' })
      .set('Authorization', await bearer('SELLER'));
    expect(categories.body).toEqual(['Tecnología']);

    const missing = await request(app).get('/api/products/123').set('Authorization', admin);
    expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });
});
