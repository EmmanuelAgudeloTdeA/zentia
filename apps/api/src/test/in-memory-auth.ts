import { randomUUID } from 'node:crypto';
import type { Role } from '@zentia/shared';
import type { Clock } from '../core/clock/index.js';
import type {
  AuthInfrastructure,
  NewRefreshToken,
  NewUser,
  PasswordHasher,
  PasswordUpdate,
  RefreshTokenRepository,
  UserRepository,
} from '../modules/auth/application/index.js';
import type { AuthUser, RefreshTokenRecord } from '../modules/auth/domain/index.js';
import { CryptoSecureTokens, JoseAccessTokens } from '../modules/auth/infrastructure/index.js';

export const TEST_JWT_SECRET = 'test-secret-with-at-least-32-characters';

export class FixedClock implements Clock {
  constructor(private current = new Date('2026-10-18T15:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current);
  }

  today(): string {
    return this.current.toISOString().slice(0, 10);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Hasher rápido y determinista solo para pruebas. */
export class PlainHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, AuthUser>();

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async existsWithRole(role: Role): Promise<boolean> {
    return [...this.users.values()].some((user) => user.role === role);
  }

  async create(user: NewUser): Promise<AuthUser> {
    const created: AuthUser = { ...user, id: randomUUID(), isActive: true, createdAt: new Date() };
    this.users.set(created.id, created);
    return created;
  }

  async updatePassword(id: string, update: PasswordUpdate): Promise<AuthUser> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = {
      ...user,
      passwordHash: update.passwordHash,
      mustChangePassword: update.mustChangePassword,
    };
    this.users.set(id, updated);
    return updated;
  }
}

interface StoredToken extends RefreshTokenRecord {
  tokenHash: string;
  replacedById: string | null;
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly tokens = new Map<string, StoredToken>();

  async create(token: NewRefreshToken): Promise<RefreshTokenRecord> {
    const stored: StoredToken = { ...token, revokedAt: null, rotatedAt: null, replacedById: null };
    this.tokens.set(token.id, stored);
    return stored;
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return [...this.tokens.values()].find((token) => token.tokenHash === tokenHash) ?? null;
  }

  async markRotated(id: string, replacedById: string, at: Date): Promise<boolean> {
    const token = this.tokens.get(id);
    if (!token || token.revokedAt) return false;
    Object.assign(token, { revokedAt: at, rotatedAt: at, replacedById });
    return true;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.familyId === familyId && !token.revokedAt) token.revokedAt = at;
    }
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const token of this.tokens.values()) {
      if (token.userId === userId && !token.revokedAt) token.revokedAt = at;
    }
  }

  async deleteStale(userId: string, before: Date): Promise<void> {
    for (const [id, token] of this.tokens) {
      const stale =
        token.expiresAt < before || (token.revokedAt !== null && token.revokedAt < before);
      if (token.userId === userId && stale) this.tokens.delete(id);
    }
  }

  active(userId: string): StoredToken[] {
    return [...this.tokens.values()].filter((token) => token.userId === userId && !token.revokedAt);
  }
}

export interface InMemoryAuth extends AuthInfrastructure {
  users: InMemoryUserRepository;
  refreshTokens: InMemoryRefreshTokenRepository;
  addUser(input: {
    email: string;
    password: string;
    role?: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
  }): Promise<AuthUser>;
}

export function createInMemoryAuth(accessTokenTtlSeconds = 900): InMemoryAuth {
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const hasher = new PlainHasher();
  return {
    users,
    refreshTokens,
    unitOfWork: { run: (work) => work({ users, refreshTokens }) },
    hasher,
    accessTokens: new JoseAccessTokens(TEST_JWT_SECRET, accessTokenTtlSeconds),
    secureTokens: new CryptoSecureTokens(),
    async addUser({
      email,
      password,
      role = 'SELLER',
      isActive = true,
      mustChangePassword = false,
    }) {
      const user = await users.create({
        email,
        name: email.split('@')[0] ?? email,
        passwordHash: await hasher.hash(password),
        role,
        mustChangePassword,
      });
      const stored = { ...user, isActive };
      users.users.set(user.id, stored);
      return stored;
    },
  };
}
