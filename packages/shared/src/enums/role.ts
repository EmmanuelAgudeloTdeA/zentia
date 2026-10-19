export const ROLES = ['SELLER', 'MANAGER', 'ADMIN'] as const;

export type Role = (typeof ROLES)[number];
