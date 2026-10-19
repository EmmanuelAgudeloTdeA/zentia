import type { Role } from '@zentia/shared';
import type { Actor } from './auth-user.js';

export type AccessScope = 'OWN' | 'ALL';

export function resolveScope(role: Role): AccessScope {
  return role === 'SELLER' ? 'OWN' : 'ALL';
}

export function canAccess(actor: Actor, ownerId: string): boolean {
  return resolveScope(actor.role) === 'ALL' || ownerId === actor.id;
}

export function scopeFilter(actor: Actor): { ownerId?: string } {
  return resolveScope(actor.role) === 'ALL' ? {} : { ownerId: actor.id };
}
