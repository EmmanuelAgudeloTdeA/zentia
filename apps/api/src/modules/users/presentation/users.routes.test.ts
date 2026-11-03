import type { Role } from '@zentia/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, type InMemoryAuth } from '../../../test/in-memory-auth.js';

let auth: InMemoryAuth;

beforeEach(() => {
  auth = createInMemoryAuth();
});

function app() {
  return createTestApp({ auth });
}

async function bearer(userId: string): Promise<string> {
  return `Bearer ${await auth.accessTokens.sign(userId)}`;
}

async function login(role: Role, email = `${role.toLowerCase()}@empresa.co`) {
  const user = await auth.addUser({ email, password: 'x', role });
  return { user, authorization: await bearer(user.id) };
}

describe('role guard', () => {
  it('only lets ADMIN manage users', async () => {
    const { authorization } = await login('MANAGER');
    const responses = await Promise.all([
      request(app()).get('/api/users').set('Authorization', authorization),
      request(app())
        .post('/api/users')
        .set('Authorization', authorization)
        .send({ email: 'a@b.co', name: 'A', role: 'SELLER' }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([403, 403]);
  });

  it('serves /users/options to MANAGER and ADMIN but not to SELLER', async () => {
    const manager = await login('MANAGER');
    const seller = await login('SELLER');
    await auth.addUser({ email: 'off@empresa.co', password: 'x', isActive: false });

    const ok = await request(app())
      .get('/api/users/options')
      .set('Authorization', manager.authorization);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual([
      { id: manager.user.id, name: 'manager', role: 'MANAGER' },
      { id: seller.user.id, name: 'seller', role: 'SELLER' },
    ]);

    const denied = await request(app())
      .get('/api/users/options')
      .set('Authorization', seller.authorization);
    expect(denied.status).toBe(403);
  });
});

describe('ADMIN user management', () => {
  it('creates a user, returns the temporary password once and never exposes the hash', async () => {
    const { authorization } = await login('ADMIN');
    const created = await request(app())
      .post('/api/users')
      .set('Authorization', authorization)
      .send({ email: ' Ana@Empresa.co ', name: 'Ana', role: 'SELLER' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      user: { email: 'ana@empresa.co', mustChangePassword: true },
      temporaryPassword: 'Temporal1abc',
    });

    const fetched = await request(app())
      .get(`/api/users/${created.body.user.id}`)
      .set('Authorization', authorization);
    expect(fetched.status).toBe(200);
    expect(JSON.stringify(fetched.body)).not.toContain('hashed');
    expect(fetched.body).not.toHaveProperty('temporaryPassword');

    const duplicate = await request(app())
      .post('/api/users')
      .set('Authorization', authorization)
      .send({ email: 'ana@empresa.co', name: 'Otra', role: 'SELLER' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('lists with filters and pagination', async () => {
    const { authorization } = await login('ADMIN');
    await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await auth.addUser({ email: 'beto@empresa.co', password: 'x', isActive: false });

    const response = await request(app())
      .get('/api/users')
      .query({ isActive: 'true', role: 'SELLER', page: '1', pageSize: '10' })
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
    expect(response.body.items[0]).toMatchObject({ email: 'ana@empresa.co' });
    expect(response.body.items[0]).not.toHaveProperty('passwordHash');

    const invalid = await request(app())
      .get('/api/users')
      .query({ isActive: 'maybe' })
      .set('Authorization', authorization);
    expect(invalid.status).toBe(400);
  });

  it('blocks a deactivated user from the next request', async () => {
    const { authorization } = await login('ADMIN');
    const seller = await login('SELLER');

    const patched = await request(app())
      .patch(`/api/users/${seller.user.id}`)
      .set('Authorization', authorization)
      .send({ isActive: false });
    expect(patched.status).toBe(200);
    expect(patched.body.isActive).toBe(false);

    const next = await request(app())
      .get('/api/company/settings')
      .set('Authorization', seller.authorization);
    expect(next.status).toBe(401);
    expect(next.body.error.code).toBe('USER_INACTIVE');
  });

  it('protects the admin themselves and answers USER_NOT_FOUND for unknown ids', async () => {
    const { user, authorization } = await login('ADMIN');

    const self = await request(app())
      .patch(`/api/users/${user.id}`)
      .set('Authorization', authorization)
      .send({ role: 'SELLER' });
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('CANNOT_MODIFY_SELF');

    for (const id of ['not-a-uuid', crypto.randomUUID()]) {
      const missing = await request(app())
        .post(`/api/users/${id}/reset-password`)
        .set('Authorization', authorization);
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('USER_NOT_FOUND');
    }
  });

  it('resets a password and forces the change on the next request', async () => {
    const { authorization } = await login('ADMIN');
    const seller = await login('SELLER');

    const reset = await request(app())
      .post(`/api/users/${seller.user.id}/reset-password`)
      .set('Authorization', authorization);
    expect(reset.status).toBe(200);
    expect(reset.body).toEqual({ temporaryPassword: 'Temporal1abc' });

    const next = await request(app())
      .get('/api/company/settings')
      .set('Authorization', seller.authorization);
    expect(next.status).toBe(403);
    expect(next.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });
});
