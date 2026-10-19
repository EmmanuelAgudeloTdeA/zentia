import type { Clock } from '../../../core/clock/index.js';
import type {
  AccessTokenSigner,
  AccessTokenVerifier,
  AuthUnitOfWork,
  PasswordHasher,
  RefreshTokenRepository,
  SecureTokenGenerator,
  UserRepository,
} from './ports/index.js';

export interface AuthInfrastructure {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  unitOfWork: AuthUnitOfWork;
  hasher: PasswordHasher;
  accessTokens: AccessTokenSigner & AccessTokenVerifier;
  secureTokens: SecureTokenGenerator;
}

export interface AuthDependencies extends AuthInfrastructure {
  clock: Clock;
  refreshTokenTtlSeconds: number;
}
