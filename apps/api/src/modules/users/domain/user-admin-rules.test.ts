import { describe, expect, it } from 'vitest';
import { checkAdminProtection, type ManagedUser } from './user-admin-rules.js';

const admin: ManagedUser = { id: 'admin-1', role: 'ADMIN', isActive: true };
const seller: ManagedUser = { id: 'seller-1', role: 'SELLER', isActive: true };

describe('checkAdminProtection', () => {
  it('forbids an admin to deactivate or demote themselves', () => {
    const base = { actorId: admin.id, target: admin, activeAdmins: 3 };
    expect(checkAdminProtection({ ...base, changes: { isActive: false } })).toBe(
      'CANNOT_MODIFY_SELF',
    );
    expect(checkAdminProtection({ ...base, changes: { role: 'MANAGER' } })).toBe(
      'CANNOT_MODIFY_SELF',
    );
  });

  it('lets an admin edit their own name-level data and keep the role', () => {
    expect(
      checkAdminProtection({
        actorId: admin.id,
        target: admin,
        changes: { role: 'ADMIN', isActive: true },
        activeAdmins: 1,
      }),
    ).toBeNull();
  });

  it('forbids leaving zero active admins', () => {
    const base = { actorId: 'admin-2', target: admin, activeAdmins: 1 };
    expect(checkAdminProtection({ ...base, changes: { isActive: false } })).toBe('LAST_ADMIN');
    expect(checkAdminProtection({ ...base, changes: { role: 'SELLER' } })).toBe('LAST_ADMIN');
  });

  it('allows demoting or deactivating an admin when another one stays active', () => {
    const base = { actorId: 'admin-2', target: admin, activeAdmins: 2 };
    expect(checkAdminProtection({ ...base, changes: { isActive: false } })).toBeNull();
    expect(checkAdminProtection({ ...base, changes: { role: 'MANAGER' } })).toBeNull();
  });

  it('ignores inactive admins and non admin users', () => {
    const inactiveAdmin = { ...admin, isActive: false };
    expect(
      checkAdminProtection({
        actorId: 'admin-2',
        target: inactiveAdmin,
        changes: { role: 'SELLER' },
        activeAdmins: 1,
      }),
    ).toBeNull();
    expect(
      checkAdminProtection({
        actorId: admin.id,
        target: seller,
        changes: { isActive: false },
        activeAdmins: 1,
      }),
    ).toBeNull();
  });
});
