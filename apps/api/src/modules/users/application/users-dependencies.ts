import type { Clock } from '../../../core/clock/index.js';
import type { AuthUnitOfWork, PasswordHasher, UserRepository } from '../../auth/index.js';
import type { TemporaryPasswordGenerator } from './ports/index.js';

export interface UsersInfrastructure {
  temporaryPasswords: TemporaryPasswordGenerator;
}

export interface UsersDependencies extends UsersInfrastructure {
  users: UserRepository;
  unitOfWork: AuthUnitOfWork;
  hasher: PasswordHasher;
  clock: Clock;
}
