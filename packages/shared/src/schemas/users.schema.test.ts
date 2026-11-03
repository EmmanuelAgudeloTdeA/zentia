import { describe, expect, it } from 'vitest';
import {
  createUserRequestSchema,
  listUsersQuerySchema,
  updateUserRequestSchema,
} from './users.schema.js';

describe('createUserRequestSchema', () => {
  it('normalizes the email and trims the name', () => {
    expect(
      createUserRequestSchema.parse({ email: ' Ana@Empresa.CO ', name: '  Ana  ', role: 'SELLER' }),
    ).toEqual({ email: 'ana@empresa.co', name: 'Ana', role: 'SELLER' });
  });

  it('rejects an empty or too long name and an unknown role', () => {
    const base = { email: 'ana@empresa.co', role: 'SELLER' };
    expect(createUserRequestSchema.safeParse({ ...base, name: '   ' }).success).toBe(false);
    expect(createUserRequestSchema.safeParse({ ...base, name: 'a'.repeat(101) }).success).toBe(
      false,
    );
    expect(createUserRequestSchema.safeParse({ ...base, name: 'Ana', role: 'OWNER' }).success).toBe(
      false,
    );
  });
});

describe('updateUserRequestSchema', () => {
  it('accepts partial changes', () => {
    expect(updateUserRequestSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });
});

describe('listUsersQuerySchema', () => {
  it('applies defaults and parses the status as boolean', () => {
    expect(listUsersQuerySchema.parse({ isActive: 'false', page: '2' })).toEqual({
      isActive: false,
      page: 2,
      pageSize: 20,
    });
  });

  it('rejects an invalid status or page size', () => {
    expect(listUsersQuerySchema.safeParse({ isActive: 'yes' }).success).toBe(false);
    expect(listUsersQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });
});
