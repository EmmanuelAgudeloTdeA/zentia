import type { Role } from '@zentia/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

export interface Actor {
  id: string;
  role: Role;
  mustChangePassword: boolean;
}

export function toActor(user: AuthUser): Actor {
  return { id: user.id, role: user.role, mustChangePassword: user.mustChangePassword };
}
