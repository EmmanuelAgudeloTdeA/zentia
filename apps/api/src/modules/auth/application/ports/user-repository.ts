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

export interface UserSearchFilter {
  q?: string | undefined;
  role?: Role | undefined;
  isActive?: boolean | undefined;
}

export interface UserPage {
  items: AuthUser[];
  total: number;
}

export interface UserUpdate {
  email?: string | undefined;
  name?: string | undefined;
  role?: Role | undefined;
  isActive?: boolean | undefined;
}

export interface UserOption {
  id: string;
  name: string;
  role: Role;
}

export interface UserRepository {
  findById(id: string): Promise<AuthUser | null>;
  findByEmail(email: string): Promise<AuthUser | null>;
  existsWithRole(role: Role): Promise<boolean>;
  create(user: NewUser): Promise<AuthUser>;
  updatePassword(id: string, update: PasswordUpdate): Promise<AuthUser>;
  /** Lanza `EMAIL_TAKEN` si el correo ya pertenece a otro usuario. */
  update(id: string, changes: UserUpdate): Promise<AuthUser>;
  list(filter: UserSearchFilter, page: { skip: number; take: number }): Promise<UserPage>;
  listActiveOptions(): Promise<UserOption[]>;
  /** Bloquea las filas contadas mientras dure la transacción. */
  countActiveAdmins(): Promise<number>;
}
