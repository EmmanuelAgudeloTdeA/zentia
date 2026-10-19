import type { UserDto } from '@zentia/shared';
import type { AuthUser } from '../domain/index.js';
import type { AuthDependencies } from './auth-dependencies.js';
import type { RefreshTokenRepository } from './ports/index.js';

export interface IssuedSession {
  accessToken: string;
  user: UserDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function toUserDto(user: AuthUser): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt.toISOString(),
  };
}

interface IssueOptions {
  refreshTokens: RefreshTokenRepository;
  familyId?: string;
  tokenId?: string;
}

export async function issueSession(
  deps: AuthDependencies,
  user: AuthUser,
  { refreshTokens, familyId, tokenId }: IssueOptions,
): Promise<IssuedSession> {
  const refreshToken = deps.secureTokens.generate();
  const refreshExpiresAt = new Date(
    deps.clock.now().getTime() + deps.refreshTokenTtlSeconds * 1000,
  );
  await refreshTokens.create({
    id: tokenId ?? deps.secureTokens.newId(),
    userId: user.id,
    familyId: familyId ?? deps.secureTokens.newId(),
    tokenHash: deps.secureTokens.hash(refreshToken),
    expiresAt: refreshExpiresAt,
  });
  return {
    accessToken: await deps.accessTokens.sign(user.id),
    user: toUserDto(user),
    refreshToken,
    refreshExpiresAt,
  };
}
