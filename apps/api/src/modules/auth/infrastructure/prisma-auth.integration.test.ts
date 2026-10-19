import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository.js';
import { PrismaUserRepository } from './prisma-user.repository.js';

// Requiere una base migrada en TEST_DATABASE_URL (por ejemplo, zentia_test); si no existe, se omite.
const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Prisma auth repositories (integration)', () => {
  let prisma: PrismaClient;
  let users: PrismaUserRepository;
  let tokens: PrismaRefreshTokenRepository;
  let userId: string;

  beforeAll(() => {
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl ?? '' } } });
    users = new PrismaUserRepository(prisma);
    tokens = new PrismaRefreshTokenRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    const user = await users.create({
      email: 'ana@empresa.co',
      name: 'Ana',
      passwordHash: 'hash',
      role: 'SELLER',
      mustChangePassword: false,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  function newToken(familyId: string, tokenHash: string) {
    return tokens.create({
      id: randomUUID(),
      userId,
      familyId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
    });
  }

  it('enforces a unique tokenHash', async () => {
    await newToken(randomUUID(), 'same-hash');
    await expect(newToken(randomUUID(), 'same-hash')).rejects.toThrow();
  });

  it('rotates a token only once', async () => {
    const token = await newToken(randomUUID(), 'h1');
    const at = new Date();
    await expect(tokens.markRotated(token.id, randomUUID(), at)).resolves.toBe(true);
    await expect(tokens.markRotated(token.id, randomUUID(), at)).resolves.toBe(false);
  });

  it('revokes by family and by user', async () => {
    const family = randomUUID();
    await newToken(family, 'a');
    await newToken(family, 'b');
    await newToken(randomUUID(), 'c');

    await tokens.revokeFamily(family, new Date());
    expect((await tokens.findByHash('a'))?.revokedAt).not.toBeNull();
    expect((await tokens.findByHash('b'))?.revokedAt).not.toBeNull();
    expect((await tokens.findByHash('c'))?.revokedAt).toBeNull();

    await tokens.revokeAllForUser(userId, new Date());
    expect((await tokens.findByHash('c'))?.revokedAt).not.toBeNull();
  });

  it('finds users by normalized email and detects existing admins', async () => {
    expect((await users.findByEmail('ana@empresa.co'))?.id).toBe(userId);
    await expect(users.existsWithRole('ADMIN')).resolves.toBe(false);
  });
});
