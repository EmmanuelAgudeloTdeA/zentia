import type { Role } from '@zentia/shared';
import type { AuthUser } from '../../domain/index.js';

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface PasswordUpdate {
  passwordHash: string;
  mustChangePassword: boolean;
  changedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  existsWithRole(role: Role): Promise<boolean>;
  create(user: NewUser): Promise<AuthUser>;
  updatePassword(id: string, update: PasswordUpdate): Promise<AuthUser>;
}
