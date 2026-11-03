import type { Role } from '@zentia/shared';

export interface ManagedUser {
  id: string;
  role: Role;
  isActive: boolean;
}

export interface AdminProtectionInput {
  actorId: string;
  target: ManagedUser;
  changes: { role?: Role | undefined; isActive?: boolean | undefined };
  activeAdmins: number;
}

export type AdminProtectionViolation = 'CANNOT_MODIFY_SELF' | 'LAST_ADMIN';

/** Un admin no se desactiva ni se quita el rol a sí mismo, y siempre queda al menos un admin activo. */
export function checkAdminProtection({
  actorId,
  target,
  changes,
  activeAdmins,
}: AdminProtectionInput): AdminProtectionViolation | null {
  const nextRole = changes.role ?? target.role;
  const nextActive = changes.isActive ?? target.isActive;
  const remainsActiveAdmin = nextRole === 'ADMIN' && nextActive;

  if (actorId === target.id && target.role === 'ADMIN' && !remainsActiveAdmin) {
    return 'CANNOT_MODIFY_SELF';
  }
  const isActiveAdmin = target.role === 'ADMIN' && target.isActive;
  if (isActiveAdmin && !remainsActiveAdmin && activeAdmins <= 1) return 'LAST_ADMIN';
  return null;
}
