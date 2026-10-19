import type { PrismaClient } from '@prisma/client';
import type { AuthInfrastructure, AuthUnitOfWork } from '../application/index.js';
import { PrismaRefreshTokenRepository } from './prisma-refresh-token.repository.js';
import { PrismaUserRepository } from './prisma-user.repository.js';
import { BcryptPasswordHasher, CryptoSecureTokens, JoseAccessTokens } from './security-adapters.js';

export interface AuthSecurityConfig {
  jwtAccessSecret: string;
  accessTokenTtlSeconds: number;
  bcryptCost: number;
}

export function createPrismaAuthInfrastructure(
  prisma: PrismaClient,
  config: AuthSecurityConfig,
): AuthInfrastructure {
  const unitOfWork: AuthUnitOfWork = {
    run: (work) =>
      prisma.$transaction((tx) =>
        work({
          users: new PrismaUserRepository(tx),
          refreshTokens: new PrismaRefreshTokenRepository(tx),
        }),
      ),
  };
  return {
    users: new PrismaUserRepository(prisma),
    refreshTokens: new PrismaRefreshTokenRepository(prisma),
    unitOfWork,
    hasher: new BcryptPasswordHasher(config.bcryptCost),
    accessTokens: new JoseAccessTokens(config.jwtAccessSecret, config.accessTokenTtlSeconds),
    secureTokens: new CryptoSecureTokens(),
  };
}
