import { checkPasswordPolicy, type ChangePasswordRequest } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { AuthDependencies } from './auth-dependencies.js';
import { issueSession, type IssuedSession } from './session.js';

export class ChangeOwnPasswordUseCase {
  constructor(private readonly deps: AuthDependencies) {}

  async execute(
    userId: string,
    { currentPassword, newPassword }: ChangePasswordRequest,
  ): Promise<IssuedSession> {
    const user = await this.deps.users.findById(userId);
    if (!user?.isActive) throw new AppError('USER_INACTIVE', 401);

    if (!(await this.deps.hasher.verify(currentPassword, user.passwordHash))) {
      throw new AppError('INVALID_CURRENT_PASSWORD', 400);
    }
    const failed = checkPasswordPolicy(newPassword, user.email);
    if (failed.length > 0) {
      throw new AppError('VALIDATION_ERROR', 400, { field: 'newPassword', rules: failed });
    }
    if (await this.deps.hasher.verify(newPassword, user.passwordHash)) {
      throw new AppError('PASSWORD_REUSED', 400);
    }

    const passwordHash = await this.deps.hasher.hash(newPassword);
    const now = this.deps.clock.now();
    return this.deps.unitOfWork.run(async ({ users, refreshTokens }) => {
      const updated = await users.updatePassword(user.id, {
        passwordHash,
        mustChangePassword: false,
        changedAt: now,
      });
      await refreshTokens.revokeAllForUser(user.id, now);
      return issueSession(this.deps, updated, { refreshTokens });
    });
  }
}
