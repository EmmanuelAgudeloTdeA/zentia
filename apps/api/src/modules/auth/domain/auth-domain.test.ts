import { describe, expect, it } from 'vitest';
import { canAccess, resolveScope, scopeFilter } from './access-scope.js';
import type { Actor } from './auth-user.js';
import { assessRefreshToken, type RefreshTokenRecord } from './refresh-token.js';

const now = new Date('2026-10-18T15:00:00.000Z');
const base: RefreshTokenRecord = {
  id: 't1',
  userId: 'u1',
  familyId: 'f1',
  expiresAt: new Date(now.getTime() + 60_000),
  revokedAt: null,
  rotatedAt: null,
};

describe('assessRefreshToken', () => {
  it('accepts a live token', () => {
    expect(assessRefreshToken(base, now)).toBe('valid');
  });

  it('rejects an unknown, expired or revoked token', () => {
    expect(assessRefreshToken(null, now)).toBe('invalid');
    expect(assessRefreshToken({ ...base, expiresAt: now }, now)).toBe('invalid');
    expect(assessRefreshToken({ ...base, revokedAt: now }, now)).toBe('invalid');
  });

  it('tolerates a rotated token within the 10 s grace window', () => {
    const rotatedAt = new Date(now.getTime() - 10_000);
    expect(assessRefreshToken({ ...base, revokedAt: rotatedAt, rotatedAt }, now)).toBe('in-grace');
  });

  it('flags a rotated token presented after the grace window as reused', () => {
    const rotatedAt = new Date(now.getTime() - 10_001);
    expect(assessRefreshToken({ ...base, revokedAt: rotatedAt, rotatedAt }, now)).toBe('reused');
  });
});

describe('access scope', () => {
  const seller: Actor = { id: 's1', role: 'SELLER', mustChangePassword: false };
  const manager: Actor = { id: 'm1', role: 'MANAGER', mustChangePassword: false };
  const admin: Actor = { id: 'a1', role: 'ADMIN', mustChangePassword: false };

  it('resolves OWN for sellers and ALL for managers and admins', () => {
    expect(resolveScope('SELLER')).toBe('OWN');
    expect(resolveScope('MANAGER')).toBe('ALL');
    expect(resolveScope('ADMIN')).toBe('ALL');
  });

  it('lets a seller access only their own resources', () => {
    expect(canAccess(seller, 's1')).toBe(true);
    expect(canAccess(seller, 'other')).toBe(false);
  });

  it('lets managers and admins access any resource', () => {
    expect(canAccess(manager, 'other')).toBe(true);
    expect(canAccess(admin, 'other')).toBe(true);
    expect(canAccess(admin, 'a1')).toBe(true);
  });

  it('builds the listing filter by scope', () => {
    expect(scopeFilter(seller)).toEqual({ ownerId: 's1' });
    expect(scopeFilter(manager)).toEqual({});
    expect(scopeFilter(admin)).toEqual({});
  });
});
