import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../core/http/index.js';
import { createTestApp } from '../../../test/create-test-app.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import { AuthenticateRequestUseCase } from '../application/index.js';
import { createRequireAuth } from './auth-guard.js';
import { REFRESH_COOKIE } from './refresh-cookie.js';

const EMAIL = 'ana@empresa.co';
const PASSWORD = 'ventas2026x';

let auth: InMemoryAuth;

beforeEach(() => {
  auth = createInMemoryAuth();
});

function refreshCookieOf(response: request.Response): string {
  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
  const cookie = cookies.find((value) => value.startsWith(`${REFRESH_COOKIE}=`));
  if (!cookie) throw new Error('Refresh cookie not set');
  return cookie;
}

describe('POST /api/auth/login', () => {
  it('returns the session and a hardened refresh cookie', async () => {
    await auth.addUser({ email: EMAIL, password: PASSWORD });
    const response = await request(createTestApp({ auth }))
      .post('/api/auth/login')
      .send({ email: ' ANA@empresa.co ', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ email: EMAIL, role: 'SELLER' });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(typeof response.body.accessToken).toBe('string');

    const cookie = refreshCookieOf(response);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/i);
    expect(cookie).toMatch(/Expires=/i);
  });

  it('sets the refresh cookie to expire 7 days after login', async () => {
    await auth.addUser({ email: EMAIL, password: PASSWORD });
    const clock = new FixedClock();
    const response = await request(createTestApp({ auth, clock }))
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    const expires = /Expires=([^;]+)/i.exec(refreshCookieOf(response))?.[1] ?? '';
    const sevenDays = 7 * 24 * 60 * 60_000;
    expect(new Date(expires).getTime() - clock.now().getTime()).toBe(sevenDays);
  });

  it('answers INVALID_CREDENTIALS without revealing which field failed', async () => {
    const response = await request(createTestApp({ auth }))
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'INVALID_CREDENTIALS' } });
  });

  it('answers VALIDATION_ERROR for a malformed body', async () => {
    const response = await request(createTestApp({ auth }))
      .post('/api/auth/login')
      .send({ email: 'no-es-correo' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('limits failed attempts per IP and email to 5 every 15 minutes', async () => {
    const app = createTestApp({ auth });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: EMAIL, password: 'mala123456' });
      expect(response.status).toBe(401);
    }
    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: 'mala123456' });
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: 'RATE_LIMITED' } });

    const otherEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'otro@empresa.co', password: 'mala123456' });
    expect(otherEmail.status).toBe(401);
  });
});

describe('refresh and logout', () => {
  async function loginCookie(app: express.Express) {
    await auth.addUser({ email: EMAIL, password: PASSWORD });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    return refreshCookieOf(response).split(';')[0] ?? '';
  }

  it('rotates the cookie on refresh', async () => {
    const app = createTestApp({ auth });
    const cookie = await loginCookie(app);

    const response = await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(EMAIL);
    expect(refreshCookieOf(response).split(';')[0]).not.toBe(cookie);
  });

  it('answers INVALID_REFRESH_TOKEN without a cookie', async () => {
    const response = await request(createTestApp({ auth })).post('/api/auth/refresh');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'INVALID_REFRESH_TOKEN' } });
  });

  it('detects reuse after the grace window and clears the cookie', async () => {
    const clock = new FixedClock();
    const app = createTestApp({ auth, clock });
    const cookie = await loginCookie(app);
    await request(app).post('/api/auth/refresh').set('Cookie', cookie);

    const inGrace = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(inGrace.status).toBe(409);
    expect(inGrace.body).toEqual({ error: { code: 'REFRESH_IN_PROGRESS' } });

    clock.advance(11_000);
    const reused = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(reused.status).toBe(401);
    expect(reused.body).toEqual({ error: { code: 'REFRESH_TOKEN_REUSED' } });
    expect(refreshCookieOf(reused)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('logout always answers 204 and invalidates the cookie', async () => {
    const app = createTestApp({ auth });
    const cookie = await loginCookie(app);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(204);
    expect(refreshCookieOf(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);

    expect((await request(app).post('/api/auth/logout')).status).toBe(204);
    expect(
      (await request(app).post('/api/auth/logout').set('Cookie', `${REFRESH_COOKIE}=basura`))
        .status,
    ).toBe(204);

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(401);
  });
});

describe('public rate limits', () => {
  async function loginCookie(app: express.Express) {
    await auth.addUser({ email: EMAIL, password: PASSWORD });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    return refreshCookieOf(response).split(';')[0] ?? '';
  }

  it('logout answers 204 and clears the cookie even after the refresh limit is exhausted', async () => {
    const app = createTestApp({ auth });
    const cookie = await loginCookie(app);
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await request(app).post('/api/auth/refresh');
    }
    expect((await request(app).post('/api/auth/refresh')).status).toBe(429);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(logout.status).toBe(204);
    expect(refreshCookieOf(logout)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  it('keeps refresh available after the public resources limit is exhausted', async () => {
    const app = createTestApp({ auth });
    const cookie = await loginCookie(app);
    for (let attempt = 0; attempt < 120; attempt += 1) {
      await request(app).get(attempt % 2 === 0 ? '/api/company/branding' : '/api/health');
    }
    const blocked = await request(app).get('/api/company/branding');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: { code: 'RATE_LIMITED' } });

    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refresh.status).toBe(200);
  });
});

describe('POST /api/auth/change-password', () => {
  it('is allowed with mustChangePassword and returns a new session', async () => {
    await auth.addUser({ email: EMAIL, password: PASSWORD, mustChangePassword: true });
    const app = createTestApp({ auth });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: PASSWORD, newPassword: 'nueva2026xy' });

    expect(response.status).toBe(200);
    expect(response.body.user.mustChangePassword).toBe(false);
    expect(refreshCookieOf(response)).toMatch(/HttpOnly/i);
  });

  it('requires an access token', async () => {
    const response = await request(createTestApp({ auth }))
      .post('/api/auth/change-password')
      .send({ currentPassword: PASSWORD, newPassword: 'nueva2026xy' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: 'UNAUTHENTICATED' } });
  });
});

describe('requireAuth guard', () => {
  function guardedApp(options: Parameters<ReturnType<typeof createRequireAuth>>[0]) {
    const app = express();
    const requireAuth = createRequireAuth(new AuthenticateRequestUseCase(auth));
    app.get('/private', requireAuth(options), (req, res) => {
      res.json({ actor: req.actor });
    });
    app.use(errorHandler);
    return app;
  }

  it('answers UNAUTHENTICATED, TOKEN_INVALID and TOKEN_EXPIRED', async () => {
    const app = guardedApp({});
    expect((await request(app).get('/private')).body.error.code).toBe('UNAUTHENTICATED');
    expect(
      (await request(app).get('/private').set('Authorization', 'Bearer nope')).body.error.code,
    ).toBe('TOKEN_INVALID');

    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const expired = await createInMemoryAuth(-1).accessTokens.sign(user.id);
    const response = await request(app).get('/private').set('Authorization', `Bearer ${expired}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('answers USER_INACTIVE and applies role changes on the next request', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const token = await auth.accessTokens.sign(user.id);
    const app = guardedApp({ roles: ['ADMIN'] });

    const forbidden = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    auth.users.users.set(user.id, { ...user, role: 'ADMIN' });
    const allowed = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.actor).toEqual({ id: user.id, role: 'ADMIN', mustChangePassword: false });

    auth.users.users.set(user.id, { ...user, role: 'ADMIN', isActive: false });
    const inactive = await request(app).get('/private').set('Authorization', `Bearer ${token}`);
    expect(inactive.status).toBe(401);
    expect(inactive.body.error.code).toBe('USER_INACTIVE');
  });

  it('reuses the actor of an outer guard without a second lookup, keeping role checks', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const token = await auth.accessTokens.sign(user.id);
    const findById = vi.spyOn(auth.users, 'findById');
    const requireAuth = createRequireAuth(new AuthenticateRequestUseCase(auth));
    const app = express();
    app.use(requireAuth());
    app.get('/nested', requireAuth(), (_req, res) => {
      res.json({ ok: true });
    });
    app.get('/admin', requireAuth({ roles: ['ADMIN'] }), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);

    const nested = await request(app).get('/nested').set('Authorization', `Bearer ${token}`);
    expect(nested.status).toBe(200);
    expect(findById).toHaveBeenCalledOnce();

    const admin = await request(app).get('/admin').set('Authorization', `Bearer ${token}`);
    expect(admin.status).toBe(403);
    expect(admin.body.error.code).toBe('FORBIDDEN');
  });

  it('answers PASSWORD_CHANGE_REQUIRED unless the route allows it', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD, mustChangePassword: true });
    const token = await auth.accessTokens.sign(user.id);

    const blocked = await request(guardedApp({}))
      .get('/private')
      .set('Authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    const allowed = await request(guardedApp({ allowPasswordChangeRequired: true }))
      .get('/private')
      .set('Authorization', `Bearer ${token}`);
    expect(allowed.status).toBe(200);
  });
});
