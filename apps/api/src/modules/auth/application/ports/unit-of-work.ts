import type { RefreshTokenRepository } from './refresh-token-repository.js';
import type { UserRepository } from './user-repository.js';

export interface AuthRepositories {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
}

export interface AuthUnitOfWork {
  run<T>(work: (repositories: AuthRepositories) => Promise<T>): Promise<T>;
}
