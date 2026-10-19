import { AppError } from '../../../core/http/index.js';
import { assessRefreshToken } from '../domain/index.js';
import type { AuthDependencies } from './auth-dependencies.js';
import { issueSession, type IssuedSession } from './session.js';

export class RefreshSessionUseCase {
  constructor(private readonly deps: AuthDependencies) {}

  async execute(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) throw new AppError('INVALID_REFRESH_TOKEN', 401);
    const now = this.deps.clock.now();
    const record = await this.deps.refreshTokens.findByHash(this.deps.secureTokens.hash(rawToken));
    const assessment = assessRefreshToken(record, now);

    if (assessment === 'in-grace') throw new AppError('REFRESH_IN_PROGRESS', 409);
    if (assessment === 'reused' && record) {
      await this.deps.refreshTokens.revokeFamily(record.familyId, now);
      throw new AppError('REFRESH_TOKEN_REUSED', 401);
    }
    if (assessment !== 'valid' || !record) throw new AppError('INVALID_REFRESH_TOKEN', 401);

    const user = await this.deps.users.findById(record.userId);
    if (!user?.isActive) {
      await this.deps.refreshTokens.revokeFamily(record.familyId, now);
      throw new AppError('INVALID_REFRESH_TOKEN', 401);
    }

    return this.deps.unitOfWork.run(async ({ refreshTokens }) => {
      const tokenId = this.deps.secureTokens.newId();
      if (!(await refreshTokens.markRotated(record.id, tokenId, now))) {
        throw new AppError('REFRESH_IN_PROGRESS', 409);
      }
      return issueSession(this.deps, user, { refreshTokens, familyId: record.familyId, tokenId });
    });
  }
}
