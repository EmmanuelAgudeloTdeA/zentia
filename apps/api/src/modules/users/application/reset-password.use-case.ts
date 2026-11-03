import type { TemporaryPasswordResult } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { UsersDependencies } from './users-dependencies.js';

export class ResetPasswordUseCase {
  constructor(
    private readonly deps: Pick<
      UsersDependencies,
      'users' | 'unitOfWork' | 'hasher' | 'temporaryPasswords' | 'clock'
    >,
  ) {}

  async execute(id: string): Promise<TemporaryPasswordResult> {
    if (!(await this.deps.users.findById(id))) throw new AppError('USER_NOT_FOUND', 404);
    const temporaryPassword = this.deps.temporaryPasswords.generate();
    const passwordHash = await this.deps.hasher.hash(temporaryPassword);
    const now = this.deps.clock.now();
    await this.deps.unitOfWork.run(async ({ users, refreshTokens }) => {
      await users.updatePassword(id, { passwordHash, mustChangePassword: true, changedAt: now });
      await refreshTokens.revokeAllForUser(id, now);
    });
    return { temporaryPassword };
  }
}
