import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import { assertCanAccess } from './access-scope.js';
import type { AuthDependencies } from './auth-dependencies.js';
import { AuthenticateRequestUseCase } from './authenticate-request.use-case.js';
import { ChangeOwnPasswordUseCase } from './change-own-password.use-case.js';
import { LoginUseCase } from './login.use-case.js';
import { LogoutUseCase } from './logout.use-case.js';
import { RefreshSessionUseCase } from './refresh-session.use-case.js';
import { SeedFirstAdminUseCase } from './seed-first-admin.use-case.js';

const EMAIL = 'ana@empresa.co';
const PASSWORD = 'ventas2026x';

let auth: InMemoryAuth;
let clock: FixedClock;
let deps: AuthDependencies;

beforeEach(() => {
  auth = createInMemoryAuth();
  clock = new FixedClock();
  deps = { ...auth, clock, refreshTokenTtlSeconds: 7 * 86_400 };
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

describe('LoginUseCase', () => {
  it('issues an access token and a refresh token for valid credentials', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const session = await new LoginUseCase(deps).execute({ email: EMAIL, password: PASSWORD });

    expect(session.user).toMatchObject({ id: user.id, email: EMAIL, role: 'SELLER' });
    expect(session.user).not.toHaveProperty('passwordHash');
    expect(await auth.accessTokens.verify(session.accessToken)).toEqual({
      ok: true,
      userId: user.id,
    });
    expect(auth.refreshTokens.active(user.id)).toHaveLength(1);
  });

  it('answers INVALID_CREDENTIALS for an unknown email, wrong password or inactive user', async () => {
    await auth.addUser({ email: EMAIL, password: PASSWORD });
    await auth.addUser({ email: 'off@empresa.co', password: PASSWORD, isActive: false });
    const login = new LoginUseCase(deps);

    await expectCode(
      login.execute({ email: 'nadie@x.co', password: PASSWORD }),
      'INVALID_CREDENTIALS',
      401,
    );
    await expectCode(
      login.execute({ email: EMAIL, password: 'otra1234567' }),
      'INVALID_CREDENTIALS',
      401,
    );
    await expectCode(
      login.execute({ email: 'off@empresa.co', password: PASSWORD }),
      'INVALID_CREDENTIALS',
      401,
    );
  });

  it('verifies against a dummy hash when the user does not exist', async () => {
    const verify = vi.spyOn(auth.hasher, 'verify');
    await new LoginUseCase(deps)
      .execute({ email: 'nadie@x.co', password: PASSWORD })
      .catch(() => {});
    expect(verify).toHaveBeenCalledOnce();
  });
});

describe('RefreshSessionUseCase', () => {
  async function login() {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const session = await new LoginUseCase(deps).execute({ email: EMAIL, password: PASSWORD });
    return { user, session };
  }

  it('rotates the token inside the same family', async () => {
    const { user, session } = await login();
    const refreshed = await new RefreshSessionUseCase(deps).execute(session.refreshToken);

    expect(refreshed.refreshToken).not.toBe(session.refreshToken);
    const [active] = auth.refreshTokens.active(user.id);
    const old = await auth.refreshTokens.findByHash(auth.secureTokens.hash(session.refreshToken));
    expect(active?.familyId).toBe(old?.familyId);
    expect(old?.rotatedAt).toEqual(clock.now());
  });

  it('answers REFRESH_IN_PROGRESS for the old token within the grace window', async () => {
    const { user, session } = await login();
    const refresh = new RefreshSessionUseCase(deps);
    await refresh.execute(session.refreshToken);
    clock.advance(10_000);

    await expectCode(refresh.execute(session.refreshToken), 'REFRESH_IN_PROGRESS', 409);
    expect(auth.refreshTokens.active(user.id)).toHaveLength(1);
  });

  it('revokes the whole family when a rotated token is reused after the window', async () => {
    const { user, session } = await login();
    const refresh = new RefreshSessionUseCase(deps);
    await refresh.execute(session.refreshToken);
    clock.advance(10_001);

    await expectCode(refresh.execute(session.refreshToken), 'REFRESH_TOKEN_REUSED', 401);
    expect(auth.refreshTokens.active(user.id)).toHaveLength(0);
  });

  it('rejects a missing, unknown or expired token', async () => {
    const { session } = await login();
    const refresh = new RefreshSessionUseCase(deps);

    await expectCode(refresh.execute(undefined), 'INVALID_REFRESH_TOKEN', 401);
    await expectCode(refresh.execute('unknown'), 'INVALID_REFRESH_TOKEN', 401);
    clock.advance(7 * 86_400_000);
    await expectCode(refresh.execute(session.refreshToken), 'INVALID_REFRESH_TOKEN', 401);
  });

  it('rejects the token of a deactivated user', async () => {
    const { user, session } = await login();
    auth.users.users.set(user.id, { ...user, isActive: false });

    await expectCode(
      new RefreshSessionUseCase(deps).execute(session.refreshToken),
      'INVALID_REFRESH_TOKEN',
      401,
    );
  });
});

describe('LogoutUseCase', () => {
  it('revokes the family and never fails', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const session = await new LoginUseCase(deps).execute({ email: EMAIL, password: PASSWORD });
    const logout = new LogoutUseCase(deps);

    await logout.execute(session.refreshToken);
    await expect(logout.execute(undefined)).resolves.toBeUndefined();
    await expect(logout.execute('garbage')).resolves.toBeUndefined();
    expect(auth.refreshTokens.active(user.id)).toHaveLength(0);
    await expectCode(
      new RefreshSessionUseCase(deps).execute(session.refreshToken),
      'INVALID_REFRESH_TOKEN',
      401,
    );
  });
});

describe('ChangeOwnPasswordUseCase', () => {
  it('rejects a wrong current password', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    await expectCode(
      new ChangeOwnPasswordUseCase(deps).execute(user.id, {
        currentPassword: 'mala123456',
        newPassword: 'nueva2026xy',
      }),
      'INVALID_CURRENT_PASSWORD',
      400,
    );
  });

  it('rejects the same password and one equal to the email', async () => {
    const user = await auth.addUser({ email: 'ana2026@empresa.co', password: PASSWORD });
    const change = new ChangeOwnPasswordUseCase(deps);

    await expectCode(
      change.execute(user.id, { currentPassword: PASSWORD, newPassword: PASSWORD }),
      'PASSWORD_REUSED',
      400,
    );
    await expectCode(
      change.execute(user.id, { currentPassword: PASSWORD, newPassword: 'ANA2026@empresa.co' }),
      'VALIDATION_ERROR',
      400,
    );
  });

  it('clears mustChangePassword, revokes every session and opens a new family', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD, mustChangePassword: true });
    const first = await new LoginUseCase(deps).execute({ email: EMAIL, password: PASSWORD });
    await new LoginUseCase(deps).execute({ email: EMAIL, password: PASSWORD });

    const session = await new ChangeOwnPasswordUseCase(deps).execute(user.id, {
      currentPassword: PASSWORD,
      newPassword: 'nueva2026xy',
    });

    expect(session.user.mustChangePassword).toBe(false);
    const active = auth.refreshTokens.active(user.id);
    expect(active).toHaveLength(1);
    const firstRecord = await auth.refreshTokens.findByHash(
      auth.secureTokens.hash(first.refreshToken),
    );
    expect(active[0]?.familyId).not.toBe(firstRecord?.familyId);
    expect(
      await auth.hasher.verify('nueva2026xy', auth.users.users.get(user.id)?.passwordHash ?? ''),
    ).toBe(true);
  });
});

describe('AuthenticateRequestUseCase', () => {
  it('loads role and flags from the store, not from the token', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD });
    const token = await auth.accessTokens.sign(user.id);
    auth.users.users.set(user.id, { ...user, role: 'MANAGER', mustChangePassword: true });

    await expect(new AuthenticateRequestUseCase(deps).execute(token)).resolves.toEqual({
      id: user.id,
      role: 'MANAGER',
      mustChangePassword: true,
    });
  });

  it('answers TOKEN_INVALID and USER_INACTIVE', async () => {
    const user = await auth.addUser({ email: EMAIL, password: PASSWORD, isActive: false });
    const authenticate = new AuthenticateRequestUseCase(deps);

    await expectCode(authenticate.execute('not-a-jwt'), 'TOKEN_INVALID', 401);
    await expectCode(
      authenticate.execute(await auth.accessTokens.sign(user.id)),
      'USER_INACTIVE',
      401,
    );
  });
});

describe('assertCanAccess', () => {
  it('throws the module not-found code for a foreign resource under OWN scope', () => {
    const seller = { id: 's1', role: 'SELLER', mustChangePassword: false } as const;
    expect(() => assertCanAccess(seller, 's1', 'NOT_FOUND')).not.toThrow();
    expect(() => assertCanAccess(seller, 'other', 'NOT_FOUND')).toThrow(AppError);
  });
});

describe('SeedFirstAdminUseCase', () => {
  it('creates the first admin with mustChangePassword only once', async () => {
    const seed = new SeedFirstAdminUseCase(auth);

    await expect(seed.execute({ email: ' Admin@Empresa.co ', password: PASSWORD })).resolves.toBe(
      'created',
    );
    await expect(seed.execute({ email: 'otro@empresa.co', password: PASSWORD })).resolves.toBe(
      'skipped',
    );

    const admin = await auth.users.findByEmail('admin@empresa.co');
    expect(admin).toMatchObject({ role: 'ADMIN', mustChangePassword: true });
  });

  it('rejects missing variables or a password outside the policy', async () => {
    const seed = new SeedFirstAdminUseCase(auth);
    await expect(seed.execute({ email: undefined, password: undefined })).rejects.toThrow(
      'ADMIN_EMAIL',
    );
    await expect(seed.execute({ email: 'admin@empresa.co', password: 'corta' })).rejects.toThrow(
      'policy',
    );
  });
});
