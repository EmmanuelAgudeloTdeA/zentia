import type { UserChanges, UserDto } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { toUserDto, type Actor } from '../../auth/index.js';
import { checkAdminProtection } from '../domain/index.js';
import type { UsersDependencies } from './users-dependencies.js';

export class UpdateUserUseCase {
  constructor(private readonly deps: Pick<UsersDependencies, 'unitOfWork' | 'clock'>) {}

  execute(actor: Actor, id: string, changes: UserChanges): Promise<UserDto> {
    return this.deps.unitOfWork.run(async ({ users, refreshTokens }) => {
      const target = await users.findById(id);
      if (!target) throw new AppError('USER_NOT_FOUND', 404);

      const violation = checkAdminProtection({
        actorId: actor.id,
        target,
        changes,
        activeAdmins: await users.countActiveAdmins(),
      });
      if (violation) throw new AppError(violation, 409);

      const updated = await users.update(id, changes);
      if (target.isActive && !updated.isActive) {
        await refreshTokens.revokeAllForUser(id, this.deps.clock.now());
      }
      return toUserDto(updated);
    });
  }
}
