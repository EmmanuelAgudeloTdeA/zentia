import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../../core/http/index.js';
import { createInMemoryAuth, FixedClock, type InMemoryAuth } from '../../../test/in-memory-auth.js';
import type { Actor } from '../../auth/index.js';
import { CreateUserUseCase } from './create-user.use-case.js';
import { ResetPasswordUseCase } from './reset-password.use-case.js';
import { UpdateUserUseCase } from './update-user.use-case.js';
import {
  GetUserUseCase,
  ListUserOptionsUseCase,
  ListUsersUseCase,
} from './user-queries.use-case.js';
import type { UsersDependencies } from './users-dependencies.js';

const TEMPORARY = 'Temporal123abc';

let auth: InMemoryAuth;
let deps: UsersDependencies;
let admin: Actor;

beforeEach(async () => {
  auth = createInMemoryAuth();
  deps = {
    ...auth,
    clock: new FixedClock(),
    temporaryPasswords: { generate: () => TEMPORARY },
  };
  const user = await auth.addUser({ email: 'admin@empresa.co', password: 'x', role: 'ADMIN' });
  admin = { id: user.id, role: 'ADMIN', mustChangePassword: false };
});

async function expectCode(promise: Promise<unknown>, code: string, status: number) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
}

async function issueTokenFor(userId: string) {
  await auth.refreshTokens.create({
    id: crypto.randomUUID(),
    userId,
    familyId: crypto.randomUUID(),
    tokenHash: crypto.randomUUID(),
    expiresAt: new Date('2030-01-01'),
  });
}

describe('CreateUserUseCase', () => {
  it('creates the user with a temporary password that must be changed', async () => {
    const result = await new CreateUserUseCase(deps).execute({
      email: 'ana@empresa.co',
      name: 'Ana',
      role: 'SELLER',
    });

    expect(result.temporaryPassword).toBe(TEMPORARY);
    expect(result.user).toMatchObject({
      email: 'ana@empresa.co',
      role: 'SELLER',
      isActive: true,
      mustChangePassword: true,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    const stored = await auth.users.findById(result.user.id);
    expect(await auth.hasher.verify(TEMPORARY, stored?.passwordHash ?? '')).toBe(true);
  });

  it('answers EMAIL_TAKEN for a registered email', async () => {
    await expectCode(
      new CreateUserUseCase(deps).execute({ email: 'admin@empresa.co', name: 'X', role: 'SELLER' }),
      'EMAIL_TAKEN',
      409,
    );
  });
});

describe('UpdateUserUseCase', () => {
  it('updates the data and revokes all sessions when deactivating', async () => {
    const seller = await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await issueTokenFor(seller.id);

    const updated = await new UpdateUserUseCase(deps).execute(admin, seller.id, {
      name: 'Ana María',
      isActive: false,
    });

    expect(updated).toMatchObject({ name: 'Ana María', isActive: false });
    expect(auth.refreshTokens.active(seller.id)).toHaveLength(0);
  });

  it('keeps the sessions when only the data changes', async () => {
    const seller = await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await issueTokenFor(seller.id);
    await new UpdateUserUseCase(deps).execute(admin, seller.id, { role: 'MANAGER' });
    expect(auth.refreshTokens.active(seller.id)).toHaveLength(1);
  });

  it('applies the admin protections', async () => {
    const update = new UpdateUserUseCase(deps);
    await expectCode(
      update.execute(admin, admin.id, { isActive: false }),
      'CANNOT_MODIFY_SELF',
      409,
    );
    const other = await auth.addUser({ email: 'jefe@empresa.co', password: 'x', role: 'ADMIN' });
    await auth.users.update(admin.id, { role: 'MANAGER' });
    await expectCode(update.execute(admin, other.id, { role: 'SELLER' }), 'LAST_ADMIN', 409);
  });

  it('answers USER_NOT_FOUND and EMAIL_TAKEN', async () => {
    const update = new UpdateUserUseCase(deps);
    await expectCode(
      update.execute(admin, crypto.randomUUID(), { name: 'X' }),
      'USER_NOT_FOUND',
      404,
    );
    const seller = await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await expectCode(
      update.execute(admin, seller.id, { email: 'admin@empresa.co' }),
      'EMAIL_TAKEN',
      409,
    );
  });
});

describe('ResetPasswordUseCase', () => {
  it('sets a temporary password, forces the change and revokes the sessions', async () => {
    const seller = await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await issueTokenFor(seller.id);

    expect(await new ResetPasswordUseCase(deps).execute(seller.id)).toEqual({
      temporaryPassword: TEMPORARY,
    });
    const stored = await auth.users.findById(seller.id);
    expect(stored?.mustChangePassword).toBe(true);
    expect(await auth.hasher.verify(TEMPORARY, stored?.passwordHash ?? '')).toBe(true);
    expect(auth.refreshTokens.active(seller.id)).toHaveLength(0);
  });

  it('works for the admin themselves and answers USER_NOT_FOUND', async () => {
    const reset = new ResetPasswordUseCase(deps);
    await reset.execute(admin.id);
    expect((await auth.users.findById(admin.id))?.mustChangePassword).toBe(true);
    await expectCode(reset.execute(crypto.randomUUID()), 'USER_NOT_FOUND', 404);
  });
});

describe('user queries', () => {
  it('lists with filters and pagination, and options only include active users', async () => {
    await auth.addUser({ email: 'ana@empresa.co', password: 'x' });
    await auth.addUser({ email: 'beto@empresa.co', password: 'x', isActive: false });
    await auth.addUser({ email: 'carla@empresa.co', password: 'x', role: 'MANAGER' });

    const page = await new ListUsersUseCase(deps).execute({
      role: 'SELLER',
      page: 1,
      pageSize: 1,
    });
    expect(page).toMatchObject({ total: 2, page: 1, pageSize: 1 });
    expect(page.items.map((user) => user.email)).toEqual(['ana@empresa.co']);

    const search = await new ListUsersUseCase(deps).execute({ q: 'CARLA', page: 1, pageSize: 20 });
    expect(search.items.map((user) => user.email)).toEqual(['carla@empresa.co']);

    const options = await new ListUserOptionsUseCase(deps).execute();
    expect(options.map((option) => option.name)).toEqual(['admin', 'ana', 'carla']);
    expect(options[0]).toEqual({ id: admin.id, name: 'admin', role: 'ADMIN', isActive: true });
    const all = await new ListUserOptionsUseCase(deps).execute(true);
    expect(all.map((option) => option.name)).toEqual(['admin', 'ana', 'beto', 'carla']);
  });

  it('GetUserUseCase answers USER_NOT_FOUND', async () => {
    await expectCode(new GetUserUseCase(deps).execute(crypto.randomUUID()), 'USER_NOT_FOUND', 404);
  });
});
